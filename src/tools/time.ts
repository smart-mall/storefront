/**
 * 秒杀相关的时间处理。
 *
 * 放在 tools/ 里而不是组件里：纯函数、没有响应式依赖，可以脱离 Vue 单独跑。
 *
 * 刻意不用 `toLocaleString` / `Intl.DateTimeFormat`：它们的输出跟着运行环境的 locale 和时区走，
 * 同一份数据在不同机器上会渲染成不同格式，截图和测试都对不上。
 */

/** 补零到两位 */
function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

/** 毫秒时间戳 → `yyyy-MM-dd HH:mm:ss` */
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp)
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}

/**
 * 剩余时长 → `HH:mm:ss`。
 *
 * 传入的是**毫秒差**（结束时间减当前时间）。已经到点或已经过点统一返回 `00:00:00`，
 * 不倒计时成负数 —— 秒杀页面上一旦出现负数说明这个场次已经结束了，不该继续显示成在跑。
 *
 * 小时不截断到 24：秒杀场次最长跨一两天，截断会让剩余 25 小时显示成 01 小时。
 */
export function formatCountdown(remainMs: number): string {
  const totalSeconds = Math.floor(Math.max(0, remainMs) / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

/**
 * 秒杀场次相对于"现在"的状态。
 *
 * 三个状态互斥，调用方按它决定显示"即将开始 / 立即抢购 / 已结束"。
 */
export type SeckillPhase = 'upcoming' | 'active' | 'ended'

export function seckillPhase(startTime: number, endTime: number, now: number): SeckillPhase {
  if (now < startTime) {
    return 'upcoming'
  }
  return now > endTime ? 'ended' : 'active'
}
