import { createPinia } from 'pinia'

/**
 * Pinia 实例。
 *
 * 单独放一个文件是为了以后要装插件（持久化、日志）时有地方加，
 * 不用去改 main.ts。
 */
export const pinia = createPinia()
