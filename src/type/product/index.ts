/**
 * 商品域的实体类型。
 *
 * 对应后端 product 模块的前台接口：
 *   - `GET /api/product/front/catalog`      → CategoryNode
 *   - `GET /api/product/front/item/{skuId}` → SkuDetail
 */

export type { CategoryNode } from './category'
export type { SaleAttr, SaleAttrValue, SpuAttr, SpuAttrGroup } from './attr'
export type { SkuImage, SpuDescription } from './media'
export type { SkuAttr, SkuDetail, SkuInfo, SkuSummary } from './sku'
export type { SeckillSku } from './seckill'
