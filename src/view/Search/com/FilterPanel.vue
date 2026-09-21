<template>
  <aside class="panel">
    <div v-if="loading && !hasFacets" class="panel__loading">
      <el-skeleton :rows="10" animated />
    </div>

    <template v-else>
      <!-- 只在结果跨多个分类时才出现：只有一个候选时它没有筛选意义 -->
      <FilterGroup v-if="catalogs.length > 1" title="分类">
        <CatalogFilter
          :catalogs="catalogs"
          :selected="query.catalog3Id"
          @change="onCatalogChange"
        />
      </FilterGroup>

      <FilterGroup v-if="brands.length > 0" title="品牌">
        <BrandFilter :brands="brands" :selected="selectedBrandIds" @change="onBrandChange" />
      </FilterGroup>

      <FilterGroup v-for="attr in attrs" :key="attr.attrId" :title="attr.attrName">
        <AttrFilter
          :attr="attr"
          :selected="readAttrValues(query.attrs, attr.attrId)"
          @change="(values) => onAttrChange(attr.attrId, values)"
        />
      </FilterGroup>

      <FilterGroup title="价格">
        <PriceFilter :value="query.skuPrice" @change="onPriceChange" />
      </FilterGroup>
    </template>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElSkeleton } from 'element-plus'
import AttrFilter from './AttrFilter.vue'
import BrandFilter from './BrandFilter.vue'
import CatalogFilter from './CatalogFilter.vue'
import FilterGroup from './FilterGroup.vue'
import PriceFilter from './PriceFilter.vue'
import { readAttrValues, writeAttrValues } from '@/composables/useSearchQuery'
import type { AttrFacet, BrandFacet, CatalogFacet, SearchQuery } from '@/type'

const props = defineProps<{
  /** 当前检索条件（来自 URL） */
  query: SearchQuery
  brands: BrandFacet[]
  attrs: AttrFacet[]
  catalogs: CatalogFacet[]
  loading: boolean
}>()

const emit = defineEmits<{
  /** 提交一批新的查询条件，由页面写回 URL */
  change: [patch: Record<string, string | number | (string | number)[] | undefined>]
}>()

const hasFacets = computed(
  () => props.brands.length > 0 || props.attrs.length > 0 || props.catalogs.length > 0,
)

const selectedBrandIds = computed(() => props.query.brandId ?? [])

function onCatalogChange(catalogId: number | undefined): void {
  emit('change', { catalog3Id: catalogId })
}

function onBrandChange(brandIds: number[]): void {
  emit('change', { brandId: brandIds.length > 0 ? brandIds : undefined })
}

/**
 * 属性的读写都走 composable 里的纯函数：URL 里是 `属性id_属性值`，
 * 前缀切分那套逻辑收在一处，和视图解耦（也才测得了）。
 */
function onAttrChange(attrId: number, values: string[]): void {
  emit('change', { attrs: writeAttrValues(props.query.attrs, attrId, values) })
}

function onPriceChange(skuPrice: string | undefined): void {
  emit('change', { skuPrice })
}
</script>

<style scoped>
.panel {
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
  padding: 4px 16px 8px;
}

.panel__loading {
  padding: 12px 0;
}
</style>
