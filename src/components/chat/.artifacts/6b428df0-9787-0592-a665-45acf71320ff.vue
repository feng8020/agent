<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import AppTextarea from '@/components/common/AppTextarea.vue'
import AttachmentPreview from './AttachmentPreview.vue'
import { uploadAttachment } from '@/api/upload'
import { getErrorMessage } from '@/api/request'
import { useToast } from '@/composables/useToast'
import { useChatStore } from '@/stores/chat'
import type { AttachmentType, PendingAttachment } from '@/types'

const props = defineProps<{ isGenerating: boolean }>()

const emit = defineEmits<{
  (e: 'send', payload: { content: string; attachments: PendingAttachment[] }): void
  (e: 'stop'): void
}>()

const toast = useToast()
const chat = useChatStore()

const content = ref('')
const attachments = ref<PendingAttachment[]>([])
const shaking = ref(false)

const textareaRef = ref<InstanceType<typeof AppTextarea> | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const imageInputRef = ref<HTMLInputElement | null>(null)

/** 保留原始 File 以支持失败重试 */
const fileMap = new Map<string, File>()

let seed = 0
const createUid = (): string => {
  seed += 1
  return `att_${Date.now().toString(36)}_${seed}`
}

const uploading = computed(() => attachments.value.some((item) => item.status === 'uploading'))
const hasContent = computed(() => content.value.trim().length > 0)
const canSend = computed(
  () => !props.isGenerating && !uploading.value && (hasContent.value || attachments.value.length > 0)
)

/* ---------------- 上传 ---------------- */

const startUpload = async (file: File, item: PendingAttachment): Promise<void> => {
  try {
    // 附件接口以会话 id 作为路由参数（/conversations/:conversationId/files），
    // 上传前先确保当前会话已写入服务端，拿到真实的 conversationId；
    // 草稿会话（draft_ 前缀）后端无法解析，直接上传会 400。
    const conversationId = await chat.persistCurrentConversation()
    if (!conversationId) {
      item.status = 'error'
      item.error = '会话创建失败，请重试'
      return
    }

    const result = await uploadAttachment(conversationId, file, (percent) => {
      item.progress = percent
    })
    // 保存服务端返回的文件 id（fileId），发送消息时随 attachments 一并提交
    item.fileId = result.id
    item.url = result.url
    item.status = 'success'
    item.progress = 100
  } catch (error) {
    item.status = 'error'
    item.error = getErrorMessage(error)
  }
}

const handleFiles = (files: FileList | null, type: AttachmentType): void => {
  if (!files || !files.length) return

  Array.from(files).forEach((file) => {
    const uid = createUid()
    const raw: PendingAttachment = {
      uid,
      type,
      name: file.name,
      size: file.size,
      status: 'uploading',
      progress: 0
    }

    attachments.value.push(raw)
    // 取回响应式代理，保证进度更新可触发视图刷新
    const item = attachments.value[attachments.value.length - 1]
    fileMap.set(uid, file)
    void startUpload(file, item)
  })
}

const onFileChange = (event: Event, type: AttachmentType): void => {
  const input = event.target as HTMLInputElement
  handleFiles(input.files, type)
  input.value = ''
}

const removeAttachment = (index: number): void => {
  const item = attachments.value[index]
  if (item) fileMap.delete(item.uid)
  attachments.value.splice(index, 1)
}

const retryAttachment = (index: number): void => {
  const item = attachments.value[index]
  if (!item) return
  const file = fileMap.get(item.uid)
  if (!file) {
    toast.error('原文件已失效，请重新选择')
    return
  }
  item.status = 'uploading'
  item.progress = 0
  item.error = undefined
  void startUpload(file, item)
}

/* ---------------- 发送 ---------------- */

const submit = (): void => {
  if (props.isGenerating) return

  if (uploading.value) {
    toast.info('附件上传中，请稍候')
    return
  }

  if (!hasContent.value && attachments.value.length === 0) {
    shaking.value = true
    window.setTimeout(() => {
      shaking.value = false
    }, 220)
    toast.info('请输入消息内容')
    textareaRef.value?.focus()
    return
  }

  emit('send', {
    content: content.value.trim(),
    attachments: attachments.value.map((item) => ({ ...item }))
  })

  content.value = ''
  attachments.value = []
  fileMap.clear()
  textareaRef.value?.resize()
}

const focus = (): void => {
  textareaRef.value?.focus()
}

onMounted(focus)

defineExpose({ focus })
</script>

