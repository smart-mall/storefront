<template>
  <div class="logs">
    <section class="logs__card">
      <h2 class="logs__title">登录记录</h2>

      <el-skeleton v-if="loading && !page" :rows="5" animated />

      <EmptyState v-else-if="error" :description="error">
        <el-button type="primary" @click="execute">重新加载</el-button>
      </EmptyState>

      <EmptyState v-else-if="!page || page.list.length === 0" description="还没有登录记录" />

      <template v-else>
        <div class="logs__head">
          <span class="logs__time">时间</span>
          <span class="logs__ip">IP</span>
          <span class="logs__city">归属地</span>
        </div>

        <div v-for="log in page.list" :key="log.id" class="logs__row">
          <span class="logs__time">{{ log.createTime }}</span>
          <span class="logs__ip">{{ log.ip || '—' }}</span>
          <span class="logs__city">{{ log.city || '—' }}</span>
        </div>

        <AppPagination
          v-model:page-size="pageSize"
          :page-num="pageNum"
          :total="page.totalCount"
          @update:page-num="onPageChange"
        />
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElButton, ElSkeleton } from 'element-plus'
import AppPagination from '@/components/AppPagination/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'
import { fetchLoginLogPage } from '@/api/member'
import { useAsyncData } from '@/composables/useAsyncData'

/**
 * 登录记录。
 *
 * 只看得到自己的 —— 会员 id 由后端从网关注入的 X-Member-Claims 取，接口不接受前端传。
 *
 * 页码放 URL 里（和订单列表同一个原则），每页条数放局部。
 *
 * ⚠️ 归属地可能是空的：后端解析 IP 归属地走外部接口，本机/私网地址会被它拒答
 *    （那时后端改用出口 IP 查，所以本地开发通常能看到城市），解析失败时就是 null。
 */
const route = useRoute()
const router = useRouter()

/** 路由参数是 string，转成数字并挡掉非法值（用户可以直接改 URL） */
const pageNum = computed<number>(() => {
  const raw = route.query.pageNum
  const text = Array.isArray(raw) ? raw[0] : raw
  const parsed = Number(text)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
})

const pageSize = ref(20)

const {
  data: page,
  loading,
  error,
  execute,
} = useAsyncData(() => fetchLoginLogPage({ pageNum: pageNum.value, pageSize: pageSize.value }))

// 每页条数变了要回第一页，否则可能停在一个不存在的页码上
watch(pageSize, () => {
  if (pageNum.value !== 1) {
    void router.replace({ query: { ...route.query, pageNum: '1' } })
  }
})

watch([pageNum, pageSize], () => void execute(), { immediate: true })

function onPageChange(value: number): void {
  void router.replace({ query: { ...route.query, pageNum: String(value) } })
}
</script>

<style scoped>
.logs__card {
  padding: 20px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
}

.logs__title {
  margin: 0 0 16px;
  font-size: 15px;
  font-weight: 600;
  color: var(--mall-text);
}

.logs__head,
.logs__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
}

.logs__head {
  font-size: 12px;
  color: var(--mall-text-weak);
  border-bottom: 1px solid var(--mall-border);
}

.logs__row {
  font-size: 13px;
  color: var(--mall-text);
  border-bottom: 1px solid var(--mall-border);
}

.logs__row:last-of-type {
  border-bottom: none;
}

.logs__time {
  flex: 0 0 180px;
}

.logs__ip {
  flex: 0 0 150px;
}

.logs__city {
  flex: 1;
  min-width: 0;
}
</style>
