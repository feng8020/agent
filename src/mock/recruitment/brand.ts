/**
 * 品牌 / 内容 Mock 数据 —— 产品书 §8.3
 *
 * 说明：
 * - 全部为**演示数据**（模拟品牌「星辰科技 NovaTech」），页面上需明确标注（产品书 §7 / UI §1）。
 * - 办公环境不使用实拍照片，仅使用 CSS 渐变 / 几何装饰 + SVG 插画（UI §13.3）。
 */
import type { BrandContent } from '@/types/recruitment'

export const BRAND: BrandContent = {
  companyName: '星辰科技',
  companyNameEn: 'NovaTech',
  slogan: '和我们一起，做有意义的事',
  subSlogan: '加入星辰科技，与一群热爱技术与产品的人，一起把想法变成真正被使用的产品。',
  intro:
    '星辰科技成立于 2015 年，是一家专注于企业数字化协作产品的科技公司。我们相信，好的产品来自对用户的深刻理解与对细节的持续打磨。目前团队已覆盖 8 座城市，服务超过 500 家企业客户。',
  highlights: [
    { value: '120+', label: '开放职位' },
    { value: '8', label: '覆盖城市' },
    { value: '500+', label: '团队成员' },
    { value: '96%', label: '员工推荐值' }
  ],
  culture:
    '我们追求简单、直接、结果导向的协作方式：没有多余的流程，只有对问题的坦诚讨论和对目标的共同负责。我们鼓励每个人提出想法，也愿意为试错留出空间。',
  benefits: [
    { title: '弹性工作', desc: '灵活办公时间，结果导向', icon: 'clock' },
    { title: '六险一金', desc: '补充医疗，保障更全面', icon: 'shield' },
    { title: '年度体检', desc: '每年一次全面健康检查', icon: 'heart' },
    { title: '带薪年假', desc: '入职即享，逐年递增', icon: 'calendar' },
    { title: '学习基金', desc: '每年学习与培训预算', icon: 'book' },
    { title: '团建旅行', desc: '团队活动与年度旅行', icon: 'plane' }
  ],
  processSteps: [
    { step: 1, title: '简历投递', desc: '在线填写信息并上传简历' },
    { step: 2, title: '简历筛选', desc: 'HR 评估匹配度并给予反馈' },
    { step: 3, title: '面试评估', desc: '技术 + 综合面试多轮深入沟通' },
    { step: 4, title: '发放 Offer', desc: '通过后发放正式录用通知' }
  ],
  faqs: [
    {
      id: 'faq-1',
      question: '投递简历后多久会收到反馈？',
      answer:
        '我们通常会在 3–5 个工作日内完成简历初筛，并通过邮件或电话与你联系。若暂时没有合适的机会，你的简历也会保留在人才库中。'
    },
    {
      id: 'faq-2',
      question: '可以同时投递多个岗位吗？',
      answer:
        '可以。我们建议你优先投递最匹配的 1–2 个岗位，这样我们能更聚焦地评估你的经历与岗位的匹配度。'
    },
    {
      id: 'faq-3',
      question: '面试一般有几轮？',
      answer:
        '通常为 2–3 轮：技术 / 专业面试、综合面试，部分岗位会有终面。每一轮我们都会及时同步进展。'
    },
    {
      id: 'faq-4',
      question: '实习和校招可以转正吗？',
      answer:
        '可以。实习期表现优秀并通过转正评估的同学，可在毕业后直接转为正式员工；校招同学入职后同样有清晰的成长与晋升通道。'
    },
    {
      id: 'faq-5',
      question: '简历需要包含哪些信息？',
      answer:
        '建议包含基本信息、教育经历、项目或工作经历与联系方式。支持 PDF / DOC / DOCX 格式，文件大小不超过 10MB。'
    }
  ],
  contactEmail: 'hr@novatech.example',
  contactPhone: '400-000-0000',
  contactAddress: '北京市海淀区中关村软件园 XX 号楼',
  socialLinks: [
    { label: '微信公众号：NovaTech 招聘', url: '' },
    { label: '小红书：星辰科技', url: '' }
  ]
}
