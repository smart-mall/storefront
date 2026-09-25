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
        <el-dropdown-item command="profile">个人中心</el-dropdown-item>
        <el-dropdown-item command="orders">我的订单</el-dropdown-item>
        <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import {
  ElAvatar,
  ElButton,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElSkeleton,
} from 'element-plus'
import { useAuthStore } from '@/store/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

function onCommand(command: string): void {
  if (command === 'profile') {
    void router.push({ name: 'profile' })
    return
  }

  if (command === 'orders') {
    void router.push({ name: 'order' })
    return
  }

  if (command === 'logout') {
    auth.logout()
    // 登出后如果还停在 /order、/cart 这类需要登录的页面上，页面里是上一个用户的数据，
    // 而路由守卫只在导航时才会拦 —— 所以这里主动退回首页
    if (route.meta.requiresAuth) {
      void router.push({ name: 'home' })
    }
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
