<script setup lang="ts">
/**
 * 聊天页布局：侧边栏 + 主区 +（可选）右侧预览区
 *
 * 右侧 aside 有两种内容，靠 previewVariant 区分（不新建第二个侧栏）：
 * - test     ：Tester Agent 的浏览器实时画面（原有能力，桌面分栏 / 移动端右下浮窗）
 * - artifact ：产物预览（网页 / 前端项目 / 前后端项目），移动端铺成全屏覆盖
 *
 * 宽度：clamp(360px, 30vw, 70vw)。
 * 原实现上限 460px 在 1920px 视口下只有 24%，不满足「占据 30% 或更多」的要求。
 */
withDefaults(
  defineProps<{
    /** 侧边栏收缩态（桌面端） */
    collapsed: boolean
    /** 移动端抽屉是否打开 */
    drawerOpen: boolean
    /** 右侧预览区是否展开：关闭时 slot 完全不渲染，聊天区占满宽度 */
    previewOpen?: boolean
    /** 右侧预览区内容类型 */
    previewVariant?: 'artifact' | 'test'
  }>(),
  { previewOpen: false, previewVariant: 'test' }
)

const emit = defineEmits<{ (e: 'close-drawer'): void }>()
</script>

<template>
  <!-- 聊天页布局（UI §5.2）：侧边栏 + 主区 +（可选）右侧预览区 -->
  <div class="chat-layout">
    <div
      class="chat-layout__sidebar"
      :class="{ 'is-drawer-open': drawerOpen }"
    >
      <slot name="sidebar" />
    </div>

    <div v-if="drawerOpen" class="chat-layout__overlay" @click="emit('close-drawer')" />

    <main class="chat-layout__main">
      <slot />
    </main>

    <!-- 右侧预览区：未展开时不占任何空间 -->
    <aside
      v-if="previewOpen"
      class="chat-layout__preview"
      :data-variant="previewVariant"
    >
      <slot name="preview" />
    </aside>
  </div>
</template>

<style scoped>
.chat-layout {
  display: flex;
  height: 100%;
  overflow: hidden;
  background-color: var(--color-bg);
}

.chat-layout__sidebar {
  flex: none;
  height: 100%;
}

.chat-layout__main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  height: 100%;
}

/* 桌面端：产物预览与测试画面共用同一块区域，宽度下限 360 / 首选 30vw / 上限 70vw */
.chat-layout__preview {
  flex: none;
  width: clamp(
    var(--size-artifact-panel-min),
    var(--size-artifact-panel-width),
    var(--size-artifact-panel-max)
  );
  height: 100%;
  border-left: 1px solid var(--color-border);
  overflow: hidden;
}

.chat-layout__overlay {
  display: none;
}

/* 平板：面板覆盖主区（侧边栏仍可见），避免两侧都不可读 */
@media (min-width: 768px) and (max-width: 1023px) {
  .chat-layout__preview[data-variant='artifact'] {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: var(--size-sidebar-expanded);
    z-index: var(--z-overlay);
    width: auto;
    box-shadow: var(--shadow-lg);
  }
}

/* 移动端：侧边栏改为抽屉（UI §12） */
@media (max-width: 767px) {
  .chat-layout__sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: var(--z-sidebar);
    width: 264px;
    max-width: 82vw;
    transform: translateX(-100%);
    transition: transform var(--duration-base) var(--easing-standard);
    box-shadow: var(--shadow-drawer);
  }

  .chat-layout__sidebar.is-drawer-open {
    transform: none;
  }

  .chat-layout__overlay {
    display: block;
    position: fixed;
    inset: 0;
    z-index: calc(var(--z-sidebar) - 1);
    background-color: var(--color-overlay);
  }

  /*
   * 测试画面：移动端右侧没有空间，改为右下角浮动小窗。
   * z-index 低于抽屉遮罩，打开侧边栏时会被遮住（符合预期）。
   */
  .chat-layout__preview[data-variant='test'] {
    position: fixed;
    right: var(--space-3);
    bottom: var(--space-3);
    width: min(78vw, 360px);
    height: auto;
    max-height: 45vh;
    z-index: calc(var(--z-sidebar) - 2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    background-color: var(--color-surface);
  }

  /* 产物预览：全屏覆盖（产品需求 §6.1：窄屏不使用 30% 分栏） */
  .chat-layout__preview[data-variant='artifact'] {
    position: fixed;
    inset: 0;
    z-index: var(--z-overlay);
    width: 100%;
    height: 100%;
    border-left: 0;
    background-color: var(--color-bg);
  }
}
</style>
