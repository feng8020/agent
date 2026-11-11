<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import AppErrorState from '@/components/common/AppErrorState.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import MessageItem from './MessageItem.vue'
import type { Attachment, Message } from '@/types'

const props = withDefaults(
  defineProps<{
    messages: Message[]
    loading: boolean
    error: string | null
    /** 当前正在流式生成的消息 id（保留在接口中，便于父组件与测试对齐） */
    generatingId: string | null
    /** 会话是否已存在可预览的构建产物（透传给产物聚合判定） */
    previewAvailable?: boolean
    /** 会话级源码打包地址（ZIP，已带令牌） */
    sourceUrl?: string
  }>(),
  { previewAvailable: false, sourceUrl: '' }
)

const emit = defineEmits<{
  (e: 'copy', message: Message): void
  (e: 'regenerate', message: Message): void
  (e: 'stop'): void
  (e: 'edit-submit', payload: { id: string; content: string }): void
  (e: 'resend', message: Message): void
  (e: 'retry'): void
  (e: 'sample', text: string): void
  /** 产物「在右侧预览」：透传到 ChatView 打开右侧面板 */
  (e: 'preview', attachment: Attachment): void
  /** 是否停留在底部（false 时 ChatView 显示「回到底部」按钮） */
  (e: 'at-bottom-change', value: boolean): void
}>()

const containerRef = ref<HTMLElement | null>(null)

/** 距底部多少像素内仍视为「停留在底部」 */
const BOTTOM_THRESHOLD = 24

/**
 * 是否跟随新内容自动滚动
 *
 * 仅当用户停留在列表底部时为 true。
 * 用户一旦向上翻阅历史（离开底部）即置为 false，
 * 此时 AI 继续输出也不会强制把视图拉到底部，从而保留用户的浏览位置。
 */
const stickToBottom = ref(true)

const renderableMessages = computed<Message[]>(() =>
  props.messages.filter(
    (item): item is Message => Boolean(item) && typeof item === 'object' && !Array.isArray(item)
  )
)

const isEmpty = computed(() => !props.loading && !props.error && renderableMessages.value.length === 0)

/** 最后一条消息的内容长度，用于驱动流式自动滚动 */
const lastContentLength = computed(() => {
  const list = renderableMessages.value
  return list.length ? (list[list.length - 1].content ?? '').length : 0
})

const SAMPLE_PROMPTS = [
  '帮我用 JavaScript 写一个快速排序',
  'SQL 深分页怎么优化？',
  '给我一份 3 天的旅行行程框架'
]

/** 是否贴近底部 */
const isNearBottom = (el: HTMLElement): boolean =>
  el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_THRESHOLD

const scrollToBottom = (smooth = false): void => {
  const el = containerRef.value
  if (!el) return
  el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  // 程序化滚动到底部后重新贴底，保证后续新内容继续跟随
  stickToBottom.value = true
}

const handleScroll = (): void => {
  const el = containerRef.value
  if (!el) return
  stickToBottom.value = isNearBottom(el)
}

/**
 * 新内容到达（新增消息 / 流式追加）时的处理
 *
 * 仅在用户仍停留在底部时跟随滚动；
 * 用户已经向上翻阅历史时保持其滚动位置不变。
 */
const followNewContent = (): void => {
  if (!stickToBottom.value) return
  nextTick(() => {
    if (!stickToBottom.value) return
    scrollToBottom()
  })
}

watch(lastContentLength, followNewContent)
watch(() => renderableMessages.value.length, followNewContent)

// 切换会话 / 历史加载完成后回到最新
watch(
  () => props.loading,
  (value) => {
    if (value) return
    stickToBottom.value = true
    nextTick(() => scrollToBottom())
  }
)

/**
 * 把「是否在底部」同步给父组件
 *
 * ChatView 据此显示/隐藏「回到底部」按钮，避免把滚动状态放进 store。
 */
watch(stickToBottom, (value) => emit('at-bottom-change', value), { immediate: true })

onMounted(() => scrollToBottom())

defineExpose({ scrollToBottom })
</script>

<template>
  <div ref="containerRef" class="message-list" @scroll.passive="handleScroll">
    <div class="message-list__inner">
      <!-- Loading（UI §10.1） -->
      <AppSkeleton v-if="loading" variant="messages" />

      <!-- Error（UI §10.3） -->
      <AppErrorState
        v-else-if="error"
        :message="error"
        description="请检查网络后重试"
        @retry="emit('retry')"
      />

      <!-- Empty：欢迎态（UI §10.2） -->
      <div v-else-if="isEmpty" class="message-list__welcome">
        <div class="message-list__welcome-logo">AI</div>
        <h2 class="message-list__welcome-title">开始新的对话</h2>
        <p class="message-list__welcome-desc">输入消息，或上传文件与图片让 AI 帮你分析</p>

        <div class="message-list__samples">
          <button
            v-for="sample in SAMPLE_PROMPTS"
            :key="sample"
            type="button"
            class="message-list__sample"
            @click="emit('sample', sample)"
          >
            {{ sample }}
          </button>
        </div>
      </div>

      <!-- 消息列表 -->
      <template v-else>
        <MessageItem
          v-for="message in renderableMessages"
          :key="message.id"
          :message="message"
          :preview-available="previewAvailable"
          :source-url="sourceUrl"
          @copy="emit('copy', message)"
          @regenerate="emit('regenerate', message)"
          @stop="emit('stop')"
          @edit-submit="emit('edit-submit', $event)"
          @resend="emit('resend', message)"
          @preview="emit('preview', $event)"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.message-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  /* 让浏览器的滚动锚定保持默认行为，避免追加内容时位置跳动 */
  overflow-anchor: auto;
  overscroll-behavior: contain;
}

/* 内容最大宽 760 居中（UI §5.2） */
.message-list__inner {
  width: 100%;
  max-width: var(--size-content-max);
  margin: 0 auto;
  padding: var(--space-6) var(--space-4) var(--space-8);
}

/* ---- 欢迎态 ---- */
.message-list__welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 52vh;
  text-align: center;
}

.message-list__welcome-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin-bottom: var(--space-5);
  font-size: 18px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-inverse);
  background-color: var(--color-primary);
  border-radius: var(--radius-xl);
}

.message-list__welcome-title {
  font-size: 20px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.message-list__welcome-desc {
  margin-top: var(--space-2);
  font-size: var(--font-size-caption);
  color: var(--color-text-secondary);
}

.message-list__samples {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-2);
  margin-top: var(--space-6);
}

.message-list__sample {
  padding: 8px 14px;
  font-size: var(--font-size-caption);
  color: var(--color-text-secondary);
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  transition: background-color var(--duration-fast) var(--easing-standard),
    color var(--duration-fast) var(--easing-standard),
    border-color var(--duration-fast) var(--easing-standard);
}

.message-list__sample:hover {
  color: var(--color-text-primary);
  background-color: var(--color-hover);
  border-color: var(--color-border-strong);
}

@media (min-width: 1024px) {
  .message-list__inner {
    padding-left: var(--space-8);
    padding-right: var(--space-8);
  }
}

@media (max-width: 767px) {
  .message-list__inner {
    padding: var(--space-4) var(--space-4) var(--space-6);
  }
}
</style>
