<script setup lang="ts">
import { computed, ref } from 'vue'
import AppAvatar from '@/components/common/AppAvatar.vue'
import AppEmpty from '@/components/common/AppEmpty.vue'
import AppErrorState from '@/components/common/AppErrorState.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import ConversationItem from './ConversationItem.vue'
import type { Conversation, ConversationGroup } from '@/types'

const props = defineProps<{
  groups: ConversationGroup[]
  currentId: string | null
  keyword: string
  loading: boolean
  error: string | null
  collapsed: boolean
  userName: string
}>()

const emit = defineEmits<{
  (e: 'new'): void
  (e: 'select', id: string): void
  (e: 'rename', conversation: Conversation): void
  (e: 'delete', conversation: Conversation): void
  (e: 'toggle-collapse'): void
  (e: 'update:keyword', value: string): void
  (e: 'retry'): void
  (e: 'logout'): void
}>()

const menuOpen = ref(false)

const searching = computed(() => props.keyword.trim().length > 0)
const hasResult = computed(() => props.groups.some((group) => group.items.length > 0))

const onSearchInput = (event: Event): void => {
  emit('update:keyword', (event.target as HTMLInputElement).value)
}

const logout = (): void => {
  menuOpen.value = false
  emit('logout')
}
</script>

<template>
  <aside class="sidebar" :class="{ 'is-collapsed': collapsed }">
    <!-- ===== 顶部：Logo + 收缩按钮 ===== -->
    <div class="sidebar__header">
      <div class="sidebar__brand">
        <span class="sidebar__logo"  @click="emit('toggle-collapse')">AI</span>
        <span v-if="!collapsed" class="sidebar__brand-text">AI Chat</span>
      </div>

      <button
        type="button"
        v-if="!collapsed"
        class="sidebar__collapse"
        :title="collapsed ? '展开侧边栏' : '收缩侧边栏'"
        :aria-label="collapsed ? '展开侧边栏' : '收缩侧边栏'"
        @click="emit('toggle-collapse')"
      >
        <AppIcon :name="collapsed ? 'expand' : 'collapse'" :size="15" />
      </button>
    </div>

    <!-- ===== 新建聊天（本地新建，不调用接口） ===== -->
    <button
      type="button"
      class="sidebar__new"
      :class="{ 'is-icon': collapsed }"
      title="新建聊天"
      @click="emit('new')"
    >
      <AppIcon name="new-chat" :size="16" />
      <span v-if="!collapsed">新建聊天</span>
    </button>

    <!-- ===== 搜索 ===== -->
    <div v-if="!collapsed" class="sidebar__search">
      <AppIcon name="search" :size="14" />
      <input
        class="sidebar__search-input"
        type="search"
        placeholder="搜索聊天"
        :value="keyword"
        @input="onSearchInput"
      />
    </div>

    <!-- ===== 会话列表 ===== -->
    <div class="sidebar__list">
      <AppSkeleton v-if="loading" variant="list" :rows="6" />

      <AppErrorState
        v-else-if="error"
        :message="error"
        description="会话列表加载失败"
        @retry="emit('retry')"
      />

      <AppEmpty
        v-else-if="!hasResult && collapsed"
        title=""
        icon="chat"
        class="sidebar__list-empty"
      />

      <AppEmpty
        v-else-if="searching && !hasResult"
        title="未找到相关聊天"
        icon="chat"
        class="sidebar__list-empty"
      />

      <AppEmpty
        v-else-if="!hasResult"
        title="暂无聊天记录"
        description="点击上方新建聊天开始对话"
        icon="chat"
        class="sidebar__list-empty"
      />

      <!-- 展开态：分组列表 -->
      <template v-else-if="!collapsed">
        <div v-for="group in groups" :key="group.label" class="sidebar__group">
          <p class="sidebar__group-label">{{ group.label }}</p>
          <ConversationItem
            v-for="item in group.items"
            :key="item.id"
            :conversation="item"
            :active="item.id === currentId"
            @select="emit('select', item.id)"
            @rename="emit('rename', item)"
            @delete="emit('delete', item)"
          />
        </div>
      </template>

      <!-- 收缩态：仅图标 -->
      <template v-else>
        <button
          v-for="item in groups.flatMap((group) => group.items)"
          :key="item.id"
          type="button"
          class="sidebar__mini-item"
          :class="{ 'is-active': item.id === currentId }"
          :title="item.title"
          :aria-label="item.title"
          @click="emit('select', item.id)"
        >
          <AppIcon name="chat" :size="15" />
        </button>
      </template>
    </div>

    <!-- ===== 底部：当前用户 ===== -->
    <div class="sidebar__footer">
      <button
        type="button"
        class="sidebar__user"
        :title="userName"
        @click="menuOpen = !menuOpen"
      >
        <AppAvatar :name="userName" :size="32" />
        <span v-if="!collapsed" class="sidebar__user-name">{{ userName }}</span>
        <AppIcon v-if="!collapsed" name="chevron-down" :size="14" class="sidebar__user-caret" />
      </button>

      <Transition name="sidebar-menu">
        <div v-if="menuOpen" class="sidebar__menu" :class="{ 'is-collapsed': collapsed }">
          <button type="button" class="sidebar__menu-item" @click="logout">
            <AppIcon name="logout" :size="15" />
            <span>退出登录</span>
          </button>
        </div>
      </Transition>

      <div v-if="menuOpen" class="sidebar__menu-backdrop" @click="menuOpen = false" />
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: none;
  width: var(--size-sidebar-expanded);
  height: 100%;
  background-color: var(--color-sidebar-bg);
  border-right: 1px solid var(--color-border);
  transition: width var(--duration-base) var(--easing-standard);
}

