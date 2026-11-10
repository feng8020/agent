<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/common/AppIcon.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppModal from '@/components/common/AppModal.vue'
import ChatHeader from '@/components/chat/ChatHeader.vue'
import ChatSidebar from '@/components/chat/ChatSidebar.vue'
import Composer from '@/components/chat/Composer.vue'
import MessageList from '@/components/chat/MessageList.vue'
import ArtifactPreviewPanel from '@/components/chat/ArtifactPreviewPanel.vue'
import TestBrowserPreview from '@/components/test/TestBrowserPreview.vue'
import ChatLayout from '@/layouts/ChatLayout.vue'
import { useBrowserPreview } from '@/composables/useBrowserPreview'
import { useArtifactPreview } from '@/composables/useArtifactPreview'
import { useConversationSearch } from '@/composables/useConversationSearch'
import { useProjectDelivery } from '@/composables/useProjectDelivery'
import { useToast } from '@/composables/useToast'
import { useViewport } from '@/composables/useViewport'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { useThemeStore } from '@/stores/theme'
import type { ArtifactKind, Attachment, Conversation, Message, PendingAttachment } from '@/types'
import { ARTIFACT_KIND_LABELS, canPreviewInPanel } from '@/utils/artifact'
import { copyText } from '@/utils/clipboard'

const route = useRoute()
const router = useRouter()
const chat = useChatStore()
const auth = useAuthStore()
const theme = useThemeStore()
const toast = useToast()
const { matches: isMobile } = useViewport()
/** 1024–1199：面板打开时侧边栏需临时收缩，否则主区会被挤到不可读 */
const { matches: isCompactDesktop } = useViewport('(min-width: 1024px) and (max-width: 1199px)')

/**
 * 项目交付（在线预览 / 下载源码）：按当前会话查询产出状态
 *
 * - previewUrl：带令牌的预览地址（iframe 无法带请求头）
 * - sourceDownloadUrl：带令牌的源码 ZIP 地址
 */
const {
  previewUrl,
  downloadUrl: sourceDownloadUrl,
  canPreview,
  canDownload,
  refresh: refreshDelivery,
  download: downloadSource
} = useProjectDelivery()

/** 右侧「产物预览」模式状态（视图局部，不进 store） */
const artifactPreview = useArtifactPreview()

/** 侧边栏搜索关键词 + 分组（视图局部，不进 store） */
const { keyword, groups: conversationGroups, setKeyword } = useConversationSearch(
  () => chat.conversations
)

/**
 * 测试浏览器实时画面（右侧预览区）
 *
 * 需求：平时不显示，只有 Tester Agent 真正驱动浏览器时才出现。
 * 这里订阅当前会话的画面流，收到帧自动展开、长时间无帧自动收起。
 */
const {
  visible: testPreviewVisible,
  frame: testPreviewFrame,
  status: testPreviewStatus,
  error: testPreviewError,
  width: testPreviewWidth,
  height: testPreviewHeight,
  start: startTestPreview,
  stop: stopTestPreview,
  hide: hideTestPreview
} = useBrowserPreview()

/** 侧边栏收缩状态本地记忆（UI §9.7） */
const SIDEBAR_KEY = 'ai-chat:sidebar-collapsed'

const readCollapsed = (): boolean => {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === '1'
  } catch {
    return false
  }
}

const sidebarCollapsed = ref(readCollapsed())
const drawerOpen = ref(false)

/** 移动端忽略收缩状态，抽屉始终按展开渲染 */
const collapsedEffective = computed(() => sidebarCollapsed.value && !isMobile.value)

/* ---------------- 消息列表滚动 ---------------- */

const messageListRef = ref<{ scrollToBottom: (smooth?: boolean) => void } | null>(null)

/** 是否停留在底部（由 MessageList 上报，false 时显示「回到底部」） */
const atBottom = ref(true)

const handleAtBottomChange = (value: boolean): void => {
  atBottom.value = value
}

const handleScrollToBottom = (): void => {
  messageListRef.value?.scrollToBottom(true)
}

/* ---------------- 右侧预览：模式与内容 ---------------- */

const previewVisible = computed(() => artifactPreview.open.value || testPreviewVisible.value)

const previewVariant = computed<'artifact' | 'test'>(() =>
  artifactPreview.open.value ? 'artifact' : 'test'
)

