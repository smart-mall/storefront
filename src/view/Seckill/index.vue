<template>
  <div class="seckill">
    <header class="seckill__head">
      <h1 class="seckill__title">限时秒杀</h1>
      <p class="seckill__sub">当前场次正在进行的商品，抢购成功后订单会稍后生成</p>
    </header>

    <div v-if="loading && !data" class="seckill__skeleton">
      <el-skeleton :rows="6" animated />
    </div>

    <EmptyState v-else-if="error" :description="error">
      <el-button type="primary" @click="execute">重试</el-button>
    </EmptyState>

    <EmptyState
      v-else-if="items.length === 0"
      description="当前没有正在进行的秒杀场次，下次再来看看"
    >
      <el-button @click="router.push({ name: 'home' })">回首页</el-button>
    </EmptyState>

    <div v-else class="seckill__grid">
      <SeckillCard
        v-for="item in items"
        :key="keyOf(item)"
        :item="item"
        :now="now"
        @success="onSuccess"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElButton, ElSkeleton } from 'element-plus'
import EmptyState from '@/components/EmptyState/index.vue'
import SeckillCard from '@/components/SeckillCard/index.vue'
import { fetchCurrentSeckill } from '@/api/seckill'
import { useAsyncData } from '@/composables/useAsyncData'
import { useNow } from '@/composables/useNow'
import type { CurrentSeckill } from '@/type'

/**
 * 秒杀场次页。
 *
 * 数据源只有 `GET /seckill/front/current` —— 后端只返回**正在进行中**的场次，
 * 不返回还没开始的场次，所以这个页面没有"即将开始"的列表。
 * 卡片上的倒计时因此永远是"距结束"，还没开始的场次只可能出现在商品详情页里。
 */

const router = useRouter()

const { data, loading, error, execute } = useAsyncData(fetchCurrentSeckill)

const items = computed(() => data.value ?? [])

// 一个定时器供整页所有卡片共用，由 prop 往下传
const now = useNow()

// 同一场次里 skuId 唯一，但跨场次可能重复，所以用 场次id-skuId 做 key
function keyOf(item: CurrentSeckill): string {
  return `${item.promotionSessionId}-${item.skuId}`
}

/**
 * 抢购成功后的去向。
 *
 * ⚠️ 这里**不能**跳 `/pay/{orderSn}`：订单号是后端发 MQ 前生成的，此刻订单还没落库，
 *    支付页会查不到订单。跳"我的订单"让用户自己看到订单出现后再去支付。
 *    要做成自动跳支付得先轮询订单列表，这轮没做。
 */
function onSuccess(): void {
  void router.push({ name: 'order' })
}
</script>

<style scoped>
.seckill {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 16px;
}

.seckill__head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.seckill__title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--mall-text);
}

.seckill__sub {
  margin: 0;
  font-size: 13px;
  color: var(--mall-text-secondary);
}

.seckill__skeleton {
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
  padding: 16px;
}

.seckill__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
</style>
