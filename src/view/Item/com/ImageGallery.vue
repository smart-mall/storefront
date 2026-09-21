<template>
  <div class="gallery">
    <div class="gallery__main">
      <img v-if="current" class="gallery__image" :src="current" :alt="alt" />
      <div v-else class="gallery__empty">暂无图片</div>
    </div>

    <div v-if="urls.length > 1" class="gallery__thumbs">
      <img
        v-for="(url, index) in urls"
        :key="url"
        class="gallery__thumb"
        :class="{ 'is-active': index === active }"
        :src="url"
        :alt="alt"
        @mouseenter="active = index"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { SkuImage } from '@/type'

const props = defineProps<{
  images: SkuImage[]
  /** 图片列表为空时用它兜底（SKU 的默认图） */
  fallback: string
  alt: string
}>()

/**
 * 按 imgSort 升序排（imgSort 可能是 null，排到最后），并去掉空 URL。
 *
 * ⚠️ 实测这批数据的 imgSort **全是 0**，等于保持后端返回的顺序 ——
 *    所以不能指望靠它把主图排到第一位，主图要看 defaultImg 标记。
 */
const items = computed(() => {
  const sorted = [...props.images].sort((a, b) => (a.imgSort ?? 0) - (b.imgSort ?? 0))
  return sorted.filter((image) => image.imgUrl !== '')
})

const urls = computed(() => {
  const list = items.value.map((image) => image.imgUrl)
  return list.length > 0 ? list : props.fallback ? [props.fallback] : []
})

const active = ref(0)

const current = computed(() => urls.value[active.value] ?? '')

/**
 * 主图是 defaultImg=1 的那张，不是列表第一张。
 * 切换 SKU 后图片列表会整体换掉，索引必须重新定位，否则会停在一个已经不属于
 * 当前 SKU 的下标上。
 */
function resetActive(): void {
  const defaultIndex = items.value.findIndex((image) => image.defaultImg === 1)
  active.value = defaultIndex >= 0 ? defaultIndex : 0
}

watch(urls, resetActive, { immediate: true })
</script>

<style scoped>
.gallery {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 400px;
  flex: 0 0 400px;
}

.gallery__main {
  aspect-ratio: 1 / 1;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gallery__image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.gallery__empty {
  color: var(--mall-text-weak);
  font-size: 13px;
}

.gallery__thumbs {
  display: flex;
  gap: 8px;
}

.gallery__thumb {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border: 1px solid var(--mall-border);
  border-radius: 6px;
  cursor: pointer;
}

.gallery__thumb.is-active {
  border-color: var(--mall-primary);
}
</style>
