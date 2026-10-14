/**
 * 会员成长值、等级与成长值流水。
 *
 * 对应后端 member 模块：
 *   GET /api/member/front/jwt/growth          → 成长值 + 当前等级 + 下一级
 *   GET /api/member/front/jwt/growth/history  → 流水分页
 *
 * 等级与成长值都不在登录凭证里，只能取这两个接口的实时值。
 */

/**
 * 会员的成长状态。
 *
 * ⚠️ 等级取的是会员此刻所在的等级，它可能高过"按成长值能到的档"：等级只升不降，
 *    后台把门槛调高时会员仍留在原等级。
 */
export interface GrowthSnapshot {
  /** 当前等级主键；会员没有等级时为 null */
  levelId: number | null
  /** 当前等级名称；会员没有等级时为 null */
  levelName: string | null
  /** 成长值累计值，后端归一到 0，不会为 null */
  growth: number
  /** 当前等级的门槛；会员没有等级时为 null */
  growthPoint: number | null
  /** 下一等级名称；已是最高等级时为 null */
  nextLevelName: string | null
  /** 下一等级的成长值门槛；已是最高等级时为 null */
  nextGrowthPoint: number | null
}

/**
 * 一条成长值变动流水，对应 ums_growth_change_history。
 *
 * ⚠️ 变动类型文案由后端下发（`changeTypeText`），前端不要按 `changeType` 自己映射一遍：
 *    后端加一类变动时前端的映射表不会跟着长，那一行就显示成空白。
 */
export interface GrowthHistory {
  /** 主键，列表渲染的稳定 key */
  id: number
  /** 格式 yyyy-MM-dd HH:mm:ss */
  createTime: string
  /** 变动值，恒为正数：成长值只有增加来源，没有扣减路径 */
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
 * 成长值流水分页。
 *
 * 形状是后端 `common/vo/PageVO`（和订单、登录记录一样），不是检索那套 SearchResult。
 */
export interface GrowthHistoryPage {
  /** 总条数，给分页组件用 */
  total: number
  /** 当前页的流水 */
  rows: GrowthHistory[]
}
