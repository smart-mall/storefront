<template>
  <div class="comments">
    <div v-if="summary && summary.total > 0" class="comments__summary">
      <div class="comments__score">
        <b>{{ summary.averageStar.toFixed(1) }}</b>
        <el-rate :model-value="roundedAverage" disabled />
        <span class="comments__total">共 {{ summary.total }} 条评价</span>
      </div>

      <ul class="comments__dist">
        <li v-for="star in STARS" :key="star" class="comments__dist-row">
          <span class="comments__dist-label">{{ star }} 星</span>
          <span class="comments__dist-bar"><i :style="{ width: percentOf(star) }" /></span>
          <span class="comments__dist-count">{{ countOf(star) }}</span>
        </li>
      </ul>
    </div>

    <div v-if="loading && !page" class="comments__skeleton">
      <el-skeleton :rows="4" animated />
    </div>

    <EmptyState v-else-if="error" :description="error">
      <el-button type="primary" @click="execute">重新加载</el-button>
    </EmptyState>

    <EmptyState v-else-if="!page || page.rows.length === 0" description="该商品还没有评价" />

    <template v-else>
      <article v-for="comment in page.rows" :key="comment.id" class="comment">
        <header class="comment__head">
          <span class="comment__avatar">{{ comment.memberNickName.slice(0, 1) }}</span>
          <span class="comment__name">{{ comment.memberNickName }}</span>
          <el-rate :model-value="comment.star" disabled />
          <span class="comment__time">{{ comment.createTime }}</span>
        </header>

        <p class="comment__content">{{ comment.content }}</p>

        <p v-if="comment.spuAttributes" class="comment__attrs">
          {{ attrsText(comment.spuAttributes) }}
        </p>
      </article>

      <AppPagination
        v-model:page-size="pageSize"
        :page-num="pageNum"
        :total="page.total"
        @update:page-num="onPageChange"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElButton, ElRate, ElSkeleton } from 'element-plus'
import EmptyState from '@/components/EmptyState/index.vue'
import AppPagination from '@/components/AppPagination/index.vue'
import { fetchCommentSummary, fetchSpuComments } from '@/api/product'
import { useAsyncData } from '@/composables/useAsyncData'

/**
 * 商品详情页的评论区：评价统计 + 评价列表。
 *
 * 由详情页在切到「商品评价」页签时才挂载，所以这里的请求天然是懒的。
 * 分页是组件内部状态、不进 URL：它是长页面里的一个区块，页码进 URL 会与详情页自身的状态混在一起。
 *
 * 按 SPU 拿数据（不是当前 SKU）：一款商品多个规格时评价聚在一起，
 * 每行用 `spuAttributes` 标明买的是哪个规格。
 */
const props = defineProps<{
  /** 商品 SPU ID；由详情页从商品信息里取出后传入 */
  spuId: number
}>()

/** 星级分布的展示顺序：从高到低，与常见电商一致 */
const STARS = [5, 4, 3, 2, 1]

const pageNum = ref(1)
const pageSize = ref(5)

const {
  data: page,
  loading,
  error,
  execute,
} = useAsyncData(() =>
  fetchSpuComments({ spuId: props.spuId, page: pageNum.value, limit: pageSize.value }),
)

const { data: summary, execute: loadSummary } = useAsyncData(() => fetchCommentSummary(props.spuId))

// spuId 变了要回到第一页：不改页码会停在一个新商品上不存在的页码上
watch(
  () => props.spuId,
  () => {
    pageNum.value = 1
    void loadSummary()
    void execute()
  },
  { immediate: true },
)

const roundedAverage = computed(() => Math.round(summary.value?.averageStar ?? 0))

function countOf(star: number): number {
  return summary.value?.starCounts?.[star] ?? 0
}

/** 分布条的宽度按占比算；没有评价时给 0，避免除以 0 */
function percentOf(star: number): string {
  const total = summary.value?.total ?? 0
  return total === 0 ? '0%' : `${Math.round((countOf(star) / total) * 100)}%`
}

function onPageChange(value: number): void {
  pageNum.value = value
  void execute()
}

/** 后端把销售属性用 ";" 连成一个字符串，展示时换成更易读的分隔符 */
function attrsText(value: string): string {
  return value.split(';').join(' / ')
}
</script>

<style scoped>
.comments {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comments__summary {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  padding: 16px 20px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
}

.comments__score {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 140px;
}

.comments__score b {
  font-size: 30px;
  line-height: 1;
  color: var(--mall-primary);
  font-variant-numeric: tabular-nums;
}

.comments__total {
  font-size: 13px;
  color: var(--mall-text-secondary);
}

.comments__dist {
  flex: 1;
  min-width: 220px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.comments__dist-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 2px 0;
  font-size: 12px;
  color: var(--mall-text-secondary);
}

.comments__dist-label {
  width: 34px;
  flex: none;
}

.comments__dist-bar {
  flex: 1;
  height: 8px;
  background: var(--mall-border);
  border-radius: 4px;
  overflow: hidden;
}

.comments__dist-bar i {
  display: block;
  height: 100%;
  background: var(--mall-primary);
}

.comments__dist-count {
  width: 32px;
  flex: none;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.comments__skeleton {
  padding: 20px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
}

.comment {
  padding: 14px 20px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
}

.comment__head {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--mall-text-secondary);
}

.comment__avatar {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--mall-border);
  color: var(--mall-text-secondary);
  font-size: 13px;
}

.comment__name {
  color: var(--mall-text);
}

.comment__time {
  margin-left: auto;
}

.comment__content {
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--mall-text);
  overflow-wrap: anywhere;
}

.comment__attrs {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--mall-text-weak);
}
</style>
