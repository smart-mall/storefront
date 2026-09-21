/**
 * 页面异步数据的三态封装。
 *
 * 首页、检索页、详情页都是一样的形态：进入 → 请求 → 加载中 / 成功 / 失败，
 * 失败要给重试入口。这个 composable 只做这一件事，不碰 store、不碰 URL。
 */

import { ref, shallowRef } from 'vue'
import type { Ref, ShallowRef } from 'vue'

export interface AsyncData<T> {
  data: ShallowRef<T | null>
  loading: Ref<boolean>
  error: Ref<string | null>
  /** 手动跑一次；组件的重试按钮也调它 */
  execute: () => Promise<void>
}

/**
 * @param loader 取数据的函数。每次 execute 都会重新调用它
 */
export function useAsyncData<T>(loader: () => Promise<T>): AsyncData<T> {
  // 用 shallowRef：拿到的都是接口返回的普通对象，不需要深层响应式，
  // 商品列表几十条时 shallowRef 能省掉大量无意义的响应式代理
  const data = shallowRef<T | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function execute(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      data.value = await loader()
    } catch (err: unknown) {
      // 拦截器已经弹过提示并抛出了带 msg 的 Error，这里只负责把状态收下来
      error.value = err instanceof Error ? err.message : '加载失败'
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, execute }
}
