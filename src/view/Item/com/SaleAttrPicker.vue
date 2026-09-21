<template>
  <div v-if="saleAttr.length > 0" class="picker">
    <div v-for="attr in saleAttr" :key="attr.attrId" class="picker__row">
      <span class="picker__label">{{ attr.attrName }}</span>

      <div class="picker__values">
        <span
          v-for="value in attr.attrValues"
          :key="value.attrValue"
          class="picker__value"
          :class="{
            'is-selected': selected[attr.attrId] === value.attrValue,
            'is-disabled': !isAvailable(attr.attrId, value.attrValue),
          }"
          @click="pick(attr.attrId, value.attrValue)"
        >
          {{ value.attrValue }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { SaleAttr } from '@/type'

/**
 * 销售属性点选。
 *
 * 数据形态是后端给的"值 → 拥有该值的 skuId 列表"（`skuIds` 是
 * `group_concat(DISTINCT sku_id)` 出来的字符串 `"1,2,3"`，不是数组）。
 * 所以定位 SKU 的做法是：每个属性各选一个值，把它们的 skuId 集合取交集，
 * 唯一剩下的那个就是要展示的 SKU。
 */
const props = defineProps<{
  saleAttr: SaleAttr[]
  /** 当前正在看的 skuId，用来回显初始选中态 */
  skuId: number
}>()

const emit = defineEmits<{ change: [skuId: number] }>()

/** attrId → 已选的值 */
const selected = reactive<Record<number, string>>({})

/** 某个属性值所拥有的 skuId 集合 */
function skuSetOf(attrId: number, value: string): Set<string> {
  const attr = props.saleAttr.find((item) => item.attrId === attrId)
  const found = attr?.attrValues.find((item) => item.attrValue === value)
  return new Set(
    (found?.skuIds ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id !== ''),
  )
}

/**
 * 回显：当前 SKU 在每个属性上分别取的是哪个值。
 *
 * 详情接口没给"当前 SKU 的销售属性值"，但每个值都带着拥有它的 skuId 列表，
 * 所以反查一下就知道当前 SKU 选的是什么。
 */
function syncFromSku(): void {
  for (const attr of props.saleAttr) {
    const hit = attr.attrValues.find((value) =>
      skuSetOf(attr.attrId, value.attrValue).has(String(props.skuId)),
    )
    if (hit) {
      selected[attr.attrId] = hit.attrValue
    } else {
      delete selected[attr.attrId]
    }
  }
}

watch([() => props.skuId, () => props.saleAttr], syncFromSku, { immediate: true })

/**
 * 这个值还能不能选：它和一个已选值之间至少要存在一个共同的 skuId。
 *
 * 不做这个判断的话，用户能点出一个根本不存在的组合，然后什么反应都没有。
 */
function isAvailable(attrId: number, value: string): boolean {
  const mine = skuSetOf(attrId, value)

  for (const attr of props.saleAttr) {
    if (attr.attrId === attrId) {
      continue
    }
    const chosen = selected[attr.attrId]
    if (!chosen) {
      continue
    }

    const other = skuSetOf(attr.attrId, chosen)
    let shareOne = false
    for (const id of mine) {
      if (other.has(id)) {
        shareOne = true
        break
      }
    }
    if (!shareOne) {
      return false
    }
  }

  return true
}

/** 所有属性都选齐后交集里的那个 skuId；选不齐或组合不存在时返回 null */
function matchedSkuId(): number | null {
  const sets: Set<string>[] = []

  for (const attr of props.saleAttr) {
    const chosen = selected[attr.attrId]
    if (!chosen) {
      return null
    }
    sets.push(skuSetOf(attr.attrId, chosen))
  }

  if (sets.length === 0) {
    return null
  }

  const [first, ...rest] = sets
  const common = [...first].filter((id) => rest.every((set) => set.has(id)))
  return common.length > 0 ? Number(common[0]) : null
}

function pick(attrId: number, value: string): void {
  if (!isAvailable(attrId, value)) {
    return
  }

  selected[attrId] = value

  const target = matchedSkuId()
  // 选到的还是当前这个 SKU 就不用跳转，避免一次无意义的重新请求
  if (target !== null && target !== props.skuId) {
    emit('change', target)
  }
}
</script>

<style scoped>
.picker {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.picker__row {
  display: flex;
  gap: 12px;
  align-items: baseline;
}

.picker__label {
  flex: 0 0 60px;
  font-size: 13px;
  color: var(--mall-text-secondary);
}

.picker__values {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.picker__value {
  padding: 4px 12px;
  border: 1px solid var(--mall-border);
  border-radius: 6px;
  font-size: 13px;
  color: var(--mall-text);
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s,
    background-color 0.15s;
}

.picker__value:hover {
  color: var(--mall-primary);
  border-color: var(--mall-primary);
}

.picker__value.is-selected {
  color: var(--mall-primary);
  border-color: var(--mall-primary);
  background: var(--mall-primary-soft);
}

/* 不存在的组合：划掉并且不给点，比点了没反应清楚 */
.picker__value.is-disabled {
  color: var(--mall-text-weak);
  border-style: dashed;
  cursor: not-allowed;
  text-decoration: line-through;
}

.picker__value.is-disabled:hover {
  color: var(--mall-text-weak);
  border-color: var(--mall-border);
}
</style>
