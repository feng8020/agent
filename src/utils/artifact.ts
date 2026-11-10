/**
 * 产物展示工具 —— 类型文案、可预览判定、ZIP 文件名
 *
 * 约定（products/artifact-render-product.md §9 业务规则 1）：
 * `kind` 只由后端判定，前端**不得**用扩展名自行猜测。
 * 这里只负责把后端给出的 kind 映射成文案，以及判断能否进右侧面板预览。
 */
import type { ArtifactKind, Attachment } from '@/types'

/** 代码内联展示上限（产品需求 §5.3，用户确认 100 行） */
export const MAX_INLINE_CODE_LINES = 100

/** 内联代码读取上限：超过该大小不内联（避免为了看 100 行去拉一个超大文件） */
export const MAX_INLINE_CODE_BYTES = 2 * 1024 * 1024

/** kind → 类型徽标文案（与 UI 规范 §7.3 唯一文案表一致） */
export const ARTIFACT_KIND_LABELS: Record<ArtifactKind, string> = {
  webpage: '网页',
  image: '图片',
  code: '代码',
  project: '前端项目',
  backend: '后端',
  fullstack: '前后端项目'
}

/** 需要走右侧 iframe 面板预览的 kind */
const IFRAME_KINDS: readonly ArtifactKind[] = ['webpage', 'project', 'fullstack']

/**
 * 是否可以在右侧面板预览
 *
 * 必须同时满足「iframe 类 kind」与「后端确认可预览（有 dist/index.html）」，
 * 缺一不可 —— 否则会出现点了预览却 404 的误导性入口（需求 §9 业务规则 2/3）。
 */
export const canPreviewInPanel = (attachment: Attachment): boolean =>
  Boolean(
    attachment.kind &&
      IFRAME_KINDS.includes(attachment.kind) &&
      attachment.hasPreview === true
  )

/** 语言徽标文案（大写，与 UI 规范一致：VUE / TS / GO） */
export const artifactLanguageLabel = (attachment: Attachment): string =>
  (attachment.language ?? '').toUpperCase()

/**
 * 源码包下载文件名
 *
 * 聚合后的交付卡名称是「后端服务」「前端项目」这类展示名，不带扩展名；
 * 若直接拿它当下载文件名，浏览器会存成没有后缀的文件，用户双击无法解压。
 * 因此统一在这里补 `.zip`（已有则保留）。
 */
export const zipFileName = (name?: string): string => {
  const value = (name ?? '').trim() || '项目源码'

  return /\.zip$/i.test(value) ? value : `${value}.zip`
}
