<template>
  <div class="item">
    <div v-if="loading && !detail" class="item__loading">
      <el-skeleton :rows="8" animated />
    </div>

    <EmptyState v-else-if="!detail" :description="error ?? '商品不存在'">
      <el-button type="primary" @click="router.push({ name: 'home' })">回首页</el-button>
    </EmptyState>

    <template v-else>
      <!--
        面包屑：详情接口只给了 catalogId、没有分类名，从全局缓存的分类树里查。
        ⚠️ 中间几级**不做链接** —— 检索接口只认三级分类 id（catalog3Id），
           拿一级/二级的 id 去查会返回 0 条，做成链接等于埋一个空结果陷阱。
      -->
      <nav v-if="breadcrumb.length > 0" class="crumb">
        <RouterLink class="crumb__link" :to="{ name: 'home' }">首页</RouterLink>
        <template v-for="node in breadcrumb" :key="node.catId">
          <span class="crumb__sep">/</span>
          <span class="crumb__text">{{ node.name }}</span>
        </template>
      </nav>

      <div class="item__top">
        <ImageGallery
          :images="detail.images"
          :fallback="detail.info.skuDefaultImg"
          :alt="detail.info.skuTitle"
        />

        <div class="item__info">
          <h1 class="item__title">{{ detail.info.skuTitle }}</h1>
          <p v-if="detail.info.skuSubtitle" class="item__subtitle">
            {{ detail.info.skuSubtitle }}
          </p>

          <!--
            秒杀进行中时主价格换成秒杀价、原价划掉放旁边；没到点或已结束都只显示原价。
            秒杀价在没到点的时候摆出来是有误导性的，所以未开始只在下面给一行提示。
          -->
          <div class="item__price-row">
            <span class="item__price">¥{{ displayPrice }}</span>
            <s v-if="inSeckill" class="item__price-was">¥{{ detail.info.price.toFixed(2) }}</s>
            <span v-if="!detail.hasStock" class="item__stock">缺货</span>
          </div>

          <p v-if="seckillHint" class="item__seckill-hint">{{ seckillHint }}</p>

          <dl class="item__meta">
            <div class="item__meta-item">
              <dt>销量</dt>
              <dd>{{ detail.info.saleCount }}</dd>
            </div>
            <div class="item__meta-item">
              <dt>商品编号</dt>
              <dd>{{ detail.info.skuId }}</dd>
            </div>
          </dl>

          <SaleAttrPicker
            :sale-attr="detail.saleAttr"
            :sku-id="skuIdValue ?? 0"
            @change="onSkuChange"
          />

          <!-- 秒杀进行中时限购数就是数量上限，超了后端返回 18003，不如前端先挡住 -->
          <QuantityStepper v-model="quantity" :max="maxQuantity" />

          <!--
            秒杀进行中额外给一个「立即抢购」，但**保留**加入购物车和立即购买。
            改造前的 item.html 是在秒杀时段把加入购物车整个藏掉的，这里不照搬 ——
            藏掉等于用户想按原价买都买不了，没有理由。
          -->
          <div class="item__actions">
            <el-button v-if="inSeckill" type="danger" size="large" :loading="killing" @click="kill">
              立即抢购
            </el-button>
            <el-button
              type="primary"
              size="large"
              :disabled="!detail.hasStock"
              :loading="cart.pending"
              @click="addToCart"
            >
              加入购物车
            </el-button>
            <el-button size="large" :disabled="!detail.hasStock" @click="buyNow">
              立即购买
            </el-button>
          </div>
        </div>
      </div>

      <div class="item__bottom">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="商品介绍" name="desc">
            <div v-if="descImages.length > 0" class="desc">
              <img v-for="url in descImages" :key="url" class="desc__image" :src="url" alt="" />
            </div>
            <EmptyState v-else description="该商品没有图文介绍" />
          </el-tab-pane>

          <el-tab-pane label="规格参数" name="attrs">
            <AttrTable :groups="detail.groupAttrs" />
          </el-tab-pane>
        </el-tabs>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ElButton, ElMessage, ElSkeleton, ElTabPane, ElTabs } from 'element-plus'
