<template>
  <article class="card">
    <header class="card__head">
      <span class="card__sn">订单号 {{ order.orderSn }}</span>
      <span class="card__time">{{ order.createTime }}</span>
      <span class="card__status">{{ order.statusText }}</span>
    </header>

    <div class="card__items">
      <div v-for="line in order.orderItemEntityList" :key="line.skuId" class="card__row">
        <RouterLink class="card__item" :to="{ name: 'item', params: { skuId: line.skuId } }">
          <img class="card__thumb" :src="line.skuPic" :alt="line.skuName" />
          <div class="card__item-body">
            <span class="card__name">{{ line.skuName }}</span>
            <span v-if="line.skuAttrsVals" class="card__attrs">{{
              attrsText(line.skuAttrsVals)
            }}</span>
          </div>
          <span class="card__qty">¥{{ line.skuPrice.toFixed(2) }} × {{ line.skuQuantity }}</span>
        </RouterLink>
        <!--
          退货是按订单项退的，所以入口挂在商品行上而不是卡片底部 ——
          一单三件商品可以只退其中一件，挂在底部就表达不出"退哪一件"。
          按钮放在链接外面：`<a>` 里嵌一个 `<button>` 既不合规、点击也会顺带跳详情页。
        -->
        <el-button
          v-if="line.canApplyReturn"
          class="card__return"
          size="small"
          :disabled="busy"
          @click="emit('returnItem', order, line)"
        >
          申请退货
        </el-button>
      </div>
    </div>

    <!--
      售后进度。后端把这一单的售后申请随列表一起带回来，所以这里不用再单独请求一次；
      「退货中」时把商家的退货地址一并显示出来 —— 那是会员下一个动作要用的信息。
    -->
    <p v-if="afterSaleText" class="card__after-sale">{{ afterSaleText }}</p>

    <footer class="card__foot">
      <span class="card__receiver">
        {{ order.receiverName }} · {{ order.receiverPhone }} · {{ address }}
      </span>

      <span class="card__amount">
        含运费 ¥{{ order.freightAmount.toFixed(2) }}，应付
        <b>¥{{ order.payAmount.toFixed(2) }}</b>
      </span>

      <span v-if="giftText" class="card__gift">{{ giftText }}</span>

      <!--
        待付款有取消与支付，已付款可以申请整单退款，已发货有确认收货，
        已完成可以评价（这一单的商品都评过时改成"查看评论"）与退货，已完成与已取消可以删除。
        退款与退货的入口显不显示由后端下发的布尔值说了算，前端不自己拼状态条件。
      -->
      <div v-if="order.status === 0" class="card__actions">
        <el-button size="small" :disabled="busy" @click="emit('cancel', order.orderSn)">
          取消订单
        </el-button>
        <el-button size="small" type="primary" :disabled="busy" @click="emit('pay', order.orderSn)">
          去支付
        </el-button>
      </div>
      <div v-else-if="order.status === 1" class="card__actions">
        <el-button
          v-if="order.canApplyRefund"
          size="small"
          :disabled="busy"
          @click="emit('refund', order)"
        >
          申请退款
        </el-button>
      </div>
      <div v-else-if="order.status === 2" class="card__actions">
        <el-button
          size="small"
          type="primary"
          :disabled="busy"
          @click="emit('receive', order.orderSn)"
        >
          确认收货
        </el-button>
      </div>
      <div v-else-if="order.status === 3 || order.status === 4" class="card__actions">
        <el-button
          v-if="order.status === 3"
          size="small"
          type="primary"
          :disabled="busy"
          @click="emit('comment', order)"
        >
          {{ allCommented ? '查看评论' : '评价' }}
        </el-button>
        <el-button size="small" :disabled="busy" @click="emit('remove', order.orderSn)">
          删除订单
        </el-button>
      </div>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ElButton } from 'element-plus'
import { joinAddress } from '@/tools/address'
import type { Order, OrderLine } from '@/type'

/**
 * 我的订单里的一张订单卡片。
 *
 * 只 emit 不碰接口：退款/退货要弹表单、取消订单与确认收货要弹确认框、支付要跳路由、
 * 操作完还要刷新列表，这几件事都需要页面级的状态，交给页面处理。
 */
const props = defineProps<{
  order: Order
  /** 有请求在飞时禁用操作按钮 */
  busy: boolean
}>()

