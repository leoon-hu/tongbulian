/// <reference types="vite/client" />

/** 构建版本（vite.config.ts 的 define；多设备房间用来核对，B43） */
declare const __BUILD__: string
/** 构建时刻（UTC，「2026-09-22 06:10」），帮助页显示；服务端构建里是空串 */
declare const __BUILT_AT__: string

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
