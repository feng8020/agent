<script setup lang="ts">
/**
 * 产物分发入口（唯一）
 *
 * 核心规则（用户明确要求）：**一次交付只给一张卡**
 * - 前端产物 → 只给「在线预览」卡（不再逐个源文件出代码块）
 * - 后端产物 → 只给「压缩包」卡
 * - 单文件交付（例如「写一个快速排序」）→ 才按原类型渲染单个代码块 / 图片
 *
 * 为什么需要聚合：
 * 后端在非「完整项目」模式下是**逐文件**下发 artifact（App.vue、main.ts、vite.config.ts…），
 * 一条消息可能带十几条 code 产物。若逐条渲染，用户会看到一屏代码块卡片，
 * 与「前端只要在线预览 / 后端只要压缩包」的交付意图完全不符。
 *
 * 判定「项目级交付」的条件（命中任一即聚合）：
 *  1. 存在项目级产物（fullstack / project / webpage）
 *  2. 存在后端产物（backend）或任一产物标记 hasBackend
 *  3. 源码文件数量 ≥ 2（多文件必然是一次工程产出，不是单文件请求）
 *
 * 注意：这里**不改后端数据**，只改渲染策略；`kind` 仍完全由后端判定。
 */
import { computed } from 'vue'
import MessageFileCard from '@/components/chat/MessageFileCard.vue'
import BackendBlock from './BackendBlock.vue'
import CodeBlock from './CodeBlock.vue'
import FullstackBlock from './FullstackBlock.vue'
import ImageBlock from './ImageBlock.vue'
import ProjectBlock from './ProjectBlock.vue'
import WebpageBlock from './WebpageBlock.vue'
import type { ArtifactKind, Attachment } from '@/types'

const props = withDefaults(
  defineProps<{
    attachments: Attachment[]
    /** 会话是否已存在可预览的构建产物（交付状态探测结果） */
    previewAvailable?: boolean
    /** 会话级源码打包地址（ZIP，已带令牌），供聚合卡片的下载入口使用 */
    sourceUrl?: string
  }>(),
  { previewAvailable: false, sourceUrl: '' }
)

const emit = defineEmits<{ (e: 'preview', attachment: Attachment): void }>()

/** 项目级产物优先级：前后端完整项目 > 前端工程 > 静态网页 */
const PROJECT_KINDS: readonly ArtifactKind[] = ['fullstack', 'project', 'webpage']

/** 后端产物 */
const BACKEND_KINDS: readonly ArtifactKind[] = ['backend']

/** 达到该数量的源码文件视为一次工程产出（而不是单文件请求） */
const MULTI_FILE_THRESHOLD = 2

/** 在给定类型集合内按优先级取第一个产物 */
const pickByKind = (kinds: readonly ArtifactKind[]): Attachment | null => {
  const candidates = props.attachments.filter(
    (item) => item.kind && kinds.includes(item.kind)
  )
  if (candidates.length === 0) return null

  return candidates.reduce((best, item) => {
    const bestRank = kinds.indexOf(best.kind as ArtifactKind)
    const rank = kinds.indexOf(item.kind as ArtifactKind)
    return rank < bestRank ? item : best
  })
}

/**
 * 合成一张「交付卡」
 *
 * 后端逐文件下发时不存在单一的项目产物，这里用会话级交付能力
 * （可预览 / 可下载 ZIP）合成一张卡，避免用户看到一屏源文件。
 */
const buildDeliveryCard = (
  kind: ArtifactKind,
  name: string,
  hasPreview: boolean
): Attachment => {
  const base = props.attachments[0]

  return {
    id: `delivery-${kind}-${base?.id ?? 'unknown'}`,
    conversationId: base?.conversationId ?? '',
    type: 'file',
    name,
    url: props.sourceUrl,
    previewUrl: '',
    created_at: base?.created_at ?? '',
    kind,
    previewKind: hasPreview ? 'iframe' : 'none',
    hasPreview,
    hasBackend: kind === 'backend',
    downloadUrl: props.sourceUrl
  }
}

/** 实际要渲染的产物列表（最多一张交付卡 + 图片） */
const displayItems = computed<Attachment[]>(() => {
  const items = props.attachments
  if (items.length === 0) return []

  // 图片是可直接看的产出内容，不参与聚合丢弃
  const images = items.filter((item) => item.kind === 'image')
  const codeItems = items.filter((item) => item.kind === 'code')

  const projectItem = pickByKind(PROJECT_KINDS)
  const backendItem = pickByKind(BACKEND_KINDS)
  const hasBackend = items.some((item) => item.hasBackend === true)

  const projectScope =
    Boolean(projectItem) ||
    Boolean(backendItem) ||
    hasBackend ||
    codeItems.length >= MULTI_FILE_THRESHOLD

  // 单文件交付：保持原类型逐条渲染（写一个函数 / 生成一张图）
  if (!projectScope) return items

  // 后端产物：给压缩包卡（若同时能预览前端，交给 fullstack 产物处理）
  if (projectItem) return [projectItem, ...images]

  // 前端可预览 → 只给在线预览卡
  if (props.previewAvailable) {
    return [buildDeliveryCard('project', '前端项目', true), ...images]
  }

  // 纯后端 → 只给压缩包卡
  if (backendItem) return [backendItem, ...images]
  if (hasBackend) return [buildDeliveryCard('backend', '后端服务', false), ...images]

  // 有前端源码但未构建 → 仍是项目卡（提示尚未构建 + 可下载源码）
  return [buildDeliveryCard('project', '前端项目', false), ...images]
})
</script>

<template>
  <div v-if="displayItems.length" class="artifact-stack">
    <template v-for="item in displayItems" :key="item.id">
      <ImageBlock v-if="item.kind === 'image'" :attachment="item" />

      <CodeBlock v-else-if="item.kind === 'code'" :attachment="item" />

      <WebpageBlock
        v-else-if="item.kind === 'webpage'"
        :attachment="item"
        @preview="emit('preview', item)"
      />

      <ProjectBlock
        v-else-if="item.kind === 'project'"
        :attachment="item"
        @preview="emit('preview', item)"
      />

      <BackendBlock v-else-if="item.kind === 'backend'" :attachment="item" />

      <FullstackBlock
        v-else-if="item.kind === 'fullstack'"
        :attachment="item"
        @preview="emit('preview', item)"
      />

      <!-- 无法识别的类型：保持现有文件卡片（含预览 / 下载） -->
      <MessageFileCard v-else :attachment="item" />
    </template>
  </div>
</template>

<style scoped>
.artifact-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-3);
}
</style>
