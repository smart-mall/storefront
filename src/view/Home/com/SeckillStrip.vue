<template>
  <!-- 没有场次时整块不渲染：宁可少一块，也不要留一个"暂无数据"的空条占着首页 -->
  <section v-if="items.length > 0" class="strip">
    <div class="strip__head">
      <h2 class="strip__title">限时秒杀</h2>
      <span class="strip__clock">{{ clockText }}</span>
      <RouterLink class="strip__more" :to="{ name: 'seckill' }">全部秒杀 &gt;</RouterLink>
    </div>

    <div class="strip__row">
      <SeckillCard
        v-for="item in items"
        :key="`${item.promotionSessionId}-${item.skuId}`"
        class="strip__card"
        :item="item"
        :now="now"
        @success="onSuccess"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import SeckillCard from '@/components/SeckillCard/index.vue'
import { fetchCurrentSeckill } from '@/api/seckill'
import { useAsyncData } from '@/composables/useAsyncData'
import { useNow } from '@/composables/useNow'
import { formatCountdown } from '@/tools/time'

/**
 * 首页秒杀栏。
 *
 * 对应改造前 index.html 里那段 `$.get("http://seckill.gulimall.com/getCurrentSeckillSkus")`
 * 拼出来的秒杀区。区别是这里没有"当前时间在不在场次内"的判断 —— 后端 `/seckill/front/current`
 * 只返回正在进行中的场次，拿到的必然是能抢的。所以整块要么不渲染，要么都是可抢的。
 *
 * 数据是**匿名可读**的：没登录也要能在首页看到秒杀商品，点抢购才会被要求登录。
 */

const router = useRouter()

const { data } = useAsyncData(fetchCurrentSeckill)

const items = computed(() => data.value ?? [])

const now = useNow()

/**
 * 同一场次里所有商品的结束时间是同一个值，所以这里取第一条算一次就够，
 * 不用每个卡片各算一遍。列表为空时 items[0] 是 undefined，用 ?. 兜住。
 */
const clockText = computed(() => {
  const first = items.value[0]
  if (!first) {
    return ''
  }
  return `距结束 ${formatCountdown(first.endTime - now.value)}`
})

/**
 * 抢购成功。
 *
 * 和其他两处一样不跳支付页：订单号是发 MQ 前生成的，订单还没落库。
 * 首页这里直接去"我的订单"，用户能在那里看到订单出现后再点支付。
 */
function onSuccess(): void {
  void router.push({ name: 'order' })
}
</script>

<style scoped>
.strip {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
  padding: 16px;
}

.strip__head {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.strip__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--mall-primary);
}

.strip__clock {
  font-size: 13px;
  color: var(--mall-text-secondary);
  font-variant-numeric: tabular-nums;
}

.strip__more {
  margin-left: auto;
  font-size: 13px;
  color: var(--mall-text-secondary);
  text-decoration: none;
}

.strip__more:hover {
  color: var(--mall-primary);
}

/* 横向排布，放不下就横向滚动，不换行 —— 首页是一栏，换行会把热门商品挤到很下面 */
.strip__row {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.strip__card {
  flex: 0 0 180px;
}
</style>
