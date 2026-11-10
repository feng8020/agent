/**
 * 岗位 Mock 数据 + 模拟接口 —— 产品书 §8.1 / §9
 *
 * 说明：
 * - Mock 仅负责模拟数据与模拟接口响应，类型来自 src/types/recruitment.ts。
 * - 数据要求（产品书 §8）：≥8 个岗位，覆盖 技术/产品/设计/运营/职能 与 社招/校招/实习，
 *   并包含 1 个「已下线」岗位用于演示「不可投递」。
 * - 本文件全部为演示数据。
 */
import type { Job, JobCategory, JobQuery, JobListResult, JobType } from '@/types/recruitment'

/** 岗位类别（固定顺序，供筛选下拉使用） */
export const JOB_CATEGORIES: JobCategory[] = ['技术', '产品', '设计', '运营', '职能']

/** 招聘类型（固定顺序） */
export const JOB_TYPES: JobType[] = ['社招', '校招', '实习']

/** 工作地点（固定顺序，供筛选下拉使用） */
export const JOB_LOCATIONS: string[] = ['北京', '上海', '深圳', '杭州', '成都']

/** 每页岗位数（2 列 × 3 行） */
export const JOB_PAGE_SIZE = 6

/** 模拟异步延时，便于展示 Loading 状态 */
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })

/** 全部岗位 Mock 数据（含 1 个已下线岗位） */
export const JOBS: Job[] = [
  {
    id: 'rc-job-001',
    title: '高级前端工程师',
    category: '技术',
    jobType: '社招',
    department: '技术中心',
    location: '北京',
    headcount: 3,
    salaryRange: '30–50K · 14薪',
    description: [
      '负责核心业务系统的前端架构设计与性能优化；',
      '参与组件库与前端工程化体系建设；',
      '与产品、设计紧密协作，打磨高质量的用户体验；',
      '参与技术方案评审，推动团队技术进步。'
    ],
    requirements: [
      '3 年以上前端开发经验，精通 Vue / React 至少其一；',
      '熟悉 TypeScript、构建工具与前端性能优化；',
      '良好的沟通协作能力与责任意识。'
    ],
    status: '招聘中',
    publishedAt: '2025-06-18',
    tags: ['热招']
  },
  {
    id: 'rc-job-002',
    title: '后端开发工程师（Go）',
    category: '技术',
    jobType: '社招',
    department: '技术中心',
    location: '北京',
    headcount: 2,
    salaryRange: '28–45K',
    description: [
      '负责核心服务的设计、开发与维护；',
      '参与高并发、高可用架构的设计与优化；',
      '编写高质量、可测试的服务端代码；',
      '参与线上问题排查与性能调优。'
    ],
    requirements: [
      '熟悉 Go 语言与常用框架（Gin 等）；',
      '熟悉 MySQL / Redis 等常用存储；',
      '有分布式系统或高并发经验者优先。'
    ],
    status: '招聘中',
    publishedAt: '2025-06-15'
  },
  {
    id: 'rc-job-003',
    title: '产品经理（增长方向）',
    category: '产品',
    jobType: '社招',
    department: '增长中心',
    location: '上海',
    headcount: 1,
    salaryRange: '25–40K',
    description: [
      '负责增长相关产品方向的规划与落地；',
      '通过数据分析发现增长机会并推动实验；',
      '撰写需求文档并协调研发、设计推进项目。'
    ],
    requirements: [
      '3 年以上产品经验，有增长 / 策略产品经验优先；',
      '数据敏感，熟练使用常见数据分析工具；',
      '优秀的跨团队沟通与推动能力。'
    ],
    status: '招聘中',
    publishedAt: '2025-06-12'
  },
  {
    id: 'rc-job-004',
    title: 'UI / 视觉设计师',
    category: '设计',
    jobType: '社招',
    department: '设计中心',
    location: '深圳',
    headcount: 1,
    salaryRange: '18–30K',
    description: [
      '负责产品界面与品牌视觉设计；',
      '维护与完善设计规范与组件库；',
      '与产品、前端协作，保证设计还原度。'
    ],
    requirements: [
      '2 年以上 UI / 视觉设计经验，作品集优秀；',
      '熟练使用 Figma 等设计工具；',
      '对细节与体验有较高要求。'
    ],
    status: '招聘中',
    publishedAt: '2025-06-10',
    tags: ['急招']
  },
  {
    id: 'rc-job-005',
    title: '数据分析师',
    category: '技术',
    jobType: '社招',
    department: '数据中台',
    location: '北京',
    headcount: 1,
    salaryRange: '20–35K',
    description: [
      '负责业务数据的采集、清洗与建模；',
      '搭建核心指标体系与可视化报表；',
      '为业务决策提供数据支持。'
    ],
    requirements: [
      '熟练使用 SQL，掌握至少一种分析工具；',
      '具备统计学基础与业务理解能力；',
      '有数据仓库 / BI 经验者优先。'
    ],
    status: '招聘中',
    publishedAt: '2025-06-08'
  },
  {
    id: 'rc-job-006',
    title: '内容运营专员',
    category: '运营',
    jobType: '校招',
    department: '市场中心',
    location: '杭州',
    headcount: 2,
    salaryRange: '10–16K',
    description: [
      '负责内容策划、撰写与发布；',
      '维护官方渠道，提升内容影响力；',
      '整理内容数据并持续优化。'
    ],
    requirements: [
      '2025 / 2026 届毕业生，文案能力扎实；',
      '对内容平台与传播有热情；',
      '学习能力强，具备良好的执行力。'
    ],
    status: '招聘中',
    publishedAt: '2025-06-06'
  },
  {
    id: 'rc-job-007',
    title: '测试开发工程师',
    category: '技术',
    jobType: '校招',
    department: '质量中心',
    location: '成都',
    headcount: 2,
    salaryRange: '15–25K',
    description: [
      '负责测试用例设计与自动化测试开发；',
      '参与质量体系建设与流程改进；',
      '推动测试工具与平台的建设。'
    ],
    requirements: [
      '2025 / 2026 届毕业生，计算机相关专业；',
      '掌握至少一门编程语言；',
      '了解常见测试方法与工具。'
    ],
    status: '招聘中',
    publishedAt: '2025-06-04'
  },
  {
    id: 'rc-job-008',
    title: 'HR 招聘实习生',
    category: '职能',
    jobType: '实习',
    department: '人力资源',
    location: '上海',
    headcount: 2,
    salaryRange: '150–200/天',
    description: [
      '协助岗位发布、简历筛选与面试安排；',
      '维护候选人数据与招聘渠道；',
      '协助招聘活动的组织与执行。'
    ],
    requirements: [
      '在校本科及以上，可实习 3 个月以上；',
      '细致耐心，沟通表达良好；',
      '熟练使用办公软件。'
    ],
    status: '招聘中',
    publishedAt: '2025-06-02'
  },
  {
    id: 'rc-job-009',
    title: '市场品牌经理',
    category: '运营',
    jobType: '社招',
    department: '市场中心',
    location: '北京',
    headcount: 1,
    salaryRange: '25–35K',
    description: [
      '负责品牌策略制定与传播落地；',
      '统筹市场活动与内容营销；',
      '维护媒体与合作伙伴关系。'
    ],
    requirements: [
      '3 年以上品牌 / 市场经验；',
      '具备较强的策划与资源整合能力；',
      '有 B 端品牌经验者优先。'
    ],
    status: '已下线',
    publishedAt: '2025-05-20'
  }
]

