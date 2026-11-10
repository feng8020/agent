/**
 * 文件格式识别 —— 文件产物卡片 / 消息附件共用
 *
 * 识别优先级：扩展名（最具体）→ MIME 主类型（兜底，兼容无扩展名文件）。
 * 后端下发的附件 type 为 MIME（例如 "text/plain; charset=utf-8"），
 * 这里先把 MIME 归一化为「主类型」（去掉 charset 等参数）再匹配，
 * 否则带参数的 MIME 永远匹配不上，所有文件都会退化成通用图标。
 */
import type { IconName } from '@/components/common/icons'

/** 文件格式大类（决定卡片图标与类型文案） */
export type FileKind =
  | 'image'
  | 'text'
  | 'code'
  | 'table'
  | 'zip'
  | 'pdf'
  | 'doc'
  | 'ppt'
  | 'audio'
  | 'video'
  | 'file'

/** 取扩展名（小写，不含点）；无扩展名 / 隐藏文件返回空串 */
export const getFileExtension = (name?: string): string => {
  const value = name ?? ''
  const index = value.lastIndexOf('.')
  if (index <= 0 || index === value.length - 1) return ''
  return value.slice(index + 1).toLowerCase()
}

/** 取 MIME 主类型（小写、去参数）："text/plain; charset=utf-8" → "text/plain" */
export const getMimeType = (mime?: string): string => {
  if (!mime) return ''
  return mime.split(';')[0].trim().toLowerCase()
}

/** 扩展名 → 格式大类 */
const EXTENSION_KIND: Record<string, FileKind> = {
  /* 图片 */
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  bmp: 'image',
  svg: 'image',
  ico: 'image',
  avif: 'image',

  /* 文本 */
  txt: 'text',
  md: 'text',
  markdown: 'text',
  log: 'text',
  rtf: 'text',

  /* 代码 / 配置 */
  js: 'code',
  jsx: 'code',
  mjs: 'code',
  cjs: 'code',
  ts: 'code',
  tsx: 'code',
  vue: 'code',
  go: 'code',
  py: 'code',
  java: 'code',
  c: 'code',
  cc: 'code',
  cpp: 'code',
  h: 'code',
  hpp: 'code',
  cs: 'code',
  rs: 'code',
  rb: 'code',
  php: 'code',
  sh: 'code',
  bash: 'code',
  zsh: 'code',
  sql: 'code',
  json: 'code',
  yml: 'code',
  yaml: 'code',
  toml: 'code',
  ini: 'code',
  html: 'code',
  htm: 'code',
  css: 'code',
  scss: 'code',
  sass: 'code',
  less: 'code',
  xml: 'code',
  conf: 'code',

  /* 表格 */
  csv: 'table',
  tsv: 'table',
  xls: 'table',
  xlsx: 'table',

  /* 压缩包 */
  zip: 'zip',
  tar: 'zip',
  gz: 'zip',
  tgz: 'zip',
  rar: 'zip',
  '7z': 'zip',

  /* 文档 / 演示 */
  pdf: 'pdf',
  doc: 'doc',
  docx: 'doc',
  odt: 'doc',
  ppt: 'ppt',
  pptx: 'ppt',
  key: 'ppt',

  /* 音视频 */
  mp3: 'audio',
  wav: 'audio',
  flac: 'audio',
  aac: 'audio',
  m4a: 'audio',
  ogg: 'audio',
  mp4: 'video',
  mov: 'video',
  avi: 'video',
  mkv: 'video',
  webm: 'video'
}

/** MIME → 格式大类（扩展名缺失时的兜底） */
const MIME_RULES: ReadonlyArray<readonly [RegExp, FileKind]> = [
  [/^image\//, 'image'],
  [/^audio\//, 'audio'],
  [/^video\//, 'video'],
  [/csv|spreadsheet|ms-excel/, 'table'],
  [/pdf/, 'pdf'],
  [/word|msword|opendocument\.text/, 'doc'],
  [/powerpoint|presentation/, 'ppt'],
  [/zip|tar|gzip|x-rar|x-7z|x-compressed/, 'zip'],
  [/json|javascript|ecmascript|xml|yaml|sql|x-sh|x-python|html|css/, 'code'],
  [/^text\/plain/, 'text']
]

/** 判断文件格式大类：扩展名优先，其次 MIME */
export const getFileKind = (name?: string, mime?: string): FileKind => {
  const byExtension = EXTENSION_KIND[getFileExtension(name)]
  if (byExtension) return byExtension

  const normalized = getMimeType(mime)
  if (normalized) {
    for (const [pattern, kind] of MIME_RULES) {
      if (pattern.test(normalized)) return kind
    }
  }

  return 'file'
}

/** 格式大类 → 图标名 */
const KIND_ICON: Record<FileKind, IconName> = {
  image: 'image',
  text: 'text',
  code: 'code',
  table: 'table',
  zip: 'zip',
  pdf: 'pdf',
  doc: 'doc',
  ppt: 'ppt',
  audio: 'audio',
  video: 'video',
  file: 'file'
}

/** 格式大类 → 无扩展名时的类型文案 */
const KIND_LABEL: Record<FileKind, string> = {
  image: '图片',
  text: '文本',
  code: '代码',
  table: '表格',
  zip: '压缩包',
  pdf: 'PDF',
  doc: '文档',
  ppt: '演示文稿',
  audio: '音频',
  video: '视频',
  file: '文件'
}

/**
 * 选择卡片图标
 *
 * @param name 文件名（用于取扩展名）
 * @param mime 后端下发的 MIME（可选，用于无扩展名时兜底）
 */
export const getFileIcon = (name?: string, mime?: string): IconName =>
  KIND_ICON[getFileKind(name, mime)]

/**
 * 文件类型文案
 *
 * 有扩展名时使用「扩展名大写」（例如 TXT / PNG），
 * 无扩展名时按识别出的格式大类给出中文描述。
 */
export const getFileTypeLabel = (name?: string, mime?: string): string => {
  const extension = getFileExtension(name)
  if (extension) return extension.toUpperCase()
  return KIND_LABEL[getFileKind(name, mime)]
}