<template>
  <div class="composer">
    <div class="composer__box" :class="{ 'is-shaking': shaking }">
      <!-- 附件预览区（UI §6.6） -->
      <div v-if="attachments.length" class="composer__attachments">
        <AttachmentPreview
          v-for="(item, index) in attachments"
          :key="item.uid"
          :attachment="item"
          @remove="removeAttachment(index)"
          @retry="retryAttachment(index)"
        />
      </div>

      <div class="composer__input">
        <AppTextarea
          ref="textareaRef"
          v-model="content"
          placeholder="给 AI 发送消息…"
          :disabled="props.isGenerating"
          @enter="submit"
        />
      </div>

      <div class="composer__toolbar">
        <div class="composer__tools">
          <button
            type="button"
            class="composer__tool"
            title="上传文件"
            aria-label="上传文件"
            @click="fileInputRef?.click()"
          >
            <AppIcon name="attach" :size="17" />
          </button>
          <button
            type="button"
            class="composer__tool"
            title="上传图片"
            aria-label="上传图片"
            @click="imageInputRef?.click()"
          >
            <AppIcon name="image" :size="17" />
          </button>
        </div>

        <div class="composer__submit">
          <span class="composer__hint">Enter 发送 · Shift+Enter 换行</span>

          <!-- 停止：实心方块（不使用描边图标，避免看起来是空心的） -->
          <button
            v-if="isGenerating"
            type="button"
            class="composer__send is-stop"
            title="停止生成"
            aria-label="停止生成"
            @click="emit('stop')"
          >
            <span class="composer__stop-glyph" aria-hidden="true" />
          </button>

          <button
            v-else
            type="button"
            class="composer__send"
            :disabled="!canSend"
            title="发送"
            aria-label="发送消息"
            @click="submit"
          >
            <AppIcon name="send" :size="17" />
          </button>
        </div>
      </div>
    </div>

    <!-- 隐藏的文件选择器 -->
    <input
      ref="fileInputRef"
      class="composer__file-input"
      type="file"
      multiple
      @change="onFileChange($event, 'file')"
    />
    <input
      ref="imageInputRef"
      class="composer__file-input"
      type="file"
      accept="image/*"
      multiple
      @change="onFileChange($event, 'image')"
    />
  </div>
</template>

<style scoped>
.composer {
  width: 100%;
  max-width: var(--size-content-max);
  margin: 0 auto;
  padding: 0 var(--space-4) var(--space-6);
}

/* 外框：圆角 16 / 1px 边框（UI §6.6） */
.composer__box {
  padding: 16px 16px 12px;
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-3xl);
  transition: border-color var(--duration-fast) var(--easing-standard),
    box-shadow var(--duration-fast) var(--easing-standard);
}

.composer__box.is-shaking {
  animation: ai-shake 200ms var(--easing-standard);
}

.composer__attachments {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.composer__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.composer__tools {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.composer__tool {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  transition: background-color var(--duration-fast) var(--easing-standard),
    color var(--duration-fast) var(--easing-standard);
}

.composer__tool:hover {
  color: var(--color-text-primary);
  background-color: var(--color-hover);
}

.composer__submit {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.composer__hint {
  font-size: 11.5px;
  color: var(--color-text-tertiary);
}

/* 发送 / 停止按钮：40×40 圆形（UI §6.6） */
.composer__send {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: var(--color-text-inverse);
  background-color: var(--color-primary);
  border-radius: var(--radius-full);
  transition: background-color var(--duration-fast) var(--easing-standard),
    transform var(--duration-fast) var(--easing-standard);
}

.composer__send:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.composer__send:active:not(:disabled) {
  transform: scale(0.96);
}

.composer__send:disabled {
  color: var(--color-disabled-text);
  background-color: var(--color-disabled-bg);
  cursor: not-allowed;
}

/*
 * 停止图标：实心圆角方块
 *
 * AppIcon 统一以 stroke 描边渲染，用 stop 图标会画出一个空心方框；
 * 这里改用纯色块，与「▪️」一致（黑底白块）。
 */
.composer__stop-glyph {
  display: block;
  width: 12px;
  height: 12px;
  background-color: currentColor;
  border-radius: 3px;
}

.composer__file-input {
  display: none;
}

@media (max-width: 767px) {
  .composer {
    padding: 0 var(--space-4) calc(var(--space-3) + env(safe-area-inset-bottom));
  }

  .composer__hint {
    display: none;
  }

  .composer__tool {
    width: 44px;
    height: 44px;
  }
}

textarea:focus {
  outline: none;
  box-shadow: none;
}
</style>
