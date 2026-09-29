/**
 * 优惠券模块接口。
 *
 * 对应后端 coupon 服务，经网关 53000 的 `/api/coupon/front/jwt/**` 转发。
 *
 * ⚠️ 这三个接口都要求登录。未登录时后端返回 code 15004，请求层会清掉本地登录态。
 *    页面已经在路由上要求登录（`requiresAuth`），所以这里不再各自判一次。
 */

import { myAxios } from '@/tools/request'
import type { CouponReceivable, MyCouponPage, Result } from '@/type'

/**
 * 券中心：当前可领取的券。
 *
 * 后端已经过滤过一遍 —— 只返回已发布、在领取窗口内、还有余量且不限会员等级的券，
 * 所以拿到的都能领（`remainCount` 恒大于 0）。已经被我领满的券仍然在列表里，
 * 靠 `receivedCount` 与 `perLimit` 判断按钮该显示成"已领取"。
 */
export async function fetchReceivableCoupons(): Promise<CouponReceivable[]> {
  const res = await myAxios.get<Result<CouponReceivable[]>>('/coupon/front/jwt/receivable')
  return res.data.data
}

/**
 * 领一张券。
 *
 * 失败会抛 Error（请求层已经弹过提示），常见 code：
 *   22006 当前不可领取（窗口关了或没发布）
 *   22007 已领完 —— 别人在你点之前把余量领光了
 *   22008 已达每人限领
 */
export async function receiveCoupon(couponId: number): Promise<void> {
  await myAxios.post<Result<null>>(`/coupon/front/jwt/receive/${couponId}`)
}

/**
 * 我的券分页。
 *
 * ⚠️ 分页参数是 `page` / `limit`（后端 `PageQuery` 固定这两个名字），
 *    传 pageNum/pageSize 会被当未知参数忽略，于是永远只拿到第一页。
 *
 * @param useType 按使用状态筛选：0 未使用 / 1 已使用 / 2 已过期；不传就是全部
 */
export async function fetchMyCoupons(params: {
  page: number
  limit: number
  useType?: number
}): Promise<MyCouponPage> {
  const res = await myAxios.get<Result<MyCouponPage>>('/coupon/front/jwt/myCoupons', { params })
  return res.data.data
}
