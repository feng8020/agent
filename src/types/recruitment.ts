/**
 * 招聘官网领域模型类型 —— 对应产品需求说明书 §8 数据需求
 *
 * 说明：
 * - 类型统一存放于 src/types，Mock 数据仅承载数据、不定义业务类型（产品书 §8）。
 * - 仅「招聘中」岗位对外可见、可投递。
 */
import type { IconName } from '@/components/common/icons'

/** 岗位类别 */
export type JobCategory = '技术' | '产品' | '设计' | '运营' | '职能'

/** 招聘类型 */
export type JobType = '社招' | '校招' | '实习'

/** 岗位状态（仅「招聘中」对外可见可投递） */
export type JobStatus = '招聘中' | '已下线' | '已结束'

/** 学历 */
export type EducationLevel = '大专' | '本科' | '硕士' | '博士'

/** 岗位筛选条件（空字符串表示「全部」） */
export interface JobQuery {
  keyword: string
  category: JobCategory | ''
  location: string
  jobType: JobType | ''
}

/** 岗位 */
export interface Job {
  id: string
  title: string
  category: JobCategory
  jobType: JobType
  department: string
  location: string
  /** 招聘人数（若填写须为正整数） */
  headcount?: number
  /** 薪资范围（可为「面议」） */
  salaryRange: string
  /** 岗位职责（逐条） */
  description: string[]
  /** 任职要求（逐条） */
  requirements: string[]
  status: JobStatus
  /** 发布时间（YYYY-MM-DD，用于排序） */
  publishedAt: string
  /** 岗位标签，如「急招」「热招」 */
  tags?: string[]
}

/** 岗位列表查询结果（模拟接口返回） */
export interface JobListResult {
  list: Job[]
  total: number
  page: number
  pageSize: number
}

/** 投递记录（前端本地存储，产品书 §8.2） */
export interface JobApplication {
  id: string
  jobId: string
  jobTitle: string
  name: string
  phone: string
  email: string
  /** 上传的简历文件名（仅记录文件名，不真实上传） */
  resumeFileName: string
  education?: string
  expectedCity?: string
  createdAt: string
}

/** 投递表单数据 */
export interface ApplyFormData {
  name: string
  phone: string
  email: string
  education: string
  expectedCity: string
  resumeFileName: string
  agreed: boolean
}

/** 投递表单校验错误（字段级） */
export type ApplyFormErrors = Partial<Record<keyof ApplyFormData, string>>

/** 品牌关键数据（数据亮点） */
export interface HighlightItem {
  value: string
  label: string
}

/** 福利项 */
export interface BenefitItem {
  title: string
  desc: string
  icon: IconName
}

/** 招聘流程步骤 */
export interface ProcessStep {
  step: number
  title: string
  desc: string
}

/** 常见问题 */
export interface FaqItem {
  id: string
  question: string
  answer: string
}

/** 社交入口（url 为空时仅作展示，不生成链接） */
export interface SocialLink {
  label: string
  url: string
}

/** 品牌 / 内容配置（全局 Mock，产品书 §8.3） */
export interface BrandContent {
  companyName: string
  companyNameEn: string
  slogan: string
  subSlogan: string
  intro: string
  highlights: HighlightItem[]
  culture: string
  benefits: BenefitItem[]
  processSteps: ProcessStep[]
  faqs: FaqItem[]
  contactEmail: string
  contactPhone: string
  contactAddress: string
  socialLinks: SocialLink[]
}
