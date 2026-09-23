/// <reference types="vite/client" />

/** 构建版本（vite.config.ts 的 define；多设备房间用来核对，B43） */
declare const __BUILD__: string
/** 当前版本 = 构建时刻（北京时间「2026-09-23 14:05」，vite.config.ts 的 buildVersion），首页页脚版本卡片用；服务端构建里是空串 */
declare const __APP_VERSION__: string

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
