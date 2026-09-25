<template>
  <div class="profile">
    <aside class="profile__side">
      <div class="profile__who">
        <el-avatar :size="48" :src="auth.avatar">{{ initial }}</el-avatar>
        <div class="profile__who-text">
          <div class="profile__who-name">{{ auth.displayName || '—' }}</div>
          <div class="profile__who-sub">{{ accountLabel }}</div>
        </div>
      </div>

      <nav class="profile__nav">
        <RouterLink
          v-for="item in NAV"
          :key="item.name"
          :to="{ name: item.name }"
          class="profile__nav-item"
          active-class="profile__nav-item--on"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
    </aside>

    <div class="profile__main">
      <RouterView />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { ElAvatar } from 'element-plus'
import { useAuthStore } from '@/store/auth'

/**
 * 会员中心的容器：左侧分栏 + 子路由。
 *
 * 用嵌套路由而不是页内 tab —— 三段内容各自有 URL，能直接打开、刷新、后退，
 * 和项目里"能从 URL 推导的状态就放 URL"的做法一致。
 */
const auth = useAuthStore()

const NAV = [
  { name: 'profileInfo', label: '个人资料' },
  { name: 'profileAddress', label: '收货地址' },
  { name: 'profileLoginLog', label: '登录记录' },
] as const

const initial = computed(() => (auth.displayName || '?').slice(0, 1))

/** 社交登录建出来的号没有 username，这里给个说明而不是留空 */
const accountLabel = computed(() => auth.member?.username || '社交账号')
</script>

<style scoped>
.profile {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding-top: 16px;
}

.profile__side {
  flex: 0 0 200px;
  padding: 20px 16px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
}

.profile__who {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--mall-border);
}

.profile__who-text {
  min-width: 0;
}

.profile__who-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--mall-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile__who-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--mall-text-weak);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile__nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 12px;
}

.profile__nav-item {
  padding: 9px 12px;
  font-size: 14px;
  color: var(--mall-text-secondary);
  text-decoration: none;
  border-radius: 8px;
  transition:
    color 0.15s,
    background 0.15s;
}

.profile__nav-item:hover {
  color: var(--mall-primary);
  background: var(--mall-primary-soft);
}

.profile__nav-item--on {
  color: var(--mall-primary);
  background: var(--mall-primary-soft);
  font-weight: 600;
}

.profile__main {
  flex: 1;
  min-width: 0;
}

/* 窄屏时侧栏收到上面：1180px 的容器里再挤两栏，右侧表单就没地方了 */
@media (max-width: 720px) {
  .profile {
    flex-direction: column;
  }

  .profile__side {
    flex: none;
    width: 100%;
    box-sizing: border-box;
  }

  .profile__nav {
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>