const emit = defineEmits<{
  pay: [orderSn: string]
  cancel: [orderSn: string]
  receive: [orderSn: string]
  /** 评价：把整张订单交给弹窗，弹窗要按订单项逐项提交 */
  comment: [order: Order]
  /** 申请整单退款：把订单交给弹窗 */
  refund: [order: Order]
  /** 申请退货：退货按订单项发起，所以要把订单与那一项一起给弹窗 */
  returnItem: [order: Order, line: OrderLine]
  remove: [orderSn: string]
}>()

/** 订单表里存的是下单时的收货快照，字段名和 MemberAddress 不一样 */
const address = computed(() =>
  joinAddress([
    props.order.receiverProvince,
    props.order.receiverCity,
    props.order.receiverRegion,
    props.order.receiverDetailAddress,
  ]),
)

/** 后端把销售属性用 ";" 连成一个字符串，展示时换成更易读的分隔符 */
function attrsText(value: string): string {
  return value.split(';').join(' / ')
}

/**
 * 这一单的商品是不是都评过了。
 *
 * 评价是按订单项记的，所以判据是"还有没有没评的项"：全评完才显示「查看评论」；
 * 一单多品、只评了一部分时仍然显示「评价」—— 藏起入口会让剩下那件商品再也评不了。
 */
const allCommented = computed(
  () =>
    props.order.orderItemEntityList.length > 0 &&
    props.order.orderItemEntityList.every((line) => !!line.comment),
)

/**
 * 售后进度文案，没有售后时为空串（整行不显示）。
 *
 * 文案（类型与状态）都由后端填好，前端只负责拼起来；「退货中」把退货地址带上，
 * 因为那正是会员下一步要照着寄回的地址。
 */
/**
 * 赠送量文案：数值取订单上下单时算定的快照（付款成功时按它入账）。
 *
 * 已取消的订单不会赠送，所以那一档不显示；其余按"还没付款"与"已付款"分成两种说法。
 */
const giftText = computed(() => {
  const integration = props.order.integration ?? 0
  const growth = props.order.growth ?? 0
  if (integration <= 0 && growth <= 0) return ''
  if (props.order.status === 4) return ''
  const prefix = props.order.status === 0 ? '付款后可得' : '已获得'
  return `${prefix} ${integration} 积分、${growth} 成长值`
})

const afterSaleText = computed(() => {
  const list = props.order.afterSaleList ?? []
  if (list.length === 0) {
    return ''
  }

  return list
    .map((item) => {
      let text = `售后：${item.typeText} · ${item.statusText}`
      if (item.status === 1 && item.companyAddress) {
        text += `（寄回：${item.companyAddress} 收件人 ${item.receiveMan ?? ''} ${
          item.receivePhone ?? ''
        }）`
      } else if (item.status === 3 && item.handleNote) {
        text += `（驳回理由：${item.handleNote}）`
      }
      return text
    })
    .join('；')
})
</script>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 20px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
}

.card__head {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
  color: var(--mall-text-secondary);
}

.card__status {
  margin-left: auto;
  color: var(--mall-primary);
  font-weight: 600;
}

.card__items {
  display: flex;
  flex-direction: column;
}

.card__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--mall-border);
}

.card__row:last-child {
  border-bottom: none;
}

.card__item {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) 140px;
  align-items: center;
  gap: 12px;
  text-decoration: none;
}

.card__return {
  flex: none;
}

.card__thumb {
  width: 56px;
  height: 56px;
  object-fit: contain;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: 6px;
}

.card__item-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card__name {
  font-size: 13px;
  color: var(--mall-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card__attrs {
  font-size: 12px;
  color: var(--mall-text-weak);
}

.card__qty {
  text-align: right;
  font-size: 13px;
  color: var(--mall-text-secondary);
  font-variant-numeric: tabular-nums;
}

.card__after-sale {
  margin: 0;
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--mall-text-secondary);
  background: var(--mall-surface-muted, #f7f8fa);
  border-radius: 6px;
}

.card__foot {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--mall-border);
  font-size: 13px;
  color: var(--mall-text-secondary);
}

.card__receiver {
  flex: 1;
  min-width: 200px;
}

.card__amount b {
  color: var(--mall-primary);
  font-size: 16px;
  font-variant-numeric: tabular-nums;
}

.card__actions {
  display: flex;
  gap: 8px;
}
</style>
