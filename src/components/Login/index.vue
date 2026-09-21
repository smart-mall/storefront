<template>
  <el-dialog
    v-model="visible"
    title="登录"
    width="420px"
    align-center
    :close-on-click-modal="false"
  >
    <el-tabs v-model="activeTab">
      <el-tab-pane label="账号密码" name="account">
        <AccountPane @success="onSuccess" />
      </el-tab-pane>
      <el-tab-pane label="邮箱验证码" name="email">
        <EmailPane @success="onSuccess" />
      </el-tab-pane>
      <el-tab-pane label="手机验证码" name="sms">
        <SmsPane @success="onSuccess" />
      </el-tab-pane>
    </el-tabs>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElDialog, ElTabPane, ElTabs } from 'element-plus'
import AccountPane from './com/AccountPane.vue'
import EmailPane from './com/EmailPane.vue'
import SmsPane from './com/SmsPane.vue'
import { useAuthStore } from '@/store/auth'

const auth = useAuthStore()

/** 开关放在 auth store 里：头部、详情页、将来的结算页都能触发它 */
const visible = computed({
  get: () => auth.loginDialogVisible,
  set: (value: boolean) => {
    if (value) {
      auth.openLoginDialog()
    } else {
      auth.closeLoginDialog()
    }
  },
})

const activeTab = ref<'account' | 'email' | 'sms'>('account')

function onSuccess(): void {
  auth.closeLoginDialog()
}
</script>
