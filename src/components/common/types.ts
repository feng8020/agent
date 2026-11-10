/**
 * 通用组件共享类型
 * （`<script setup>` 内不允许 ES 导出，故统一放置于此，保持 Vue 3.2 兼容）
 */

/** 分段控件选项 */
export interface SegmentedOption<T extends string = string> {
  label: string
  value: T
}

/** 选项卡 */
export interface TabItem {
  label: string
  value: string
}
