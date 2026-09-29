<template>
  <div class="coupon" :class="{ 'coupon--off': disabled }">
    <div class="coupon__left">
      <div class="coupon__amount"><span class="coupon__symbol">¥</span>{{ amountText }}</div>
      <div class="coupon__threshold">{{ thresholdText }}</div>
    </div>

    <div class="coupon__body">
      <div class="coupon__name">{{ name }}</div>
      <div class="coupon__scope">{{ scopeText }}</div>
      <div class="coupon__period">{{ periodText }}</div>
    </div>

    <!-- 动作区由使用方决定：券中心是"立即领取"，我的券是状态文案 -->
    <div class="coupon__action">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CouponUseType } from '@/type'

/**
 * 优惠券卡片，券中心和我的券共用。
 *
 * 纯展示 —— 两张列表的差别只在右上角那格，所以那格留给调用方插槽，
 * 不为它分成两个卡片组件（同一套版式抄两遍，改一次要改两处）。
 */
const props = defineProps<{
  name: string
  amount: number
  minPoint: number
  /** 适用范围；与"使用状态"同名不同义，别搞混 */
  useType: CouponUseType | null
  /** 展示用的有效期文案，由调用方按自己那份数据拼好 */
  periodText: string
  /** 置灰。已使用 / 已过期 / 已领取的券用得到 */
  disabled?: boolean
}>()

/** 面额去掉无意义的小数位：30.0000 显示成 30，30.5 保留成 30.5 */
const amountText = computed(() => {
  const text = props.amount.toFixed(2)
  return text.endsWith('.00') ? text.slice(0, -3) : text
})

/** 门槛为 0 是"无门槛"，直接写数字会让人以为是消费满 0 元 */
const thresholdText = computed(() =>
  props.minPoint > 0 ? `满 ${props.minPoint.toFixed(2)} 可用` : '无门槛',
)

const SCOPE_TEXT: Record<CouponUseType, string> = {
  0: '全场通用',
  1: '指定分类可用',
  2: '指定商品可用',
}

const scopeText = computed(() => (props.useType === null ? '' : SCOPE_TEXT[props.useType]))
</script>

<style scoped>
.coupon {
  display: grid;
  grid-template-columns: 108px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
}

/* 不可用的券仍然列出（已使用/已过期各占一档），靠降低对比度而不是隐藏 */
.coupon--off {
  opacity: 0.55;
}

.coupon__left {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding-right: 16px;
  border-right: 1px dashed var(--mall-border);
}

.coupon__amount {
  font-size: 26px;
  font-weight: 600;
  line-height: 1.1;
  color: var(--mall-primary);
  font-variant-numeric: tabular-nums;
}

.coupon__symbol {
  margin-right: 2px;
  font-size: 14px;
  font-weight: 400;
}

.coupon__threshold {
  font-size: 12px;
  color: var(--mall-text-secondary);
}

.coupon__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.coupon__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--mall-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coupon__scope,
.coupon__period {
  font-size: 12px;
  color: var(--mall-text-secondary);
}

.coupon__action {
  display: flex;
  align-items: center;
}
</style>
