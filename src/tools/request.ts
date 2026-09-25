/**
 * 统一请求工具
 * ============
 *
 * 一个文件三样东西：统一配置 / Result 实体 / axios 实例与拦截器。
 *
 * 处理规则：
 *   1. 发请求：有 token 就自动加到请求头
 *   2. code === 15004 / 15005（未登录 / 登录过期）：清本地登录态 + 回调 auth store，不弹窗
 *   3. code 不等于成功码（业务错误）：console.error + ElMessage 弹窗 + 抛 error 中断
 *   4. HTTP 层错误（超时、断网、5xx）：console.error + 抛 error 中断，不弹窗
 *
 * 拦截器返回的是**完整 AxiosResponse**，所以取值是 `res.data.data` / `res.data.msg`：
 *
 *   const res = await myAxios.get<Result<SkuItemVo>>(`/product/front/item/${skuId}`)
 *   const item = res.data.data      // SkuItemVo
 *
 * 两个后端事实（不知道会踩坑）：
 *   ① 成功码是 0 不是 1 —— 后端 common/utils/R.java 里是 put("code", 0)。
 *   ② **所有接口都返回 HTTP 200**，业务结果只在 body 的 code 里，所以"未登录"不是
 *      状态码 401 而是 code 15004 / 15005，判断必须走 code。响应体只有两种形状：
 *      R.ok().setData(x) → { code, msg, data: x }；R.ok().put("page", p) →
 *      { code, msg, page: p }，数据在顶层不在 data 里。
 */

import type { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios'
import axios from 'axios'
import { ElMessage } from 'element-plus'

/* ═══════════════════════════ 1. 统一配置 ═══════════════════════════ */

export const REQUEST_CONFIG = {
  // 所有请求的公共前缀，直指网关。写成绝对地址是有意的：网关的 CORS 白名单里列了
  // 前端的源（见 gateway 的 CorsConfiguration），换端口要同步加进去。
  // 登录态是 Authorization 头里的 JWT，不依赖同源 cookie。
  baseURL: 'http://localhost:53000/api',

  // 超时时间（毫秒）
  timeout: 15_000,

  // JWT 存在 localStorage 里的 key
  tokenKey: 'user-vue:token',

  // JWT 放在哪个请求头。
  tokenHeader: 'Authorization',
  tokenPrefix: 'Bearer ',
}

/** 读取 JWT，未登录返回 null */
export function getToken(): string | null {
  return localStorage.getItem(REQUEST_CONFIG.tokenKey)
}

/** 登录成功后写入 JWT */
export function setToken(token: string): void {
  localStorage.setItem(REQUEST_CONFIG.tokenKey, token)
}

/** 退出登录 / token 失效时清除 */
export function clearToken(): void {
  localStorage.removeItem(REQUEST_CONFIG.tokenKey)
}

/**
 * 未授权回调。
 *
 * 拦截器遇到"未登录 / 登录过期"（code 15004 / 15005）时会清掉 localStorage 里的 token，
 * 但它**不能直接去改 auth store** —— 那会形成 `store → api → request → store` 的循环依赖。
 * 所以这里留一个注册点：auth store 初始化时把自己的清理动作注册进来，
 * 两边一起清，不会出现"localStorage 空了但页面还显示着用户名"。
 */
type UnauthorizedHandler = () => void

let unauthorizedHandler: UnauthorizedHandler | null = null

/** 注册未授权处理动作；传 null 取消注册 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler
}

/* ═══════════════════════════ 2. Result 实体 ═══════════════════════════ */

/** 业务成功码。后端 R.java 里成功是 0，要改只改这一处 */
export const SUCCESS_CODE = 0

/** 未登录 / 登录已过期。后端一律返回 HTTP 200，凭证问题靠这两个码判断 */
export const NOT_LOGIN_CODE = 15004
export const LOGIN_EXPIRED_CODE = 15005

/** 后端统一响应结构，对应 common/utils/R.java */
export interface Result<T = unknown> {
  code: number
  msg: string
  data: T
  /**
   * 字段级错误：字段名 → 中文消息。
   *
   * 只有校验类失败才有（注解校验、手写校验、请求体不是合法 JSON）。判断"这是字段级错误"的
   * 依据是**有没有这个字段**，不是 code —— 因为 JSON 解析失败是 10002，同样带它。
   */
  errors?: Record<string, string>
}

/**
 * 拼出给用户看的错误文案。
 *
 * 校验类失败的 msg 是固定文案（"参数格式校验失败"），具体信息在 errors 里；不拼进来的话
 * 用户只能看到一句"校验失败"，取不到原因。errors 缺失（纯业务异常）或类型不是对象
 * （旧版后端把异常文本直接塞进 errors）时退回 msg。
 */
function buildErrorMessage(body: Result): string {
  const errors = body.errors
  if (errors && typeof errors === 'object') {
    const messages = Object.keys(errors)
      .map((key) => errors[key])
      .filter(Boolean)
    if (messages.length) {
      return messages.join('；')
    }
  }
  return body.msg || '请求失败'
}

/* ═══════════════════════════ 3. 请求工具 ═══════════════════════════ */

// 创建 axios 实例
const myAxios: AxiosInstance = axios.create({
  baseURL: REQUEST_CONFIG.baseURL,
  timeout: REQUEST_CONFIG.timeout,
  // 登录态是 Authorization 头里的 JWT，cookie 不是必需的。保留 true 是因为网关的 CORS
  // 已经按"带凭据"配置（具体源 + allowCredentials），两边要保持一致
  withCredentials: true,
  // ⚠️ 不要在这里设默认 Content-Type。axios 1.x 见到 FormData 时，只要 Content-Type 里带
  // application/json 就会把它序列化成 JSON（文件内容直接丢），上传因此永远不是 multipart，
  // 后端收到 {"file":{}} 并抛 MultipartException。普通对象不用兜底，axios 自己会设。
})

// 请求拦截器：有 token 就加上
myAxios.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken()
    if (token) {
      config.headers[REQUEST_CONFIG.tokenHeader] = `${REQUEST_CONFIG.tokenPrefix}${token}`
    }
    return config
  },
  (error: AxiosError) => Promise.reject(error),
)

