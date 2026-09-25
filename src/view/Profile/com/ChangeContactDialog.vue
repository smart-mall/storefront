<template>
  <el-dialog
    :model-value="modelValue"
    :title="isMobile ? '更换手机号' : '更换邮箱'"
    width="440px"
    :close-on-click-modal="false"
    @update:model-value="onVisibleChange"
    @open="onOpen"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="72px" @submit.prevent>
      <el-form-item :label="isMobile ? '新手机号' : '新邮箱'" prop="value">
        <el-input
          v-model="form.value"
          :maxlength="isMobile ? 11 : 64"
          :placeholder="isMobile ? '11 位手机号' : '邮箱地址'"
        />
      </el-form-item>

      <el-form-item label="验证码" prop="code">
        <div class="contact__code">
          <el-input v-model="form.code" maxlength="6" placeholder="6 位验证码" />
          <SendCodeButton :kind="codeKind" :target="form.value" />
        </div>
      </el-form-item>
    </el-form>

    <p class="contact__tip">
      {{ isMobile ? '手机号' : '邮箱' }}是登录标识，换绑之后
      {{ isMobile ? '短信' : '邮箱' }}验证码登录会用新的。
      <br />
      ⚠️ 验证码和登录是同一份，请不要拿它去登录页登录 —— 那条链路是"登录即注册"， 会给新{{
        isMobile ? '手机号' : '邮箱'
      }}建出一个新账号，反而让这次换绑撞上"已被绑定"。
    </p>

    <template #footer>
      <el-button :disabled="submitting" @click="onVisibleChange(false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="onSubmit">确认更换</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElButton, ElDialog, ElForm, ElFormItem, ElInput, ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import SendCodeButton from '@/components/Login/com/SendCodeButton.vue'
import { changeEmail, changeMobile } from '@/api/member'
import { emailRules, mobileRules } from '@/tools/validators'

/**
 * 更换手机号 / 邮箱的弹窗。
 *
 * 两种换绑流程完全一样（发码 → 验码 → 提交），所以只写一份，靠 kind 区分。
 *
 * 为什么不做进资料表单：它们是**登录标识**，不是普通字段。后端也不接受在资料接口里改它们 ——
 * 改绑要过验证码，而验证码的校验在 auth。
 */
const props = defineProps<{
  modelValue: boolean
  kind: 'mobile' | 'email'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** 换绑成功。父组件据此重拉会员信息，把打码后的新值显示出来 */
  changed: []
}>()

const formRef = ref<FormInstance>()
const submitting = ref(false)

const form = reactive({ value: '', code: '' })

const isMobile = computed(() => props.kind === 'mobile')

/**
 * SendCodeButton 的 kind 用的是后端那两条链路的叫法（sms / email），
 * 而这里对外用 mobile / email（跟资料页上的文案对齐），所以翻译一下。
 */
const codeKind = computed<'sms' | 'email'>(() => (isMobile.value ? 'sms' : 'email'))

const rules = computed<FormRules>(() => ({
  value: isMobile.value ? mobileRules : emailRules,
  code: [{ required: true, message: '验证码不能为空', trigger: 'blur' }],
}))

function onOpen(): void {
  form.value = ''
  form.code = ''
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
    return
  }

  submitting.value = true
  try {
    const payload = { value: form.value.trim(), code: form.code.trim() }
    if (isMobile.value) {
      await changeMobile(payload)
    } else {
      await changeEmail(payload)
    }
    ElMessage.success('已更换')
    emit('changed')
    emit('update:modelValue', false)
  } catch {
    // 请求层已经弹过提示（15006 / 15007 已被其他账号绑定、验证码错误 10001）
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.contact__code {
  display: flex;
  gap: 8px;
  width: 100%;
}

.contact__tip {
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--mall-text-weak);
}
</style>
