/** vite.config.ts 的 audioClips 插件生成：每种语言一串排好序的 10 位音频哈希（见 src/audio/clips.ts 与 engine/offline.ts） */
declare module 'virtual:audio-clips' {
  export const zh: string
  export const en: string
  /** 文件名不是文本哈希的几条（合成时换过读法的多音字）：文本的哈希 → 文件的哈希 */
  export const zhAlias: Record<string, string>
  export const enAlias: Record<string, string>
}
