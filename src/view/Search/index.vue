<template>
  <div class="search">
    <aside class="search__aside">
      <FilterPanel
        :query="query"
        :brands="data?.brands ?? []"
        :attrs="data?.attrs ?? []"
        :catalogs="data?.catalogs ?? []"
        :loading="loading"
        @change="setParams"
      />
    </aside>

    <section class="search__main">
      <FilterChips :chips="chips" @remove="removeChip" @clear="reset" />

      <SortBar
        :sort="query.sort"
        :has-stock="query.hasStock"
        :total="data?.total"
        show-stock-filter
        @update:sort="(value) => setParams({ sort: value })"
        @update:has-stock="(value) => setParams({ hasStock: value })"
      />

      <ProductGrid :products="data?.product ?? []" :loading="loading" :skeleton-count="pageSize">
        <template #empty-action>
          <el-button v-if="hasAnyCondition" @click="reset()">清空全部条件</el-button>
        </template>
      </ProductGrid>

      <AppPagination
        v-if="data && data.total > 0"
        v-model:page-size="pageSizeModel"
        :page-num="pageNum"
        :total="data.total"
        @update:page-num="(value) => setParams({ pageNum: value })"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { ElButton } from 'element-plus'
import AppPagination from '@/components/AppPagination/index.vue'
import ProductGrid from '@/components/ProductGrid/index.vue'
import SortBar from '@/components/SortBar/index.vue'
import FilterChips from './com/FilterChips.vue'
import FilterPanel from './com/FilterPanel.vue'
import { searchSkus } from '@/api/search'
import { useAsyncData } from '@/composables/useAsyncData'
import { readPaging, useSearchQuery } from '@/composables/useSearchQuery'
import type { FilterChip } from '@/type'

/**
 * 这个页面不持有任何筛选条件：条件全在 URL 里，组件只负责
 * 「读 query → 请求 → 渲染」和「用户操作 → 改 URL」。
 * 所以刷新、后退、分享链接都不需要额外代码。
 */
const { query, setParams, removeChip, reset } = useSearchQuery()

const paging = computed(() => readPaging(query.value))
const pageNum = computed(() => paging.value.pageNum)
const pageSize = computed(() => paging.value.pageSize)

const pageSizeModel = computed({
  get: () => pageSize.value,
  set: (value: number) => setParams({ pageSize: value }),
})

const { data, loading, execute } = useAsyncData(() =>
  searchSkus({ ...query.value, pageNum: pageNum.value, pageSize: pageSize.value }),
)

// URL 一变就重新请求；immediate 顺带承担首屏加载
watch(query, () => void execute(), { immediate: true })

/**
 * 已选条件。
 *
 * 分类/品牌/属性三条用后端返回的 `navs`（名字由后端从聚合候选里反查，省得前端再拼一次）；
 * 关键词后端不给，前端自己补一条。
 *
 * 注意 `navs` 跟着**响应**走，所以筛选条件刚变、请求还没回来时，chips 会比复选框晚一拍。
 * 这一拍内 `data` 还是上一次的结果，属于可接受的范围；要完全同步就得前端自己从 URL
 * 重建一套命名逻辑，和 `navs` 重复。
 */
const chips = computed<FilterChip[]>(() => {
  const keyword = query.value.keyword
  const own: FilterChip[] = keyword
    ? [{ navName: '关键词', navValue: keyword, removeKey: 'keyword', removeValue: keyword }]
    : []
  return [...own, ...(data.value?.navs ?? [])]
})

/** 空结果时要不要给"清空全部条件"：没条件还清空就没意义了 */
const hasAnyCondition = computed(() => {
  const q = query.value
  return Boolean(
    q.keyword ||
    q.catalog3Id ||
    q.skuPrice ||
    q.sort ||
    q.hasStock !== undefined ||
    (q.brandId?.length ?? 0) > 0 ||
    (q.attrs?.length ?? 0) > 0,
  )
})
</script>

<style scoped>
.search {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 16px;
  align-items: start;
  padding-top: 16px;
}

/* 筛选面板可能比视口还高（属性多的时候），所以不做 sticky */
.search__aside {
  min-width: 0;
}

.search__main {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
</style>