.sidebar.is-collapsed {
  width: var(--size-sidebar-collapsed);
}

/* ---- 顶部 ---- */
.sidebar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: 20px 18px 0;
}

.is-collapsed .sidebar__header {
  padding: 20px 0 0;
  justify-content: center;
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.sidebar__logo {
  display: flex;
  align-items: center;
  cursor: pointer;
  justify-content: center;
  width: 30px;
  height: 30px;
  font-size: 13px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-inverse);
  background-color: var(--color-primary);
  border-radius: var(--radius-md);
}

.sidebar__brand-text {
  font-size: 15px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  white-space: nowrap;
}

.sidebar__collapse {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  transition: background-color var(--duration-fast) var(--easing-standard);
}

.sidebar__collapse:hover {
  background-color: var(--color-hover);
  color: var(--color-text-primary);
}

.is-collapsed .sidebar__collapse {
  border-color: transparent;
}

/* ---- 新建聊天 ---- */
.sidebar__new {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: 42px;
  margin: 26px 16px 0;
  font-size: var(--font-size-form);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-inverse);
  background-color: var(--color-primary);
  border-radius: var(--radius-lg);
  white-space: nowrap;
  transition: background-color var(--duration-fast) var(--easing-standard);
}

.sidebar__new:hover {
  background-color: var(--color-primary-hover);
}

.sidebar__new.is-icon {
  width: 36px;
  height: 36px;
  margin: 26px auto 0;
}

/* ---- 搜索 ---- */
.sidebar__search {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: 38px;
  margin: 12px 16px 0;
  padding: 0 12px;
  color: var(--color-text-tertiary);
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 9px;
}

.sidebar__search:focus-within {
  border-color: var(--color-border-strong);
}

.sidebar__search-input {
  flex: 1;
  min-width: 0;
  font-size: var(--font-size-caption);
  color: var(--color-text-primary);
  background: transparent;
  border: none;
  outline: none;
}

.sidebar__search-input::placeholder {
  color: var(--color-text-tertiary);
}

.sidebar__search-input::-webkit-search-cancel-button {
  display: none;
}

/* ---- 列表 ---- */
.sidebar__list {
  flex: 1;
  min-height: 0;
  margin-top: 18px;
  padding: 0 10px;
  overflow-y: auto;
}

.is-collapsed .sidebar__list {
  padding: 0 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
}

.sidebar__group + .sidebar__group {
  margin-top: 14px;
}

.sidebar__group-label {
  padding: 0 8px 6px;
  font-size: var(--font-size-micro);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-tertiary);
}

.sidebar__list-empty {
  padding: var(--space-6) var(--space-2);
}

.is-collapsed .sidebar__list-empty {
  display: none;
}

.sidebar__mini-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  transition: background-color var(--duration-fast) var(--easing-standard);
}

.sidebar__mini-item:hover {
  background-color: var(--color-hover);
  color: var(--color-text-primary);
}

.sidebar__mini-item.is-active {
  color: var(--color-text-primary);
  background-color: var(--color-active-bg);
}

/* ---- 底部用户 ---- */
.sidebar__footer {
  position: relative;
  border-top: 1px solid var(--color-border);
  padding: 12px;
}

.is-collapsed .sidebar__footer {
  display: flex;
  justify-content: center;
  padding: 12px 0;
}

.sidebar__user {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: 4px;
  border-radius: var(--radius-lg);
  transition: background-color var(--duration-fast) var(--easing-standard);
}

.sidebar__user:hover {
  background-color: var(--color-hover);
}

.is-collapsed .sidebar__user {
  width: auto;
}

.sidebar__user-name {
  flex: 1;
  min-width: 0;
  font-size: var(--font-size-list);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar__user-caret {
  color: var(--color-text-tertiary);
}

/* ---- 用户菜单 ---- */
.sidebar__menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-dropdown);
}

.sidebar__menu {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 64px;
  z-index: calc(var(--z-dropdown) + 1);
  padding: 6px;
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
}

.sidebar__menu.is-collapsed {
  left: 8px;
  right: auto;
  width: 180px;
  bottom: 56px;
}

.sidebar__menu-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  height: 36px;
  padding: 0 10px;
  font-size: var(--font-size-caption);
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  transition: background-color var(--duration-fast) var(--easing-standard),
    color var(--duration-fast) var(--easing-standard);
}

.sidebar__menu-item:hover {
  color: var(--color-text-primary);
  background-color: var(--color-hover);
}

.sidebar-menu-enter-active,
.sidebar-menu-leave-active {
  transition: opacity var(--duration-fast) var(--easing-standard),
    transform var(--duration-fast) var(--easing-standard);
}

.sidebar-menu-enter-from,
.sidebar-menu-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
