/**
 * 检索模块接口。
 *
 * 对应后端 search 服务的 `GET /api/search/front/list`，经网关 53000 转发。
 */

import { myAxios } from '@/tools/request'
import type { Result, SearchQuery, SearchResult } from '@/type'

/**
 * 把查询条件拼成 query string。
 *
 * 为什么不直接把对象丢给 axios：
 *   `brandId` / `attrs` 是**可重复的 query key**（`brandId=1&brandId=2`），
 *   而 axios 默认会把数组拼成 `brandId[]=1&brandId[]=2`，并且它的 encode 会把
 *   `[` `]` 还原成原字符（不做百分号转义）。Tomcat 默认拒绝请求目标里的方括号，
 *   于是拿到的是 **HTTP 400 + 一张 Tomcat 的 HTML 错误页** —— 没有 code、没有 msg，
 *   前端只能弹"请求失败（HTTP 400）"，根本看不出是参数序列化引起的。
 *
 *   实测（经网关打真实后端）：
 *     brandId=1              → 200，3 条
 *     brandId[]=1（原样方括号）→ 400，Tomcat 错误页
 *     brandId%5B%5D=1（转义）  → 200，3 条     ← 说明 Spring 本身能绑定 [] 形式，
 *                                             这个坑纯粹来自客户端序列化方式
 *   所以这里自己拼 URLSearchParams：它会把方括号一并转义，axios 遇到
 *   URLSearchParams 也直接用它 toString()，不再走默认序列化。
 *
 * 值为 undefined 的参数不拼（后端按"没传"处理）；
 * 但要保留 0 和空字符串 —— `hasStock=0` 是有意义的取值。
 */
function buildSearchParams(query: SearchQuery): URLSearchParams {
  const params = new URLSearchParams()

  const append = (key: string, value: string | number | undefined): void => {
    if (value !== undefined) {
      params.append(key, String(value))
    }
  }

  const appendAll = (key: string, values: number[] | string[] | undefined): void => {
    if (values) {
      for (const value of values) {
        params.append(key, String(value))
      }
    }
  }

  append('keyword', query.keyword)
  append('catalog3Id', query.catalog3Id)
  appendAll('brandId', query.brandId)
  appendAll('attrs', query.attrs)
  append('skuPrice', query.skuPrice)
  append('hasStock', query.hasStock)
  append('sort', query.sort)
  append('pageNum', query.pageNum)
  append('pageSize', query.pageSize)

  return params
}

/**
 * 商品检索。
 *
 * 不传任何条件就是"全部商品"，首页的商品列表也走这个接口
 * （传 `sort: 'hotScore_desc'` 当热门）。
 *
 * 返回里的 `brands` / `attrs` / `catalogs` 就是筛选面板的候选，
 * 后端保证候选不会被自己的筛选条件收窄，所以勾选后仍能改选别的。
 *
 * 参数不合法（排序字段写错、价格区间格式不对、每页条数超 100 等）
 * 返回 code=10001，由拦截器统一弹提示。
 */
export async function searchSkus(query: SearchQuery = {}): Promise<SearchResult> {
  const res = await myAxios.get<Result<SearchResult>>('/search/front/list', {
    params: buildSearchParams(query),
  })
  return res.data.data
}