// 响应拦截器
myAxios.interceptors.response.use(
  (response: AxiosResponse) => {
    // HTTP 状态不是 200 —— 网络错误
    if (response.status !== 200) {
      const message = response.data?.msg || '请求失败'
      console.error(`[网络错误] ${response.status} ${message}`)
      throw new Error(message)
    }

    const body = response.data

    // 未登录 / 登录过期：清掉本地登录态并通知 auth store，不弹窗
    // （后端一律返回 HTTP 200，凭证问题只能看 body 的 code）
    if (body.code === NOT_LOGIN_CODE || body.code === LOGIN_EXPIRED_CODE) {
      console.error(`[未授权] code=${body.code} ${body.msg}`)
      clearToken()
      unauthorizedHandler?.()
      throw new Error(body.msg || '登录已失效，请重新登录')
    }

    // code 不等于成功码 —— 业务错误
    if (body.code !== SUCCESS_CODE) {
      const message = buildErrorMessage(body)
      console.error(`[业务错误] code=${body.code} ${message}`)
      ElMessage.error(message)
      throw new Error(message)
    }

    return response
  },
  (error: AxiosError) => {
    // 网络错误：HTTP 非 2xx、超时、断网、跨域被拦
    const status = error.response?.status
    let message: string

    if (status === undefined) {
      // 压根没拿到响应
      message =
        error.code === 'ECONNABORTED'
          ? `请求超时（${REQUEST_CONFIG.timeout}ms）`
          : '网络异常，请检查网络连接'
    } else {
      // 拿到了响应但状态码不对 —— 后端业务响应都是 200，走到这里说明出错的是网关之外的一层
      // （nginx 502、Tomcat 拒绝请求目标等）。未登录不在这里判断，见上面的 code 分支
      const body = error.response?.data as { msg?: string } | undefined
      message = body?.msg || `请求失败（HTTP ${status}）`
    }

    // 需求要求：网络错误只报控制台，不弹窗。想弹窗就在这里加 ElMessage.error(message)
    console.error(`[网络错误] ${message}`, error)
    return Promise.reject(new Error(message))
  },
)

export { myAxios }
