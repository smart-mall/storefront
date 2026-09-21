/**
 * 登录相关的表单与响应。
 *
 * 对应后端 `auth/vo/UserAccountVo / UserEmailVo / UserMobileVo`
 * 和 `auth/controller/AbstractLoginController#issueToken`。
 *
 * 三条链路是彼此独立的，不能互相替代：
 *   - 账号密码：有独立的注册动作，两个接口
 *   - 邮箱验证码 / 手机验证码：**登录即注册**，没有注册接口
 * 所以表单类型也分成三个，不要合并。
 */

import type { MemberProfile } from './member'

/**
 * 账号密码表单，**注册和登录共用**（后端也是一个 VO）。
 *
 * 因此没有"确认密码"字段 —— 两次输入是否一致由前端校验，
 * 后端只认最终那一个 password。
 */
export interface AccountForm {
  /** 账号，6-19 字符 */
  username: string
  /** 密码，6-18 字符 */
  password: string
}

/**
 * 邮箱验证码表单。
 *
 * `username` 只在"这个邮箱还没注册过、需要新建账号"时才会被用到；
 * 老用户走这条链路是按**邮箱**认人的，填错账号也不影响登录。
 */
export interface EmailCodeForm {
  /** 账号，6-19 字符，仅新建账号时生效 */
  username: string
  /** 邮箱 */
  email: string
  /** 邮箱收到的验证码 */
  code: string
}

/**
 * 手机验证码表单，和邮箱链路完全对称：
 * `username` 只在新建账号时生效，老用户按**手机号**认人。
 */
export interface MobileCodeForm {
  /** 账号，6-19 字符，仅新建账号时生效 */
  username: string
  /** 手机号，1[3-9] 开头的 11 位 */
  mobile: string
  /** 短信验证码 */
  code: string
}

/** JWT 本身 */
export interface TokenPayload {
  /** 存 localStorage，请求时放进 Authorization 头（拦截器已自动处理） */
  token: string
  /** 有效期，单位秒，后端配置是 604800（7 天） */
  expiresIn: number
}

/**
 * 登录成功后的完整 `data`：`{ token, expiresIn, user }`。
 *
 * 取值是两层的 `res.data.data`，所以 api 层直接把这一层解出来返回。
 */
export interface LoginResult extends TokenPayload {
  user: MemberProfile
}