/** 面板打开且处于紧凑桌面区间时，侧边栏临时收缩为图标栏（不写回偏好） */
const layoutCollapsed = computed(
  () => collapsedEffective.value || (previewVisible.value && isCompactDesktop.value)
)

const activeArtifact = artifactPreview.active

const panelName = computed(() => activeArtifact.value?.name || '产物预览')

const panelKindLabel = computed(() => {
  const kind = activeArtifact.value?.kind
  if (kind) return ARTIFACT_KIND_LABELS[kind]
  return canPreview.value ? '网页' : ''
})

/** 只有完整项目才在面板里给「下载 ZIP」 */
const panelShowDownload = computed(() => {
  const kind = activeArtifact.value?.kind
  return kind === 'project' || kind === 'fullstack'
})

/** 可预览产物的优先级（产品需求 §4.1：fullstack > project > webpage） */
const PREVIEW_PRIORITY: readonly ArtifactKind[] = ['fullstack', 'project', 'webpage']

/** 一条消息内按优先级挑一个可预览产物 */
const pickFromMessage = (items: Attachment[]): Attachment | null => {
  const candidates = items.filter(
    (item) => canPreviewInPanel(item) && PREVIEW_PRIORITY.includes(item.kind as ArtifactKind)
  )
  if (candidates.length === 0) return null

  return candidates.reduce((best, item) => {
    const bestRank = PREVIEW_PRIORITY.indexOf(best.kind as ArtifactKind)
    const rank = PREVIEW_PRIORITY.indexOf(item.kind as ArtifactKind)
    return rank < bestRank ? item : best
  })
}

/** 最新的可预览产物（从后往前找，取优先级最高的一个） */
const latestPreviewable = computed<Attachment | null>(() => {
  const list = chat.messages
  for (let index = list.length - 1; index >= 0; index -= 1) {
    const picked = pickFromMessage(list[index].attachments ?? [])
    if (picked) return picked
  }
  return null
})

const previewableAttachments = computed<Attachment[]>(() => {
  const list: Attachment[] = []
  chat.messages.forEach((message) => {
    ;(message.attachments ?? []).forEach((item) => {
      if (canPreviewInPanel(item)) list.push(item)
    })
  })
  return list
})

/**
 * 会话级「预览卡」
 *
 * 后端在非完整项目模式下逐文件下发产物，此时没有任何单条产物带
 * kind=project/webpage，但会话本身可能已经有 dist（可预览）。
 * 这里合成一张卡，让面板能打开，也让标题显示「前端项目」。
 */
const buildConversationPreviewCard = (): Attachment => ({
  id: `conversation-preview-${chat.currentId ?? 'none'}`,
  conversationId: chat.currentId ?? '',
  type: 'file',
  name: '前端项目',
  url: sourceDownloadUrl.value,
  previewUrl: '',
  created_at: new Date().toISOString(),
  kind: 'project',
  previewKind: 'iframe',
  hasPreview: true,
  hasBackend: false,
  downloadUrl: sourceDownloadUrl.value
})

/* ---------------- 自动打开预览的「上膛」标记 ---------------- */

/**
 * 只有用户本轮主动发起生成（发送 / 重新生成 / 编辑重发 / 重新发送）时才上膛，
 * 生成结束即卸膛。避免历史消息或后台刷新意外弹出面板。
 */
const autoOpenArmed = ref(false)

const armAutoOpen = (): void => {
  autoOpenArmed.value = true
}

const disarmAutoOpen = (): void => {
  autoOpenArmed.value = false
}

/**
 * 按需自动打开右侧预览
 *
 * 优先用消息里真实的可预览产物；没有时退回会话级预览卡
 * （逐文件下发的前端项目属于这种情况）。
 */
const maybeAutoOpenPreview = (): void => {
  if (!autoOpenArmed.value) return

  const target = latestPreviewable.value ?? (canPreview.value ? buildConversationPreviewCard() : null)
  if (!target) return

  artifactPreview.autoShow(target)
}

/* ---------------- 弹窗状态 ---------------- */
const renameTarget = ref<Conversation | null>(null)
const renameTitle = ref('')
const renameError = ref('')
const renameLoading = ref(false)

const deleteTarget = ref<Conversation | null>(null)
const deleteLoading = ref(false)

const logoutOpen = ref(false)
const logoutLoading = ref(false)

/* ---------------- 初始化 ---------------- */

const syncRoute = (id: string | null): void => {
  if (!id) return
  if (route.params.conversationId === id) return
  void router.replace({ name: 'chat', params: { conversationId: id } })
}

