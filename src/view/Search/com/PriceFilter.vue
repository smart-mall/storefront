<template>
  <div class="price">
    <div class="price__presets">
      <span
        v-for="preset in PRESETS"
        :key="preset.value"
        class="price__preset"
        :class="{ 'is-active': value === preset.value }"
        @click="pickPreset(preset.value)"
      >
        {{ preset.label }}
      </span>
    </div>

    <div class="price__custom">
      <el-input v-model="minInput" size="small" placeholder="最低" />
      <span class="price__dash">—</span>
      <el-input v-model="maxInput" size="small" placeholder="最高" />
      <el-button size="small" @click="applyCustom">确定</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElButton, ElInput, ElMessage } from 'element-plus'

const props = defineProps<{
  /** 当前的价格区间，形如 `100_500` / `_100` / `100_`；未筛选时 undefined */
  value?: string
}>()

const emit = defineEmits<{ change: [value: string | undefined] }>()

/**
 * 后端 skuPrice 接受三种写法：`最低_最高` / `_最高` / `最低_`。
 * 预设直接生成这三种形式，自定义输入走同样的拼法。
 */
const PRESETS = [
  { label: '100 以下', value: '_100' },
  { label: '100 - 500', value: '100_500' },
  { label: '500 - 1000', value: '500_1000' },
  { label: '1000 - 5000', value: '1000_5000' },
  { label: '5000 以上', value: '5000_' },
]

const minInput = ref('')
const maxInput = ref('')

// URL 里的区间是唯一真相：chips 上删掉价格条件、或点了预设，输入框都要跟着变
watch(
  () => props.value,
  () => {
    const [min = '', max = ''] = (props.value ?? '').split('_')
    minInput.value = min
    maxInput.value = max
  },
  { immediate: true },
)

/** 再点一次同一个预设就取消 */
function pickPreset(preset: string): void {
  emit('change', props.value === preset ? undefined : preset)
}

function applyCustom(): void {
  const min = minInput.value.trim()
  const max = maxInput.value.trim()

  if (!min && !max) {
    // 两个都清空 = 取消价格筛选，而不是发一个 `_` 出去
    emit('change', undefined)
    return
  }

  // 先挡非数字：后端对 skuPrice 有格式校验，不拦的话用户会收到一个 10001
  for (const [label, text] of [
    ['最低价', min],
    ['最高价', max],
  ] as const) {
    if (text !== '' && !Number.isFinite(Number(text))) {
      ElMessage.warning(`${label}只能填数字`)
      return
    }
  }

  if (min !== '' && max !== '' && Number(min) > Number(max)) {
    // 直接放过去的话后端会返回 0 条，看起来像"没有这个价位的商品"，很难排查
    ElMessage.warning('最低价不能高于最高价')
    return
  }

  emit('change', `${min}_${max}`)
}
</script>

<style scoped>
.price {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.price__presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.price__preset {
  padding: 3px 8px;
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-pill);
  font-size: 12px;
  color: var(--mall-text-secondary);
  cursor: pointer;
}

.price__preset:hover {
  color: var(--mall-primary);
  border-color: var(--mall-primary);
}

.price__preset.is-active {
  color: var(--mall-primary);
  border-color: var(--mall-primary);
  background: var(--mall-primary-soft);
}

.price__custom {
  display: flex;
  align-items: center;
  gap: 6px;
}

.price__dash {
  color: var(--mall-text-weak);
}
</style>