/** 对外可见（招聘中）的岗位 */
export const getVisibleJobs = (): Job[] => JOBS.filter((job) => job.status === '招聘中')

/** 按 id 查询岗位（含已下线，便于详情页给出「不可投递」提示） */
export const getJobById = (id: string): Job | undefined => JOBS.find((job) => job.id === id)

/** 首页精选岗位（按发布时间倒序取前 N 个） */
export const getFeaturedJobs = (limit = 6): Job[] =>
  [...getVisibleJobs()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, limit)

/**
 * 模拟「岗位列表查询」接口：仅返回招聘中岗位，支持关键词 + 条件过滤 + 分页
 * （前端过滤，对应产品书 §9.1）
 */
export const fetchJobs = async (
  query: JobQuery,
  page = 1,
  pageSize = JOB_PAGE_SIZE
): Promise<JobListResult> => {
  await delay(240)

  const keyword = query.keyword.trim().toLowerCase()

  const filtered = getVisibleJobs()
    .filter((job) => {
      const searchable = [job.title, job.department, job.location, ...job.description]
        .join(' ')
        .toLowerCase()
      const matchKeyword = !keyword || searchable.includes(keyword)
      const matchCategory = !query.category || job.category === query.category
      const matchLocation = !query.location || job.location === query.location
      const matchType = !query.jobType || job.jobType === query.jobType
      return matchKeyword && matchCategory && matchLocation && matchType
    })
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))

  const total = filtered.length
  const start = (page - 1) * pageSize
  const list = filtered.slice(start, start + pageSize)

  return { list, total, page, pageSize }
}
