<template>
  <div v-if="loading" class="grid">
    <div v-for="n in skeletonCount" :key="n" class="grid__skeleton">
      <el-skeleton animated>
        <template #template>
          <el-skeleton-item variant="image" class="grid__skeleton-img" />
          <div class="grid__skeleton-body">
            <el-skeleton-item variant="text" />
            <el-skeleton-item variant="text" style="width: 40%" />
          </div>
        </template>
      </el-skeleton>
    </div>
  </div>

  <EmptyState v-else-if="products.length === 0" description="没有找到符合条件的商品">
    <slot name="empty-action" />
  </EmptyState>

  <div v-else class="grid">
    <ProductCard v-for="sku in products" :key="sku.skuId" :sku="sku" />
  </div>
</template>

<script setup lang="ts">
import { ElSkeleton, ElSkeletonItem } from 'element-plus'
import EmptyState from '@/components/EmptyState/index.vue'
import ProductCard from '@/components/ProductCard/index.vue'
import type { SkuSummary } from '@/type'

withDefaults(
  defineProps<{
    products: SkuSummary[]
    loading?: boolean
    /** 骨架屏个数，取当前每页条数更贴近真实布局 */
    skeletonCount?: number
  }>(),
  { loading: false, skeletonCount: 10 },
)
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.grid__skeleton {
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
  overflow: hidden;
}

.grid__skeleton-img {
  width: 100%;
  height: 0;
  padding-bottom: 100%;
}

.grid__skeleton-body {
  padding: 10px 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
