/// <reference types="vite/client" />

/** 构建版本（vite.config.ts 的 define；多设备房间用来核对，B43） */
declare const __BUILD__: string

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
