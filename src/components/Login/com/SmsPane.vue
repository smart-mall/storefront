<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
    <el-form-item label="账号" prop="username">
      <el-input v-model="form.username" placeholder="仅新建账号时使用" />
    </el-form-item>

    <el-form-item label="手机号" prop="mobile">
      <el-input v-model="form.mobile" placeholder="接收验证码的手机号" />
    </el-form-item>

    <el-form-item label="验证码" prop="code">
      <div class="pane__code-row">
        <el-input v-model="form.code" placeholder="短信收到的验证码" @keyup.enter="submit" />
        <SendCodeButton kind="sms" :target="form.mobile" />
      </div>
    </el-form-item>

    <el-button class="pane__submit" type="primary" :loading="submitting" @click="submit">
      登录
    </el-button>

    <div class="pane__tip">这一项没有单独的注册，未注册的手机号会自动创建账号</div>
  </el-form>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElButton, ElForm, ElFormItem, ElInput, ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import SendCodeButton from './SendCodeButton.vue'
import { useAuthStore } from '@/store/auth'
import { codeRules, mobileRules, usernameRules } from '@/tools/validators'
import type { MobileCodeForm } from '@/type'

const emit = defineEmits<{ success: [] }>()

const auth = useAuthStore()

const formRef = ref<FormInstance>()
const submitting = ref(false)

const form = reactive<MobileCodeForm>({ username: '', mobile: '', code: '' })
const rules = { username: usernameRules, mobile: mobileRules, code: codeRules }

async function submit(): Promise<void> {
  const instance = formRef.value
  if (!instance) {
    return
  }
  const valid = await instance.validate().catch(() => false)
  if (!valid) {
    return
  }

  submitting.value = true
  try {
    await auth.loginByMobile({ ...form })
    ElMessage.success('登录成功')
    emit('success')
  } catch {
    // 拦截器已提示
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.pane__code-row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.pane__submit {
  width: 100%;
}

.pane__tip {
  margin-top: 12px;
  font-size: 13px;
  color: var(--mall-text-secondary);
  text-align: center;
}
</style>
