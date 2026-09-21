<template>
  <el-checkbox-group :model-value="selected" class="brand" @change="onChange">
    <el-checkbox v-for="brand in brands" :key="brand.brandId" :value="brand.brandId">
      {{ brand.brandName }}
    </el-checkbox>
  </el-checkbox-group>
</template>

<script setup lang="ts">
import { ElCheckbox, ElCheckboxGroup } from 'element-plus'
import type { BrandFacet } from '@/type'

defineProps<{
  /** 品牌候选。后端保证候选不会被自己的筛选条件收窄，所以勾选后还能改选别的 */
  brands: BrandFacet[]
  /** 已选品牌 id */
  selected: number[]
}>()

const emit = defineEmits<{ change: [value: number[]] }>()

function onChange(value: (string | number | boolean)[]): void {
  emit('change', value.map(Number))
}
</script>

<style scoped>
.brand {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>
