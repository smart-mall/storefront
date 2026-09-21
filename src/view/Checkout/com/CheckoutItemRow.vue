<template>
  <div class="row">
    <img class="row__thumb" :src="item.image" :alt="item.title" />

    <div class="row__body">
      <RouterLink class="row__title" :to="{ name: 'item', params: { skuId: item.skuId } }">
        {{ item.title }}
      </RouterLink>
      <div v-if="attrs.length > 0" class="row__attrs">
        <span v-for="attr in attrs" :key="attr" class="row__attr">{{ attr }}</span>
      </div>
    </div>

    <div class="row__price">¥{{ item.price.toFixed(2) }}</div>
    <div class="row__count">×{{ item.count }}</div>
    <div class="row__subtotal">¥{{ item.totalPrice.toFixed(2) }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { CheckoutItem } from '@/type'

/**
 * 结算页的商品行。纯展示 —— 结算页不能改数量也不能删，
 * 要改就回购物车改（否则用户在结算页改了数量，防重令牌和金额会一起失效）。
 */
const props = defineProps<{ item: CheckoutItem }>()

const attrs = computed(() => props.item.skuAttrValues ?? [])
</script>

<style scoped>
.row {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) 100px 60px 100px;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--mall-border);
}

.row:last-child {
  border-bottom: none;
}

.row__thumb {
  width: 64px;
  height: 64px;
  object-fit: contain;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: 6px;
}

.row__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.row__title {
  font-size: 13px;
  line-height: 1.5;
  color: var(--mall-text);
  text-decoration: none;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.row__title:hover {
  color: var(--mall-primary);
}

.row__attrs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.row__attr {
  padding: 1px 8px;
  font-size: 12px;
  color: var(--mall-text-secondary);
  background: var(--mall-bg);
  border-radius: var(--mall-radius-pill);
}

.row__price,
.row__count {
  font-size: 13px;
  color: var(--mall-text-secondary);
  font-variant-numeric: tabular-nums;
}

.row__count {
  text-align: center;
}

.row__subtotal {
  text-align: right;
  font-size: 14px;
  font-weight: 600;
  color: var(--mall-primary);
  font-variant-numeric: tabular-nums;
}
</style>
