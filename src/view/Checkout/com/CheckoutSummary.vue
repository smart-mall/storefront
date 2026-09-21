<template>
  <div class="summary">
    <div class="summary__left">
      <span class="summary__label">支付方式</span>
      <button
        v-for="option in PAY_OPTIONS"
        :key="option.value"
        type="button"
        class="summary__pay"
        :class="{ 'summary__pay--on': option.value === payType }"
        :disabled="submitting"
        @click="emit('update:payType', option.value)"
      >
        {{ option.label }}
      </button>
    </div>

    <div class="summary__right">
      <span v-if="outOfStock" class="summary__warn">有商品缺货，无法提交</span>
      <span v-else-if="addressMissing" class="summary__warn">请先选择收货地址</span>

      <dl class="summary__amounts">
        <div class="summary__line">
          <dt>商品总额</dt>
          <dd>¥{{ totalAmount.toFixed(2) }}</dd>
        </div>
        <div class="summary__line">
          <dt>运费</dt>
          <dd>¥{{ freightAmount.toFixed(2) }}</dd>
        </div>
        <div class="summary__line summary__line--total">
          <dt>{{ count }} 件商品，应付</dt>
          <dd>¥{{ payAmount.toFixed(2) }}</dd>
        </div>
      </dl>

      <el-button
        type="primary"
        size="large"
        :loading="submitting"
        :disabled="!canSubmit"
        @click="emit('submit')"
      >
        提交订单
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElButton } from 'element-plus'
import type { PayType } from '@/type'

/**
 * 结算页底部汇总条。纯展示 + 上抛事件：
 * 金额全部来自后端（含运费），这里只负责显示和在提交时原样回传给页面。
 */
defineProps<{
  totalAmount: number
  freightAmount: number
  /** 应付总额，提交时回传的就是它 */
  payAmount: number
  count: number
  payType: PayType
  submitting: boolean
  canSubmit: boolean
  outOfStock: boolean
  addressMissing: boolean
}>()

const emit = defineEmits<{
  'update:payType': [value: PayType]
  submit: []
}>()

/**
 * 用普通按钮而不是 el-radio：Element Plus 2.6 起 radio 的绑定属性从 `label` 换成了
 * `value`（`label` 变成显示文案），两个版本写法不兼容。这里只有二选一，
 * 不值得为它去踩那个变更。
 */
const PAY_OPTIONS: { value: PayType; label: string }[] = [
  { value: 1, label: '支付宝' },
  { value: 2, label: '微信' },
]
</script>

<style scoped>
.summary {
  position: sticky;
  bottom: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 16px 20px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
  box-shadow: var(--mall-shadow-hover);
}

.summary__left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.summary__label {
  font-size: 13px;
  color: var(--mall-text-secondary);
}

.summary__pay {
  padding: 6px 16px;
  font: inherit;
  font-size: 13px;
  color: var(--mall-text);
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: 8px;
  cursor: pointer;
}

.summary__pay:hover:not(:disabled) {
  border-color: var(--mall-primary);
}

.summary__pay--on {
  color: var(--mall-primary);
  border-color: var(--mall-primary);
  background: var(--mall-primary-soft);
}

.summary__pay:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.summary__right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.summary__warn {
  font-size: 13px;
  color: var(--mall-primary);
}

.summary__amounts {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary__line {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  font-size: 13px;
  color: var(--mall-text-secondary);
}

.summary__line dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.summary__line--total {
  font-size: 14px;
  color: var(--mall-text);
}

.summary__line--total dd {
  color: var(--mall-primary);
  font-size: 20px;
  font-weight: 600;
}
</style>
