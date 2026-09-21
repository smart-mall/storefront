<template>
  <div class="layout">
    <AppHeader />

    <div class="layout__bar">
      <div class="layout__inner">
        <SearchBar />
      </div>
    </div>

    <main class="layout__main">
      <div class="layout__inner">
        <slot />
      </div>
    </main>

    <AppFooter />

    <!-- 全站唯一的登录弹窗实例，靠 auth store 里的开关控制 -->
    <LoginDialog />
  </div>
</template>

<script setup lang="ts">
import AppFooter from './com/AppFooter.vue'
import AppHeader from './com/AppHeader.vue'
import SearchBar from './com/SearchBar.vue'
import LoginDialog from '@/components/Login/index.vue'
</script>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100svh;
  background: var(--mall-bg);
}

.layout__bar {
  border-bottom: 1px solid var(--mall-border);
  background: var(--mall-surface);
}

.layout__inner {
  width: 100%;
  max-width: var(--mall-content-width);
  margin: 0 auto;
  padding: 0 16px;
  box-sizing: border-box;
}

.layout__main {
  flex: 1;
  padding: 16px 0 48px;
}
</style>
