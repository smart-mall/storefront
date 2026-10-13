<template>
  <div class="comments">
    <div v-if="loading && !page" class="comments__skeleton">
      <el-skeleton :rows="5" animated />
    </div>

    <EmptyState v-else-if="error" :description="error">
      <el-button type="primary" @click="execute">重新加载</el-button>
    </EmptyState>

    <EmptyState v-else-if="!page || page.rows.length === 0" description="还没有评价">
      <el-button type="primary" @click="router.push({ name: 'order' })">去我的订单看看</el-button>
    </EmptyState>

    <template v-else>
      <article v-for="comment in page.rows" :key="comment.id" class="comment">
        <header class="comment__head">
          <el-rate :model-value="comment.star" disabled />
          <span class="comment__time">{{ comment.createTime }}</span>
        </header>

        <p class="comment__content">{{ comment.content }}</p>

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
              <span class="reply__like-icon">♥</span>
              {{ isLiked(reply.id) ? '已赞' : '点赞' }}
              <template v-if="reply.likesCount > 0">{{ reply.likesCount }}</template>
            </el-button>
          </li>
        </ul>

        <footer class="comment__foot">
          <RouterLink
            class="comment__goods"
            :to="{ name: 'item', params: { skuId: comment.skuId } }"
          >
            {{ comment.spuName }}
            <template v-if="comment.spuAttributes">
              · {{ attrsText(comment.spuAttributes) }}
            </template>
          </RouterLink>
          <span v-if="comment.likesCount > 0" class="comment__likes">
            获赞 {{ comment.likesCount }}
          </span>
          <el-button size="small" :disabled="busy" @click="onDelete(comment)">删除评价</el-button>
        </footer>
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
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ElButton, ElMessage, ElMessageBox, ElRate, ElSkeleton } from 'element-plus'
import EmptyState from '@/components/EmptyState/index.vue'
import AppPagination from '@/components/AppPagination/index.vue'
import { deleteComment, fetchMyComments, likeComment, unlikeComment } from '@/api/product'
import { readLikedIds, writeLikedIds } from '@/tools/likedComments'
import { useAuthStore } from '@/store/auth'
import { useAsyncData } from '@/composables/useAsyncData'
import type { CommentReply, MyComment } from '@/type'

/**
 * 评论中心：当前会员自己写过的评价。
 *
 * 页码放 URL 里（和我的订单同一个约定：列表状态以 URL 为准，刷新与前进后退都能复现），
 * 每页条数放局部状态。
 *
 * 只做查看与删除：后端没有"改评价"的入口，要改就删掉重评 —— 删除会释放该项的唯一索引，
 * 重新评价走的是同一条提交链路，不需要另开一条更新链路。
 *
 * 每行展示别人在这条评价下的获赞数与回复：这是会员看反馈的地方，不必回到商品页去找。
 * 评价本身没有点赞按钮（自己不能给自己点赞），但别人的回复可以点赞。
 */
const route = useRoute()
const router = useRouter()

/** 路由参数是 string，转成数字并挡掉非法值（用户可以直接改 URL） */
const pageNum = computed<number>(() => {
  const raw = route.query.pageNum
  const text = Array.isArray(raw) ? raw[0] : raw
  const parsed = Number(text)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
})

const pageSize = ref(10)
const busy = ref(false)

const auth = useAuthStore()

/** 本地点赞记录。后端不存谁点过，高亮与「已赞 / 点赞」文案都以它为准 */
const likedIds = ref<Set<number>>(readLikedIds())

const {
  data: page,
  loading,
  error,
  execute,
} = useAsyncData(() => fetchMyComments({ page: pageNum.value, limit: pageSize.value }))

// 每页条数变了要回到第一页，否则可能停在一个不存在的页码上（与我的订单同一处理）
watch(pageSize, () => {
  if (pageNum.value !== 1) {
    void router.replace({ query: { ...route.query, pageNum: '1' } })
  }
})

watch([pageNum, pageSize], () => void execute(), { immediate: true })

function onPageChange(value: number): void {
  void router.replace({ query: { ...route.query, pageNum: String(value) } })
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
function replaceComment(next: MyComment): void {
  if (!page.value) {
    return
  }
  page.value = {
    ...page.value,
    rows: page.value.rows.map((row) => (row.id === next.id ? next : row)),
  }
}

/**
 * 点赞或取消点赞别人在我这条评价下的回复。
 *
 * 自己的回复由后端拒绝（11206）：接口不下发作者身份，前端无法预先判断，所以按钮一律显示。
 */
async function onToggleReplyLike(comment: MyComment, reply: CommentReply): Promise<void> {
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

/**
 * 删除一条评价。
 *
 * 与订单页那几处同一个形状：先确认、再请求、最后刷新列表。删完之后这一项可以重新评价，
 * 所以确认文案要说清这一点，避免用户以为删了就再也评不了。
 */
async function onDelete(comment: MyComment): Promise<void> {
  try {
    await ElMessageBox.confirm(
      '删除后这条评价不再出现在评论中心，那件商品可以重新评价。确定删除吗？',
      '删除评价',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '再想想',
        type: 'warning',
      },
    )
  } catch {
    // 用户点了"再想想"，什么都不做
    return
  }

  busy.value = true
  try {
    await deleteComment(comment.id)
    ElMessage.success('评价已删除')
    await execute()
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.comments {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 16px;
}

.comments__skeleton {
  padding: 20px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
}

.comment {
  padding: 16px 20px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
}

.comment__head {
  display: flex;
  align-items: center;
  gap: 16px;
}

.comment__time {
  margin-left: auto;
  font-size: 13px;
  color: var(--mall-text-secondary);
}

.comment__content {
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--mall-text);
  overflow-wrap: anywhere;
}

.replies {
  margin: 10px 0 0;
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

.reply__like-icon {
  margin-right: 2px;
  color: var(--mall-text-weak);
}

.reply__like.is-liked,
.reply__like.is-liked .reply__like-icon {
  color: var(--mall-primary);
}

.comment__likes {
  flex: none;
  color: var(--mall-text-secondary);
  font-variant-numeric: tabular-nums;
}

.comment__foot {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--mall-border);
  font-size: 13px;
  color: var(--mall-text-secondary);
}

.comment__goods {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--mall-text-secondary);
  text-decoration: none;
}

.comment__goods:hover {
  color: var(--mall-primary);
  text-decoration: underline;
}
</style>
