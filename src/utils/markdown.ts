/**
 * Markdown 渲染（UI §6.7 代码块 / §6.8 Markdown 渲染样式）
 *
 * - 使用 markdown-it 渲染
 * - 重写 fence 渲染器，输出带「语言标签 + 复制按钮」的代码块结构
 * - 使用 highlight.js 做代码高亮
 * - 禁止原始 HTML，避免 XSS（AI 输出内容不可信）
 */
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/common'

/** 转义 HTML 属性值 */
const escapeAttr = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 代码高亮，返回 HTML 片段 */
const highlightCode = (code: string, lang: string): { html: string; language: string } => {
  const language = (lang || '').trim().toLowerCase()

  if (language && hljs.getLanguage(language)) {
    try {
      return {
        html: hljs.highlight(code, { language, ignoreIllegals: true }).value,
        language
      }
    } catch {
      // 忽略，走自动识别
    }
  }

  try {
    return { html: hljs.highlightAuto(code).value, language: language || 'text' }
  } catch {
    return { html: escapeAttr(code), language: language || 'text' }
  }
}

const md = new MarkdownIt({
  html: false, // 安全：禁止 AI 内容中的原始 HTML
  linkify: true,
  breaks: true,
  typographer: false
})

// 自定义代码块渲染（UI §6.7）
md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx]
  const info = token.info ? token.info.trim() : ''
  const rawLang = info.split(/\s+/)[0] || ''
  const code = token.content

  const { html, language } = highlightCode(code, rawLang)

  return (
    '<div class="md-code-block">' +
    '<div class="md-code-block__header">' +
    `<span class="md-code-block__lang">${escapeAttr(language)}</span>` +
    '<button type="button" class="md-code-block__copy" data-copy-code>复制</button>' +
    '</div>' +
    `<pre class="md-code-block__pre"><code class="hljs language-${escapeAttr(language)}">${html}</code></pre>` +
    '</div>'
  )
}

// 表格外层包裹容器，便于横向滚动（UI §6.8 表格）
md.renderer.rules.table_open = () => '<div class="md-table-wrap"><table>'
md.renderer.rules.table_close = () => '</table></div>'

// 链接在新标签打开
const defaultLinkOpen =
  md.renderer.rules.link_open ||
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet('target', '_blank')
  tokens[idx].attrSet('rel', 'noopener noreferrer')
  return defaultLinkOpen(tokens, idx, options, env, self)
}

/** 渲染 Markdown 为 HTML 字符串 */
export const renderMarkdown = (source: string): string => {
  if (!source) return ''
  try {
    return md.render(source)
  } catch {
    return `<p>${escapeAttr(source)}</p>`
  }
}
