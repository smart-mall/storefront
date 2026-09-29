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
        <CheckoutItemRow
          v-for="item in data.items"
          :key="item.skuId"
          :item="item"
          :freight="fareOf(item.skuId)"
          :coupon-discount="couponOf(item.skuId)"
        />
      </section>

      <CouponPicker
        v-model="selectedCouponId"
        :coupons="data.availableCoupons"
        :disabled="submitting"
      />

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
        :freight-amount="freightAmount"
        :coupon-amount="couponAmount"
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
import CouponPicker from './com/CouponPicker.vue'
import { fetchFare, fetchOrderConfirm, submitOrder } from '@/api/order'
import { useAsyncData } from '@/composables/useAsyncData'
import { useCartStore } from '@/store/cart'
import type { CouponItem, FareItem, FareResult, PayType } from '@/type'

/**
 * 确认订单页。
 *
 * 页面持有四样东西：选中的地址、选中的券、生效的金额、支付方式。
 * 金额一律不自己算 —— 商品总额、运费、券的抵扣额都来自后端，地址或券一变就重新要一份。
 * 这样最终的 payPrice 和后端 submitOrder 里的算法一致。
 *
 * 首次加载用 `/confirm`（它顺带把可用券列表和防重令牌一起给出来），之后任一影响价格的
 * 参数变了都用 `/fare` 重算 —— 它更轻，且不用换掉手上的令牌。
 */
const router = useRouter()
const cart = useCartStore()

const { data, loading, error, execute } = useAsyncData(() => fetchOrderConfirm())

const selectedAddrId = ref<number | null>(null)
/** 选中的券；null 表示不用券 */
const selectedCouponId = ref<number | null>(null)
/**
 * 重新算出来的金额；为 null 表示沿用确认页给的那一份。
 *
 * 金额一律不在这里自己相加：加价规则只在后端有一份，前端重算一旦与后端不一致，
 * 提交时就会被判成 17002「商品价格已变动」。
 */
const fareResult = ref<FareResult | null>(null)
const payType = ref<PayType>(1)
const remarks = ref('')
const submitting = ref(false)
const addressDialogVisible = ref(false)

/**
 * 确认页数据到手后回到后端给的默认地址。
 *
 * 每次重新拉确认页都回到默认地址 —— 重新拉多半是因为令牌失效或价格变动，
 * 沿用用户之前选的非默认地址会和这一份金额对应的地址对不上。
 */
watch(
  data,
  (value) => {
    if (!value) {
      return
    }
    // 金额换回确认页那一份：上一次重算拿到的已经不适用了
    fareResult.value = null
    selectedAddrId.value = value.defaultAddrId
  },
  { immediate: true },
)

/**
 * 金额请求的序号。
 *
 * 地址和券都能触发重算，两个请求可能并发；只认最后发出的那一次结果，
 * 否则先发的慢响应回来会把新金额覆盖掉 —— 那是会让用户按错价格付款的问题。
 */
let amountSeq = 0

/**
 * 按当前的地址与券重新要一份金额。
 *
 * 地址是默认地址且没用券时直接用确认页那一份，不再发请求。没有地址时直接返回：
 * `/fare` 必须带 addrId，而这时页面本来就不可提交。
 */
async function refreshAmounts(): Promise<void> {
  const confirmData = data.value
  const addrId = selectedAddrId.value
  const couponId = selectedCouponId.value
  if (!confirmData || addrId === null) {
    return
  }
  if (addrId === confirmData.defaultAddrId && couponId === null) {
    fareResult.value = null
    return
  }

  const seq = ++amountSeq
  try {
    const result = await fetchFare(addrId, couponId)
    if (seq === amountSeq) {
      fareResult.value = result
    }
  } catch {
    if (seq !== amountSeq) {
      return
    }
    // 请求层已经弹过提示。分不清是地址还是券的问题，就一起退回基线：
    // 默认地址 + 不用券一定是能提交的组合，比让页面停在一个算不出来的金额上强
    selectedCouponId.value = null
    selectedAddrId.value = confirmData.defaultAddrId
    fareResult.value = null
  }
}

watch(selectedAddrId, (value) => {
  // 初次回填（含从 null 变成默认地址）时金额已经一起回填了，不必再查一次
  if (value !== null) {
    void refreshAmounts()
  }
})

watch(selectedCouponId, () => void refreshAmounts())

/** 当前生效的优惠金额，展示用。没用券时为 0 */
const couponAmount = computed(() => fareResult.value?.couponAmount ?? data.value?.couponAmount ?? 0)

/** 当前生效的运费，展示用 */
const freightAmount = computed(
  () => fareResult.value?.freightAmount ?? data.value?.freightAmount ?? 0,
)

/** 应付总额。提交时回传的就是它，只取后端给的值 */
const payAmount = computed(() => fareResult.value?.payAmount ?? data.value?.payAmount ?? 0)

/** 按商品拆分的运费：重算过用新的那份，否则用确认页给的那份 */
const fareItems = computed<FareItem[]>(
  () => fareResult.value?.fareItems ?? data.value?.fareItems ?? [],
)

/** 按商品拆分的优惠，与运费同一套取舍 */
const couponItems = computed<CouponItem[]>(
  () => fareResult.value?.couponItems ?? data.value?.couponItems ?? [],
)

/** skuId -> 该商品的运费。后端给的是数组，页面按行取值，这里转一次便于逐行查 */
const fareBySku = computed(() => new Map(fareItems.value.map((item) => [item.skuId, item.fare])))

/**
 * skuId -> 该商品分到的优惠。
 *
 * ⚠️ 优惠明细的行数不一定和运费一样：券只减适用范围内的商品，范围外的商品不在这里。
 *    所以按 skuId 查，查不到就是不减。
 */
const couponBySku = computed(
  () => new Map(couponItems.value.map((item) => [item.skuId, item.discountAmount])),
)

/** 取某个 SKU 的运费；后端没给这个 SKU 的明细时返回 null，行里就不显示运费 */
function fareOf(skuId: number): number | null {
  return fareBySku.value.get(skuId) ?? null
}

/** 取某个 SKU 分到的优惠；券不覆盖这个商品时返回 null */
function couponOf(skuId: number): number | null {
  return couponBySku.value.get(skuId) ?? null
}

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
      // 不用券时不传这个字段；传 null 会被后端当成参数绑定失败
      ...(selectedCouponId.value === null ? {} : { couponHistoryId: selectedCouponId.value }),
      remarks: remark === '' ? undefined : remark,
    })
    // 后端下单成功后会删掉整个购物车，本地 store 里的件数已经过期 —— 强制重拉一次，
    // 否则头部角标还挂着下单前的数字
    void cart.loadCart(true)
    await router.push({ name: 'pay', params: { orderSn: result.order.orderSn } })
  } catch {
    // 请求层已经弹过提示。这里直接重新拉确认页：最常见的失败是 17001（令牌失效）
    // 和 17002（价格变动），两者都需要一份新的令牌和金额才能重试。
    // 重拉会把选中的券清掉（确认页那一份是"不用券"的金额），这是有意的：
    // 价格变动很可能就是这张券引起的，带着它重试只会再失败一次
    selectedCouponId.value = null
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
