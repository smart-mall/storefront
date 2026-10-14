/**
 * SKU 基础信息与检索投影。
 *
 * 对应后端 `product/entity/SkuInfoEntity.java`（详情页用）
 * 和 `common/es/SkuEsModel.java`（检索列表用）。
 */

import type { SaleAttr, SpuAttrGroup } from './attr'
import type { SkuImage, SpuDescription } from './media'
import type { SeckillSku } from './seckill'

/**
 * SKU 基础信息，对应 pms_sku_info，是商品详情 `SkuDetail.info` 的类型。
 */
export interface SkuInfo {
  skuId: number
  spuId: number
  /** sku 名称 */
  skuName: string
  /** sku 介绍描述 */
  skuDesc: string | null
  /** 所属分类 id */
  catalogId: number | null
  /** 品牌 id */
  brandId: number | null
  /** 默认图片 */
  skuDefaultImg: string
  /** 标题，详情页大标题 */
  skuTitle: string
  /** 副标题，标题下方的卖点 */
  skuSubtitle: string | null
  /** 价格 */
  price: number
  /** 销量 */
  saleCount: number
}

/**
 * 检索结果里 SKU 所携带的属性。
 *
 * ⚠️ 不要和 `AttrFacet` 混用，区别在 attrValue：
 *    这里是**单值字符串**，同一属性的多个值用 `;` 连在一起；
 *    `AttrFacet.attrValue` 是聚合出来的候选值**数组**。
 */
export interface SkuAttr {
  attrId: number
  attrName: string
  attrValue: string
}

/**
 * 检索结果里的 SKU 投影，对应 `common/es/SkuEsModel.java`，
 * 即 `GET /api/search/front/list` 返回的 `data.product[]`。
 *
 * ⚠️ 它和 `SkuInfo` 不是一回事：这是商品上架时写进 ES 的快照，
 *    字段更少，但额外带了品牌名、分类名和属性，正好够画一张商品卡片。
 */
export interface SkuSummary {
  skuId: number
  spuId: number
  /**
   * 标题。
   *
   * ⚠️ 带关键字检索时后端会往里面插 `<em>` 高亮标签，
   *    卡片要用 `v-html` 渲染才会显示高亮。
   */
  skuTitle: string
  skuPrice: number
  /** 默认图片地址 */
  skuImg: string
  saleCount: number
  hasStock: boolean
  hotScore: number
  brandId: number
  /** ⚠️ 实测可能为 null（上架时没写分类的 SKU） */
  catalogId: number | null
  brandName: string
  brandImg: string
  catalogName: string
  attrs: SkuAttr[]
}

/**
 * 商品详情聚合，对应 `product/vo/SkuItemVo.java`，
 * 即 `GET /api/product/front/item/{skuId}` 的 `data`。
 *
 * 一次请求拿全详情页所有数据，前端不需要再发第二个请求。
 */
export interface SkuDetail {
  /** 基本信息 */
  info: SkuInfo
  /** 是否有货；由 ware 服务查库存得出，ware 异常时后端保持默认的 true */
  hasStock: boolean
  /** 图片列表，前端按 imgSort 升序排列 */
  images: SkuImage[]
  /** 销售属性（颜色、套餐…），用于点选切换 SKU */
  saleAttr: SaleAttr[]
  /** 商品介绍，内容是逗号分隔的图片地址 */
  desc: SpuDescription
  /** 规格参数，按 groupName 分组 */
  groupAttrs: SpuAttrGroup[]
  /** 秒杀信息，该商品不参与秒杀时为 null */
  seckillSkuVo: SeckillSku | null
  /** 商品优惠规则（满减、阶梯价与会员价），都没配时为 null */
  promotion: SkuPromotion | null
  /**
   * 按 1 件试算的赠送购物积分，由后端算好下发。
   *
   * ⚠️ 只用于显示"每件预计可得"。本单的准确数额取结算页的 `giftIntegration` ——
   *    按件数相乘后取整不是线性的（19.9 元一件与两件取整后不成倍数），前端自己乘会差几分。
   */
  unitGiftIntegration: number
  /** 按 1 件试算的赠送成长值，口径同上 */
  unitGiftGrowth: number
  /**
   * 该 sku 所有等级里最低的会员价，供展示"会员价 ¥X 起"；没配过时为 null。
   *
   * 它不需要身份：会员价配置本身是公开的，谁都能看到"最低能到多少"；具体按哪个等级成交
   * 要到结算页才知道（那里有会员凭证）。
   */
  memberPriceFrom: number | null
}

/**
 * 商品优惠规则，对应 `common/to/SkuPromotionVo.java`。
 *
 * 后端只给规则、不给算好的减免额：能减多少取决于买几件、行金额多少，由下单时在服务端算。
 * 没配置的那一段，其字段全为 null（只有满减就阶梯那三个字段为 null，反之亦然）。
 * `memberPrice` 是"你这个等级"的价（请求要带上等级才有），`memberPriceFrom` 是所有等级里的最低价。
 */
export interface SkuPromotion {
  /** 满减：满多少元 */
  fullPrice: number | null
  /** 满减：减多少元 */
  reducePrice: number | null
  /** 阶梯价：满几件 */
  fullCount: number | null
  /** 阶梯价：打几折，0.75 表示七五折 */
  discount: number | null
  /** 阶梯价：折后单价；与 discount 同时有值时以它为准 */
  ladderPrice: number | null
  /** 会员价：你这个等级能拿到的价；没传等级或这个等级没配时为 null */
  memberPrice: number | null
  /** 会员价：所有等级里的最低价，详情页用它显示"¥X 起"；没配过时为 null */
  memberPriceFrom: number | null
}
