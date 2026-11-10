<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '@/utils/markdown'
import { copyText } from '@/utils/clipboard'
import { useToast } from '@/composables/useToast'

const props = withDefaults(
  defineProps<{
    content: string
    /** 流式中：末尾显示闪烁光标（UI §6.4） */
    streaming?: boolean
  }>(),
  { streaming: false }
)

const toast = useToast()

const html = computed(() => renderMarkdown(props.content))

/** 事件委托处理代码块「复制」（UI §6.7） */
const handleClick = async (event: MouseEvent): Promise<void> => {
  const target = event.target as HTMLElement | null
  const button = target?.closest('[data-copy-code]') as HTMLButtonElement | null
  if (!button) return

  const block = button.closest('.md-code-block')
  const code = block?.querySelector('code')?.textContent ?? ''
  const ok = await copyText(code)

  if (ok) {
    button.textContent = '已复制'
    window.setTimeout(() => {
      button.textContent = '复制'
    }, 1500)
    toast.success('已复制')
  } else {
    toast.error('复制失败，请重试')
  }
}
</script>

<template>
  <div
    class="markdown-body"
    :class="{ 'is-streaming': streaming }"
    @click="handleClick"
    v-html="html"
  />
</template>

<style scoped>
/* ============ Markdown 基础排版（UI §6.8） ============ */
.markdown-body {
  font-size: var(--font-size-body);
  line-height: var(--line-height-body);
  color: var(--color-text-primary);
  word-break: break-word;
  overflow-wrap: anywhere;
}

.markdown-body :deep(> *:first-child) {
  margin-top: 0;
}

.markdown-body :deep(> *:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(p) {
  margin: 12px 0;
}

.markdown-body :deep(h1) {
  margin: 16px 0 8px;
  font-size: 20px;
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-tight);
}

.markdown-body :deep(h2) {
  margin: 16px 0 8px;
  font-size: 17px;
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-tight);
}

.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  margin: 16px 0 8px;
  font-size: 15px;
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-tight);
}

.markdown-body :deep(strong) {
  font-weight: var(--font-weight-semibold);
}

.markdown-body :deep(em) {
  font-style: italic;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 12px 0;
  padding-left: 22px;
}

.markdown-body :deep(ul) {
  list-style: disc;
}

.markdown-body :deep(ol) {
  list-style: decimal;
}

.markdown-body :deep(li) {
  margin: 6px 0;
}

.markdown-body :deep(li > ul),
.markdown-body :deep(li > ol) {
  margin: 6px 0;
}

.markdown-body :deep(blockquote) {
  margin: 12px 0;
  padding-left: 14px;
  color: var(--color-text-secondary);
  border-left: 3px solid var(--color-border-strong);
}

.markdown-body :deep(a) {
  color: var(--color-text-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.markdown-body :deep(a:hover) {
  color: var(--color-text-secondary);
}

.markdown-body :deep(hr) {
  margin: 20px 0;
  border: none;
  border-top: 1px solid var(--color-border);
}

.markdown-body :deep(img) {
  max-width: 100%;
  border-radius: var(--radius-lg);
}

.markdown-body :deep(code:not(.hljs)) {
  padding: 2px 6px;
  font-family: var(--font-family-mono);
  font-size: 13px;
  background-color: var(--color-code-inline-bg);
  border-radius: var(--radius-xs);
}

/* ============ 表格 ============ */
.markdown-body :deep(.md-table-wrap) {
  margin: 12px 0;
  overflow-x: auto;
}

.markdown-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-caption);
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  padding: 8px 12px;
  text-align: left;
  border: 1px solid var(--color-border);
}

.markdown-body :deep(th) {
  font-weight: var(--font-weight-semibold);
  background-color: var(--color-surface);
}

/* ============ 代码块（UI §6.7） ============ */
.markdown-body :deep(.md-code-block) {
  margin: 12px 0;
  overflow: hidden;
  background-color: var(--color-code-block-bg);
  border: 1px solid var(--color-code-block-border);
  border-radius: var(--radius-xl);
}

.markdown-body :deep(.md-code-block__header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 20px;
  border-bottom: 1px solid var(--color-code-block-border);
}

.markdown-body :deep(.md-code-block__lang) {
  font-family: var(--font-family-mono);
  font-size: var(--font-size-micro);
  color: #a3a3a3;
}

.markdown-body :deep(.md-code-block__copy) {
  height: 26px;
  padding: 0 12px;
  font-size: var(--font-size-micro);
  color: #e5e5e5;
  background-color: #262626;
  border-radius: 7px;
  transition: background-color var(--duration-fast) var(--easing-standard);
}

.markdown-body :deep(.md-code-block__copy:hover) {
  background-color: #3f3f3f;
}

.markdown-body :deep(.md-code-block__pre) {
  margin: 0;
  padding: 16px 20px;
  overflow-x: auto;
}

.markdown-body :deep(.md-code-block__pre code),
.markdown-body :deep(.hljs) {
  display: block;
  padding: 0;
  font-family: var(--font-family-mono);
  font-size: var(--font-size-code);
  line-height: var(--line-height-code);
  color: var(--color-code-text);
  background: transparent;
  white-space: pre;
}

/* ============ 流式光标 ============ */
.markdown-body.is-streaming :deep(> *:last-child)::after {
  content: '';
  display: inline-block;
  width: 2px;
  height: 15px;
  margin-left: 3px;
  vertical-align: text-bottom;
  background-color: currentColor;
  animation: ai-blink 1s step-end infinite;
}
</style>
