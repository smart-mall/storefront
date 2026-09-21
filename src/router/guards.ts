/**
 * 全局路由守卫。
 */

import type { Router } from 'vue-router'
import { useAuthStore } from '@/store/auth'

export function setupGuards(router: Router): void {
  router.beforeEach(async (to) => {
    // 守卫里取 store 是安全的：main.ts 里 pinia 先于 router 安装
    const auth = useAuthStore()

    if (to.meta.requiresAuth) {
      // 必须等：启动时 localStorage 里可能有 token 但还没验证过（status 是 unknown），
      // 不等的话会把已登录用户误判成未登录
      await auth.loadCurrentMember()
      if (!auth.isLoggedIn) {
        auth.openLoginDialog()
        // 取消本次导航，用户关掉弹窗后仍停在原页面
        return false
      }
      return true
    }

    // 非受保护路由：后台恢复登录态就行，不阻塞导航。
    // loadCurrentMember 内部只在 status 是 unknown 时真的发请求，所以每次导航都调也不会有额外开销
    void auth.loadCurrentMember()
    return true
  })

  router.afterEach((to) => {
    document.title = to.meta.title ? `${to.meta.title} - 谷粒商城` : '谷粒商城'
  })
}
