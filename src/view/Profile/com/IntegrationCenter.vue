<template>
  <div class="integration">
    <section class="integration__card">
      <h2 class="integration__title">我的积分</h2>

      <p class="integration__balance">
        <span class="integration__value">{{ balance ?? '—' }}</span>
        <span class="integration__unit">积分</span>
      </p>

      <p class="integration__hint">
        结算页可以用积分抵扣应付款；订单支付成功后按商品金额赠送积分；订单取消或超时关闭时，
        已经抵扣掉的积分会退回。
      </p>
    </section>

    <section class="integration__card">
      <h2 class="integration__title">积分明细</h2>

      <el-skeleton v-if="loading && !page" :rows="5" animated />

      <EmptyState v-else-if="error" :description="error">
        <el-button type="primary" @click="reloadAll">重新加载</el-button>
      </EmptyState>

      <EmptyState v-else-if="!page || page.rows.length === 0" description="还没有积分变动记录" />

      <template v-else>
        <div class="integration__head">
          <span class="integration__time">时间</span>
          <span class="integration__type">类型</span>
          <span class="integration__order">来源订单</span>
          <span class="integration__change">变动</span>
        </div>

        <div v-for="row in page.rows" :key="row.id" class="integration__row">
          <span class="integration__time">{{ row.createTime }}</span>
          <span class="integration__type">{{ row.changeTypeText || '其他变动' }}</span>
          <span class="integration__order">{{ row.orderSn || '—' }}</span>
          <span
            class="integration__change"
            :class="row.changeCount >= 0 ? 'integration__change--up' : 'integration__change--down'"
          >
            {{ row.changeCount >= 0 ? '+' : '' }}{{ row.changeCount }}
          </span>
        </div>

        <AppPagination
          v-model:page-size="pageSize"
          :page-num="pageNum"
          :total="page.total"
          @update:page-num="onPageChange"
        />
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElButton, ElSkeleton } from 'element-plus'
import AppPagination from '@/components/AppPagination/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'
import { fetchIntegrationBalance, fetchIntegrationHistoryPage } from '@/api/member'
import { useAsyncData } from '@/composables/useAsyncData'

/**
 * 我的积分：余额 + 变动明细。
 *
 * 只看得到自己的 —— 会员 id 由后端从网关注入的 X-Member-Claims 取，接口不接受前端传。
 *
 * 页码放 URL 里（和订单列表、登录记录同一个原则），每页条数放局部。
 * 余额与明细是两个独立请求：明细的分页失败不该让余额跟着显示不出来。
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

const { data: balance, execute: loadBalance } = useAsyncData(() => fetchIntegrationBalance())

const {
  data: page,
  loading,
  error,
  execute,
} = useAsyncData(() => fetchIntegrationHistoryPage({ page: pageNum.value, limit: pageSize.value }))

// useAsyncData 不会自己发请求，两个数据源各自要显式触发一次。
// 余额不随分页变，进页面拉一次就够；明细跟着页码走，交给下面那个 watch
onMounted(() => void loadBalance())

// 每页条数变了要回第一页，否则可能停在一个不存在的页码上
watch(pageSize, () => {
  if (pageNum.value !== 1) {
    void router.replace({ query: { ...route.query, pageNum: '1' } })
  }
})

watch([pageNum, pageSize], () => void execute(), { immediate: true })

function onPageChange(value: number): void {
  void router.replace({ query: { ...route.query, pageNum: String(value) } })
}

/** 重试要把页面上两个数据源都拉一遍：只重试明细的话，余额那半截还是空的 */
function reloadAll(): void {
  void loadBalance()
  void execute()
}
</script>

<style scoped>
.integration {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.integration__card {
  padding: 20px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
}

.integration__title {
  margin: 0 0 16px;
  font-size: 15px;
  font-weight: 600;
  color: var(--mall-text);
}

.integration__balance {
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.integration__value {
  font-size: 32px;
  font-weight: 600;
  color: var(--mall-primary);
  font-variant-numeric: tabular-nums;
}

.integration__unit {
  font-size: 13px;
  color: var(--mall-text-secondary);
}

.integration__hint {
  margin: 12px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--mall-text-secondary);
}

.integration__head,
.integration__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
}

.integration__head {
  font-size: 12px;
  color: var(--mall-text-weak);
  border-bottom: 1px solid var(--mall-border);
}

.integration__row {
  font-size: 13px;
  color: var(--mall-text);
  border-bottom: 1px solid var(--mall-border);
}

.integration__row:last-of-type {
  border-bottom: none;
}

.integration__time {
  flex: 0 0 180px;
}

.integration__type {
  flex: 0 0 100px;
}

.integration__order {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.integration__change {
  flex: 0 0 90px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* 增加与减少用两个方向区分：明细里两者混在一起，只差一个符号很难扫 */
.integration__change--up {
  color: var(--mall-primary);
}

.integration__change--down {
  color: var(--mall-text-secondary);
}
</style>
