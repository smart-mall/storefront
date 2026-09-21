<template>
  <div class="sidebar">
    <div v-if="loading && tree.length === 0" class="sidebar__loading">
      <el-skeleton :rows="9" animated />
    </div>

    <ul v-else class="sidebar__list">
      <li v-for="first in tree" :key="first.catId">
        <!--
          详情走悬浮面板，不再内联展开：
          内联会把后面的项挤下去、侧栏高度来回跳，鼠标停在原处却已经指着别的分类了。

          用 el-popover 而不是自己写绝对定位，是因为它默认 teleport 到 body、自带层级管理，
          不会被首页的 grid 布局或任何祖先的 overflow 裁掉。

          三个参数都是有原因的：
            offset=0     默认 12px 会在侧栏和面板之间留一条缝，鼠标移过去时正好落在缝里
            hide-after   鼠标从侧栏项移到右侧面板要穿过一段"两边都不沾"的区域，
                         没有关闭延迟的话面板会立刻消失、鼠标还没到就没了
            show-after   防止鼠标扫过整列时面板一路乱闪
        -->
        <el-popover
          placement="right-start"
          :width="PANEL_WIDTH"
          :offset="0"
          :show-after="SHOW_DELAY"
          :hide-after="HIDE_DELAY"
          trigger="hover"
        >
          <template #reference>
            <div class="sidebar__item">
              <span>{{ first.name }}</span>
              <span class="sidebar__arrow">▸</span>
            </div>
          </template>

          <!--
            面板里只有三级分类可点：检索接口只认 catalog3Id（三级分类 id），
            一级/二级没有对应的过滤参数，所以它们只作分组标题。
          -->
          <div class="panel">
            <div v-for="second in first.children" :key="second.catId" class="panel__group">
              <div class="panel__group-title">{{ second.name }}</div>
              <div class="panel__links">
                <RouterLink
                  v-for="third in second.children"
                  :key="third.catId"
                  class="panel__link"
                  :to="{ name: 'search', query: { catalog3Id: third.catId } }"
                >
                  {{ third.name }}
                </RouterLink>
              </div>
            </div>
          </div>
        </el-popover>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ElPopover, ElSkeleton } from 'element-plus'
import { useCatalog } from '@/composables/useCatalog'

/** 侧栏 200px + 主区约 980px，面板取 560 不会压住整屏 */
const PANEL_WIDTH = 560
/** 悬停 80ms 才弹，防止鼠标扫过整列时面板一路乱闪（Element Plus 默认是 0） */
const SHOW_DELAY = 80
/** 移开后 200ms 再关。Element Plus 的默认值本来就是 200，这里显式写出来是为了
 *  把这个决定留在代码里，而不是悄悄依赖库的默认值 —— 鼠标从侧栏项移到右侧面板
 *  要穿过一段"两边都不沾"的区域，这个宽限期短了面板会在鼠标到达前消失 */
const HIDE_DELAY = 200

const { tree, loading } = useCatalog()
</script>

<style scoped>
.sidebar {
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
  padding: 8px 0;
}

.sidebar__loading {
  padding: 12px;
}

.sidebar__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.sidebar__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 16px;
  font-size: 14px;
  color: var(--mall-text-secondary);
  cursor: pointer;
  transition:
    background-color 0.15s,
    color 0.15s;
}

.sidebar__item:hover {
  color: var(--mall-primary);
  background: var(--mall-primary-soft);
}

.sidebar__arrow {
  font-size: 12px;
  color: var(--mall-text-weak);
}

.sidebar__item:hover .sidebar__arrow {
  color: var(--mall-primary);
}

/* 面板内部。外层容器（内边距、阴影、圆角）交给 Element Plus，这里只排内容。
   面板虽然被 teleport 到 body，但元素仍带着本组件的 scoped 属性，
   所以这些选择器照样命中；反过来要改 .el-popover 外壳才需要非 scoped 样式块。 */
.panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel__group {
  display: flex;
  gap: 12px;
  align-items: baseline;
}

.panel__group-title {
  flex: 0 0 88px;
  font-size: 13px;
  font-weight: 600;
  color: var(--mall-text);
}

.panel__links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}

.panel__link {
  font-size: 13px;
  color: var(--mall-text-secondary);
  text-decoration: none;
}

.panel__link:hover {
  color: var(--mall-primary);
}
</style>