const bootstrap = async (): Promise<void> => {
  await chat.loadConversations()

  const routeId = typeof route.params.conversationId === 'string' ? route.params.conversationId : ''
  const exists = routeId && chat.conversations.some((item) => item.id === routeId)
  // 会话不存在时提示并回到最近会话（产品书 §10）
  if (routeId && !exists) {
    toast.error('会话不存在')
  }

  const target = exists ? routeId : chat.conversations[0]?.id
  if (target) {
    await chat.selectConversation(target)
    syncRoute(target)
  }
}

onMounted(bootstrap)

// 地址栏变化时同步会话（支持直接访问 /chat/:id）
watch(
  () => route.params.conversationId,
  (value) => {
    const id = typeof value === 'string' ? value : ''
    if (id && id !== chat.currentId) void chat.selectConversation(id)
  }
)

/**
 * 会话变化时刷新「在线预览 / 下载源码」的可用状态
 *
 * immediate：首次进入 / 从其它页面返回本页时，即使会话 id 未发生变化，
 * 也要主动探测一次（草稿会话会清空状态）。
 */
watch(
  () => chat.currentId,
  (id) => {
    void refreshDelivery(id)
  },
  { immediate: true }
)

/**
 * 会话切换：面板与产物状态必须重置，不得残留上一会话内容（产品需求 §6.1）
 */
watch(() => chat.currentId, () => {
  artifactPreview.reset()
  disarmAutoOpen()
})

/**
 * 历史会话加载完成后，把已有产物标记为「已出现」
 *
 * 这样打开旧会话不会被 30% 面板突然占据；只有本次新产出的产物才自动打开
 * （ui/pages/chat-artifact-render.md §6）。
 */
watch(
  () => [chat.currentId, chat.messagesLoading] as const,
  () => {
    if (chat.messagesLoading) return
    artifactPreview.markSeen(previewableAttachments.value.map((item) => item.id))
  },
  { immediate: true }
)

// ① 真实项目级产物到达 → 自动打开面板
watch(latestPreviewable, () => {
  maybeAutoOpenPreview()
})

/**
 * ② 一轮生成结束 → 刷新交付状态 → 若前端已可预览则自动打开面板
 *
 * 逐文件下发的产物没有单一的 project 产物，只能靠交付状态判断，
 * 而交付状态要等这一轮生成结束后才有结果，因此这里必须 await。
 */
watch(
  () => chat.generatingId,
  async (value, previous) => {
    if (!previous || value) return

    await refreshDelivery(chat.currentId)
    maybeAutoOpenPreview()
    disarmAutoOpen()
  }
)

/**
 * 会话切换时重建测试画面订阅
 *
 * 只在服务端会话（纯数字 id）上订阅：草稿会话尚未落库，后端无法定位。
 * 订阅本身的释放由 useBrowserPreview 内的 onBeforeUnmount 负责。
 */
watch(
  () => chat.currentId,
  (id) => {
    if (id) startTestPreview(id)
    else stopTestPreview()
  },
  { immediate: true }
)

/* ---------------- 右侧预览操作 ---------------- */

/** 消息块里的「在右侧预览」 */
const handleArtifactPreview = (attachment: Attachment): void => {
  artifactPreview.show(attachment)
  // 交付状态可能还没探测到（例如刚生成完），补一次
  if (!previewUrl.value) void refreshDelivery(chat.currentId)
}

/** 聊天头部的「在线预览」：直接打开右侧面板（取代原来的 iframe 弹窗） */
const handleHeaderPreview = (): void => {
  if (!canPreview.value) {
    toast.error('暂无可预览的构建产物')
    return
  }
  artifactPreview.show(buildConversationPreviewCard())
}

/**
 * 关闭面板
 *
 * hide() 只会关掉「产物预览」；若此时测试画面仍在推流，
 * previewVisible 仍为 true，面板自动回落到测试画面（不打断测试）。
 */
const handlePanelClose = (): void => {
  artifactPreview.hide()
}

const handlePanelDownload = async (): Promise<void> => {
  await downloadSource()
}

/* ---------------- 侧边栏 ---------------- */

const toggleCollapse = (): void => {
  sidebarCollapsed.value = !sidebarCollapsed.value
  try {
    localStorage.setItem(SIDEBAR_KEY, sidebarCollapsed.value ? '1' : '0')
  } catch {
    // 忽略存储异常
  }
}

