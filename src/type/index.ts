/**
 * 实体类型层，业务代码统一从 `@/type` 引入。
 *
 * 按业务域分目录，不把接口平铺在一个文件里：
 *   product/  商品（分类树、SKU、详情、属性、秒杀）
 *   auth/     登录（会员、三种登录表单、登录结果）
 *   search/   检索（请求参数、筛选候选、检索结果）
 *
 * 后端统一响应结构 `Result<T>` 不在这里重新定义 —— 它属于请求层，
 * 已经在 `@/tools/request` 里声明，这里只做再导出，保证全项目只有一处定义。
 */

export type { Result } from '@/tools/request'

export type * from './product'
export type * from './auth'
export type * from './search'
