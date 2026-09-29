<template>
  <section class="picker">
    <h2 class="picker__title">优惠券</h2>

    <p v-if="coupons.length === 0" class="picker__empty">当前没有可用的优惠券</p>

    <div v-else class="picker__list">
      <button
        type="button"
        class="picker__row"
        :class="{ 'picker__row--on': modelValue === null }"
        :disabled="disabled"
        @click="emit('update:modelValue', null)"
      >
        <span class="picker__name">不使用优惠券</span>
      </button>

      <button
        v-for="coupon in coupons"
        :key="coupon.couponHistoryId"
        type="button"
        class="picker__row"
        :class="{ 'picker__row--on': coupon.couponHistoryId === modelValue }"
        :disabled="disabled"
        @click="emit('update:modelValue', coupon.couponHistoryId)"
      >
        <span class="picker__name">{{ coupon.couponName }}</span>
        <span class="picker__condition">{{ conditionText(coupon.minPoint) }}</span>
        <span class="picker__save">−¥{{ coupon.discountAmount.toFixed(2) }}</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { CouponUsable } from '@/type'

/**
 * 结算页的选券入口。
 *
 * 列表里的券都是后端按当前购物车筛过的（"可用券"），所以这里不做任何可用性判断 ——
 * 前端再判一次等于把后端的匹配规则抄一份，两边迟早分叉。
 *
 * 抵扣额只显示不参与计算：选中后由页面重新向后端要金额。
 */
defineProps<{
  /** 当前购物车可用的券，由结算页从确认页数据里取 */
  coupons: CouponUsable[]
  /** 选中的领取记录 ID；null 表示不用券 */
  modelValue: number | null
  disabled: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

function conditionText(minPoint: number): string {
  return minPoint > 0 ? `满 ${minPoint.toFixed(2)} 可用` : '无门槛'
}
</script>

<style scoped>
.picker {
  padding: 20px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
}

.picker__title {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 600;
  color: var(--mall-text);
}

.picker__empty {
  margin: 0;
  font-size: 13px;
  color: var(--mall-text-secondary);
}

.picker__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.picker__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  font: inherit;
  font-size: 13px;
  text-align: left;
  color: var(--mall-text);
  background: var(--mall-bg);
  border: 1px solid var(--mall-border);
  border-radius: 8px;
  cursor: pointer;
}

.picker__row:hover:not(:disabled) {
  border-color: var(--mall-primary);
}

.picker__row--on {
  border-color: var(--mall-primary);
  background: var(--mall-primary-soft);
}

.picker__row:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.picker__name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker__condition {
  color: var(--mall-text-secondary);
}

.picker__save {
  color: var(--mall-primary);
  font-variant-numeric: tabular-nums;
}
</style>