/**
 * 新建聊天：只在前端创建一条空白会话，不调用接口
 * 用户发出第一条消息时才会真正写入服务端（见 chat.sendMessage）
 */
const handleCreate = (): void => {
  chat.startNewConversation()
  drawerOpen.value = false
  // 新对话不写入路由参数，避免刷新时按 id 拉取不存在的历史消息
  void router.replace({ name: 'chat' })
}

const handleSelect = async (id: string): Promise<void> => {
  drawerOpen.value = false
  await chat.selectConversation(id)
  syncRoute(id)
}

/* ---------------- 消息 ---------------- */

const handleSend = async (payload: {
  content: string
  attachments: PendingAttachment[]
}): Promise<void> => {

  armAutoOpen()
  await chat.sendMessage(payload.content, payload.attachments)
  syncRoute(chat.currentId)
}

const handleSample = async (text: string): Promise<void> => {
  await handleSend({ content: text, attachments: [] })
}

const handleCopy = async (message: Message): Promise<void> => {
  const ok = await copyText(message.content)
  if (ok) toast.success('已复制')
  else toast.error('复制失败，请重试')
}

const handleRegenerate = async (message: Message): Promise<void> => {
  armAutoOpen()
  await chat.regenerate(message.id)
}

const handleEditSubmit = async (payload: { id: string; content: string }): Promise<void> => {
  armAutoOpen()
  await chat.editUserMessage(payload.id, payload.content)
}

const handleResend = async (message: Message): Promise<void> => {
  armAutoOpen()
  await chat.resendUserMessage(message.id)
}

const reloadMessages = (): void => {
  if (chat.currentId) void chat.loadMessages(chat.currentId)
}

/* ---------------- 会话操作 ---------------- */

const openRename = (conversation: Conversation): void => {
  renameTarget.value = conversation
  renameTitle.value = conversation.title
  renameError.value = ''
}

const closeRename = (): void => {
  if (renameLoading.value) return
  renameTarget.value = null
  renameTitle.value = ''
  renameError.value = ''
}

const confirmRename = async (): Promise<void> => {
  const target = renameTarget.value
  if (!target) return

  const title = renameTitle.value.trim()
  if (!title) {
    renameError.value = '请输入聊天标题'
    return
  }

  renameLoading.value = true
  try {
    const ok = await chat.renameConversation(target.id, title)
    if (ok) {
      renameTarget.value = null
      renameTitle.value = ''
      renameError.value = ''
    }
  } finally {
    renameLoading.value = false
  }
}

const openDelete = (conversation: Conversation): void => {
  deleteTarget.value = conversation
}

const closeDelete = (): void => {
  if (deleteLoading.value) return
  deleteTarget.value = null
}

const confirmDelete = async (): Promise<void> => {
  const target = deleteTarget.value
  if (!target) return

  deleteLoading.value = true
  try {
    await chat.removeConversation(target.id)
    deleteTarget.value = null
    syncRoute(chat.currentId)
  } finally {
    deleteLoading.value = false
  }
}

/* ---------------- 全局操作 ---------------- */

/** 主题仅保存在本地（顶部快捷入口，UI §6.2） */
const handleToggleTheme = (): void => {
  theme.toggle()
}

const confirmLogout = async (): Promise<void> => {
  logoutLoading.value = true
  try {
    await auth.signOut()
    chat.reset()
    logoutOpen.value = false
    toast.success('已退出登录')
    await router.replace({ name: 'login' })
  } catch {
    toast.error('退出登录失败，请重试')
  } finally {
    logoutLoading.value = false
  }
}
</script>

