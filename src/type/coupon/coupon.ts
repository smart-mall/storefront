/**
 * 优惠券模块类型。
 *
 * 对应后端 coupon 模块的三个会员端接口：
 *   GET  /api/coupon/front/jwt/receivable     → CouponReceivable[]  券中心（可领取）
 *   GET  /api/coupon/front/jwt/myCoupons      → MyCouponPage        我的券
 *   POST /api/coupon/front/jwt/receive/{id}   → null                领券
 *
 * ⚠️ 时间字段都是 `"2026-09-29 12:00:00"` 这种字符串，既不是毫秒时间戳也不是 ISO8601 ——
 *    后端 Jackson 配的就是这个格式。`new Date(...)` 在部分浏览器上解析不出来，
 *    要显示就直接用字符串。这和秒杀那套（毫秒时间戳，走 Redis）不是一回事。
 */

/**
 * 适用范围，取值见后端 `sms_coupon.use_type`。
 *
 * ⚠️ 与下面 `CouponUseStatus` 同名不同义：这个是"能买什么"，那个是"用掉没有"。
 */
export type CouponUseType = 0 | 1 | 2

/** 领取记录的使用状态，取值见后端 `CouponUseStatusEnum`。 */
export type CouponUseStatus = 0 | 1 | 2 | 3

/**
 * 券中心里的一张可领取券。
 *
 * 后端只返回"此刻真的领得到"的券（已发布、在领取窗口内、还有余量、不限会员等级），
 * 所以 `remainCount` 恒大于 0。已经被我领满的券**仍然会返回** —— 列表里要显示成"已领取"
 * 而不是让它凭空消失。
 */
export interface CouponReceivable {
  couponId: number
  couponName: string
  amount: number
  minPoint: number
  useType: CouponUseType
  /** 券的可使用结束时间 */
  endTime: string
  /** 领取截止时间 */
  enableEndTime: string
  /** 剩余可领张数 */
  remainCount: number
  /** 当前会员已领张数 */
  receivedCount: number
  /** 每人限领张数 */
  perLimit: number
}

/**
 * 我的一张券：领取记录 + 券模板上要展示的字段（后端回查券模板补的）。
 *
 * 这是"前端用到的字段"的投影：后端还带了 `memberId`、`memberNickName` 等，列表用不上。
 */
export interface MyCoupon {
  /** 领取记录主键。提交订单时指定用哪张券，传的就是它 */
  id: number
  couponId: number
  /** 领取方式：0 后台赠送，1 主动领取 */
  getType: number
  createTime: string
  useType: CouponUseStatus
  /** 使用状态文案，后端现算的 —— 不要在前端再维护一份状态码到文案的映射 */
  useTypeText: string
  useTime: string | null
  /** 占用或核销这张券的订单号；没占用时为 null */
  orderSn: string | null
  couponName: string | null
  amount: number | null
  minPoint: number | null
  couponStartTime: string | null
  couponEndTime: string | null
}

/** 我的券分页，形状是后端 `common/vo/PageVO`（total / rows）。 */
export interface MyCouponPage {
  total: number
  rows: MyCoupon[]
}
