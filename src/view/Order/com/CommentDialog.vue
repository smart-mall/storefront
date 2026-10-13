<template>
  <el-dialog
    :model-value="modelValue"
    :title="allCommented ? '查看评论' : '评价商品'"
    width="520px"
    :close-on-click-modal="false"
    @update:model-value="onVisibleChange"
  >
    <div v-if="lines.length === 0" class="comment__empty">这一单没有可评价的商品</div>

    <ul v-else class="comment__list">
      <li v-for="line in lines" :key="line.id" class="comment__item">
        <div class="comment__head">
          <img class="comment__thumb" :src="line.skuPic" :alt="line.skuName" />
          <span class="comment__name">{{ line.skuName }}</span>
        </div>

        <!-- 评过的项只读展示：后端没有"改评价"的入口，要改就删掉重评 -->
        <div v-if="line.comment" class="comment__view">
          <el-rate :model-value="line.comment.star" disabled />
          <p class="comment__content">{{ line.comment.content }}</p>
          <div class="comment__actions">
            <span class="comment__time">{{ line.comment.createTime }}</span>
            <el-button
              size="small"
              :loading="deletingId === line.comment.commentId"
              @click="onDelete(line.comment)"
            >
              删除评价
            </el-button>
          </div>
        </div>

        <div v-else class="comment__form">
          <el-rate v-model="drafts[line.id].star" />
          <el-input
            v-model="drafts[line.id].content"
            type="textarea"
            :rows="3"
            placeholder="说说这件商品怎么样（必填）"
          />
          <div class="comment__actions">
            <span v-if="done[line.id]" class="comment__done">已评价</span>
            <el-button
              v-else
              type="primary"
              size="small"
              :disabled="!canSubmit(line.id)"
              :loading="submittingId === line.id"
              @click="onSubmit(line.id)"
            >
              提交评价
            </el-button>
          </div>
        </div>
      </li>
    </ul>

    <p class="comment__tip">
      评价过的商品只能查看或删除；想改内容就先删掉、再重新评价 —— 删除后这一项会回到可评价状态。
    </p>

    <template #footer>
      <el-button @click="onVisibleChange(false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElButton, ElDialog, ElInput, ElMessage, ElMessageBox, ElRate } from 'element-plus'
import { deleteComment, submitComment } from '@/api/product'
import type { CommentBrief, Order, OrderLine } from '@/type'

/**
 * 评价弹窗：一张订单下的每件商品各自处理。
 *
 * 逐项独立提交，不攒成一个请求：后端按订单项落库、按订单项判重，一次提交对应一条评价；
 * 其中一项失败不影响其他项，用户也不必因为一件商品写错就重填整单。
 *
 * 评过的项走只读分支（星级 + 内容 + 删除），未评的项走表单分支；
 * 依据是订单项上的评价摘要，它由订单列表接口带回。
 */
const props = defineProps<{
  modelValue: boolean
  /** 要处理的订单；为空时不展示任何商品 */
  order: Order | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** 提交或删除成功。父组件据此重拉订单列表，并把弹窗指向刷新后的订单 */
  submitted: []
}>()

interface Draft {
  star: number
  content: string
}

const drafts = ref<Record<number, Draft>>({})
const done = ref<Record<number, boolean>>({})
const submittingId = ref<number | null>(null)
const deletingId = ref<number | null>(null)

const lines = computed<OrderLine[]>(() => props.order?.orderItemEntityList ?? [])

/** 这一单是不是都评过了：标题在「评价商品」与「查看评论」之间切换 */
const allCommented = computed(
  () => lines.value.length > 0 && lines.value.every((line) => !!line.comment),
)

// 打开或换单时重置草稿：弹窗是复用的，不重置会把上一单的输入带过来。
// 放在 watch 而不是 @open：子内容随 modelValue 一起渲染，@open 时机上拿不准
watch(
  () => [props.modelValue, props.order] as const,
  ([visible]) => {
    if (visible) {
      reset()
    }
  },
  { immediate: true },
)

function reset(): void {
  const next: Record<number, Draft> = {}
  for (const line of lines.value) {
    // 星级默认 0：让用户自己选，不替他把好评预置成 5 星
    next[line.id] = { star: 0, content: '' }
  }
  drafts.value = next
  done.value = {}
  submittingId.value = null
  deletingId.value = null
}

/** 星级与内容都填了才允许提交，省掉一次注定失败的请求 */
function canSubmit(orderItemId: number): boolean {
  const draft = drafts.value[orderItemId]
  return !!draft && draft.star >= 1 && draft.content.trim().length > 0
}

function onVisibleChange(value: boolean): void {
  emit('update:modelValue', value)
}

async function onSubmit(orderItemId: number): Promise<void> {
  const draft = drafts.value[orderItemId]
  if (!draft) {
    return
  }

  submittingId.value = orderItemId
  try {
    await submitComment({ orderItemId, star: draft.star, content: draft.content.trim() })
    done.value[orderItemId] = true
    ElMessage.success('评价成功')
    emit('submitted')
  } catch {
    // 请求层已经弹过提示（11200 不属于你 / 11201 未完成 / 11203 已评过 / 11204 订单服务不可用）
  } finally {
    submittingId.value = null
  }
}

/**
 * 删除这一项的评价。
 *
 * 删完让父组件重拉：刷新后的订单里这一项不再带评价摘要，于是自动回到可评价的表单分支。
 */
async function onDelete(comment: CommentBrief): Promise<void> {
  try {
    await ElMessageBox.confirm('删除后这件商品可以重新评价。确定删除吗？', '删除评价', {
      confirmButtonText: '确定删除',
      cancelButtonText: '再想想',
      type: 'warning',
    })
  } catch {
    // 用户点了"再想想"，什么都不做
    return
  }

  deletingId.value = comment.commentId
  try {
    await deleteComment(comment.commentId)
    ElMessage.success('评价已删除')
    emit('submitted')
  } catch {
    // 请求层已经弹过提示（11205 评价不存在或不是自己的）
  } finally {
    deletingId.value = null
  }
}
</script>

<style scoped>
.comment__list {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.comment__item {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--mall-border);
}

.comment__item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.comment__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.comment__thumb {
  width: 44px;
  height: 44px;
  object-fit: contain;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: 6px;
}

.comment__name {
  font-size: 13px;
  color: var(--mall-text);
}

.comment__view,
.comment__form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

.comment__content {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--mall-text);
  overflow-wrap: anywhere;
}

.comment__time {
  font-size: 12px;
  color: var(--mall-text-weak);
}

.comment__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 24px;
}

.comment__done {
  margin-left: auto;
  font-size: 13px;
  color: var(--mall-text-weak);
}

.comment__empty {
  padding: 24px 0;
  text-align: center;
  font-size: 13px;
  color: var(--mall-text-weak);
}

.comment__tip {
  margin: 16px 0 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--mall-text-weak);
}
</style>
