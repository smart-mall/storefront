<template>
  <section class="group">
    <h3 class="group__title">{{ title }}</h3>
    <div class="group__body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * 筛选项分组的统一外壳：标题 + 分隔线 + 间距。
 *
 * 抽出来是因为品牌、分类、属性、价格四类筛选的"外壳"完全一样，
 * 不抽的话这段样式要在四个组件里各抄一遍，而且间距容易走样。
 */
defineProps<{ title: string }>()
</script>

<style scoped>
.group {
  padding: 14px 0;
  border-bottom: 1px solid var(--mall-border);
}

.group:last-child {
  border-bottom: none;
}

.group__title {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--mall-text);
}

.group__body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
