/**
 * 检索域的实体类型。
 *
 * 对应后端 search 模块的前台接口 `GET /api/search/front/list`。
 */

export type { ChipKey, AttrFacet, BrandFacet, CatalogFacet, FilterChip } from './facet'
export type { SearchQuery, SearchSort, StockFilter } from './query'
export type { SearchPage, SearchResult } from './result'
