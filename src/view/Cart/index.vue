<template>
  <div class="cart">
    <!-- 加载失败：给出原因和重试，而不是留一个空白页 -->
    <EmptyState v-if="cart.error" :description="cart.error">
      <el-button type="primary" @click="cart.loadCart(true)">重新加载</el-button>
    </EmptyState>

    <!-- cart === null 是"还没加载过"，和"车是空的"必须分开，否则会闪一下空态 -->
    <div v-else-if="cart.cart === null" class="cart__skeleton">
      <el-skeleton :rows="6" animated />
    </div>

    <EmptyState v-else-if="cart.isEmpty" description="购物车还是空的">
      <el-button type="primary" @click="router.push({ name: 'home' })">去逛逛</el-button>
    </EmptyState>

    <template v-else>
      <div class="cart__head">
        <span class="cart__head-main">商品</span>
        <span>单价</span>
        <span class="cart__head-center">数量</span>
        <span>小计</span>
        <span class="cart__head-right">操作</span>
      </div>

      <div class="cart__list">
        <CartItemRow v-for="item in cart.items" :key="item.skuId" :item="item" />
      </div>

      <CartSummaryBar
        :all-checked="cart.allChecked"
        :checked-type-count="cart.checkedItems.length"
        :total-amount="cart.totalAmount"
        :disabled="cart.pending"
        @check-all="onCheckAll"
        @remove-checked="onRemoveChecked"
        @checkout="onCheckout"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElButton, ElMessage, ElSkeleton } from 'element-plus'
import EmptyState from '@/components/EmptyState/index.vue'
import CartItemRow from './com/CartItemRow.vue'
import CartSummaryBar from './com/CartSummaryBar.vue'
import { useCartStore } from '@/store/cart'

const router = useRouter()
const cart = useCartStore()

/**
 * store 里那个跟着登录态走的 watch 已经会拉一次；这里再调一次是为了
 * 直接刷新 /cart 时页面一定有数据（那时的时序不确定谁先）。
 * loadCart 自带"已加载 / 正在加载就跳过"，所以不会重复请求。
 */
onMounted(() => void cart.loadCart())

/**
 * 勾选、改数量、删除单项都在 CartItemRow 里直接调 store（见那个组件的注释），
 * 这里只处理需要整车信息的批量动作。
 */
function onCheckAll(checked: boolean): void {
  const skuIds = cart.items.map((item) => item.skuId)
  if (skuIds.length > 0) {
    void cart.checkMany(skuIds, checked)
  }
}

function onRemoveChecked(): void {
  const skuIds = cart.checkedItems.map((item) => item.skuId)
  if (skuIds.length === 0) {
    ElMessage.info('请先勾选要删除的商品')
    return
  }
  void cart.removeMany(skuIds)
}

function onCheckout(): void {
  // 结算页还没做：order 模块对前台还没有 JSON 接口，它的 OrderWebController
  // 返回的是 Thymeleaf 视图（而且那个模板还在读已经退役的 session.loginUser）。
  // 先给一个明确反馈，别放一个点了没反应的按钮。
  ElMessage.info('结算功能开发中')
}
</script>

<style scoped>
.cart {
  /**
   * 表头和每一行共用同一套列宽。
   *
   * 用自定义属性而不是在两边各写一遍 grid-template-columns：行在子组件里、
   * 表头在这里，scoped 样式互相看不见对方的类名，而自定义属性是**继承**的，
   * 正好能穿过组件边界。改列宽只需要动这一行。
   */
  --cart-grid: 40px 88px minmax(0, 1fr) 110px 150px 120px 64px;

  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 16px;
}

.cart__skeleton {
  padding: 20px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
}

.cart__head {
  display: grid;
  grid-template-columns: var(--cart-grid);
  gap: 12px;
  padding: 0 20px;
  font-size: 13px;
  color: var(--mall-text-secondary);
}

/* 前 3 列（勾选框、缩略图、标题）合成一个"商品"表头 */
.cart__head-main {
  grid-column: 1 / 4;
}

.cart__head-center,
.cart__head-right {
  text-align: center;
}

.cart__head-right {
  text-align: right;
}

.cart__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
