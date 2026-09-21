/**
 * 登录模块接口。
 *
 * 对应后端 auth 服务的三条独立登录链路，经网关 53000 转发：
 *   账号密码     `POST /api/auth/account/register`、`POST /api/auth/account/login`
 *   邮箱验证码   `GET  /api/auth/email/sendCode`、`POST /api/auth/email/login`
 *   手机验证码   `GET  /api/auth/sms/sendCode`、`POST /api/auth/sms/login`
 *
 * 三条链路彼此独立、不能互相替代：账号密码那条有独立的注册动作；
 * 两条验证码链路都是**登录即注册**，没有注册接口。
 *
 * 登录成功后 token 由拦截器自动写进 `Authorization` 头，这里不用管。
 */

import { myAxios } from '@/tools/request'
import type {
  AccountForm,
  EmailCodeForm,
  LoginResult,
  MemberProfile,
  MobileCodeForm,
  Result,
} from '@/type'

/* ═══════════════════ 账号密码链路 ═══════════════════ */

/**
 * 注册。
 *
 * ⚠️ 后端成功时返回的是裸 `R.ok()`，没有 data 体，所以返回 void。
 *    账号已被占用返回 code=15001。
 */
export async function accountRegister(form: AccountForm): Promise<void> {
  await myAxios.post<Result<void>>('/auth/account/register', form)
}

/**
 * 登录。
 *
 * 账号或密码错误返回 code=15003。
 * ⚠️ 这条链路只按 **username** 认人，邮箱和手机号不能当账号用。
 */
export async function accountLogin(form: AccountForm): Promise<LoginResult> {
  const res = await myAxios.post<Result<LoginResult>>('/auth/account/login', form)
  return res.data.data
}

/* ═══════════════════ 邮箱验证码链路 ═══════════════════ */

/**
 * 发送邮箱验证码。
 *
 * ⚠️ 同一个邮箱 60 秒内只能发一次，重复请求返回 code=10004，
 *    按钮必须做倒计时，别让用户连点。
 */
export async function sendEmailCode(email: string): Promise<void> {
  await myAxios.get<Result<void>>('/auth/email/sendCode', { params: { email } })
}

/**
 * 邮箱验证码登录，**登录即注册**。
 *
 * 邮箱没注册过时后端会自动建号，`username` 只在那一刻生效；
 * 老用户按邮箱认人，传错 username 也能登录。
 */
export async function emailLogin(form: EmailCodeForm): Promise<LoginResult> {
  const res = await myAxios.post<Result<LoginResult>>('/auth/email/login', form)
  return res.data.data
}

/* ═══════════════════ 手机验证码链路 ═══════════════════ */

/**
 * 发送短信验证码。
 *
 * ⚠️ 同样有 60 秒防刷（code=10004）。手机号格式不对返回 code=10001。
 */
export async function sendSmsCode(mobile: string): Promise<void> {
  await myAxios.get<Result<void>>('/auth/sms/sendCode', { params: { mobile } })
}

/**
 * 手机验证码登录，**登录即注册**。语义和邮箱链路完全对称。
 */
export async function smsLogin(form: MobileCodeForm): Promise<LoginResult> {
  const res = await myAxios.post<Result<LoginResult>>('/auth/sms/login', form)
  return res.data.data
}

/* ═══════════════════ 登录态 ═══════════════════ */

/**
 * 当前登录用户的完整信息，需要请求头带 JWT（拦截器自动加）。
 *
 * ⚠️ token 缺失 / 无效 / 过期时返回的是**真 HTTP 401**（body 里 code 是
 *    15004 或 15005），拦截器会捕获 401 并清掉本地 token。
 *    所以调用方拿到 reject 就按"未登录"处理，不要再去读 msg 判断。
 *
 * ⚠️ 会员的昵称、头像应以这个接口的返回为准：JWT 里虽然也带了这两项，
 *    但用户改过头像之后 token 里还是旧值。
 */
export async function fetchCurrentMember(): Promise<MemberProfile> {
  const res = await myAxios.get<Result<MemberProfile>>('/auth/user/info')
  return res.data.data
}
