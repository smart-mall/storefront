import type { FormItemRule } from 'element-plus'

/**
 * 表单校验工具。
 *
 * 这里的规则是**照着后端 VO 抄的**，目的是让用户在前端就被拦住，
 * 而不是等一个来回再看到 10001。后端仍然是最终防线，前端校验不替代它。
 *
 * 对应关系：
 *   email  ← auth/vo/UserEmailVo#email  @Email
 *   mobile ← auth/vo/UserMobileVo#mobile @Pattern("^1[3-9]\\d{9}$")
 *   username 长度 ← 两个 VO 上的 @Length(min = 6, max = 19)
 *   password 长度 ← UserAccountVo#password @Length(min = 6, max = 18)
 */

/** 账号长度，对应后端 @Length(min = 6, max = 19) */
export const USERNAME_MIN = 6
export const USERNAME_MAX = 19

/** 密码长度，对应后端 @Length(min = 6, max = 18) */
export const PASSWORD_MIN = 6
export const PASSWORD_MAX = 18

/** 验证码防刷间隔（秒），后端 60 秒内重复发送会返回 code=10004 */
export const CODE_COOLDOWN_SECONDS = 60

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MOBILE_PATTERN = /^1[3-9]\d{9}$/

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email)
}

export function isValidMobile(mobile: string): boolean {
  return MOBILE_PATTERN.test(mobile)
}

/* ═══════════════════ Element Plus 表单规则 ═══════════════════ */

export const usernameRules: FormItemRule[] = [
  { required: true, message: '账号不能为空', trigger: 'blur' },
  {
    min: USERNAME_MIN,
    max: USERNAME_MAX,
    message: `账号长度在 ${USERNAME_MIN}-${USERNAME_MAX} 字符`,
    trigger: 'blur',
  },
]

export const passwordRules: FormItemRule[] = [
  { required: true, message: '密码必须填写', trigger: 'blur' },
  {
    min: PASSWORD_MIN,
    max: PASSWORD_MAX,
    message: `密码必须是 ${PASSWORD_MIN}-${PASSWORD_MAX} 位字符`,
    trigger: 'blur',
  },
]

export const emailRules: FormItemRule[] = [
  { required: true, message: '邮箱不能为空', trigger: 'blur' },
  {
    validator: (_rule, value: string, callback) => {
      if (isValidEmail(value)) {
        callback()
      } else {
        callback(new Error('邮箱格式不正确'))
      }
    },
    trigger: 'blur',
  },
]

export const mobileRules: FormItemRule[] = [
  { required: true, message: '手机号不能为空', trigger: 'blur' },
  {
    validator: (_rule, value: string, callback) => {
      if (isValidMobile(value)) {
        callback()
      } else {
        callback(new Error('手机号格式不正确'))
      }
    },
    trigger: 'blur',
  },
]

export const codeRules: FormItemRule[] = [
  { required: true, message: '验证码不能为空', trigger: 'blur' },
]
