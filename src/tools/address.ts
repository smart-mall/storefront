/**
 * 收货地址的展示格式化。
 *
 * 放 tools/ 而不是写在组件里：结算页的地址卡片和订单卡片都要拼这一串，
 * 而且它是纯函数，按 tools/ 的约定可以直接用 node 跑断言验证。
 */

import type { MemberAddress } from '@/type'

/**
 * 把地址的几段拼成一行，null / 空串会被丢掉。
 *
 * 逐段过滤而不是直接 join(' ')：省市区在库里允许为 null（实测有的地址 region 就是 null），
 * 不过滤会拼出 "湖南 长沙 null 望城区" 这种脏字符串。
 *
 * 单独暴露这个通用版本是因为订单卡片拼的是 `receiverProvince` 那一套字段
 * （订单表里存的是下单时的收货快照），形状和 MemberAddress 不一样。
 */
export function joinAddress(parts: (string | null | undefined)[]): string {
  return parts.filter((part): part is string => typeof part === 'string' && part !== '').join(' ')
}

/** 收货地址对象 → 一行地址 */
export function formatAddress(address: MemberAddress): string {
  return joinAddress([address.province, address.city, address.region, address.detailAddress])
}
