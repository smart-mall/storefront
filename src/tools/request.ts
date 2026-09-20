/**
 * 统一请求工具
 * ============
 *
 * 一个文件三样东西：统一配置 / Result 实体 / axios 实例与拦截器。
 *
 * 处理规则：
 *   1. 发请求：有 token 就自动加到请求头
 *   2. 响应不是 200（网络错误）：console.error + 抛 error 中断
 *   3. code 不等于成功码（业务错误）：console.error + ElMessage 弹窗 + 抛 error 中断
 *   4. 响应体没有 code：跳过业务码判断，原样返回
 *
 * 拦截器返回的是**完整 AxiosResponse**，所以取值是 `res.data.data` / `res.data.msg`：
 *
 *   const res = await myAxios.get<Result<SkuItemVo>>(`/product/skuinfo/item/${skuId}`)
 *   const item = res.data.data      // SkuItemVo
 *
 * 两个后端事实（不知道会踩坑）：
 *   ① 成功码是 0 不是 1 —— 后端 common/utils/R.java 里是 put("code", 0)，
 *      而且全后端都依赖它（LoginController 里 if (r.getCode() != 0) 抛异常）。
 *   ② 不是所有接口都返回 Result —— R extends HashMap，于是有三类响应：
 *        R.ok().setData(x)      → { code, msg, data: x }
 *        R.ok().put("page", p)  → { code, msg, page: p }   数据在顶层，不在 data 里
 *        return 裸对象           → 连 code 都没有
 *      第三类如 GET /index/catalog.json（裸 Map）、GET /queryByOrderId（裸实体）、
 *      GET /aliPayOrder（HTML 文本），必须跳过业务码判断，否则首页都加载不出来。
 */

import type { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios'
import axios from 'axios'
import { ElMessage } from 'element-plus'

/* ═══════════════════════════ 1. 统一配置 ═══════════════════════════ */

export const REQUEST_CONFIG = {
  // 所有请求的公共前缀。开发时由 vite proxy、生产时由 nginx 转发到网关。
  // 用相对路径是为了「同源」——登录态是 session cookie，同源才能自动带上，
  // 也就不需要处理 CORS。要指向别处就在 .env 里设 VITE_API_BASE_URL。
  baseURL: 'http://localhost:53000/api',

  // 超时时间（毫秒）
  timeout: 15_000,

  // 发请求时固定带的 Content-Type（上传文件时 axios 会自动改成 multipart）
  contentType: 'application/json',

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

/* ═══════════════════════════ 2. Result 实体 ═══════════════════════════ */

/** 业务成功码。后端 R.java 里成功是 0，要改只改这一处 */
export const SUCCESS_CODE = 0

/** 后端统一响应结构，对应 common/utils/R.java */
export interface Result<T = unknown> {
  code: number
  msg: string
  data: T
}

/* ═══════════════════════════ 3. 请求工具 ═══════════════════════════ */

// 创建 axios 实例
const myAxios: AxiosInstance = axios.create({
  baseURL: REQUEST_CONFIG.baseURL,
  timeout: REQUEST_CONFIG.timeout,
  // 带着 cookie 发请求。登录态是服务端 session（auth 服务往 HttpSession 写 LOGIN_USER），
  // 依赖 JSESSIONID cookie
  withCredentials: true,
  headers: {
    'Content-Type': REQUEST_CONFIG.contentType,
  },
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

    // code 不等于成功码 —— 业务错误
    if (body.code !== SUCCESS_CODE) {
      const message = body.msg || '请求失败'
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
      // 拿到了响应但状态码不对。有些接口即使非 2xx 也带 Result，优先用后端的 msg
      const body = error.response?.data as { msg?: string } | undefined
      message = body?.msg || `请求失败（HTTP ${status}）`

      // 未授权：清掉本地 token
      if (status === 401) {
        clearToken()
      }
    }

    // 需求要求：网络错误只报控制台，不弹窗。想弹窗就在这里加 ElMessage.error(message)
    console.error(`[网络错误] ${message}`, error)
    return Promise.reject(new Error(message))
  },
)

export { myAxios }
