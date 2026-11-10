/**
 * 附件上传接口（产品书 §9.4、§11 文件和图片上传）
 *
 * 附件归属于某个会话，会话 id 作为路由参数随请求携带：
 * POST /conversations/:conversationId/files
 *
 * 返回值中的 id 即服务端生成的文件 id（fileId，int），
 * 发送消息时必须随 attachments 一并提交，后端据此关联已上传文件。
 *
 * TODO(待确认)：产品书 §12 第 2/3 条 —— 文件大小上限、允许格式、单会话附件数量限制待需求方确认。
 * 当前不在前端做硬编码限制，超出时展示接口返回的错误文案。
 */
import { http } from './request'

/**
 * 归一化服务端返回的文件 id（fileId，int）
 *
 * 后端约定 fileId 为 int，这里必须保持 number 类型，不能转成字符串，
 * 否则发送消息回传 attachments 时会把 int 变成 string，导致后端类型校验失败。
 * 兼容后端以数字字符串返回的情况（如 "12" → 12）；无法解析时返回 0 表示无有效 id。
 */
const normalizeFileId = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value.trim())
  return 0
}

/** 上传成功后由服务端返回的文件信息 */
export interface UploadedFile {
  /** 服务端文件 id（fileId，int），发送消息时原样（number）回传后端 */
  id: number
  /** 文件访问地址 */
  url: string
}

/**
 * 归一化上传响应
 *
 * - 兼容「裸数据」与「统一包装（{ code, msg, data }）」两种结构
 * - 兼容 id / fileId / file_id 三种文件 id 字段命名（值保持 int / number）
 * 归一化失败时退回本地兜底值，保证调用方拿到结构稳定的对象。
 */
const normalizeUploadedFile = (raw: unknown, fallback: UploadedFile): UploadedFile => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fallback

  const record = raw as Record<string, unknown>
  const payload =
    'data' in record && record.data && typeof record.data === 'object'
      ? (record.data as Record<string, unknown>)
      : record

  const id = normalizeFileId(payload.id ?? payload.fileId ?? payload.file_id)
  // 后端不一定回传可访问地址（例如上传 .txt 时只返回 { fileId, originalName, size }），
  // 此时 url 为空是正常情况，不影响后续以 fileId 关联文件。
  const url = typeof payload.url === 'string' ? payload.url : ''

  return {
    id: id || fallback.id,
    url: url || fallback.url
  }
}

export const uploadAttachment = async (
  conversationId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadedFile> => {
  const formData = new FormData()
  // 字段名需与后端读取的参数名一致（multipart 中的 file 字段）
  formData.append('file', file)

  // 关键：不要手动设置 Content-Type。
  // 写成 'multipart/form-data' 会覆盖浏览器自动生成的
  // `multipart/form-data; boundary=xxxx`，导致 boundary 丢失、后端无法解析文件；
  // 交给浏览器根据 FormData 自行生成才是正确做法。
  const { data } = await http.post<unknown>(
    `/chat/conversations/${conversationId}/files`,
    formData,
    {
      onUploadProgress: (event) => {
        if (!onProgress) return
        const total = event.total ?? 0
        if (!total) return
        onProgress(Math.round((event.loaded / total) * 100))
      }
    }
  )

  // 传入完整响应体：normalizeUploadedFile 内部已兼容「统一包装（{ code, msg, data }）」
  // 与「裸数据」两种结构，避免不同后端返回层级下 fileId 被取空。
  return normalizeUploadedFile(data, { id: 0, url: '' })
}
