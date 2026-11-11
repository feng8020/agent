/**
 * 路由与登录守卫 —— 现有 AI Chat 应用（保持不变）
 *
 * - 公开：/login、/register
 * - 需登录：/chat（未登录重定向到 /login，不显示 403 页面）
 *
 * 新增（招聘官网 / Careers Site，独立产品）：
 * - /careers               招聘官网首页
 * - /careers/jobs          岗位列表
 * - /careers/jobs/:id      岗位详情
 * - /careers/my-applications 我的投递（P1，本地记录）
 * - /careers/*            招聘官网 404
 * 招聘官网为公开页面（无登录 / 权限要求，产品书 §3 / §11），不影响既有路由。
 */
import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    /** 需要登录 */
    requiresAuth?: boolean
    /** 仅未登录可访问 */
    guestOnly?: boolean
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/chat'
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { guestOnly: true }
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { guestOnly: true }
  },
  {
    path: '/chat/:conversationId?',
    name: 'chat',
    component: () => import('@/views/ChatView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/chat'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.ensureInitialized()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'chat' }
  }

  return true
})

export default router
