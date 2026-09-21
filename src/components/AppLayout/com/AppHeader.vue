<template>
  <header class="header">
    <div class="header__inner">
      <RouterLink class="header__brand" to="/">谷粒商城</RouterLink>

      <nav class="header__nav">
        <RouterLink to="/">首页</RouterLink>
        <RouterLink :to="{ name: 'search' }">全部商品</RouterLink>
        <span class="header__nav-disabled" title="功能开发中">秒杀</span>
        <span class="header__nav-disabled" title="功能开发中">优惠券</span>
      </nav>

      <div class="header__right">
        <span class="header__cart" title="购物车开发中">
          <el-icon><ShoppingCart /></el-icon>
          <span>购物车</span>
        </span>
        <UserMenu />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ShoppingCart } from '@element-plus/icons-vue'
import { ElIcon } from 'element-plus'
import UserMenu from './UserMenu.vue'
</script>

<style scoped>
.header {
  background: var(--mall-surface);
  border-bottom: 1px solid var(--mall-border);
}

.header__inner {
  width: 100%;
  max-width: var(--mall-content-width);
  margin: 0 auto;
  padding: 0 16px;
  height: var(--mall-header-height);
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 32px;
}

.header__brand {
  font-size: 20px;
  font-weight: 600;
  color: var(--mall-text);
  text-decoration: none;
  letter-spacing: 0.5px;
}

.header__nav {
  display: flex;
  align-items: center;
  gap: 24px;
  flex: 1;
  font-size: 14px;
}

.header__nav a {
  color: var(--mall-text-secondary);
  text-decoration: none;
}

.header__nav a:hover,
.header__nav a.router-link-exact-active {
  color: var(--mall-primary);
}

/* 还没做的入口：保持可见但不给点，避免用户点了没反应 */
.header__nav-disabled {
  color: var(--mall-text-weak);
  cursor: not-allowed;
}

.header__right {
  display: flex;
  align-items: center;
  gap: 24px;
  font-size: 14px;
}

.header__cart {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--mall-text-weak);
  cursor: not-allowed;
}
</style>
