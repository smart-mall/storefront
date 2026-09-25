/**
 * 登录域的实体类型。
 *
 * 对应后端 auth 模块：
 *   - `/api/auth/front/account/{register,login}`
 *   - `/api/auth/front/email/{sendCode,login}`
 *   - `/api/auth/front/sms/{sendCode,login}`
 *   - `GET /api/auth/front/jwt/user/info`
 */

export type { MemberGender, MemberProfile } from './member'
export type { AccountForm, EmailCodeForm, LoginResult, MobileCodeForm, TokenPayload } from './login'
