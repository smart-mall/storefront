<template>
  <div v-if="chips.length > 0" class="chips">
    <span class="chips__label">已选：</span>

    <el-tag
      v-for="chip in chips"
      :key="chip.removeKey + '=' + chip.removeValue"
      closable
      type="info"
      @close="emit('remove', chip)"
    >
      {{ chip.navName }}：{{ chip.navValue }}
    </el-tag>

    <el-link type="primary" :underline="false" @click="emit('clear')">清空全部</el-link>
  </div>
</template>

<script setup lang="ts">
import { ElLink, ElTag } from 'element-plus'
import type { FilterChip } from '@/type'

defineProps<{ chips: FilterChip[] }>()

const emit = defineEmits<{
  remove: [chip: FilterChip]
  clear: []
}>()
</script>

<style scoped>
.chips {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 16px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
  font-size: 13px;
}

.chips__label {
  color: var(--mall-text-secondary);
}
</style>