<template>
  <ChatLayout
    :collapsed="layoutCollapsed"
    :drawer-open="drawerOpen"
    :preview-open="previewVisible"
    :preview-variant="previewVariant"
    @close-drawer="drawerOpen = false"
  >
    <template #sidebar>
      <ChatSidebar
        :groups="conversationGroups"
        :current-id="chat.currentId"
        :keyword="keyword"
        :loading="chat.listLoading"
        :error="chat.listError"
        :collapsed="collapsedEffective"
        :user-name="auth.displayName"
        @new="handleCreate"
        @select="handleSelect"
        @rename="openRename"
        @delete="openDelete"
        @toggle-collapse="toggleCollapse"
        @update:keyword="setKeyword"
        @retry="chat.loadConversations()"
        @logout="logoutOpen = true"
      />
    </template>

    <ChatHeader
      :title="chat.currentTitle"
      :can-preview="canPreview"
      :can-download="canDownload"
      @preview="handleHeaderPreview"
      @download="downloadSource"
      @toggle-theme="handleToggleTheme"
      @toggle-sidebar="drawerOpen = true"
    />

    <MessageList
      ref="messageListRef"
      :messages="chat.messages"
      :loading="chat.messagesLoading"
      :error="chat.messagesError"
      :generating-id="chat.generatingId"
      :preview-available="canPreview"
      :source-url="sourceDownloadUrl"
      @copy="handleCopy"
      @regenerate="handleRegenerate"
      @stop="chat.stopGeneration()"
      @edit-submit="handleEditSubmit"
      @resend="handleResend"
      @retry="reloadMessages"
      @sample="handleSample"
      @preview="handleArtifactPreview"
      @at-bottom-change="handleAtBottomChange"
    />

    <!-- 「回到底部」浮动按钮：紧贴输入框上方，仅在用户上翻离开底部时出现 -->
    <div class="scroll-anchor">
      <button
        v-if="!atBottom"
        type="button"
        class="scroll-anchor__btn"
        title="回到底部"
        aria-label="回到底部"
        @click="handleScrollToBottom"
      >
        <AppIcon name="chevron-down" :size="14" />
        <span>回到底部</span>
      </button>
    </div>

    <Composer :is-generating="chat.isGenerating" @send="handleSend" @stop="chat.stopGeneration()" />

    <!-- 右侧预览区：产物预览 / 测试画面 共用同一个 aside -->
    <template #preview>
      <ArtifactPreviewPanel
        v-if="previewVariant === 'artifact'"
        :open="artifactPreview.open.value"
        :name="panelName"
        :kind-label="panelKindLabel"
        :preview-url="previewUrl"
        :show-download="panelShowDownload"
        @close="handlePanelClose"
        @download="handlePanelDownload"
      />

      <TestBrowserPreview
        v-else
        :frame="testPreviewFrame"
        :status="testPreviewStatus"
        :error="testPreviewError"
        :width="testPreviewWidth"
        :height="testPreviewHeight"
        @close="hideTestPreview"
      />
    </template>

    <!-- 重命名弹窗（UI §6.11） -->
    <AppModal
      :open="!!renameTarget"
      title="重命名聊天"
      confirm-text="保存"
      :loading="renameLoading"
      @cancel="closeRename"
      @confirm="confirmRename"
    >
      <AppInput
        v-model="renameTitle"
        placeholder="请输入聊天标题"
        :maxlength="50"
        :error="renameError"
        :autofocus="true"
        @enter="confirmRename"
      />
    </AppModal>

    <!-- 删除确认（UI §6.10） -->
    <AppModal
      :open="!!deleteTarget"
      title="删除该聊天？"
      description="删除后不可恢复，确认删除该聊天？"
      confirm-text="删除"
      variant="danger"
      :loading="deleteLoading"
      @cancel="closeDelete"
      @confirm="confirmDelete"
    />

    <!-- 退出登录确认（UI §6.10） -->
    <AppModal
      :open="logoutOpen"
      title="确认退出登录？"
      description="退出后需重新登录才能继续使用"
      confirm-text="退出登录"
      variant="danger"
      :loading="logoutLoading"
      @cancel="logoutOpen = false"
      @confirm="confirmLogout"
    />
  </ChatLayout>
</template>

<style scoped>
/*
 * 「回到底部」按钮的定位锚点
 *
 * 高度为 0，刚好落在「消息列表」与「输入框」之间；
 * 按钮绝对定位到其上方，因此视觉上贴在输入框上沿。
 * 容器本身 pointer-events: none，不会挡住消息区的点击。
 */
.scroll-anchor {
  position: relative;
  z-index: var(--z-sticky);
  display: flex;
  flex: none;
  justify-content: center;
  height: 0;
  pointer-events: none;
}

.scroll-anchor__btn {
  position: absolute;
  bottom: var(--space-3);
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  height: 32px;
  padding: 0 var(--space-3);
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-md);
  pointer-events: auto;
  transition: background-color var(--duration-fast) var(--easing-standard),
    border-color var(--duration-fast) var(--easing-standard),
    color var(--duration-fast) var(--easing-standard);
}

.scroll-anchor__btn:hover {
  color: var(--color-text-primary);
  background-color: var(--color-hover);
  border-color: var(--color-border-strong);
}

.scroll-anchor__btn:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
</style>
