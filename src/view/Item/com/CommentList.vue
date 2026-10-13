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

        <div class="comment__actions">
          <el-button
            text
            size="small"
            :class="{ 'is-liked': isLiked(comment.id) }"
            @click="onToggleLike(comment)"
          >
            <span class="comment__like">♥</span>
            {{ isLiked(comment.id) ? '已赞' : '点赞' }}
            <template v-if="comment.likesCount > 0">{{ comment.likesCount }}</template>
          </el-button>
          <el-button text size="small" @click="onToggleReply(comment.id)">
            回复
            <template v-if="comment.replyCount > 0">（{{ comment.replyCount }}）</template>
          </el-button>
        </div>

        <ul v-if="comment.replies.length" class="replies">
          <li v-for="reply in comment.replies" :key="reply.id" class="reply">
            <span class="reply__name">{{ reply.memberNickName }}</span>
            <span class="reply__content">{{ reply.content }}</span>
            <span class="reply__time">{{ reply.createTime }}</span>
            <el-button
              text
              size="small"
              class="reply__like"
              :class="{ 'is-liked': isLiked(reply.id) }"
              @click="onToggleReplyLike(comment, reply)"
            >
              <span class="comment__like">♥</span>
              {{ isLiked(reply.id) ? '已赞' : '点赞' }}
              <template v-if="reply.likesCount > 0">{{ reply.likesCount }}</template>
            </el-button>
          </li>
        </ul>

        <div v-if="replyTargetId === comment.id" class="reply-form">
          <el-input
            v-model="replyDraft"
            type="textarea"
            :rows="2"
            maxlength="200"
            show-word-limit
            placeholder="说点什么，回复这条评价"
          />
          <div class="reply-form__actions">
            <el-button size="small" @click="closeReplyForm">取消</el-button>
            <el-button
              type="primary"
              size="small"
              :loading="replying"
              @click="submitReply(comment)"
            >
              发表回复
            </el-button>
          </div>
        </div>
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
import { ElButton, ElInput, ElMessage, ElRate, ElSkeleton } from 'element-plus'
import EmptyState from '@/components/EmptyState/index.vue'
import AppPagination from '@/components/AppPagination/index.vue'
import {
  fetchCommentSummary,
  fetchSpuComments,
  likeComment,
  replyComment,
  unlikeComment,
} from '@/api/product'
import { readLikedIds, writeLikedIds } from '@/tools/likedComments'
import { useAuthStore } from '@/store/auth'
import { useAsyncData } from '@/composables/useAsyncData'
import type { CommentReply, PublicComment } from '@/type'

/**
 * 商品详情页的评论区：评价统计 + 评价列表 + 点赞与回复。
 *
 * 由详情页在切到「商品评价」页签时才挂载，所以这里的请求天然是懒的。
 * 分页是组件内部状态、不进 URL：它是长页面里的一个区块，页码进 URL 会与详情页自身的状态混在一起。
 *
 * 按 SPU 拿数据（不是当前 SKU）：一款商品多个规格时评价聚在一起，
 * 每行用 `spuAttributes` 标明买的是哪个规格。
 *
 * 点赞与回复都要求登录：不登录就无从判断"这条评价是不是自己的"，接口也拿不到会员身份。
 * 点赞状态记在 localStorage 里，服务端只有计数。
 */
const props = defineProps<{
  /** 商品 SPU ID；由详情页从商品信息里取出后传入 */
  spuId: number
}>()

/** 星级分布的展示顺序：从高到低，与常见电商一致 */
const STARS = [5, 4, 3, 2, 1]

const auth = useAuthStore()

const pageNum = ref(1)
const pageSize = ref(5)

/** 本地点赞记录。后端不存谁点过，高亮与「已赞 / 点赞」文案都以它为准 */
const likedIds = ref<Set<number>>(readLikedIds())

/** 正在回复哪条评价；null 表示没有展开的回复框 */
const replyTargetId = ref<number | null>(null)
const replyDraft = ref('')
const replying = ref(false)

const {
  data: page,
  loading,
  error,
  execute,
} = useAsyncData(() =>
  fetchSpuComments({ spuId: props.spuId, page: pageNum.value, limit: pageSize.value }),
)

const { data: summary, execute: loadSummary } = useAsyncData(() => fetchCommentSummary(props.spuId))

