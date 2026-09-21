<template>
  <div class="catalog">
    <span
      v-for="item in catalogs"
      :key="item.catalogId"
      class="catalog__item"
      :class="{ 'is-active': selected === item.catalogId }"
      @click="toggle(item.catalogId)"
    >
      {{ item.catalogName }}
    </span>
  </div>
</template>

<script setup lang="ts">
import type { CatalogFacet } from '@/type'

const props = defineProps<{
  /** 当前结果集涉及到的分类（后端聚合出来的候选） */
  catalogs: CatalogFacet[]
  /** 已选中的分类 id */
  selected?: number
}>()

const emit = defineEmits<{ change: [value: number | undefined] }>()

/** 再点一次取消。没有这个的话用户只能去 chips 那里才能取消，多一步 */
function toggle(catalogId: number): void {
  emit('change', props.selected === catalogId ? undefined : catalogId)
}
</script>

<style scoped>
.catalog {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.catalog__item {
  padding: 4px 10px;
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-pill);
  font-size: 13px;
  color: var(--mall-text-secondary);
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s,
    background-color 0.15s;
}

.catalog__item:hover {
  color: var(--mall-primary);
  border-color: var(--mall-primary);
}

.catalog__item.is-active {
  color: var(--mall-primary);
  border-color: var(--mall-primary);
  background: var(--mall-primary-soft);
}
</style>
