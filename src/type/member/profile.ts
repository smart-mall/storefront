/**
 * 会员资料与登录记录。
 */

/**
 * 修改资料的请求体。
 *
 * 只有这 7 个字段能改：会员等级、积分、成长值、启用状态、用户名由后端系统决定，
 * 用户改它们等于提权。整体替换语义 —— 表单会把 7 个字段全带上，清空的字段会真的被清掉。
 */
export interface ProfileUpdateForm {
  nickname: string
  header: string | null
  gender: number | null
  /** ⚠️ yyyy-MM-dd，el-date-picker 要设 value-format="YYYY-MM-DD" */
  birth: string | null
  city: string | null
  job: string | null
  sign: string | null
}

/** 一条登录记录，对应 ums_member_login_log */
export interface LoginLog {
  id: number
  memberId: number
  /** 格式 yyyy-MM-dd HH:mm:ss */
  createTime: string
  ip: string | null
  /** IP 归属城市。解析不出来时为 null */
  city: string | null
  /** 1 = web，2 = app。本项目只有 web */
  loginType: number | null
}

/**
 * 登录记录分页。
 *
 * 形状是后端 `common/vo/PageVO`（和订单列表一样），不是检索那套 SearchResult。
 */
export interface LoginLogPage {
  /** 总条数，给分页组件用 */
  total: number
  /** 当前页的登录记录 */
  rows: LoginLog[]
}

/**
 * 换绑手机号 / 邮箱的请求体。
 *
 * 用一个 value 而不是 mobile/email 两个字段：两种换绑的流程完全一样（发码 → 验码 → 提交），
 * 弹窗组件只写一份。字段名的差异由 api 层翻译。
 */
export interface ChangeContactForm {
  value: string
  code: string
}
