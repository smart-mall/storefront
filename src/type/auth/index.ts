/**
 * 登录域的实体类型。
 *
 * 对应后端 auth 模块：
 *   - `/api/auth/account/{register,login}`
 *   - `/api/auth/email/{sendCode,login}`
 *   - `/api/auth/sms/{sendCode,login}`
 *   - `GET /api/auth/user/info`
 */

export type { MemberGender, MemberProfile } from './member'
export type { AccountForm, EmailCodeForm, LoginResult, MobileCodeForm, TokenPayload } from './login'
