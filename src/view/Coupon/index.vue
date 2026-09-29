<template>
  <div class="coupons">
    <div class="coupons__tabs">
      <button
        v-for="item in TABS"
        :key="item.key"
        type="button"
        class="coupons__tab"
        :class="{ 'coupons__tab--on': item.key === tab }"
        @click="onTabChange(item.key)"
      >
        {{ item.label }}
      </button>
    </div>

    <!-- 券中心 -->
    <template v-if="tab === 'receivable'">
      <div v-if="receivableLoading && !receivables" class="coupons__skeleton">
        <el-skeleton :rows="4" animated />
      </div>

      <EmptyState v-else-if="receivableError" :description="receivableError">
        <el-button type="primary" @click="loadReceivable">重新加载</el-button>
      </EmptyState>

      <EmptyState
        v-else-if="!receivables || receivables.length === 0"
        description="暂时没有可领取的优惠券"
      />

      <template v-else>
        <CouponCard
          v-for="coupon in receivables"
          :key="coupon.couponId"
          :name="coupon.couponName"
          :amount="coupon.amount"
          :min-point="coupon.minPoint"
          :use-type="coupon.useType"
          :period-text="receivablePeriod(coupon)"
          :disabled="claimedOut(coupon)"
        >
          <template #action>
            <!-- 领满：只给结果，没有可点的东西 -->
            <span v-if="claimedOut(coupon)" class="coupons__status">
              已领 {{ coupon.perLimit }}/{{ coupon.perLimit }}
            </span>

            <!--
              领过但还有额度：把进度显示出来，按钮换成"再领一张"。
              与第一次那个"立即领取"明显不同 —— 同一张券不该有一个可以反复按的一模一样的按钮
            -->
            <div v-else-if="partiallyClaimed(coupon)" class="coupons__claimed">
              <span class="coupons__progress">
                已领 {{ coupon.receivedCount }}/{{ coupon.perLimit }}
              </span>
              <el-button
                size="small"
                :loading="receivingId === coupon.couponId"
                @click="onReceive(coupon)"
              >
                再领一张
              </el-button>
            </div>

            <!-- 从没领过 -->
            <el-button
              v-else
              type="primary"
              size="small"
              :loading="receivingId === coupon.couponId"
              @click="onReceive(coupon)"
            >
              立即领取
            </el-button>
          </template>
        </CouponCard>
      </template>
    </template>

    <!-- 我的券 -->
    <template v-else>
      <div class="coupons__filters">
        <button
          v-for="option in STATUS_OPTIONS"
          :key="String(option.value)"
          type="button"
          class="coupons__chip"
          :class="{ 'coupons__chip--on': option.value === useType }"
          @click="onStatusChange(option.value)"
        >
          {{ option.label }}
        </button>
      </div>

      <div v-if="mineLoading && !mine" class="coupons__skeleton">
        <el-skeleton :rows="4" animated />
      </div>

      <EmptyState v-else-if="mineError" :description="mineError">
        <el-button type="primary" @click="loadMine">重新加载</el-button>
      </EmptyState>

      <EmptyState v-else-if="!mine || mine.rows.length === 0" description="这里还没有券">
        <el-button type="primary" @click="onTabChange('receivable')">去领券</el-button>
      </EmptyState>

      <template v-else>
        <CouponCard
          v-for="coupon in mine.rows"
          :key="coupon.id"
          :name="coupon.couponName ?? '优惠券'"
          :amount="coupon.amount ?? 0"
          :min-point="coupon.minPoint ?? 0"
          :use-type="null"
          :period-text="minePeriod(coupon)"
          :disabled="coupon.useType !== UNUSED"
        >
          <template #action>
            <el-button
              v-if="coupon.useType === UNUSED"
              size="small"
              @click="router.push({ name: 'home' })"
            >
              去使用
            </el-button>
            <span v-else class="coupons__status">{{ coupon.useTypeText }}</span>
          </template>
        </CouponCard>

        <AppPagination
          v-model:page-size="pageSize"
          :page-num="pageNum"
          :total="mine.total"
          @update:page-num="onPageChange"
        />
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElButton, ElMessage, ElSkeleton } from 'element-plus'
import EmptyState from '@/components/EmptyState/index.vue'
import AppPagination from '@/components/AppPagination/index.vue'
import CouponCard from './com/CouponCard.vue'
import { fetchMyCoupons, fetchReceivableCoupons, receiveCoupon } from '@/api/coupon'
import { useAsyncData } from '@/composables/useAsyncData'
import type { CouponReceivable, CouponUseStatus, MyCoupon } from '@/type'

/**
 * 优惠券页：券中心与我的券两档。
 *
 * 只有 tab 进 URL —— 一页里同时放"可领取"和"我的券"两套列表，再把状态筛选和页码都塞进
 * URL 就是四五个查询参数，分享出去的链接也读不懂。状态筛选与页码属于查看偏好，放本地。
 *
 * 状态筛选给全 5 档而不是只给"未使用/已使用/已过期"三档：后端状态有 4 个值，
 * 少给一档会让"占用中"的券在这页里彻底看不见（它既不算未使用也不算已使用）。
 */
type TabKey = 'receivable' | 'mine'

const UNUSED: CouponUseStatus = 0

const TABS: { key: TabKey; label: string }[] = [
  { key: 'receivable', label: '可领取' },
  { key: 'mine', label: '我的券' },
]

