/**
 * 商品模块接口。
 *
 * 对应后端 product 服务的前台接口，经网关 53000 转发。
 * 请求前缀 `/api` 已经写死在 `@/tools/request` 的 baseURL 里，这里不要重复带。
 */

import { myAxios } from '@/tools/request'
import type {
  CategoryNode,
  CommentPage,
  CommentReply,
  CommentSummary,
  PublicCommentPage,
  Result,
  SkuDetail,
} from '@/type'

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

/**
 * 我的评价分页。
 *
 * 只返回自己写的评价，按评价时间倒序；归属由服务端按会员判断，前端不需要传会员。
 *
 * ⚠️ 分页参数是 `page` / `limit`（后端 `PageQuery` 固定这两个名字），
 *    与检索那套 `pageNum` / `pageSize` 不是一回事。
 */
export async function fetchMyComments(params: {
  page: number
  limit: number
}): Promise<CommentPage> {
  const res = await myAxios.get<Result<CommentPage>>('/product/front/jwt/comment/my', { params })
  return res.data.data
}

/**
 * 删除我的一条评价。
 *
 * 归属由服务端判断：评价不存在、或不是自己写的，都返回 11205（请求层已经弹过提示）。
 * 删除后这一项可以重新评价 —— 唯一索引不再被占用。
 */
export async function deleteComment(commentId: number): Promise<void> {
  await myAxios.delete<Result<null>>(`/product/front/jwt/comment/${commentId}`)
}

/**
 * 某件商品的评价分页。
 *
 * 公开接口，不要求登录：商品页不登录也要能看到评价。按 **SPU** 聚合 ——
 * 一款商品多个规格时评价聚在一起，每行用 `spuAttributes` 标明买的是哪个规格。
 *
 * ⚠️ 分页参数是 `page` / `limit`（后端 `PageQuery` 固定这两个名字）。
 */
export async function fetchSpuComments(params: {
  spuId: number
  page: number
  limit: number
}): Promise<PublicCommentPage> {
  const res = await myAxios.get<Result<PublicCommentPage>>('/product/front/comment/list', {
    params,
  })
  return res.data.data
}

/**
 * 某件商品的评价统计：总数、平均分与星级分布。
 *
 * 与列表同一套过滤口径，所以 `total` 与列表的总数一致，不会出现"标题 10 条、列表 6 条"。
 */
export async function fetchCommentSummary(spuId: number): Promise<CommentSummary> {
  const res = await myAxios.get<Result<CommentSummary>>('/product/front/comment/summary', {
    params: { spuId },
  })
  return res.data.data
}

/**
 * 给一条评价或回复点赞。
 *
 * ⚠️ `commentId` 既可以是评价 ID，也可以是回复 ID —— 两者存在同一张表里、ID 全局唯一。
 *
 * 不做幂等：后端只维护计数，重复调用会重复加，所以调用方必须先确定这次是"点赞"还是"取消"
 * （前端按 localStorage 里的记录判断，见 `@/tools/likedComments`）。
 *
 * 失败会抛 Error（请求层已经弹过提示），常见 code：
 *   11206 不能给自己写的评价或回复点赞
 *   11205 这一行不存在或已不可见
 *
 * @returns 更新后的获赞数
 */
export async function likeComment(commentId: number): Promise<number> {
  const res = await myAxios.post<Result<number>>(`/product/front/jwt/comment/${commentId}/like`)
  return res.data.data
}

/**
 * 取消给一条评价或回复的点赞。
 *
 * 校验与点赞相同，计数减一且不会减到负数；服务端不校验"之前点过没有"。
 *
 * @returns 更新后的获赞数
 */
export async function unlikeComment(commentId: number): Promise<number> {
  const res = await myAxios.delete<Result<number>>(`/product/front/jwt/comment/${commentId}/like`)
  return res.data.data
}

/**
 * 在一条评价下发表回复。
 *
 * 回复只挂一层：`commentId` 必须是被回复的**评价**主键，对回复再回复会被后端拒绝（11205）。
 * 回复人与昵称由服务端从登录身份里取，前端只传内容。
 */
export async function replyComment(commentId: number, content: string): Promise<CommentReply> {
  const res = await myAxios.post<Result<CommentReply>>(
    `/product/front/jwt/comment/${commentId}/reply`,
    { content },
  )
  return res.data.data
}
