/**
 * 会员信息。
 *
 * 对应后端 `common/vo/MemberResponseVo.java`，两个地方会用到：
 *   - 登录成功时的 `LoginResult.user`
 *   - `GET /api/auth/front/jwt/user/info` 的 `data`
 *
 * ⚠️ 后端标了 `@JsonIgnore` 的字段**不会**出现在响应里，所以这里不声明：
 *   - `password`    BCrypt 哈希
 *   - `accessToken` 微博令牌，拿到就能冒充用户去调微博
 *   - `expiresIn`   社交登录的过期时间，是 long 基本类型、永远序列化成 0，
 *                   而登录响应里 data.expiresIn 是 JWT 的有效期（604800），
 *                   两个同名字段在同一个响应里值却不同，后端索性不输出
 */
export interface MemberProfile {
  id: number
  /** 会员等级 id；库里没有默认等级时后端会留空 */
  levelId: number | null
  username: string
  nickname: string
  mobile: string | null
  email: string | null
  /** 头像地址 */
  header: string | null
  gender: MemberGender | null
  /**
   * 生日。
   *
   * ⚠️ 格式是 `yyyy-MM-dd HH:mm:ss`（如 `2026-09-20 19:57:04`），
   *    **不是** ISO-8601，dayjs 直接解析即可，别用 `new Date()` 硬解。
   */
  birth: string | null
  /** 所在城市 */
  city: string | null
  /** 职业 */
  job: string | null
  /** 个性签名 */
  sign: string | null
  /** 用户来源 */
  sourceType: number | null
  /** 积分 */
  integration: number | null
  /** 成长值 */
  growth: number | null
  /** 启用状态 */
  status: number | null
  /** 注册时间，格式同 birth */
  createTime: string
  /** 社交登录 uid */
  socialUid: string | null
}

/**
 * 性别。
 *
 * 后端是 Integer：0 未知 / 1 男 / 2 女。
 * 这里用字面量联合而不是 enum —— tsconfig 开了 `erasableSyntaxOnly`，
 * enum 会生成运行时代码，直接编译报错。
 */
export type MemberGender = 0 | 1 | 2