import EmptyState from '@/components/EmptyState/index.vue'
import QuantityStepper from '@/components/QuantityStepper/index.vue'
import AttrTable from './com/AttrTable.vue'
import ImageGallery from './com/ImageGallery.vue'
import SaleAttrPicker from './com/SaleAttrPicker.vue'
import { fetchSkuDetail } from '@/api/product'
import { seckillKill } from '@/api/seckill'
import { useAsyncData } from '@/composables/useAsyncData'
import { useCatalog } from '@/composables/useCatalog'
import { useNow } from '@/composables/useNow'
import { useCartStore } from '@/store/cart'
import { findCategoryPath } from '@/tools/catalog'
import { formatDateTime, seckillPhase } from '@/tools/time'

const route = useRoute()
const router = useRouter()

/** 路由参数是 string，转成数字并挡掉非法值（用户可以直接改 URL） */
const skuIdValue = computed<number | null>(() => {
  const raw = route.params.skuId
  const text = Array.isArray(raw) ? raw[0] : raw
  const parsed = Number(text)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
})

const { data, loading, error, execute } = useAsyncData(async () => {
  const skuId = skuIdValue.value
  if (skuId === null) {
    throw new Error('商品不存在')
  }
  return fetchSkuDetail(skuId)
})

// skuId 变了就重新请求：点选销售属性切换 SKU 时走的就是这条
watch(skuIdValue, () => void execute(), { immediate: true })

const detail = computed(() => data.value)

const { tree } = useCatalog()
const breadcrumb = computed(() =>
  findCategoryPath(tree.value, detail.value?.info.catalogId ?? null),
)

/** 商品介绍不是富文本，是逗号分隔的图片地址 */
const descImages = computed(() =>
  (detail.value?.desc?.decript ?? '')
    .split(',')
    .map((url) => url.trim())
    .filter((url) => url !== ''),
)

const activeTab = ref('desc')
const quantity = ref(1)

const cart = useCartStore()

/* ═══════════════════ 秒杀 ═══════════════════ */

/**
 * 每秒跳一次的"现在"。
 *
 * 必须是个会走的时钟而不是 `Date.now()` 直接读：用户把页面开着不动，
 * 场次从"未开始"跨到"进行中"、或从"进行中"跨到"已结束"的时候，
 * 按钮和价格要自己跟着变，不能等用户手动刷新。
 */
const now = useNow()

/** 随商品详情一起返回的秒杀信息。不参加秒杀、或场次已结束时后端给 null */
const seckill = computed(() => detail.value?.seckillSkuVo ?? null)

const phase = computed(() =>
  seckill.value ? seckillPhase(seckill.value.startTime, seckill.value.endTime, now.value) : 'ended',
)

/**
 * 能不能抢。
 *
 * 除了"正在进行中"还要求 randomCode 非空：后端只在秒杀进行中才把随机码下发到详情里，
 * 它是这次抢购的凭证，没有它调 kill 必定返回 18001。
 */
const inSeckill = computed(() => phase.value === 'active' && seckill.value?.randomCode != null)

const displayPrice = computed(() => {
  const s = seckill.value
  if (inSeckill.value && s) {
    return s.seckillPrice.toFixed(2)
  }
  return (detail.value?.info.price ?? 0).toFixed(2)
})

/** 未开始 / 已结束各给一行提示；进行中不提，价格本身已经说明问题了 */
const seckillHint = computed(() => {
  const s = seckill.value
  if (!s || inSeckill.value) {
    return ''
  }
  return phase.value === 'upcoming'
    ? `本商品将于 ${formatDateTime(s.startTime)} 开始秒杀`
    : '本商品的秒杀场次已结束'
})

/** 秒杀进行中按每人限购数限制数量输入 */
const maxQuantity = computed(() => seckill.value?.seckillLimit ?? 99)

const killing = ref(false)

/**
 * 抢购。
 *
 * killId 是后端 Redis hash 的 field，格式固定为 `场次id-skuId`，由前端拼好原样回传。
 *
 * ⚠️ 成功后**不能**跳支付页：订单号是后端发 MQ 之前生成的，那一刻订单还没落库，
 *    支付页去查会拿到 17000。这里跳"我的订单"，用户能看到订单出现后再点支付。
 */
