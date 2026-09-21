<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
    <el-form-item label="账号" prop="username">
      <el-input v-model="form.username" placeholder="6-19 位字符" @keyup.enter="submit" />
    </el-form-item>

    <el-form-item label="密码" prop="password">
      <el-input
        v-model="form.password"
        type="password"
        show-password
        placeholder="6-18 位字符"
        @keyup.enter="submit"
      />
    </el-form-item>

    <el-button class="pane__submit" type="primary" :loading="submitting" @click="submit">
      {{ mode === 'login' ? '登录' : '注册' }}
    </el-button>

    <div class="pane__tip">
      <template v-if="mode === 'login'">
        还没有账号？
        <el-link type="primary" :underline="false" @click="mode = 'register'">注册</el-link>
      </template>
      <template v-else>
        已有账号？
        <el-link type="primary" :underline="false" @click="mode = 'login'">去登录</el-link>
      </template>
    </div>
  </el-form>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElButton, ElForm, ElFormItem, ElInput, ElLink, ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { accountRegister } from '@/api/auth'
import { useAuthStore } from '@/store/auth'
import { passwordRules, usernameRules } from '@/tools/validators'
import type { AccountForm } from '@/type'

const emit = defineEmits<{ success: [] }>()

const auth = useAuthStore()

const formRef = ref<FormInstance>()
/** 账号密码这条链路注册和登录是两个独立动作，所以要区分模式 */
const mode = ref<'login' | 'register'>('login')
const submitting = ref(false)

const form = reactive<AccountForm>({ username: '', password: '' })
const rules = { username: usernameRules, password: passwordRules }

async function submit(): Promise<void> {
  const instance = formRef.value
  if (!instance) {
    return
  }
  // Element Plus 的 validate 校验失败是 reject 而不是 resolve(false)
  const valid = await instance.validate().catch(() => false)
  if (!valid) {
    return
  }

  submitting.value = true
  try {
    if (mode.value === 'register') {
      await accountRegister({ ...form })
      // ⚠️ 注册接口只返回 R.ok()，不带 token，所以注册完不会自动登录，
      //    必须让用户再登一次（这是后端行为，不是前端偷懒）
      ElMessage.success('注册成功，请登录')
      mode.value = 'login'
      return
    }

    await auth.loginByAccount({ ...form })
    ElMessage.success('登录成功')
    emit('success')
  } catch {
    // 拦截器已经弹过提示：账号或密码错误是 15003，账号已被占用是 15001
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
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
