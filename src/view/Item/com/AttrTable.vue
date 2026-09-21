<template>
  <div v-if="groups.length > 0" class="attrs">
    <section v-for="group in groups" :key="group.groupName" class="attrs__group">
      <h4 class="attrs__group-title">{{ group.groupName }}</h4>

      <div class="attrs__rows">
        <div v-for="attr in group.attrs" :key="attr.attrId" class="attrs__row">
          <span class="attrs__name">{{ attr.attrName }}</span>
          <span class="attrs__value">{{ attr.attrValue }}</span>
        </div>
      </div>
    </section>
  </div>

  <EmptyState v-else description="该商品没有规格参数" />
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState/index.vue'
import type { SpuAttrGroup } from '@/type'

defineProps<{
  /** 规格参数，后端已按属性分组，前端只负责排板 */
  groups: SpuAttrGroup[]
}>()
</script>

<style scoped>
.attrs {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.attrs__group-title {
  margin: 0 0 12px;
  padding-left: 10px;
  border-left: 3px solid var(--mall-primary);
  font-size: 14px;
  font-weight: 600;
  color: var(--mall-text);
}

.attrs__rows {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 32px;
}

.attrs__row {
  display: flex;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px dashed var(--mall-border);
  font-size: 13px;
}

.attrs__name {
  flex: 0 0 96px;
  color: var(--mall-text-secondary);
}

.attrs__value {
  color: var(--mall-text);
  word-break: break-all;
}
</style>
