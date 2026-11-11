<script setup lang="ts">
/**
 * 需要登录令牌才能访问的图片
 *
 * 为什么不能直接用 <img :src="url"> 或 <img :src="url + '?token='">（BUG-02）：
 *
 * 1. <img> 由浏览器自己发起请求，**无法携带 Authorization 头**；
 * 2. 后端的文件下载路由 /api/chat/files/:id/download 挂的是 middleware.Auth()，
 *    只认请求头，**不接受 ?token=**（只有 project/preview 与 project/download
 *    才支持 query token）；
 *
 * 于是 <img src="..."> 会稳定拿到 401，界面上只剩占位图。
 *
 * 正确做法：用 fetch 带上令牌把图片取成 Blob，再转成 object URL 交给 <img>。
 * 加载失败时抛 error 事件，由父组件决定降级表现（占位图 / 文件行）。
 */
import { onBeforeUnmount, ref, watch } from 'vue'
import { fetchFileBlob } from '@/utils/file'

const props = withDefaults(
  defineProps<{
    /** 图片地址（后端返回的相对地址，不需要自带 token） */
    src: string
    alt?: string
  }>(),
  { alt: '' }
)

const emit = defineEmits<{ (e: 'error'): void }>()

const objectUrl = ref('')

/** 释放上一张 object URL，避免内存泄漏 */
const release = (): void => {
  if (!objectUrl.value) return
  URL.revokeObjectURL(objectUrl.value)
  objectUrl.value = ''
}

const load = async (): Promise<void> => {
  release()

  if (!props.src) {
    emit('error')
    return
  }

  try {
    const blob = await fetchFileBlob(props.src)
    objectUrl.value = URL.createObjectURL(blob)
  } catch {
    emit('error')
  }
}

watch(() => props.src, load, { immediate: true })

onBeforeUnmount(release)
</script>

<template>
  <img v-if="objectUrl" :src="objectUrl" :alt="alt" />
</template>
