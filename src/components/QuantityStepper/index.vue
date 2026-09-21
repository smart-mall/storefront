<template>
  <div class="stepper">
    <span v-if="label" class="stepper__label">{{ label }}</span>
    <el-input-number
      v-model="quantity"
      :min="MIN"
      :max="max"
      :disabled="disabled"
      size="small"
      controls-position="right"
      @change="onChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ElInputNumber } from 'element-plus'

/**
 * 数量选择。用 el-input-number 而不是手写加减按钮：它自带边界、
 * 键盘输入校验和非数字回落，手写这几个都要自己处理。
 *
 * 商品详情页和购物车行都在用，所以放在 components/ 而不是某个 view 的 com/ 下。
 *
 * ⚠️ 同时暴露 `v-model`（每次变化）和 `change`（提交时）两个口子，用法要挑对：
 *    - 详情页只是本地攒一个数量、提交时再发给后端 → 用 v-model 最省事；
 *    - 购物车行每改一次都要发请求，必须用 `change`。用 v-model 的话，
 *      输入 "12" 会先发一个 1 再发一个 12，白白多一次请求。
 */

withDefaults(
  defineProps<{
    /** 上限。秒杀商品有每人限购数时传 seckillLimit */
    max?: number
    /** 左侧文案。传空字符串则不显示（购物车行里表头已经写了"数量"） */
    label?: string
    disabled?: boolean
  }>(),
  { max: 99, label: '数量', disabled: false },
)

const emit = defineEmits<{ change: [value: number] }>()

const quantity = defineModel<number>({ default: 1 })

const MIN = 1

/**
 * el-input-number 的 change 会在提交时给一个 number；清空输入框时给 undefined，
 * 那种情况不发出去 —— 让输入框停在上一个有效值，等用户重新输入。
 */
function onChange(value: number | undefined): void {
  if (typeof value === 'number') {
    emit('change', value)
  }
}
</script>

<style scoped>
.stepper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stepper__label {
  font-size: 13px;
  color: var(--mall-text-secondary);
}
</style>
