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

        <footer class="comment__foot">
          <span class="comment__goods">
            {{ comment.spuName }}
            <template v-if="comment.spuAttributes">
              · {{ attrsText(comment.spuAttributes) }}
            </template>
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
import { useRoute, useRouter } from 'vue-router'
import { ElButton, ElMessage, ElMessageBox, ElRate, ElSkeleton } from 'element-plus'
import EmptyState from '@/components/EmptyState/index.vue'
import AppPagination from '@/components/AppPagination/index.vue'
import { deleteComment, fetchMyComments } from '@/api/product'
import { useAsyncData } from '@/composables/useAsyncData'
import type { MyComment } from '@/type'

/**
 * 评论中心：当前会员自己写过的评价。
 *
 * 页码放 URL 里（和我的订单同一个约定：列表状态以 URL 为准，刷新与前进后退都能复现），
 * 每页条数放局部状态。
 *
 * 只做查看与删除：后端没有"改评价"的入口，要改就删掉重评 —— 删除会释放该项的唯一索引，
 * 重新评价走的是同一条提交链路，不需要另开一条更新链路。
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
}
</style>
