/**
 * 每秒递增一次的"现在"。
 *
 * 秒杀页面必须知道当前时刻：同一个商品在开始前、进行中、结束后要显示三种不同的东西，
 * 而且得在时间越过开始/结束的那一刻**自动**切过去 —— 只在加载时算一次的话，
 * 页面开着不动就会一直停在旧状态。
 *
 * 放在 composables/ 而不是每个卡片各起一个定时器：一个列表页几十个商品，
 * 每个卡片一个 setInterval 是纯浪费，统一在页面层起一个、以 prop 往下传。
 */

import { onUnmounted, ref } from 'vue'
import type { Ref } from 'vue'

/**
 * @param intervalMs 刷新间隔，默认 1000ms（倒计时显示到秒，再密没有意义）
 */
export function useNow(intervalMs = 1000): Ref<number> {
  const now = ref(Date.now())

  const timer = window.setInterval(() => {
    now.value = Date.now()
  }, intervalMs)

  onUnmounted(() => {
    window.clearInterval(timer)
  })

  return now
}
