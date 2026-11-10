import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { setUnauthorizedHandler } from './utils/authRedirect'

// Design Tokens / 全局样式（对应 UI 文档 §14）
import './styles/tokens.css'
import './styles/global.css'
// 代码块高亮主题（代码块恒为深色底，UI §6.7）
import 'highlight.js/styles/github-dark.css'
// 招聘官网样式（Design Tokens 作用域限定在 .careers-app，不影响现有应用）
import './styles/recruitment.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

/**
 * 401（登录态失效）统一处理
 *
 * 需求：401 时直接 replace 到登录页，不允许停留在内部页面。
 *
 * 处理顺序很重要：
 *   1. 先清理本地会话（localStorage + 内存 user）
 *      —— 否则路由守卫仍判定为已登录，会把 /login 重定向回 /chat，
 *         表现为「点了登录页又弹回聊天页」。
 *   2. 再 router.replace 到 /login
 *      —— 用 replace 而不是 push，避免历史记录里留下已失效的内部页面，
 *         用户按后退也不会回到需要登录的页面。
 *   3. 带上 redirect（登录后回跳）与 expired 标记（登录页提示原因）。
 */
setUnauthorizedHandler(({ redirect }) => {
  const auth = useAuthStore(pinia)
  auth.resetSession()

  const current = router.currentRoute.value

  // 已经在登录 / 注册页时不再跳转（例如登录失败后的其它 401 场景）
  if (current.name === 'login' || current.name === 'register') return

  // 不把登录页自身作为回跳目标，避免登录成功后又回到登录页
  const redirectTarget =
    redirect && redirect !== '/' && !redirect.startsWith('/login') ? redirect : ''

  void router
    .replace({
      name: 'login',
      query: {
        ...(redirectTarget ? { redirect: redirectTarget } : {}),
        expired: '1'
      }
    })
    .catch(() => {
      // 导航被守卫中断时不抛出未处理的 Promise 异常
    })
})

app.mount('#app')