/** value 为 null 表示不筛选。取值与后端 `CouponUseStatusEnum` 一一对应 */
const STATUS_OPTIONS: { value: CouponUseStatus | null; label: string }[] = [
  { value: null, label: '全部' },
  { value: 0, label: '未使用' },
  { value: 3, label: '占用中' },
  { value: 1, label: '已使用' },
  { value: 2, label: '已过期' },
]

const route = useRoute()
const router = useRouter()

/** 路由参数是 string，认不出的一律回到券中心 */
const tab = computed<TabKey>(() => (route.query.tab === 'mine' ? 'mine' : 'receivable'))

const useType = ref<CouponUseStatus | null>(null)
const pageNum = ref(1)
const pageSize = ref(20)
const receivingId = ref<number | null>(null)

const {
  data: receivables,
  loading: receivableLoading,
  error: receivableError,
  execute: loadReceivable,
} = useAsyncData(() => fetchReceivableCoupons())

const {
  data: mine,
  loading: mineLoading,
  error: mineError,
  execute: loadMine,
} = useAsyncData(() =>
  fetchMyCoupons({
    page: pageNum.value,
    limit: pageSize.value,
    // 不筛选时不能传 undefined 之外的占位值：后端按 useType 是否为 null 决定加不加条件
    ...(useType.value === null ? {} : { useType: useType.value }),
  }),
)

watch(
  [tab, useType, pageNum, pageSize],
  () => {
    if (tab.value === 'receivable') {
      void loadReceivable()
    } else {
      void loadMine()
    }
  },
  { immediate: true },
)

/** 日期是 `yyyy-MM-dd HH:mm:ss` 字符串，卡片上只留日期部分 */
function dayOf(text: string): string {
  return text.slice(0, 10)
}

function minePeriod(coupon: MyCoupon): string {
  if (coupon.couponStartTime === null || coupon.couponEndTime === null) {
    return ''
  }
  return `${dayOf(coupon.couponStartTime)} 至 ${dayOf(coupon.couponEndTime)}`
}

/**
 * 券中心卡片的有效期文案。
 *
 * 顺带把"每人限领 N 张"写出来：不写的话会员看不出这个按钮为什么还能再点，
 * 而"能反复点"正是这张卡片原本别扭的地方。`perLimit` 为 1 时不写 —— 没有信息量。
 */
function receivablePeriod(coupon: CouponReceivable): string {
  const period = `有效期至 ${dayOf(coupon.endTime)}`
  return coupon.perLimit > 1 ? `${period} · 每人限领 ${coupon.perLimit} 张` : period
}

/** 领满了：已达每人限领。卡片灰掉，动作区只显示结果 */
function claimedOut(coupon: CouponReceivable): boolean {
  return coupon.receivedCount >= coupon.perLimit
}

/** 领过但还有额度：动作区要显示进度并换一个按钮 */
function partiallyClaimed(coupon: CouponReceivable): boolean {
  return coupon.receivedCount > 0 && !claimedOut(coupon)
}

function onTabChange(value: TabKey): void {
  // 切档时状态筛选与页码都作废：它们属于上一档的列表
  useType.value = null
  pageNum.value = 1
  void router.replace({ query: value === 'mine' ? { tab: 'mine' } : {} })
}

function onStatusChange(value: CouponUseStatus | null): void {
  useType.value = value
  pageNum.value = 1
}

function onPageChange(value: number): void {
  pageNum.value = value
}

async function onReceive(coupon: CouponReceivable): Promise<void> {
  receivingId.value = coupon.couponId
  try {
    await receiveCoupon(coupon.couponId)
    ElMessage.success('领取成功')
    // 重拉而不是本地把 receivedCount 加一：剩余量是别人也在抢的共享数据，
    // 本地加一只会把"其实已经领完"这件事推迟到下一次点击才暴露
    await loadReceivable()
  } catch {
    // 请求层已经弹过提示（22006 不可领取 / 22007 已领完 / 22008 达限领）。
    // 重拉一次让按钮回到真实状态 —— 失败最常见的原因就是余量刚被别人抢光
    await loadReceivable()
  } finally {
    receivingId.value = null
  }
}
</script>

<style scoped>
.coupons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 16px;
}

.coupons__tabs {
  display: flex;
  gap: 8px;
}

.coupons__tab {
  padding: 8px 20px;
  font: inherit;
  font-size: 14px;
  color: var(--mall-text);
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-pill);
  cursor: pointer;
}

.coupons__tab:hover {
  border-color: var(--mall-primary);
}

.coupons__tab--on {
  color: var(--mall-primary);
  border-color: var(--mall-primary);
  background: var(--mall-primary-soft);
}

.coupons__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.coupons__chip {
  padding: 4px 14px;
  font: inherit;
  font-size: 13px;
  color: var(--mall-text-secondary);
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-pill);
  cursor: pointer;
}

.coupons__chip:hover {
  border-color: var(--mall-primary);
}

.coupons__chip--on {
  color: var(--mall-primary);
  border-color: var(--mall-primary);
  background: var(--mall-primary-soft);
}

.coupons__skeleton {
  padding: 20px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
}

.coupons__status {
  font-size: 13px;
  color: var(--mall-text-secondary);
}

/* 进度在按钮上方：动作区本来是一行，这里需要两行 */
.coupons__claimed {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.coupons__progress {
  font-size: 12px;
  color: var(--mall-primary);
  font-variant-numeric: tabular-nums;
}
</style>
