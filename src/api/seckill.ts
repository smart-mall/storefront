/**
 * 秒杀模块接口。
 *
 * 对应后端 seckill 服务的前台接口，经网关 53000 转发。
 * 请求前缀 `/api` 已经写死在 `@/tools/request` 的 baseURL 里，这里不要重复带。
 */

import { myAxios } from '@/tools/request'
import type { CurrentSeckill, Result } from '@/type'

/**
 * 当前正在进行的秒杀场次里的商品。
 *
 * 后端的契约是**永远返回数组**，没有场次时是 `[]` 而不是 null
 * （见 `SeckillService.getCurrentSeckillSkus` 的注释），所以调用方不用判空。
 */
export async function fetchCurrentSeckill(): Promise<CurrentSeckill[]> {
  const res = await myAxios.get<Result<CurrentSeckill[]>>('/seckill/front/current')
  return res.data.data
}

/**
 * 抢购。
 *
 * ⚠️ 返回的订单号**此刻订单还没落库**：后端生成订单号后发 MQ，由 order 消费后才异步建单。
 *    所以拿它去 `/pay/{orderSn}` 会 17000，必须等订单出现在列表里再跳支付。
 *
 * @param killId 场次id + "-" + skuId，由调用方从 promotionSessionId 和 skuId 拼出来
 * @param key    随机码，只在秒杀进行中才随商品详情下发，原样回传
 * @param num    购买数量
 */
export async function seckillKill(killId: string, key: string, num: number): Promise<string> {
  const res = await myAxios.post<Result<string>>('/seckill/front/kill', { killId, key, num })
  return res.data.data
}
