/**
 * 会员积分与积分流水。
 *
 * 对应后端 member 模块：
 *   GET /api/member/front/jwt/integration          → 余额（数字）
 *   GET /api/member/front/jwt/integration/history  → 流水分页
 *
 * 积分余额是"当前值"，不是登录凭证里那份 —— 凭证里的积分是登录那一刻的快照，下过单之后就不准了。
 */

/**
 * 一条积分变动流水，对应 ums_integration_change_history。
 *
 * ⚠️ 变动类型文案由后端下发（`changeTypeText`），前端不要再自己按 `changeType` 映射一遍：
 *    后端加一类变动时，前端的映射表不会跟着长，那一行就会显示成空白。
 */
export interface IntegrationHistory {
  /** 主键，列表渲染的稳定 key */
  id: number
  /** 格式 yyyy-MM-dd HH:mm:ss */
  createTime: string
  /** 变动值：正数表示增加、负数表示减少 */
  changeCount: number
  /** 变动类型取值；没有订单来源的变动（如管理员手工调整）为 null */
  changeType: number | null
  /** 变动类型文案；没有订单来源的变动为 null，展示时按"其他变动"兜底 */
  changeTypeText: string | null
  /** 关联订单号；没有订单来源的变动为 null */
  orderSn: string | null
  /** 备注 */
  note: string | null
}

/**
 * 积分流水分页。
 *
 * 形状是后端 `common/vo/PageVO`（和订单、登录记录一样），不是检索那套 SearchResult。
 */
export interface IntegrationHistoryPage {
  /** 总条数，给分页组件用 */
  total: number
  /** 当前页的流水 */
  rows: IntegrationHistory[]
}
