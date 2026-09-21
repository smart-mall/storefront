<template>
  <header class="header">
    <div class="header__inner">
      <RouterLink class="header__brand" to="/">谷粒商城</RouterLink>

      <nav class="header__nav">
        <RouterLink to="/">首页</RouterLink>
        <RouterLink :to="{ name: 'search' }">全部商品</RouterLink>
        <RouterLink :to="{ name: 'seckill' }">秒杀</RouterLink>
        <span class="header__nav-disabled" title="功能开发中">优惠券</span>
      </nav>

      <div class="header__right">
        <RouterLink class="header__cart" :to="{ name: 'cart' }">
          <el-badge :value="cartBadge" :max="99" :hidden="cartBadge === 0">
            <el-icon :size="18"><ShoppingCart /></el-icon>
          </el-badge>
          <span>购物车</span>
        </RouterLink>
        <UserMenu />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ShoppingCart } from '@element-plus/icons-vue'
import { ElBadge, ElIcon } from 'element-plus'
import UserMenu from './UserMenu.vue'
import { useAuthStore } from '@/store/auth'
import { useCartStore } from '@/store/cart'

const auth = useAuthStore()

/**
 * 实例化 store 本身就是这里要做的一半事情：store 内部有一个跟着登录态走的 watch
 * （登录后拉整车、退出后清空），只有 store 被实例化了它才存在。
 * 头部是全局唯一常驻的组件，由它来"点火"最合适。
 */
const cart = useCartStore()

/**
 * 未登录时角标固定为 0。
 *
 * store 里的 watch 会在退出登录时清空购物车，但 status 是 unknown 的那一瞬
 * （有 token 还没验证完）isLoggedIn 也是 false —— 那一瞬正是刷新页面时的第一帧，
 * 不挡住的话会闪一下上一个用户的件数。
 */
const cartBadge = computed(() => (auth.isLoggedIn ? cart.countNum : 0))
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
  gap: 8px;
  color: var(--mall-text-secondary);
  text-decoration: none;
}

.header__cart:hover,
.header__cart.router-link-active {
  color: var(--mall-primary);
}
</style>
