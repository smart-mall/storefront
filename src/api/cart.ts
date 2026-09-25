/**
 * 购物车模块接口。
 *
 * 对应后端 cart 服务，经网关 53000 的 `/api/cart/front/jwt/**` 转发。
 *
 * ⚠️ 购物车的**所有**接口都要求登录。未登录时后端返回 code 15004，请求层会清掉本地登录态
 *    但不弹提示，所以调用方要先确认登录态，别指望请求失败能给出反馈 —— 见 store/cart.ts 的 requireLogin。
 */

import { myAxios } from '@/tools/request'
import type {
  AddCartItemPayload,
  Cart,
  CartItem,
  ChangeCartItemCountPayload,
  CheckCartItemPayload,
  CheckCartItemsPayload,
  Result,
} from '@/type'

/** 整车（含未勾选项） */
export async function fetchCart(): Promise<Cart> {
  const res = await myAxios.get<Result<Cart>>('/cart/front/jwt/list')
  return res.data.data
}

/**
 * 购物车中已勾选的商品项，价格已刷新到最新。订单确认页用。
 *
 * 目前没有调用方（结算页还没做），留着是因为 order 那边已经在用同一条路径，
 * 前端接结算时可以复用，免得又去猜后端返回的是整车还是列表。
 */
export async function fetchCheckedCartItems(): Promise<CartItem[]> {
  const res = await myAxios.get<Result<CartItem[]>>('/cart/front/jwt/checked')
  return res.data.data
}

/** 加购。车里已有这个 sku 就累加数量 */
export async function addCartItem(payload: AddCartItemPayload): Promise<Cart> {
  const res = await myAxios.post<Result<Cart>>('/cart/front/jwt/items', payload)
  return res.data.data
}

/** 改数量。绝对值，不是增量 */
export async function changeCartItemCount(
  skuId: number,
  payload: ChangeCartItemCountPayload,
): Promise<Cart> {
  const res = await myAxios.put<Result<Cart>>(`/cart/front/jwt/items/${skuId}/count`, payload)
  return res.data.data
}

/** 勾选 / 取消勾选单项 */
export async function checkCartItem(skuId: number, payload: CheckCartItemPayload): Promise<Cart> {
  const res = await myAxios.put<Result<Cart>>(`/cart/front/jwt/items/${skuId}/check`, payload)
  return res.data.data
}

/** 批量勾选 / 全选反选 */
export async function checkCartItems(payload: CheckCartItemsPayload): Promise<Cart> {
  const res = await myAxios.put<Result<Cart>>('/cart/front/jwt/items/check', payload)
  return res.data.data
}

/** 删除单项 */
export async function deleteCartItem(skuId: number): Promise<Cart> {
  const res = await myAxios.delete<Result<Cart>>(`/cart/front/jwt/items/${skuId}`)
  return res.data.data
}

/**
 * 批量删除。
 *
 * ⚠️ skuIds 不能用 axios 的数组默认序列化：它会拼成 `skuIds[]=1&skuIds[]=2`，
 *    而且方括号会被原样放出来（不做百分号转义）。Tomcat 默认拒绝请求目标里的方括号，
 *    拿到的是 HTTP 400 + 一张 Tomcat 的 HTML 错误页 —— 没有 code、没有 msg。
 *    这和检索接口的 brandId 是同一个坑，详见 `api/search.ts` 里那段实测记录。
 *
 *    自己拼 URLSearchParams 发**可重复的 query key**（`skuIds=1&skuIds=2`），
 *    这正是 Spring 对 `@RequestParam List<Long>` 的绑定方式。实测 `?skuIds=10`
 *    能正常删掉那一项，重复 key 走的是同一套绑定。
 */
export async function deleteCartItems(skuIds: number[]): Promise<Cart> {
  const params = new URLSearchParams()
  for (const skuId of skuIds) {
    params.append('skuIds', String(skuId))
  }
  const res = await myAxios.delete<Result<Cart>>('/cart/front/jwt/items', { params })
  return res.data.data
}
