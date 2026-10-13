<template>
  <section class="picker">
    <h2 class="picker__title">积分抵扣</h2>

    <p v-if="limit === 0" class="picker__empty">{{ emptyText }}</p>

    <div v-else class="picker__body">
      <el-checkbox
        :model-value="modelValue !== null"
        :disabled="disabled"
        @update:model-value="onToggle"
      >
        使用积分
      </el-checkbox>

      <div v-if="modelValue !== null" class="picker__control">
        <el-input-number
          :model-value="modelValue"
          :min="1"
          :max="limit"
          :step="100"
          :disabled="disabled"
          controls-position="right"
          @update:model-value="onPointsChange"
        />
        <el-button
          link
          type="primary"
          :disabled="disabled"
          @click="emit('update:modelValue', limit)"
        >
          全部使用
        </el-button>
      </div>

      <p class="picker__hint">当前可用 {{ balance }} 积分，本单最多可用 {{ limit }} 积分</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElButton, ElCheckbox, ElInputNumber } from 'element-plus'

/**
 * 结算页的积分抵扣入口。
 *
 * 上限由后端给（封顶按券后金额算，换券会变小），页面不自己算能抵多少钱 ——
 * 选中数量后由页面重新向后端要金额，"100 积分抵 1 元"这条规则只存在于后端一处。
 */
const props = defineProps<{
  /** 使用的积分数量；null 表示不用积分 */
  modelValue: number | null
  /** 会员当前积分余额 */
  balance: number
  /** 本单最多可用的积分数；为 0 表示本单用不了积分 */
  limit: number
  disabled: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

/**
 * 勾上就默认用满：会员点"使用积分"的意图通常就是能抵多少抵多少，想少用再自己调。
 *
 * 参数类型写成 unknown 再判真假，是为了不依赖 Element Plus 那一版 checkbox 事件的具体类型。
 */
function onToggle(value: unknown): void {
  emit('update:modelValue', value ? props.limit : null)
}

/** el-input-number 被清空时会给出 undefined，统一收敛成"不用积分" */
function onPointsChange(value: number | undefined): void {
  emit('update:modelValue', value ?? null)
}

/** 上限为 0 有两种原因，文案要分开：没积分，还是这单太小抵不了 */
const emptyText = computed(() => (props.balance > 0 ? '本单可抵金额不足 1 分' : '暂无可用积分'))
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

.picker__body {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.picker__control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.picker__hint {
  margin: 0;
  font-size: 13px;
  color: var(--mall-text-secondary);
}
</style>
