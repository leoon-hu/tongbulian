// 学习引擎（与学科/年级无关）的题目生成原语。内容包的生成器只依赖这里。
// 注意：这里【不】导出 catalog，避免「生成器 → @/engine → catalog → 内容包 → 生成器」的循环依赖。
// 目录相关（SUBJECTS / getCourse / findKp …）请从 '@/engine/catalog' 导入。
export { ROUND_SIZE, buildSession, defineGenerator, getGenerator, hasGenerator } from './session'
export type { Generator, SessionOptions } from './session'
export { createRng } from './rng'
export type { RNG } from './rng'
export { choicesFrom, labelKey, labelQuestion, numberDistractors, numberQuestion, sigId } from './question'
