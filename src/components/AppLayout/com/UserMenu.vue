<template>
  <!-- unknown：还不知道登没登录，占位而不是显示"登录"，否则每次刷新都会闪一下 -->
  <el-skeleton v-if="auth.status === 'unknown'" :rows="1" animated class="user-menu__skeleton" />

  <el-button v-else-if="!auth.isLoggedIn" text type="primary" @click="auth.openLoginDialog()">
    登录 / 注册
  </el-button>

  <el-dropdown v-else trigger="click" @command="onCommand">
    <span class="user-menu__trigger">
      <el-avatar :size="28" :src="auth.avatar">
        {{ auth.displayName.slice(0, 1) }}
      </el-avatar>
      <span class="user-menu__name">{{ auth.displayName }}</span>
    </span>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="logout">退出登录</el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import {
  ElAvatar,
  ElButton,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElSkeleton,
} from 'element-plus'
import { useAuthStore } from '@/store/auth'

const auth = useAuthStore()

function onCommand(command: string): void {
  if (command === 'logout') {
    auth.logout()
  }
}
</script>

<style scoped>
.user-menu__skeleton {
  width: 96px;
}

.user-menu__trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  outline: none;
}

.user-menu__name {
  font-size: 14px;
  color: var(--mall-text);
}
</style>
