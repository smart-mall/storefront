import { createRouter, createWebHistory } from 'vue-router'
import type { LocationQuery } from 'vue-router'
import { setupGuards } from './guards'
import { routes } from './routes'

/**
 * 把 query 归一化成可比较的字符串：剔除页码、按 key 排序、数组内部也排序。
 *
 * 直接用 JSON.stringify 比较是不行的 —— `{ a: 1, b: 2 }` 和 `{ b: 2, a: 1 }`
 * 语义相同但字符串不同，会被当成"变了"，于是页面在改筛选条件时白跳一下顶部。
 */
function canonicalQuery(query: LocationQuery): string {
  return Object.entries(query)
    .filter(([key]) => key !== 'pageNum')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      const text = Array.isArray(value) ? [...value].sort().join(',') : String(value)
      return `${key}=${text}`
    })
    .join('&')
}

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,

  /**
   * 滚动行为。
   *
   * 三种情况要分开处理，否则检索页没法用：
   *   1. 浏览器前进/后退 → 还原原来的位置
   *   2. 同一个页面、只有筛选条件变了 → **停在原地**。
   *      不处理的话用户每点一个复选框页面就弹回顶部，勾选五个条件等于被弹五次
   *   3. 只有页码变了，或者换了页面 → 回顶部
   */
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }

    if (to.name === from.name) {
      const onlyPageChanged = canonicalQuery(to.query) === canonicalQuery(from.query)
      return onlyPageChanged ? { top: 0 } : false
    }

    return { top: 0 }
  },
})

setupGuards(router)
