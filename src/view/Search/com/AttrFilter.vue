<template>
  <el-checkbox-group :model-value="selected" class="attr" @change="onChange">
    <el-checkbox v-for="value in visibleValues" :key="value" :value="value">
      {{ value }}
    </el-checkbox>
  </el-checkbox-group>

  <el-link
    v-if="hiddenCount > 0"
    class="attr__more"
    type="primary"
    :underline="false"
    @click="expanded = !expanded"
  >
    {{ expanded ? '收起' : `更多（${hiddenCount}）` }}
  </el-link>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElCheckbox, ElCheckboxGroup, ElLink } from 'element-plus'
import type { AttrFacet } from '@/type'

const props = defineProps<{
  /** 一个属性的候选，对应后端聚合出来的一组 attrId + attrValue[] */
  attr: AttrFacet
  /** 这个属性下已选的值（不含 `属性id_` 前缀） */
  selected: string[]
}>()

const emit = defineEmits<{ change: [value: string[]] }>()

/** 属性值个数很不均匀：颜色可能十几个，上市年份就一个。超过这个数先折叠起来 */
const COLLAPSED_COUNT = 6

const expanded = ref(false)

const visibleValues = computed(() =>
  expanded.value ? props.attr.attrValue : props.attr.attrValue.slice(0, COLLAPSED_COUNT),
)

const hiddenCount = computed(() => Math.max(0, props.attr.attrValue.length - COLLAPSED_COUNT))

function onChange(value: (string | number | boolean)[]): void {
  emit('change', value.map(String))
}
</script>

<style scoped>
.attr {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.attr__more {
  align-self: flex-start;
  font-size: 12px;
}
</style>
