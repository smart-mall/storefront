<template>
  <el-dialog
    :model-value="modelValue"
    title="评价商品"
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

        <div class="comment__form">
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
      一件商品在一张订单里只能评价一次。这一单里已经评价过的商品，提交时会提示「已经评价过了」——
      哪些评过只有服务端知道，这里不猜。
    </p>

    <template #footer>
      <el-button @click="onVisibleChange(false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElButton, ElDialog, ElInput, ElMessage, ElRate } from 'element-plus'
import { submitComment } from '@/api/product'
import type { Order, OrderLine } from '@/type'

/**
 * 评价弹窗：把一张订单里每件商品各评一次。
 *
 * 逐项独立提交，不攒成一个请求：后端按订单项落库、按订单项判重，一次提交对应一条评价；
 * 其中一项失败不影响其他项，用户也不必因为一件商品写错就重填整单。
 */
const props = defineProps<{
  modelValue: boolean
  /** 要评价的订单；为空时不展示任何商品 */
  order: Order | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** 有一条评价提交成功。父组件据此重拉订单列表（评价会写订单的 comment_time） */
  submitted: []
}>()

interface Draft {
  star: number
  content: string
}

const drafts = ref<Record<number, Draft>>({})
const done = ref<Record<number, boolean>>({})
const submittingId = ref<number | null>(null)

const lines = computed<OrderLine[]>(() => props.order?.orderItemEntityList ?? [])

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

.comment__form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

.comment__actions {
  display: flex;
  justify-content: flex-end;
  min-height: 24px;
}

.comment__done {
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
