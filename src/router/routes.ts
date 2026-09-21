import type { RouteRecordRaw } from 'vue-router'

/**
 * 路由表。
 *
 * 全部懒加载：首屏只加载布局和首页，检索页、详情页各自成 chunk。
 */

declare module 'vue-router' {
  interface RouteMeta {
    /** 浏览器标题，守卫里会拼成 `${title} - 谷粒商城` */
    title?: string
    /** 需要登录才能进；未登录时守卫弹登录框并取消本次导航 */
    requiresAuth?: boolean
  }
}

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/view/Home/index.vue'),
    meta: { title: '首页' },
  },
  {
    // 全部筛选条件都放在 query 里，这个页面不持有状态
    path: '/search',
    name: 'search',
    component: () => import('@/view/Search/index.vue'),
    meta: { title: '商品检索' },
  },
  {
    path: '/item/:skuId',
    name: 'item',
    component: () => import('@/view/Item/index.vue'),
    meta: { title: '商品详情' },
  },

  // 以下为预约路由，等对应功能落地时再打开（视图文件还不存在，先注释掉）
  // { path: '/cart',     name: 'cart',     component: () => import('@/view/Cart/index.vue'),     meta: { title: '购物车', requiresAuth: true } },
  // { path: '/checkout', name: 'checkout', component: () => import('@/view/Checkout/index.vue'), meta: { title: '结算',   requiresAuth: true } },
  // { path: '/order',    name: 'order',    component: () => import('@/view/Order/index.vue'),    meta: { title: '我的订单', requiresAuth: true } },
  // { path: '/coupon',   name: 'coupon',   component: () => import('@/view/Coupon/index.vue'),   meta: { title: '优惠券', requiresAuth: true } },

  {
    // 必须放最后：通配路由会吃掉后面所有规则
    path: '/:pathMatch(.*)*',
    name: 'notFound',
    component: () => import('@/view/NotFound/index.vue'),
    meta: { title: '页面不存在' },
  },
]
