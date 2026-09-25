<template>
  <el-dialog
    :model-value="modelValue"
    :title="isEdit ? '修改收货地址' : '新增收货地址'"
    width="520px"
    :close-on-click-modal="false"
    @update:model-value="onVisibleChange"
    @open="onOpen"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="82px" @submit.prevent>
      <el-form-item label="收货人" prop="name">
        <el-input v-model="form.name" maxlength="255" placeholder="收货人姓名" />
      </el-form-item>

      <el-form-item label="手机号" prop="phone">
        <el-input v-model="form.phone" maxlength="11" placeholder="11 位手机号" />
      </el-form-item>

      <el-form-item label="所在地区" prop="areaPath">
        <el-cascader
          v-model="form.areaPath"
          :options="treeOptions"
          :props="CASCADER_PROPS"
          :loading="treeLoading"
          placeholder="省 / 市 / 区"
          class="address-form__cascader"
        />
      </el-form-item>

      <el-form-item label="详细地址" prop="detailAddress">
        <el-input
          v-model="form.detailAddress"
          type="textarea"
          :rows="2"
          maxlength="255"
          show-word-limit
          placeholder="街道、门牌号"
        />
      </el-form-item>

      <el-form-item label="邮编" prop="postCode">
        <el-input v-model="form.postCode" maxlength="64" placeholder="选填" />
      </el-form-item>

      <el-form-item label="默认地址">
        <el-checkbox v-model="form.defaultStatus">设为默认</el-checkbox>
        <span class="address-form__hint">第一条地址会自动成为默认</span>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button :disabled="submitting" @click="onVisibleChange(false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="onSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import {
  ElButton,
  ElCascader,
  ElCheckbox,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
} from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { createAddress, fetchAddressTree, updateAddress } from '@/api/member'
import { ADDRESS_LEVELS, findAreaPath, pruneAddressTree, resolveAreaNames } from '@/tools/address'
import { mobileRules } from '@/tools/validators'
import type { AddressSaveForm, AreaNode, MemberAddress } from '@/type'

/**
 * 收货地址的新增 / 修改弹窗。
 *
 * 放在 components/ 而不是某个页面的 com/ 下：会员中心的地址列表和结算页都要用它
 * （结算页加完地址要能立刻重算运费），属于跨页面复用。
 *
 * 省市区来自 third-party 的行政区划树，不是 member 的接口 —— 树是"可选项"，与用户无关；
 * 用户存了哪些地址在 member。两者在这里汇合：用树选，用 member 的接口存。
 */
const props = defineProps<{
  modelValue: boolean
  /** null 是新增，传地址是修改 */
  address: MemberAddress | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** 保存成功。父组件据此重拉列表；结算页还要重拉确认页 */
  saved: []
}>()

/** 级联器按 code 取值、按 name 显示，和 AreaNode 的字段对齐 */
const CASCADER_PROPS = { label: 'name', value: 'code', children: 'children' } as const

const formRef = ref<FormInstance>()
const submitting = ref(false)

const form = reactive({
  name: '',
  phone: '',
  postCode: '',
  /** 级联器的值，是 code 路径：['110000','110100','110101'] */
  areaPath: [] as string[],
  detailAddress: '',
  defaultStatus: false,
})

const isEdit = computed(() => props.address !== null)

const rules: FormRules = {
  name: [{ required: true, message: '收货人不能为空', trigger: 'blur' }],
  phone: mobileRules,
  areaPath: [
    {
      validator: (_rule, value: string[], callback) => {
        // 必须选到区县：库里 province/city/region 三段都要有，缺一段结算页的地址就是残的
        if (!Array.isArray(value) || value.length < ADDRESS_LEVELS) {
          callback(new Error('请选择到区县'))
        } else {
          callback()
        }
      },
      trigger: 'change',
    },
  ],
  detailAddress: [{ required: true, message: '详细地址不能为空', trigger: 'blur' }],
}

const treeOptions = ref<AreaNode[]>([])
const treeLoading = ref(false)
let treeLoaded = false

/** 树只拉一次：它是全国行政区划，本次会话内不会变 */
async function ensureTree(): Promise<void> {
  if (treeLoaded) {
    return
  }
  treeLoading.value = true
  try {
    const raw = await fetchAddressTree()
    // 必须裁到三级：原始树最深到居委会，不裁的话用户会一路点到街道
    treeOptions.value = pruneAddressTree(raw ?? [], ADDRESS_LEVELS)
    treeLoaded = true
  } catch {
    // 请求层已经弹过提示。树空着，用户选不了地区，但弹窗本身不该崩
  } finally {
    treeLoading.value = false
  }
}

async function onOpen(): Promise<void> {
  // 先等树就位再回填：编辑时要用树把 areacode 反查成 code 路径
  await ensureTree()

  const address = props.address
  if (address) {
    form.name = address.name
    form.phone = address.phone
    form.postCode = address.postCode ?? ''
    form.detailAddress = address.detailAddress
    form.defaultStatus = address.defaultStatus === 1
    form.areaPath = findAreaPath(treeOptions.value, address.areacode, [
      address.province,
      address.city,
      address.region,
    ])
  } else {
    form.name = ''
    form.phone = ''
    form.postCode = ''
    form.detailAddress = ''
    form.defaultStatus = false
    form.areaPath = []
  }
  formRef.value?.clearValidate()
}

function onVisibleChange(value: boolean): void {
  emit('update:modelValue', value)
}

async function onSubmit(): Promise<void> {
  const instance = formRef.value
  if (!instance) {
    return
  }
  try {
    await instance.validate()
  } catch {
    // 校验失败，el-form 已经把红字显示出来了
    return
  }

  const names = resolveAreaNames(treeOptions.value, form.areaPath)
  if (names.length < ADDRESS_LEVELS) {
    ElMessage.error('请选择到区县')
    return
  }
  const [province = '', city = '', region = ''] = names

  const payload: AddressSaveForm = {
    name: form.name.trim(),
    phone: form.phone.trim(),
    postCode: form.postCode.trim() || null,
    province,
    city,
    region,
    detailAddress: form.detailAddress.trim(),
    areacode: form.areaPath[form.areaPath.length - 1] ?? null,
    defaultStatus: form.defaultStatus,
  }

  submitting.value = true
  try {
    if (props.address) {
      await updateAddress(props.address.id, payload)
    } else {
      await createAddress(payload)
    }
    ElMessage.success('已保存')
    emit('saved')
    emit('update:modelValue', false)
  } catch {
    // 请求层已经弹过提示（15008 数量超限、17004 地址不存在等），弹窗保持打开让用户改
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.address-form__cascader {
  width: 100%;
}

.address-form__hint {
  margin-left: 12px;
  font-size: 12px;
  color: var(--mall-text-weak);
}
</style>
