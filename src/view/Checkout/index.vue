<template>
  <div class="checkout">
    <div v-if="loading && !data" class="checkout__skeleton">
      <el-skeleton :rows="6" animated />
    </div>

    <EmptyState v-else-if="error" :description="error">
      <el-button type="primary" @click="execute">重新加载</el-button>
    </EmptyState>

    <EmptyState v-else-if="data && data.items.length === 0" description="购物车里没有已勾选的商品">
      <el-button type="primary" @click="router.push({ name: 'cart' })">回购物车</el-button>
    </EmptyState>

    <template v-else-if="data">
      <AddressPicker
        v-model="selectedAddrId"
        :addresses="data.addresses"
        :disabled="submitting"
        @create="addressDialogVisible = true"
      />

      <section class="checkout__card">
        <h2 class="checkout__title">商品清单</h2>
        <CheckoutItemRow v-for="item in data.items" :key="item.skuId" :item="item" />
      </section>

      <section class="checkout__card">
        <h2 class="checkout__title">订单备注</h2>
        <el-input
          v-model="remarks"
          type="textarea"
          :rows="2"
          maxlength="200"
          show-word-limit
          placeholder="选填，比如对配送时间的要求"
        />
      </section>

      <CheckoutSummary
        v-model:pay-type="payType"
        :total-amount="data.totalAmount"
        :freight-amount="freight"
        :pay-amount="payAmount"
        :count="data.count"
        :submitting="submitting"
        :can-submit="canSubmit"
        :out-of-stock="outOfStock"
        :address-missing="selectedAddrId === null"
        @submit="onSubmit"
      />
    </template>

    <!-- 地址弹窗由结算页持有：加完之后它要重拉确认页，重算默认地址和运费 -->
    <AddressFormDialog v-model="addressDialogVisible" :address="null" @saved="onAddressSaved" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElButton, ElInput, ElSkeleton } from 'element-plus'
import EmptyState from '@/components/EmptyState/index.vue'
import AddressFormDialog from '@/components/AddressFormDialog/index.vue'
import AddressPicker from './com/AddressPicker.vue'
import CheckoutItemRow from './com/CheckoutItemRow.vue'
import CheckoutSummary from './com/CheckoutSummary.vue'
import { fetchFare, fetchOrderConfirm, submitOrder } from '@/api/order'
import { useAsyncData } from '@/composables/useAsyncData'
import { useCartStore } from '@/store/cart'
import type { PayType } from '@/type'

/**
 * 确认订单页。
 *
 * 页面持有三样东西：选中的地址、该地址的运费、支付方式。
 * 金额不自己算 —— 商品总额和默认地址的运费都来自 `/confirm`，换地址只会覆盖运费，
 * 应付总额由两者相加得出。这样最终的 payPrice 和后端 submitOrder 里的算法一致。
 */
const router = useRouter()
const cart = useCartStore()

const { data, loading, error, execute } = useAsyncData(() => fetchOrderConfirm())

const selectedAddrId = ref<number | null>(null)
const freight = ref(0)
const payType = ref<PayType>(1)
const remarks = ref('')
const submitting = ref(false)
const addressDialogVisible = ref(false)

/**
 * 确认页数据到手后回填选中地址和运费。
 *
 * 每次重新拉确认页都回到后端给的默认地址 —— 重新拉多半是因为令牌失效或价格变动，
 * 沿用用户之前选的非默认地址会让显示的运费和"默认地址的运费"这个初始值对不上。
 */
watch(
  data,
  (value) => {
    if (!value) {
      return
    }
    freight.value = value.freightAmount
    selectedAddrId.value = value.defaultAddrId
  },
  { immediate: true },
)

watch(selectedAddrId, async (value, oldValue) => {
  const confirmData = data.value
  // 初次回填（含从 null 变成默认地址）时运费已经一起回填了，不必再查一次
  if (value === null || confirmData === null || value === oldValue) {
    return
  }
  if (value === confirmData.defaultAddrId) {
    freight.value = confirmData.freightAmount
    return
  }
  try {
    freight.value = (await fetchFare(value)).fare
  } catch {
    // 请求层已经弹过提示（换到别人的地址会是 17004）。
    // 退回默认地址，别让页面停在一个和选中地址不符的运费上
    selectedAddrId.value = confirmData.defaultAddrId
    freight.value = confirmData.freightAmount
  }
})

/** 应付总额 = 商品总额 + 当前地址的运费。提交时回传的就是它 */
const payAmount = computed(() => (data.value?.totalAmount ?? 0) + freight.value)

/** stocks 的 key 是字符串（后端 Map<Long,Boolean>），必须 String(skuId) 取 */
const outOfStock = computed(() => {
  const confirmData = data.value
  if (!confirmData) {
    return false
  }
  return confirmData.items.some((item) => confirmData.stocks[String(item.skuId)] === false)
})

const canSubmit = computed(
  () => selectedAddrId.value !== null && !outOfStock.value && !submitting.value,
)

onMounted(() => void execute())

/**
 * 新增地址成功后重拉确认页。
 *
 * 不把新地址直接塞进 data.addresses：新地址很可能成为默认（第一条一定是），
 * 而默认地址一变，选中项和运费都要跟着变 —— 重拉一次比在本地推演这套规则可靠，
 * 后端本来就是这两个数的唯一来源。
 */
async function onAddressSaved(): Promise<void> {
  await execute()
}

async function onSubmit(): Promise<void> {
  const confirmData = data.value
  if (!confirmData || selectedAddrId.value === null || submitting.value) {
    return
  }

  const remark = remarks.value.trim()
  submitting.value = true
  try {
    const result = await submitOrder({
      addrId: selectedAddrId.value,
      payType: payType.value,
      orderToken: confirmData.orderToken,
      payPrice: payAmount.value,
      remarks: remark === '' ? undefined : remark,
    })
    // 后端下单成功后会删掉整个购物车，本地 store 里的件数已经过期 —— 强制重拉一次，
    // 否则头部角标还挂着下单前的数字
    void cart.loadCart(true)
    await router.push({ name: 'pay', params: { orderSn: result.order.orderSn } })
  } catch {
    // 请求层已经弹过提示。这里直接重新拉确认页：最常见的失败是 17001（令牌失效）
    // 和 17002（价格变动），两者都需要一份新的令牌和金额才能重试
    await execute()
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.checkout {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 16px;
}

.checkout__skeleton {
  padding: 20px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
}

.checkout__card {
  padding: 20px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
}

.checkout__title {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 600;
  color: var(--mall-text);
}
</style>
