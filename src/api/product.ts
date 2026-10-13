/**
 * 商品模块接口。
 *
 * 对应后端 product 服务的前台接口，经网关 53000 转发。
 * 请求前缀 `/api` 已经写死在 `@/tools/request` 的 baseURL 里，这里不要重复带。
 */

import { myAxios } from '@/tools/request'
import type { CategoryNode, Result, SkuDetail } from '@/type'

/**
 * 首页 / 全局导航用的完整三级分类树。
 *
 * 一次请求拿到全部层级（一级的 children 是二级，二级的 children 是三级），
 * 后端已经按 sort 排好序，前端不要再排。
 */
export async function fetchCategoryTree(): Promise<CategoryNode[]> {
  const res = await myAxios.get<Result<CategoryNode[]>>('/product/front/catalog')
  return res.data.data
}

/**
 * 商品详情。
 *
 * 一次拿全详情页所需数据：基本信息、图片、销售属性、图文介绍、规格参数、秒杀信息，
 * 不需要再发第二个请求。
 *
 * ⚠️ 路径不要加 `.json` 后缀：后端 `{skuId}` 是贪婪匹配，`item/1.json` 会把
 *    `"1.json"` 整个吃进去再转 Long，结果是 400 而不是 404。
 */
export async function fetchSkuDetail(skuId: number): Promise<SkuDetail> {
  const res = await myAxios.get<Result<SkuDetail>>(`/product/front/item/${skuId}`)
  return res.data.data
}

/**
 * 提交商品评价。
 *
 * 一次提交对应一张订单里的一件商品：`orderItemId` 是订单项主键，服务端拿它去订单服务核对
 * "这一项属于你、订单已完成"，前端不要自己判断能不能评。
 *
 * 失败会抛 Error（请求层已经弹过提示），常见 code：
 *   11200 订单项不存在或不属于当前用户
 *   11201 订单还没完成（没确认收货）
 *   11203 这件商品在这张订单里已经评价过了
 *   11204 订单服务暂时不可用，这次没有落库，稍后可以重试
 */
export async function submitComment(payload: {
  orderItemId: number
  star: number
  content: string
}): Promise<void> {
  await myAxios.post<Result<null>>('/product/front/jwt/comment', payload)
}
