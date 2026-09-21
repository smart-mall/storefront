<template>
  <div class="sort-bar">
    <el-radio-group :model-value="sort" size="small" @change="onSortChange">
      <el-radio-button :value="undefined">综合</el-radio-button>
      <el-radio-button value="skuPrice_asc">价格 ↑</el-radio-button>
      <el-radio-button value="skuPrice_desc">价格 ↓</el-radio-button>
      <el-radio-button value="saleCount_desc">销量</el-radio-button>
    </el-radio-group>

    <el-checkbox
      v-if="showStockFilter"
      :model-value="hasStock === 1"
      class="sort-bar__stock"
      @change="onStockChange"
    >
      只看有货
    </el-checkbox>

    <span v-if="total !== undefined" class="sort-bar__total">共 {{ total }} 件</span>
  </div>
</template>

<script setup lang="ts">
import { ElCheckbox, ElRadioButton, ElRadioGroup } from 'element-plus'
import type { SearchSort, StockFilter } from '@/type'

withDefaults(
  defineProps<{
    /** 当前排序；undefined 表示「综合」 */
    sort?: SearchSort
    /** 只看有货：1 = 只看有货，0 或不传 = 不限 */
    hasStock?: StockFilter
    total?: number
    /** 首页不显示「只看有货」，检索页才显示 */
    showStockFilter?: boolean
  }>(),
  { sort: undefined, hasStock: undefined, total: undefined, showStockFilter: false },
)

const emit = defineEmits<{
  'update:sort': [value: SearchSort | undefined]
  'update:hasStock': [value: StockFilter | undefined]
}>()

function onSortChange(value: string | number | boolean | undefined): void {
  // el-radio-group 的 change 值类型很宽，这里收窄成我们自己的联合类型。
  // 「综合」那一项的 value 是 undefined，会走到第一个分支
  emit('update:sort', typeof value === 'string' ? (value as SearchSort) : undefined)
}

function onStockChange(checked: string | number | boolean): void {
  emit('update:hasStock', checked ? 1 : undefined)
}
</script>

<style scoped>
.sort-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
  font-size: 14px;
}

.sort-bar__stock {
  margin-left: 8px;
}

.sort-bar__total {
  margin-left: auto;
  color: var(--mall-text-secondary);
  font-size: 13px;
}
</style>
