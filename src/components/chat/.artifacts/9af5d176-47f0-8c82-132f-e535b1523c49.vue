<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import AppAvatar from '@/components/common/AppAvatar.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import AppTextarea from '@/components/common/AppTextarea.vue'
import MarkdownRenderer from './MarkdownRenderer.vue'
import MessageActions from './MessageActions.vue'
import ArtifactRenderer from './artifacts/ArtifactRenderer.vue'
import type { Attachment, Message } from '@/types'
import { formatFileSize } from '@/utils/format'
import { getFileIcon } from '@/utils/fileType'

const props = withDefaults(
  defineProps<{
    message: Message
    /** 会话是否已存在可预览的构建产物（用于「前端 → 只给在线预览」的聚合判定） */
    previewAvailable?: boolean
    /** 会话级源码打包地址（ZIP，已带令牌） */
    sourceUrl?: string
  }>(),
  { previewAvailable: false, sourceUrl: '' }
)

const emit = defineEmits<{
  (e: 'copy'): void
  (e: 'regenerate'): void
  (e: 'stop'): void
  (e: 'edit-submit', payload: { id: string; content: string }): void
  (e: 'resend'): void
  /** AI 产物「在右侧预览」：冒泡到 ChatView 打开预览面板 */
  (e: 'preview', attachment: Attachment): void
}>()

const editing = ref(false)
const draft = ref('')
const textareaRef = ref<InstanceType<typeof AppTextarea> | null>(null)

const isUser = computed(() => props.message.role === 'user')
const isStreaming = computed(() => props.message.status === 'streaming')
/** 生成中（含发送中的占位）：只有该状态且无内容时才展示「正在思考」 */
const isBusy = computed(() => props.message.status === 'streaming' || props.message.status === 'sending')
/** 产物列表兜底，避免异常数据导致渲染报错 */
const attachments = computed(() => props.message.attachments ?? [])

const startEdit = (): void => {
  draft.value = props.message.content
  editing.value = true
  nextTick(() => textareaRef.value?.focus())
}

const cancelEdit = (): void => {
  editing.value = false
  draft.value = ''
}

const submitEdit = (): void => {
  const value = draft.value.trim()
  if (!value) return
  editing.value = false
  emit('edit-submit', { id: props.message.id, content: value })
}
</script>

<template>
  <div class="message" :class="isUser ? 'is-user' : 'is-assistant'">
    <AppAvatar v-if="!isUser" variant="assistant" :size="30" class="message__avatar" />

    <div class="message__body">
      <!-- ===== 用户消息 ===== -->
      <template v-if="isUser">
        <div v-if="!editing" class="message__bubble">
          <p v-if="message.content" class="message__bubble-text">{{ message.content }}</p>

          <div v-if="attachments.length" class="message__attachments">
            <template v-for="item in attachments" :key="item.id">
              <img
                v-if="item.type === 'image' && item.url"
                class="message__attachment-image"
                :src="item.url"
                :alt="item.name"
              />
              <div v-else class="message__attachment-file">
                <AppIcon :name="getFileIcon(item.name, item.type)" :size="16" />
                <span class="message__attachment-name">{{ item.name }}</span>
                <span class="message__attachment-size">{{ formatFileSize(item.size) }}</span>
              </div>
            </template>
          </div>
        </div>

        <div v-else class="message__editor">
          <AppTextarea
            ref="textareaRef"
            v-model="draft"
            placeholder="修改消息内容"
            @enter="submitEdit"
          />
          <div class="message__editor-actions">
            <AppButton variant="ghost" size="sm" @click="cancelEdit">取消</AppButton>
            <AppButton size="sm" :disabled="!draft.trim()" @click="submitEdit">发送</AppButton>
          </div>
        </div>

        <MessageActions
          v-if="!editing"
          role="user"
          :status="message.status"
          @edit="startEdit"
          @resend="emit('resend')"
        />
      </template>

      <!-- ===== AI 消息 ===== -->
      <template v-else>
        <div class="message__content">
          <MarkdownRenderer
            v-if="message.content"
            :content="message.content"
            :streaming="isStreaming"
          />
          <!-- 仅生成中且还没有内容时展示等待态 -->
          <p v-else-if="isBusy" class="message__thinking">
            正在思考
            <span class="message__caret" />
          </p>

          <p v-if="message.status === 'stopped'" class="message__status">已停止</p>
          <p v-if="message.status === 'failed'" class="message__status is-error">
            生成失败，请重试
          </p>
        </div>

        <!--
          AI 产物：由 ArtifactRenderer 统一决策——
          一次交付只出一张卡（前端=在线预览 / 后端=压缩包），
          不再按后端逐文件下发的产物渲染成一屏代码块。
        -->
        <ArtifactRenderer
          :attachments="attachments"
          :preview-available="previewAvailable"
          :source-url="sourceUrl"
          @preview="emit('preview', $event)"
        />

        <MessageActions
          role="assistant"
          :status="message.status"
          @copy="emit('copy')"
          @regenerate="emit('regenerate')"
          @stop="emit('stop')"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.message {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-8);
}

.message.is-user {
  justify-content: flex-end;
}

.message__avatar {
  margin-top: 2px;
}

.message__body {
  min-width: 0;
}

.is-assistant .message__body {
  flex: 1;
}

.is-user .message__body {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  max-width: 70%;
}

/* ===== 用户气泡：黑底白字（UI §6.4） ===== */
.message__bubble {
  padding: 16px 20px;
  color: var(--color-bubble-user-text);
  background-color: var(--color-bubble-user-bg);
  border-radius: var(--radius-2xl);
}

.message__bubble-text {
  font-size: var(--font-size-body);
  line-height: var(--line-height-base);
  white-space: pre-wrap;
  word-break: break-word;
}

.message__attachments {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.message__attachment-image {
  max-width: 240px;
  max-height: 180px;
  border-radius: var(--radius-lg);
  object-fit: cover;
}

.message__attachment-file {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 260px;
  padding: 8px 12px;
  font-size: var(--font-size-micro);
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: var(--radius-md);
}

.message__attachment-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message__attachment-size {
  flex: none;
  opacity: 0.7;
}

/* ===== 编辑态 ===== */
.message__editor {
  width: 100%;
  min-width: 280px;
  padding: 14px 16px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-2xl);
}

.message__editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

/* ===== AI 内容 ===== */
.message__content {
  position: relative;
}

.message__thinking {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-body);
  color: var(--color-text-tertiary);
}

.message__caret {
  display: inline-block;
  width: 2px;
  height: 15px;
  background-color: currentColor;
  animation: ai-blink 1s step-end infinite;
}

.message__status {
  margin-top: var(--space-2);
  font-size: var(--font-size-micro);
  color: var(--color-text-tertiary);
}

.message__status.is-error {
  font-weight: var(--font-weight-medium);
  color: var(--color-error);
}

/* ===== 响应式（UI §12） ===== */
@media (max-width: 1023px) {
  .is-user .message__body {
    max-width: 80%;
  }
}

@media (max-width: 767px) {
  .is-user .message__body {
    max-width: 88%;
  }

  .message {
    margin-bottom: var(--space-6);
  }
}
</style>