// spuId 变了要回到第一页：不改页码会停在一个新商品上不存在的页码上；
// 回复框也一并收起，否则它会挂在新列表里一条同 ID 的评价上
watch(
  () => props.spuId,
  () => {
    pageNum.value = 1
    closeReplyForm()
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

function isLiked(commentId: number): boolean {
  return likedIds.value.has(commentId)
}

/**
 * 用一条改动后的评价替换列表里的那一行。
 *
 * `useAsyncData` 用的是 shallowRef，直接改行内字段不会触发渲染，所以整页换一个新对象。
 */
function replaceComment(next: PublicComment): void {
  if (!page.value) {
    return
  }
  page.value = {
    ...page.value,
    rows: page.value.rows.map((row) => (row.id === next.id ? next : row)),
  }
}

/**
 * 点赞或取消点赞。
 *
 * 先按本地记录决定调哪个接口，再用接口返回的计数覆盖显示值 —— 本地加减会在别人同时点赞时越差越多。
 * 未登录先去登录：接口要求会员凭证，不登录也无从判断"这条评价是不是自己的"。
 */
async function onToggleLike(comment: PublicComment): Promise<void> {
  if (!auth.isLoggedIn) {
    auth.openLoginDialog()
    return
  }

  const liked = isLiked(comment.id)
  try {
    const likesCount = liked ? await unlikeComment(comment.id) : await likeComment(comment.id)
    const next = new Set(likedIds.value)
    if (liked) {
      next.delete(comment.id)
    } else {
      next.add(comment.id)
    }
    likedIds.value = next
    writeLikedIds(next)
    replaceComment({ ...comment, likesCount })
  } catch {
    // 请求层已经弹过提示（"不能给自己的评价点赞"也走这里），本地状态保持不变
  }
}

/**
 * 点赞或取消点赞一条回复。
 *
 * 与评价共用一份本地点赞记录：评价和回复在同一张表里，ID 全局唯一，不会互相覆盖。
 * 自己的回复由后端拒绝（11206），前端拿不到作者身份，所以不预先隐藏按钮。
 */
async function onToggleReplyLike(comment: PublicComment, reply: CommentReply): Promise<void> {
  if (!auth.isLoggedIn) {
    auth.openLoginDialog()
    return
  }

  const liked = isLiked(reply.id)
  try {
    const likesCount = liked ? await unlikeComment(reply.id) : await likeComment(reply.id)
    const next = new Set(likedIds.value)
    if (liked) {
      next.delete(reply.id)
    } else {
      next.add(reply.id)
    }
    likedIds.value = next
    writeLikedIds(next)
    replaceComment({
      ...comment,
      replies: comment.replies.map((row) => (row.id === reply.id ? { ...row, likesCount } : row)),
    })
  } catch {
    // 请求层已经弹过提示，本地状态保持不变
  }
}

/** 展开或收起某条评价的回复框；未登录先去登录 */
function onToggleReply(commentId: number): void {
  if (!auth.isLoggedIn) {
    auth.openLoginDialog()
    return
  }

  const sameTarget = replyTargetId.value === commentId
  replyTargetId.value = sameTarget ? null : commentId
  replyDraft.value = ''
}

function closeReplyForm(): void {
  replyTargetId.value = null
  replyDraft.value = ''
}

/**
 * 发表回复并把新回复追加到那一行。
 *
 * 回复不分页，一次只可能加在当前这条评价上，所以本地追加即可，不必重拉整页。
 */
async function submitReply(comment: PublicComment): Promise<void> {
  const content = replyDraft.value.trim()
  if (!content) {
    ElMessage.warning('回复内容不能为空')
    return
  }

  replying.value = true
  try {
    const reply = await replyComment(comment.id, content)
    replaceComment({
      ...comment,
      replies: [...comment.replies, reply],
      replyCount: comment.replyCount + 1,
    })
    closeReplyForm()
  } catch {
    // 请求层已经弹过提示；草稿留着，用户可以直接重试
  } finally {
    replying.value = false
  }
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

.comment__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
}

.comment__like {
  margin-right: 2px;
  color: var(--mall-text-weak);
}

.comment__actions .is-liked {
  color: var(--mall-primary);
}

.comment__actions .is-liked .comment__like {
  color: var(--mall-primary);
}

.replies {
  margin: 8px 0 0;
  padding: 8px 12px;
  list-style: none;
  background: var(--mall-bg);
  border-left: 2px solid var(--mall-border);
  border-radius: 4px;
}

.reply {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 3px 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--mall-text-secondary);
}

.reply__name {
  flex: none;
  color: var(--mall-text);
}

.reply__content {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}

.reply__time {
  flex: none;
  font-size: 12px;
  color: var(--mall-text-weak);
}

.reply__like {
  flex: none;
  padding: 0 4px;
  font-size: 12px;
}

.reply__like.is-liked,
.reply__like.is-liked .comment__like {
  color: var(--mall-primary);
}

.reply-form {
  margin-top: 10px;
}

.reply-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
</style>
