<template>
  <div class="orders">
    <div v-if="loading && !page" class="orders__skeleton">
      <el-skeleton :rows="6" animated />
    </div>

    <EmptyState v-else-if="error" :description="error">
      <el-button type="primary" @click="execute">重新加载</el-button>
    </EmptyState>

    <EmptyState v-else-if="!page || page.list.length === 0" description="还没有订单">
      <el-button type="primary" @click="router.push({ name: 'home' })">去逛逛</el-button>
    </EmptyState>

    <template v-else>
      <OrderCard
        v-for="order in page.list"
        :key="order.orderSn"
        :order="order"
        :busy="busy"
        @pay="onPay"
        @cancel="onCancel"
      />

      <AppPagination
        v-model:page-size="pageSize"
        :page-num="pageNum"
        :total="page.totalCount"
        @update:page-num="onPageChange"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElButton, ElMessage, ElMessageBox, ElSkeleton } from 'element-plus'
import EmptyState from '@/components/EmptyState/index.vue'
import AppPagination from '@/components/AppPagination/index.vue'
import OrderCard from './com/OrderCard.vue'
import { cancelOrder, fetchOrderPage } from '@/api/order'
import { useAsyncData } from '@/composables/useAsyncData'

/**
 * 我的订单。
 *
 * 页码放 URL 里（和检索页同一个原则：列表状态以 URL 为准，刷新/前进后退都能复现），
 * 每页条数放局部 —— 它更像设备的显示偏好，不值得进 URL 和分享出去。
 *
 * ⚠️ 刻意没做状态筛选 tab：那需要前端维护一份"状态码 → 文案"的映射，
 *    而后端每个订单已经带了 statusText，再抄一份就是多一个会漂移的副本。
 *    后端接口本身支持 ?status=，真要加 tab 时补一个小的映射即可。
 */
const route = useRoute()
const router = useRouter()

/** 路由参数是 string，转成数字并挡掉非法值（用户可以直接改 URL） */
const pageNum = computed<number>(() => {
  const raw = route.query.pageNum
  const text = Array.isArray(raw) ? raw[0] : raw
  const parsed = Number(text)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
})

const pageSize = ref(20)
const busy = ref(false)

const {
  data: page,
  loading,
  error,
  execute,
} = useAsyncData(() => fetchOrderPage({ pageNum: pageNum.value, pageSize: pageSize.value }))

// 每页条数变了要回到第一页，否则可能停在一个不存在的页码上（改 URL 比直接 execute 多一次
// 跳转，但页码是 URL 驱动的，不这么写就会出现"URL 写着第 5 页、实际显示第 1 页"）
watch(pageSize, () => {
  if (pageNum.value !== 1) {
    void router.replace({ query: { ...route.query, pageNum: '1' } })
  }
})

watch([pageNum, pageSize], () => void execute(), { immediate: true })

function onPageChange(value: number): void {
  void router.replace({ query: { ...route.query, pageNum: String(value) } })
}

function onPay(orderSn: string): void {
  void router.push({ name: 'pay', params: { orderSn } })
}

async function onCancel(orderSn: string): Promise<void> {
  try {
    await ElMessageBox.confirm('取消后订单不可恢复，占用的库存会被释放。确定取消吗？', '取消订单', {
      confirmButtonText: '确定取消',
      cancelButtonText: '再想想',
      type: 'warning',
    })
  } catch {
    // 用户点了"再想想"，什么都不做
    return
  }

  busy.value = true
  try {
    await cancelOrder(orderSn)
    ElMessage.success('订单已取消')
    await execute()
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.orders {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 16px;
}

.orders__skeleton {
  padding: 20px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
}
</style>