async function kill(): Promise<void> {
  const s = seckill.value
  if (!inSeckill.value || !s?.randomCode) {
    return
  }
  killing.value = true
  try {
    await seckillKill(`${s.promotionSessionId}-${s.skuId}`, s.randomCode, quantity.value)
    ElMessage.success('抢购成功，订单正在生成')
    void router.push({ name: 'order' })
  } catch {
    // 失败原因由请求拦截器按后端 code 弹出（18002 已抢完 / 18003 超限购 / 18004 已经抢过）
  } finally {
    killing.value = false
  }
}

/** 点选销售属性后跳到定位到的那个 SKU，详情会整体换掉 */
function onSkuChange(skuId: number): void {
  void router.push({ name: 'item', params: { skuId } })
}

/**
 * 加入购物车。
 *
 * 未登录时 store 会把请求拦下来并弹登录框（后端的 /cart/front/jwt/** 全部要求登录，
 * 而请求层对未授权只打 console 不弹提示），所以这里不需要自己判断登录态。
 * 加完把数量复位成 1 —— 用户再加一次通常是想再买一件，不是想重复上次那个量。
 */
async function addToCart(): Promise<void> {
  const skuId = detail.value?.info.skuId
  if (skuId === undefined) {
    return
  }
  if (await cart.addItem(skuId, quantity.value)) {
    ElMessage.success('已加入购物车')
    quantity.value = 1
  }
}

/**
 * 立即购买。
 *
 * ⚠️ 它走的是和「加入购物车」同一条路：先把这一件加进购物车，再跳结算页。
 *    所以如果购物车里原本还有别的已勾选商品，会一起被结算进去。
 *    真正的"只买这一件"需要后端开一条绕过购物车的下单路径，这轮没做。
 */
async function buyNow(): Promise<void> {
  const skuId = detail.value?.info.skuId
  if (skuId === undefined) {
    return
  }
  if (await cart.addItem(skuId, quantity.value)) {
    quantity.value = 1
    await router.push({ name: 'checkout' })
  }
}
</script>

<style scoped>
.item {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 16px;
}

.item__loading {
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
  padding: 16px;
}

.crumb {
  font-size: 13px;
  color: var(--mall-text-secondary);
}

.crumb__link {
  color: var(--mall-text-secondary);
  text-decoration: none;
}

.crumb__link:hover {
  color: var(--mall-primary);
}

.crumb__sep {
  margin: 0 8px;
  color: var(--mall-text-weak);
}

.crumb__text {
  color: var(--mall-text-secondary);
}

.item__top {
  display: flex;
  gap: 32px;
  align-items: flex-start;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
  padding: 20px;
}

.item__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.item__title {
  margin: 0;
  font-size: 20px;
  line-height: 1.4;
  color: var(--mall-text);
}

.item__subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--mall-text-secondary);
}

.item__price-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 12px 16px;
  background: var(--mall-primary-soft);
  border-radius: 8px;
}

.item__price {
  font-size: 28px;
  font-weight: 600;
  color: var(--mall-primary);
  font-variant-numeric: tabular-nums;
}

/* 秒杀进行中时和秒杀价并排显示的划线原价 */
.item__price-was {
  font-size: 14px;
  color: var(--mall-text-weak);
}

/* 秒杀未开始 / 已结束的一行提示 */
.item__seckill-hint {
  margin: 0;
  font-size: 13px;
  color: var(--mall-primary);
}

.item__stock {
  font-size: 13px;
  color: var(--mall-text-weak);
}

.item__meta {
  display: flex;
  gap: 32px;
  margin: 0;
  font-size: 13px;
}

.item__meta-item {
  display: flex;
  gap: 8px;
}

.item__meta-item dt {
  color: var(--mall-text-secondary);
}

.item__meta-item dd {
  margin: 0;
  color: var(--mall-text);
}

.item__actions {
  display: flex;
  gap: 12px;
}

.item__bottom {
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
  padding: 8px 20px 20px;
}

.desc {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.desc__image {
  max-width: 100%;
}
</style>
