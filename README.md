# AI Chat · 前端

网页版 AI 聊天应用（第一阶段）前端工程。

- 产品需求：`../products/ai-chat-product.md`
- UI 设计说明：`../ui/ai-chat-ui.md`
- 视觉设计稿：`../designs/*.svg` / `../designs/*.png`

## 技术栈

| 项目 | 选型 |
| --- | --- |
| 构建 | Vite 5 |
| 框架 | Vue 3（Composition API + `<script setup>`） |
| 语言 | TypeScript |
| 路由 | Vue Router 4 |
| 状态 | Pinia |
| 请求 | Axios |
| Markdown | markdown-it + highlight.js |

> 代码遵循 Vue 3.2 兼容写法，**未使用 `defineModel`**；TS 代码统一使用箭头函数（不使用 `function` 声明）。

## 目录结构

```
src/
├── api/            接口层（auth / conversation / message / upload / user）
│   └── request.ts  Axios 实例、Authorization 注入与错误归一化
├── components/
│   ├── common/     通用组件（Button / Input / Modal / Toast / Icon ...）
│   └── chat/       聊天业务组件（Sidebar / Header / MessageList / Composer / Markdown ...）
├── composables/    组合式函数（useToast / useViewport）
├── layouts/        布局（AuthLayout / ChatLayout）
├── router/         路由与登录守卫
├── stores/         Pinia（auth / chat / theme）
├── styles/         Design Tokens 与全局样式
├── types/          领域模型类型
├── utils/          会话存储 / 剪贴板 / 格式化 / Markdown
└── views/          页面（Login / Register / Chat）
```

## 路由

| 路径 | 页面 | 权限 |
| --- | --- | --- |
| `/login` | 登录页（仅用户名 + 密码） | 公开（已登录自动跳 `/chat`） |
| `/register` | 注册页 | 公开 |
| `/chat`、`/chat/:conversationId` | 聊天页 | 需登录 |

未登录访问受保护页面会被重定向到 `/login`（产品书 §5.4 / §7.2）。

## 会话行为

- **新建聊天**：点击「新建聊天」只在**前端本地**插入一条空白会话并进入欢迎态，
  **不调用任何接口**；用户发出第一条消息时才调用 `POST /conversations` 创建会话，
  本地占位会话会被服务端返回的会话替换。
- 未发送内容的空白会话在侧边栏最多保留一条，重复点击「新建聊天」会复用它。
- 对空白会话的**重命名 / 删除**仅在前端生效，不会请求服务端。
- 空白会话不会写入地址栏参数，刷新页面后回到最近一次真实会话。

## 接口约定

| 用途 | 方法与路径 | 说明 |
| --- | --- | --- |
| 登录 | `POST /auth/user/login` | 请求体 `{ username, password }`，响应 `data` 中返回 `token` 与用户信息 |
| 新建会话 | `POST /conversations` | 在用户发出第一条消息时调用 |
| 流式对话 | `POST /chat/stream` | 请求体 `{ message }`，以 SSE 流式返回增量内容 |

登录成功后，`token` 会被写入 `localStorage`，并在后续请求中通过请求头
`Authorization: Bearer <token>` 自动携带（见 `src/api/request.ts` 的请求拦截器）。
流式接口使用原生 `fetch`，同样显式携带该请求头。

## 环境变量

复制 `.env.example` 为 `.env` 后按需调整：

| 变量 | 说明 | 默认 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | 后端 API 基础地址 | `/api` |

## 常用命令

```bash
npm install      # 安装依赖
npm run dev      # 本地开发（默认 http://localhost:5173）
npm run build    # 生产构建
npm run preview  # 预览构建产物
npm run type-check
```

## 主题

浅色 / 深色 / 跟随系统，通过根元素 `data-theme="light|dark"` 切换，
全部样式基于 `src/styles/tokens.css` 中的 CSS 变量（对应 UI 文档 §14）。
偏好持久化在 `localStorage` 的 `ai-chat-theme`，顶部操作区提供快捷切换。
