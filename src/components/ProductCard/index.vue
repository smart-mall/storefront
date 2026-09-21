<template>
  <article class="card" @click="goDetail">
    <div class="card__media">
      <img class="card__img" :src="sku.skuImg" :alt="sku.skuTitle" loading="lazy" />
      <span v-if="!sku.hasStock" class="card__badge">缺货</span>
    </div>

    <div class="card__body">
      <!--
        v-html 是必须的：带关键字检索时后端会把命中的字包成 <em> 来高亮，
        用插值渲染会把 <em> 当文本原样显示出来。

        这里是本项目唯一一处 v-html，风险说明：
        标题来自 pms_sku_info.sku_title（后台录入），后端是**直接**把 <em> 插进原串的，
        没有先做 HTML 转义，所以标题里如果带标签会被执行。
        当前录入入口只有后台管理，风险可控；要彻底解决应该在后端插入高亮前先转义标题。
      -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <h3 class="card__title" v-html="sku.skuTitle" />
      <div class="card__price">¥{{ price }}</div>
      <div class="card__brand">{{ sku.brandName }}</div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { SkuSummary } from '@/type'

const props = defineProps<{ sku: SkuSummary }>()

const router = useRouter()

const price = computed(() => props.sku.skuPrice.toFixed(2))

function goDetail(): void {
  void router.push({ name: 'item', params: { skuId: props.sku.skuId } })
}
</script>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
  overflow: hidden;
  cursor: pointer;
  transition:
    box-shadow 0.2s,
    transform 0.2s;
}

.card:hover {
  box-shadow: var(--mall-shadow-hover);
  transform: translateY(-2px);
}

.card__media {
  position: relative;
  aspect-ratio: 1 / 1;
  background: var(--mall-bg);
}

.card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.card__badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 8px;
  border-radius: var(--mall-radius-pill);
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 12px;
}

.card__body {
  padding: 10px 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card__title {
  margin: 0;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.4;
  color: var(--mall-text);
  /* 标题固定两行，卡片高度才不会参差 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.8em;
}

.card__title :deep(em) {
  font-style: normal;
  color: var(--mall-primary);
}

.card__price {
  font-size: 18px;
  font-weight: 600;
  color: var(--mall-primary);
  font-variant-numeric: tabular-nums;
}

.card__brand {
  font-size: 12px;
  color: var(--mall-text-weak);
}
</style>
