<template>
  <el-dialog
    :model-value="modelValue"
    :title="isRefund ? '申请退款' : '申请退货'"
    width="560px"
    :close-on-click-modal="false"
    @update:model-value="onVisibleChange"
  >
    <el-form label-width="96px">
      <el-form-item label="订单号">
        <span>{{ order?.orderSn }}</span>
      </el-form-item>

      <template v-if="!isRefund">
        <el-form-item label="退货商品">
          <span>{{ line?.skuName }} × {{ line?.skuQuantity }}</span>
        </el-form-item>
        <el-form-item label="退款金额">
          <b class="after-sale__amount">¥{{ line ? line.realAmount.toFixed(2) : '0.00' }}</b>
          <span class="after-sale__hint">按这一项的实付金额退，整项退</span>
        </el-form-item>
        <el-form-item label="退货原因">
          <el-select v-model="form.reason" placeholder="请选择退货原因" style="width: 100%">
            <el-option
              v-for="item in reasons"
              :key="item.id"
              :label="item.name"
              :value="item.name"
            />
          </el-select>
        </el-form-item>
      </template>

      <el-form-item :label="isRefund ? '申请说明' : '补充描述'">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          maxlength="500"
          show-word-limit
          :placeholder="
            isRefund ? '说明一下为什么不要了，管理员审核时会看到（必填）' : '补充说明，可不填'
          "
        />
      </el-form-item>

      <el-form-item v-if="!isRefund" label="凭证图片">
        <div class="after-sale__pics">
          <img v-for="pic in pics" :key="pic" :src="pic" class="after-sale__pic" alt="凭证" />
          <el-upload
            v-if="pics.length < MAX_PICS"
            :auto-upload="false"
            :show-file-list="false"
            accept="image/*"
            :on-change="onFileChange"
          >
            <el-button size="small" :loading="uploading">上传图片</el-button>
          </el-upload>
        </div>
      </el-form-item>
    </el-form>

    <p class="after-sale__tip">{{ tip }}</p>

    <template #footer>
      <el-button @click="onVisibleChange(false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="onSubmit">提交申请</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
// 本项目没装 unplugin-vue-components（见 vite.config.ts），Element 组件一律显式导入：
// 不导入的话模板里的 <el-dialog> 会被编译成运行时 resolveComponent，项目又没有全局注册，
// 于是只报一条 warning、按原生标签渲染 —— 表现为"点了没反应、不弹窗、控制台也不报错"
import {
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElOption,
  ElSelect,
  ElUpload,
} from 'element-plus'
import { applyRefund, applyReturn, fetchReturnReasons } from '@/api/order'
import { uploadImage } from '@/api/media'
import type { Order, OrderLine, ReturnReason } from '@/type'

/**
 * 售后申请弹窗：一个组件管两条链。
 *
 * 仅退款（`mode = 'refund'`）与退货退款（`mode = 'return'`）的表单长得像，但入参不是一回事 ——
 * 前者退整单、只填一段说明；后者退一个订单项，要选原因、可以传凭证。所以字段按 mode 分支渲染，
 * 提交时也走两个接口，不做"一个接口两种语义"。
 */
const props = defineProps<{
  modelValue: boolean
  /** 退款模式必须有；订单项由父组件按"哪一项能退"给出 */
  order: Order | null
  line?: OrderLine | null
  mode: 'refund' | 'return'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** 提交成功：父组件负责重拉列表，让这条申请及其状态立刻出现 */
  submitted: []
}>()

/** 凭证图片最多传几张：后端 descPics 是一段逗号隔开的字符串，没有长度语义，这里只做一个界面约束 */
const MAX_PICS = 3

const form = ref({ reason: '', description: '' })
const pics = ref<string[]>([])
const reasons = ref<ReturnReason[]>([])
const submitting = ref(false)
const uploading = ref(false)

const isRefund = computed(() => props.mode === 'refund')

const tip = computed(() =>
  isRefund.value
    ? '提交后不会立刻到账：订单会进入待审核，后台同意后原路退回，同时订单作废、库存与优惠券、积分一并退回。'
    : '先提交申请，后台同意后你会看到商家的退货地址；把货寄回、商家确认收到，钱才原路退回。',
)

// 打开或换个订单项时重置：弹窗是复用的，不重置会把上一次的输入带过来
watch(
  () => [props.modelValue, props.order, props.line] as const,
  ([visible]) => {
    if (visible) {
      form.value = { reason: '', description: '' }
      pics.value = []
      if (!isRefund.value) {
        void loadReasons()
      }
    }
  },
  { immediate: true },
)

async function loadReasons(): Promise<void> {
  try {
    reasons.value = await fetchReturnReasons()
  } catch {
    // 请求层已经弹过提示；拿不到选项时下拉是空的，用户提交会被后端的必填校验挡下
    reasons.value = []
  }
}

function onVisibleChange(value: boolean): void {
  emit('update:modelValue', value)
}

/**
 * 选图后立刻上传，拿回地址先攒在本地。
 *
 * 与评价那条链同一套做法：上传成功只表示文件进了 MinIO，地址要随业务表单一起提交才算数；
 * 用户选了图又放弃提交，那些文件就是孤儿（接口注释里写明了这一点）。
 */
async function onFileChange(file: { raw?: File }): Promise<void> {
  if (!file.raw) {
    return
  }

  uploading.value = true
  try {
    const uploaded = await uploadImage(file.raw)
    pics.value = [...pics.value, uploaded.url]
  } catch {
    // 请求层已经弹过提示（19001 格式不支持 / 19002 超出大小等）
  } finally {
    uploading.value = false
  }
}

async function onSubmit(): Promise<void> {
  if (!props.order) {
    return
  }

  if (isRefund.value && form.value.description.trim().length === 0) {
    ElMessage.warning('请先填写申请说明')
    return
  }
  if (!isRefund.value && form.value.reason.trim().length === 0) {
    ElMessage.warning('请先选择退货原因')
    return
  }

  submitting.value = true
  try {
    if (isRefund.value) {
      await applyRefund({
        orderSn: props.order.orderSn,
        description: form.value.description.trim(),
      })
    } else if (props.line) {
      await applyReturn({
        orderItemId: props.line.id,
        reason: form.value.reason,
        description: form.value.description.trim() || undefined,
        descPics: pics.value.length > 0 ? pics.value.join(',') : undefined,
      })
    }
    ElMessage.success('申请已提交，等待后台处理')
    emit('submitted')
    onVisibleChange(false)
  } catch {
    // 请求层已经弹过提示（17003 状态不对 / 17013 已有进行中的申请）
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.after-sale__amount {
  margin-right: 8px;
  color: var(--mall-primary);
  font-size: 16px;
}

.after-sale__hint {
  font-size: 12px;
  color: var(--mall-text-weak);
}

.after-sale__pics {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.after-sale__pic {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border: 1px solid var(--mall-border);
  border-radius: 6px;
}

.after-sale__tip {
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--mall-text-weak);
}
</style>
