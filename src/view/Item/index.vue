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

          <div class="item__price-row">
            <span class="item__price">¥{{ detail.info.price.toFixed(2) }}</span>
            <span v-if="!detail.hasStock" class="item__stock">缺货</span>
          </div>

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

          <QuantityStepper v-model="quantity" />

          <div class="item__actions">
            <el-button
              type="primary"
              size="large"
              :disabled="!detail.hasStock"
              :loading="cart.pending"
              @click="addToCart"
            >
              加入购物车
            </el-button>
            <el-button size="large" :disabled="!detail.hasStock" @click="checkoutNotReady">
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
import { useAsyncData } from '@/composables/useAsyncData'
import { useCatalog } from '@/composables/useCatalog'
import { useCartStore } from '@/store/cart'
import { findCategoryPath } from '@/tools/catalog'

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

/** 点选销售属性后跳到定位到的那个 SKU，详情会整体换掉 */
function onSkuChange(skuId: number): void {
  void router.push({ name: 'item', params: { skuId } })
}

/**
 * 加入购物车。
 *
 * 未登录时 store 会把请求拦下来并弹登录框（后端的 /cart/** 全部要求登录，
 * 而请求层对 401 只打 console 不弹提示），所以这里不需要自己判断登录态。
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

function checkoutNotReady(): void {
  // 「立即购买」要先有结算页，而 order 模块对前台还没有 JSON 接口。
  // 先给明确反馈，别放一个点了没反应的按钮。
  ElMessage.info('结算功能开发中')
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
