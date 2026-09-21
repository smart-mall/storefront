<template>
  <div class="empty">
    <div class="empty__title">{{ description }}</div>
    <div v-if="$slots.default" class="empty__action">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ description?: string }>(), { description: '暂无数据' })
</script>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 64px 16px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
}

.empty__title {
  color: var(--mall-text-secondary);
  font-size: 14px;
}
</style>
