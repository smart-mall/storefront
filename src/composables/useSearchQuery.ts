/**
 * 检索条件的 URL 读写。
 *
 * 这是"URL 是筛选条件唯一真相"这条设计的落点：视图不持有条件，
 * 只从这里读 `query`，改动则调 `setParams` 让 URL 变、再触发重新请求。
 *
 * 好处是刷新、后退、分享链接全部零成本 —— 不需要任何同步代码。
 *
 * 参数协议（和后端 SearchParam 一一对应）在这一处收口，视图里不要自己拼 query：
 *   brandId    可重复 key   → number[]
 *   attrs      可重复 key，每项形如 `属性id_属性值`，同属性多值用 `:` 连接
 *   skuPrice   `最低_最高` / `_最高` / `最低_`
 *   hasStock   1 或 0
 *   sort       `字段_asc|desc`，字段只能是 skuPrice / saleCount / hotScore
 */

import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { LocationQuery, LocationQueryRaw } from 'vue-router'
import type { FilterChip, SearchQuery, SearchSort, StockFilter } from '@/type'

const SORTS: readonly string[] = [
  'skuPrice_asc',
  'skuPrice_desc',
  'saleCount_asc',
  'saleCount_desc',
  'hotScore_asc',
  'hotScore_desc',
]

/** query 里的单值统一取成 string，多值取成 string[]，其余一律丢弃 */
function single(query: LocationQuery, key: string): string | undefined {
  const value = query[key]
  return typeof value === 'string' && value !== '' ? value : undefined
}

function multiple(query: LocationQuery, key: string): string[] {
  const value = query[key]
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item !== '')
  }
  return typeof value === 'string' && value !== '' ? [value] : []
}

function toNumber(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined
  }
  const parsed = Number(value)
  // URL 是用户可以随手改的，解析不出来就当没传，交给后端兜默认值
  return Number.isFinite(parsed) ? parsed : undefined
}

function toStock(value: string | undefined): StockFilter | undefined {
  if (value === '1') {
    return 1
  }
  if (value === '0') {
    return 0
  }
  return undefined
}

/**
 * 把 URL query 解析成检索参数。
 *
 * sort 这里做了白名单校验：URL 上写个 `sort=price_asc` 后端会返回 10001，
 * 与其让用户看到那个报错，不如直接当没传。
 */
export function parseSearchQuery(query: LocationQuery): SearchQuery {
  const sort = single(query, 'sort')
  return {
    keyword: single(query, 'keyword'),
    catalog3Id: toNumber(single(query, 'catalog3Id')),
    brandId: multiple(query, 'brandId').map(Number).filter(Number.isFinite),
    attrs: multiple(query, 'attrs'),
    skuPrice: single(query, 'skuPrice'),
    hasStock: toStock(single(query, 'hasStock')),
    sort: sort && SORTS.includes(sort) ? (sort as SearchSort) : undefined,
    pageNum: toNumber(single(query, 'pageNum')),
    pageSize: toNumber(single(query, 'pageSize')),
  }
}

type PatchValue = string | number | (string | number)[] | undefined

export function useSearchQuery() {
  const route = useRoute()
  const router = useRouter()

  const query = computed<SearchQuery>(() => parseSearchQuery(route.query))

  /**
   * 按 patch 改条件。
   *
   * 规则：
   *   - patch 里值为 undefined / '' 的项 → 从 URL 删掉
   *   - 没显式传 pageNum 时，页码自动回到第 1 页（改了条件还停在第 5 页没意义）
   */
  function setParams(patch: Record<string, PatchValue>): void {
    if (!route.name) {
      return
    }

    const next: LocationQueryRaw = {}
    for (const [key, value] of Object.entries(route.query)) {
      if (typeof value === 'string') {
        next[key] = value
      } else if (Array.isArray(value)) {
        next[key] = value.filter((item): item is string => typeof item === 'string')
      }
    }

    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === '') {
        delete next[key]
      } else {
        next[key] = Array.isArray(value) ? value.map(String) : value
      }
    }

    if (!('pageNum' in patch)) {
      delete next.pageNum
    }

    void router.push({ name: route.name, query: next })
  }

  /** 点 chips 上的 ✕：从对应参数里去掉这一个值 */
  function removeChip(chip: FilterChip): void {
    const key: string = chip.removeKey

    if (key === 'attrs' || key === 'brandId') {
      const current = multiple(route.query, key)
      const remaining = current.filter((item) => item !== chip.removeValue)
      setParams({ [key]: remaining.length > 0 ? remaining : undefined })
      return
    }

    setParams({ [key]: undefined })
  }

  /** 清空全部条件 */
  function reset(): void {
    if (!route.name) {
      return
    }
    void router.push({ name: route.name, query: {} })
  }

  return { query, setParams, removeChip, reset }
}

/** 把 URL query 里的页码/每页条数取成可用数值 */
export function readPaging(query: SearchQuery): { pageNum: number; pageSize: number } {
  return {
    pageNum: query.pageNum && query.pageNum > 0 ? query.pageNum : 1,
    pageSize: query.pageSize && query.pageSize > 0 ? query.pageSize : 20,
  }
}
