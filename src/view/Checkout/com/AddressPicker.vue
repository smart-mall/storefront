<template>
  <div class="addr">
    <div class="addr__bar">
      <h2 class="addr__title">收货地址</h2>
      <el-button link type="primary" :disabled="disabled" @click="emit('create')">
        新增地址
      </el-button>
    </div>

    <!-- 一条地址都没有就没法下单（submit 会返回 17004），所以这里直接给新增入口 -->
    <EmptyState v-if="addresses.length === 0" description="还没有收货地址，先新增一条才能结算">
      <el-button type="primary" :disabled="disabled" @click="emit('create')">新增地址</el-button>
    </EmptyState>

    <div v-else class="addr__list">
      <button
        v-for="address in addresses"
        :key="address.id"
        type="button"
        class="addr__item"
        :class="{ 'addr__item--on': address.id === modelValue }"
        :disabled="disabled"
        @click="emit('update:modelValue', address.id)"
      >
        <div class="addr__head">
          <span class="addr__name">{{ address.name }}</span>
          <span class="addr__phone">{{ address.phone }}</span>
          <span v-if="address.defaultStatus === 1" class="addr__badge">默认</span>
        </div>
        <p class="addr__detail">{{ formatAddress(address) }}</p>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElButton } from 'element-plus'
import EmptyState from '@/components/EmptyState/index.vue'
import { formatAddress } from '@/tools/address'
import type { MemberAddress } from '@/type'

defineProps<{
  addresses: MemberAddress[]
  /** 当前选中的地址 id */
  modelValue: number | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
  /** 用户点了新增地址。弹窗由结算页持有 —— 加完之后它还要重拉确认页重算运费 */
  create: []
}>()
</script>

<style scoped>
.addr {
  padding: 20px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
}

.addr__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.addr__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--mall-text);
}

.addr__list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.addr__item {
  flex: 0 1 280px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 16px;
  text-align: left;
  font: inherit;
  background: var(--mall-bg);
  border: 1px solid var(--mall-border);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s;
}

.addr__item:hover:not(:disabled) {
  border-color: var(--mall-primary);
}

.addr__item--on {
  border-color: var(--mall-primary);
  background: var(--mall-primary-soft);
}

.addr__item:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.addr__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.addr__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--mall-text);
}

.addr__phone {
  font-size: 13px;
  color: var(--mall-text-secondary);
}

.addr__badge {
  padding: 1px 6px;
  font-size: 11px;
  color: var(--mall-primary);
  border: 1px solid var(--mall-primary);
  border-radius: var(--mall-radius-pill);
}

.addr__detail {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--mall-text-secondary);
}
</style>
