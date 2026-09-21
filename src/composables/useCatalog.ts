/**
 * 商品分类树。
 *
 * 为什么不做成 store：它是**字典数据**，不是应用状态。一旦让它进 store，
 * 就等于承认"接口回来的东西都可以进 store"，商品列表和详情迟早也会被塞进去。
 *
 * 这里用模块级单例保存状态和**在途 Promise**：
 *   - 缓存 Promise 而不是结果 —— 页面里三个组件同时挂载时，第一个请求还在路上，
 *     缓存结果的话后两个会各发一次；缓存 Promise 则三次拿到同一个请求。
 *   - 请求失败不缓存，允许下次重试。
 */

import { ref } from 'vue'
import { fetchCategoryTree } from '@/api/product'
import type { CategoryNode } from '@/type'

const tree = ref<CategoryNode[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

let pending: Promise<CategoryNode[]> | null = null
let started = false

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    pending ??= fetchCategoryTree().catch((err: unknown) => {
      pending = null
      throw err
    })
    tree.value = await pending
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : '分类加载失败'
  } finally {
    loading.value = false
  }
}

export function useCatalog() {
  // 首次调用即开始加载，之后所有调用者共享同一份状态
  if (!started) {
    started = true
    void load()
  }

  return { tree, loading, error, reload: load }
}
