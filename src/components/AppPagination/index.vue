<template>
  <div class="pagination">
    <!--
      后端已经不返回 pageNavs 了，页码范围由 el-pagination 自己算。
      每页条数上限是 100（后端会校验 pageSize 在 1~100），所以档位只给这三档。
    -->
    <el-pagination
      :current-page="pageNum"
      :page-size="pageSize"
      :total="total"
      :page-sizes="PAGE_SIZES"
      layout="prev, pager, next, sizes"
      background
      hide-on-single-page
      @current-change="onPageChange"
      @size-change="onSizeChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ElPagination } from 'element-plus'

defineProps<{
  pageNum: number
  total: number
}>()

const emit = defineEmits<{
  'update:pageNum': [value: number]
  'update:pageSize': [value: number]
}>()

/** 后端限制 1~100，这三档够用 */
const PAGE_SIZES = [20, 40, 60]

/** 由父组件注入，避免 props 里再放一个只用于显示的字段 */
const pageSize = defineModel<number>('pageSize', { required: true })

function onPageChange(value: number): void {
  emit('update:pageNum', value)
}

function onSizeChange(value: number): void {
  pageSize.value = value
}
</script>

<style scoped>
.pagination {
  display: flex;
  justify-content: center;
  padding: 24px 0 0;
}
</style>
