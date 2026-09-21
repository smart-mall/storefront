<template>
  <div class="stepper">
    <span class="stepper__label">数量</span>
    <el-input-number
      v-model="quantity"
      :min="MIN"
      :max="max"
      size="small"
      controls-position="right"
    />
  </div>
</template>

<script setup lang="ts">
import { ElInputNumber } from 'element-plus'

/**
 * 数量选择。用 el-input-number 而不是手写加减按钮：它自带边界、
 * 键盘输入校验和非数字回落，手写这几个都要自己处理。
 *
 * ⚠️ 目前这个数量还没接任何地方 —— 购物车接口尚未 JSON 化，
 *    「加入购物车」是占位按钮。cart 落地后直接把 quantity 传给它即可。
 */
withDefaults(
  defineProps<{
    /** 上限。秒杀商品有每人限购数时传 seckillLimit */
    max?: number
  }>(),
  { max: 99 },
)

const quantity = defineModel<number>({ default: 1 })

const MIN = 1
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
