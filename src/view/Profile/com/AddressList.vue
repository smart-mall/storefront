<template>
  <div class="addr">
    <section class="addr__card">
      <div class="addr__head">
        <h2 class="addr__title">收货地址</h2>
        <el-button type="primary" @click="openCreate">新增地址</el-button>
      </div>

      <el-skeleton v-if="loading && !addresses" :rows="4" animated />

      <EmptyState v-else-if="error" :description="error">
        <el-button type="primary" @click="execute">重新加载</el-button>
      </EmptyState>

      <EmptyState v-else-if="!addresses || addresses.length === 0" description="还没有收货地址">
        <el-button type="primary" @click="openCreate">新增地址</el-button>
      </EmptyState>

      <div v-else class="addr__list">
        <article v-for="item in addresses" :key="item.id" class="addr__item">
          <div class="addr__item-head">
            <span class="addr__name">{{ item.name }}</span>
            <span class="addr__phone">{{ item.phone }}</span>
            <span v-if="item.defaultStatus === 1" class="addr__badge">默认</span>
          </div>

          <p class="addr__detail">{{ formatAddress(item) }}</p>

          <div class="addr__ops">
            <el-button
              v-if="item.defaultStatus !== 1"
              link
              type="primary"
              :disabled="busy"
              @click="onSetDefault(item)"
            >
              设为默认
            </el-button>
            <el-button link type="primary" :disabled="busy" @click="openEdit(item)">修改</el-button>
            <el-button link type="danger" :disabled="busy" @click="onDelete(item)">删除</el-button>
          </div>
        </article>
      </div>
    </section>

    <AddressFormDialog v-model="dialogVisible" :address="editing" @saved="onSaved" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElButton, ElMessage, ElMessageBox, ElSkeleton } from 'element-plus'
import AddressFormDialog from '@/components/AddressFormDialog/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'
import { deleteAddress, fetchMyAddresses, setDefaultAddress } from '@/api/member'
import { useAsyncData } from '@/composables/useAsyncData'
import { formatAddress } from '@/tools/address'
import type { MemberAddress } from '@/type'

/**
 * 收货地址管理。
 *
 * 列表顺序由后端定（默认地址在最前，其余按 id），前端不再排 —— 排序规则只该有一处。
 * 归属校验也在后端：改/删别人的地址一律返回 17004「收货地址不存在」。
 */
const { data: addresses, loading, error, execute } = useAsyncData(() => fetchMyAddresses())

const dialogVisible = ref(false)
/** null 是新增 */
const editing = ref<MemberAddress | null>(null)
/** 设为默认 / 删除期间禁用按钮，避免连点 */
const busy = ref(false)

onMounted(() => void execute())

function openCreate(): void {
  editing.value = null
  dialogVisible.value = true
}

function openEdit(item: MemberAddress): void {
  editing.value = item
  dialogVisible.value = true
}

function onSaved(): void {
  void execute()
}

async function onSetDefault(item: MemberAddress): Promise<void> {
  busy.value = true
  try {
    await setDefaultAddress(item.id)
    ElMessage.success('已设为默认')
    await execute()
  } catch {
    // 请求层已经弹过提示
  } finally {
    busy.value = false
  }
}

async function onDelete(item: MemberAddress): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除「${item.name}」的这条地址吗？`, '删除地址', {
      confirmButtonText: '确定删除',
      cancelButtonText: '再想想',
      type: 'warning',
    })
  } catch {
    // 用户点了"再想想"
    return
  }

  busy.value = true
  try {
    await deleteAddress(item.id)
    ElMessage.success('已删除')
    await execute()
  } catch {
    // 请求层已经弹过提示
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.addr__card {
  padding: 20px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
}

.addr__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.addr__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--mall-text);
}

.addr__list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.addr__item {
  flex: 0 1 320px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  background: var(--mall-bg);
  border: 1px solid var(--mall-border);
  border-radius: 8px;
}

.addr__item-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.addr__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--mall-text);
}

.addr__phone {
  font-size: 13px;
  color: var(--mall-text-secondary);
}

.addr__badge {
  padding: 1px 6px;
  font-size: 11px;
  color: var(--mall-primary);
  border: 1px solid var(--mall-primary);
  border-radius: var(--mall-radius-pill);
}

.addr__detail {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--mall-text-secondary);
}

.addr__ops {
  display: flex;
  gap: 4px;
  padding-top: 4px;
  border-top: 1px solid var(--mall-border);
}
</style>
