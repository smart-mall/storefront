<template>
  <div class="home">
    <aside class="home__aside">
      <CategorySidebar />
    </aside>

    <section class="home__main">
      <!-- 秒杀栏：没有正在进行的场次时它自己整块不渲染，不会留空位 -->
      <SeckillStrip />

      <div class="home__head">
        <h2 class="home__title">热门商品</h2>
        <SortBar :sort="query.sort" :total="data?.total" @update:sort="onSortChange" />
      </div>

      <ProductGrid :products="data?.product ?? []" :loading="loading" :skeleton-count="pageSize" />

      <AppPagination
        v-if="data && data.total > 0"
        v-model:page-size="pageSizeModel"
        :page-num="pageNum"
        :total="data.total"
        @update:page-num="onPageChange"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import AppPagination from '@/components/AppPagination/index.vue'
import ProductGrid from '@/components/ProductGrid/index.vue'
import SortBar from '@/components/SortBar/index.vue'
import CategorySidebar from './com/CategorySidebar.vue'
import SeckillStrip from './com/SeckillStrip.vue'
import { searchSkus } from '@/api/search'
import { useAsyncData } from '@/composables/useAsyncData'
import { readPaging, useSearchQuery } from '@/composables/useSearchQuery'
import type { SearchSort } from '@/type'

const { query, setParams } = useSearchQuery()

const paging = computed(() => readPaging(query.value))
const pageNum = computed(() => paging.value.pageNum)
const pageSize = computed(() => paging.value.pageSize)

/** el-pagination 要点 :page-size，但真相在 URL，所以转一层写回去 */
const pageSizeModel = computed({
  get: () => pageSize.value,
  set: (value: number) => setParams({ pageSize: value }),
})

// 首页没有"推荐"接口，用热度排序顶替：这就是一次不带筛选条件的检索
const { data, loading, execute } = useAsyncData(() =>
  searchSkus({
    ...query.value,
    sort: query.value.sort ?? 'hotScore_desc',
    pageNum: pageNum.value,
    pageSize: pageSize.value,
  }),
)

// URL 一变就重新请求。immediate 顺带承担了首屏加载
watch(query, () => void execute(), { immediate: true })

function onSortChange(sort: SearchSort | undefined): void {
  setParams({ sort })
}

function onPageChange(value: number): void {
  // 显式传 pageNum，setParams 才不会把页码重置回 1
  setParams({ pageNum: value })
}
</script>

<style scoped>
.home {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 16px;
  align-items: start;
  padding-top: 16px;
}

.home__aside {
  position: sticky;
  top: calc(var(--mall-header-height) + 16px);
}

.home__main {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.home__head {
  display: flex;
  align-items: center;
  gap: 16px;
}

.home__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--mall-text);
  white-space: nowrap;
}

.home__head :deep(.sort-bar) {
  flex: 1;
}
</style>
