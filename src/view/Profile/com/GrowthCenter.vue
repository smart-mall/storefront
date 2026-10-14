<template>
  <div class="growth">
    <section class="growth__card">
      <h2 class="growth__title">我的成长值</h2>

      <p class="growth__level">{{ snapshot?.levelName ?? '暂无等级' }}</p>

      <p class="growth__total">
        <span class="growth__value">{{ snapshot ? snapshot.growth : '—' }}</span>
        <span class="growth__unit">成长值</span>
      </p>

      <p class="growth__progress">{{ progressText }}</p>

      <p class="growth__hint">
        订单支付成功后按商品金额赠送成长值，评价成功后也会赠送；成长值累计到门槛就升级，等级只升不降。
        等级决定你能领取哪些限定了会员等级的优惠券。
      </p>
    </section>

    <section class="growth__card">
      <h2 class="growth__title">成长值明细</h2>

      <el-skeleton v-if="loading && !page" :rows="5" animated />

      <EmptyState v-else-if="error" :description="error">
        <el-button type="primary" @click="reloadAll">重新加载</el-button>
      </EmptyState>

      <EmptyState v-else-if="!page || page.rows.length === 0" description="还没有成长值变动记录" />

      <template v-else>
        <div class="growth__head">
          <span class="growth__time">时间</span>
          <span class="growth__type">类型</span>
          <span class="growth__order">来源订单</span>
          <span class="growth__change">成长值</span>
        </div>

        <div v-for="row in page.rows" :key="row.id" class="growth__row">
          <span class="growth__time">{{ row.createTime }}</span>
          <span class="growth__type">{{ row.changeTypeText || '其他变动' }}</span>
          <span class="growth__order">{{ row.orderSn || '—' }}</span>
          <span class="growth__change">+{{ row.changeCount }}</span>
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
import { fetchGrowthHistoryPage, fetchGrowthSnapshot } from '@/api/member'
import { useAsyncData } from '@/composables/useAsyncData'

/**
 * 我的成长值：当前等级与成长值，以及变动明细。
 *
 * 只看得到自己的 —— 会员 id 由后端从网关注入的 X-Member-Claims 取，接口不接受前端传。
 *
 * 页码放 URL 里（和订单列表、登录记录同一个原则），每页条数放局部。
 * 等级与明细是两个独立请求：明细的分页失败不该让等级跟着显示不出来。
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

const { data: snapshot, execute: loadSnapshot } = useAsyncData(() => fetchGrowthSnapshot())

const {
  data: page,
  loading,
  error,
  execute,
} = useAsyncData(() => fetchGrowthHistoryPage({ page: pageNum.value, limit: pageSize.value }))

// useAsyncData 不会自己发请求，两个数据源各自要显式触发一次。
// 等级不随分页变，进页面拉一次就够；明细跟着页码走，交给下面那个 watch
onMounted(() => void loadSnapshot())

/**
 * 离下一级还差多少。
 *
 * 成长值已经够到下一级的门槛却还没升级时（等级只在成长值变动那一刻重算），差值会算成负数，
 * 这里按 0 显示，不把负数摆到页面上。
 */
const progressText = computed(() => {
  const data = snapshot.value
  if (!data) {
    return '正在加载等级信息'
  }
  if (data.nextGrowthPoint == null) {
    return '已经是最高等级'
  }
  const remaining = Math.max(0, data.nextGrowthPoint - data.growth)
  return `距${data.nextLevelName}还差 ${remaining} 成长值`
})

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

/** 重试要把页面上两个数据源都拉一遍：只重试明细的话，等级那半截还是空的 */
function reloadAll(): void {
  void loadSnapshot()
  void execute()
}
</script>

<style scoped>
.growth {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.growth__card {
  padding: 20px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
}

.growth__title {
  margin: 0 0 16px;
  font-size: 15px;
  font-weight: 600;
  color: var(--mall-text);
}

.growth__level {
  display: inline-block;
  margin: 0;
  padding: 3px 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--mall-primary);
  background: var(--mall-primary-soft);
  border-radius: 999px;
}

.growth__total {
  margin: 12px 0 0;
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.growth__value {
  font-size: 32px;
  font-weight: 600;
  color: var(--mall-primary);
  font-variant-numeric: tabular-nums;
}

.growth__unit {
  font-size: 13px;
  color: var(--mall-text-secondary);
}

.growth__progress {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--mall-text);
}

.growth__hint {
  margin: 12px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--mall-text-secondary);
}

.growth__head,
.growth__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
}

.growth__head {
  font-size: 12px;
  color: var(--mall-text-weak);
  border-bottom: 1px solid var(--mall-border);
}

.growth__row {
  font-size: 13px;
  color: var(--mall-text);
  border-bottom: 1px solid var(--mall-border);
}

.growth__row:last-of-type {
  border-bottom: none;
}

.growth__time {
  flex: 0 0 180px;
}

.growth__type {
  flex: 0 0 100px;
}

.growth__order {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 成长值只有增加，符号统一是加号，配色也就不需要两个方向 */
.growth__change {
  flex: 0 0 90px;
  text-align: right;
  color: var(--mall-primary);
  font-variant-numeric: tabular-nums;
}
</style>
