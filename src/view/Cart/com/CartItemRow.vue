<template>
  <div class="row" :class="{ 'row--on': item.check }">
    <el-checkbox
      class="row__check"
      :model-value="item.check"
      :disabled="cart.pending"
      @change="onCheck"
    />

    <RouterLink class="row__thumb" :to="{ name: 'item', params: { skuId: item.skuId } }">
      <img :src="item.image" :alt="item.title" />
    </RouterLink>

    <div class="row__body">
      <RouterLink class="row__title" :to="{ name: 'item', params: { skuId: item.skuId } }">
        {{ item.title }}
      </RouterLink>
      <div v-if="attrs.length > 0" class="row__attrs">
        <span v-for="attr in attrs" :key="attr" class="row__attr">{{ attr }}</span>
      </div>
    </div>

    <div class="row__price">¥{{ item.price.toFixed(2) }}</div>

    <div class="row__count">
      <!--
        用 :model-value + @change 而不是 v-model：这里每改一次就要发请求，
        v-model 会跟着每一次输入变化（输入 "12" 会先发 1 再发 12）。
        单向绑定还能保证"显示的一定是后端确认过的数量"。
      -->
      <QuantityStepper
        :model-value="item.count"
        :disabled="cart.pending"
        label=""
        @change="onCountChange"
      />
    </div>

    <div class="row__subtotal">¥{{ item.totalPrice.toFixed(2) }}</div>

    <div class="row__op">
      <el-button type="danger" text :disabled="cart.pending" @click="onRemove">删除</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ElButton, ElCheckbox } from 'element-plus'
import QuantityStepper from '@/components/QuantityStepper/index.vue'
import { useCartStore } from '@/store/cart'
import type { CartItem } from '@/type'

const props = defineProps<{ item: CartItem }>()

const cart = useCartStore()

/**
 * 这一行直接操作 store，而不是把勾选/改数量/删除都 emit 给父组件：
 * 三个动作都天然属于"购物车"这个 store，父组件只是把它们摆成表格，
 * 透传一圈只会多一层样板。父组件负责的是需要整车信息的批量动作（全选、删除选中）。
 */
const attrs = computed(() => props.item.skuAttrValues ?? [])

function onCheck(value: boolean | string | number): void {
  void cart.checkOne(props.item.skuId, value === true)
}

function onCountChange(value: number): void {
  // stepper 在初始渲染时也会 emit 一次 change，数量没变就不必发请求
  if (value !== props.item.count) {
    void cart.updateCount(props.item.skuId, value)
  }
}

function onRemove(): void {
  void cart.removeOne(props.item.skuId)
}
</script>

<style scoped>
.row {
  display: grid;
  /* 列宽由父级 .cart 上的 --cart-grid 提供，详见 Cart/index.vue 的注释 */
  grid-template-columns: var(--cart-grid);
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
  transition: background-color 0.15s;
}

.row--on {
  background: var(--mall-primary-soft);
}

.row__check {
  display: flex;
  justify-content: center;
}

.row__thumb img {
  width: 72px;
  height: 72px;
  object-fit: contain;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: 6px;
}

.row__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row__title {
  color: var(--mall-text);
  font-size: 14px;
  line-height: 1.5;
  text-decoration: none;
  /* 标题可能很长，最多两行 */
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
  padding: 2px 8px;
  font-size: 12px;
  color: var(--mall-text-secondary);
  background: var(--mall-bg);
  border-radius: var(--mall-radius-pill);
}

.row__price,
.row__subtotal {
  font-variant-numeric: tabular-nums;
  color: var(--mall-text-secondary);
  font-size: 14px;
}

.row__subtotal {
  color: var(--mall-primary);
  font-weight: 600;
}

.row__count {
  display: flex;
  justify-content: center;
}

.row__op {
  display: flex;
  justify-content: flex-end;
}
</style>
