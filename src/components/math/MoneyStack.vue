<script setup lang="ts">
import type { MoneyPiece } from '@/types/models'
import { t } from '@/engine/i18n'

/** 一组人民币：纸币画成矩形，硬币画成圆形，面额居中。 */
defineProps<{ pieces: MoneyPiece[] }>()

/** 面额文字（跟随全局语言） */
function label(fen: number): string {
  return t({ k: 'money.amount', p: { fen } })
}

// 面额 → 配色（贴近真实人民币的色系，帮助识别）
const COLOR: Record<number, string> = {
  10: '#c9b7e8', // 1角
  50: '#a8d5c4', // 5角
  100: '#8fbf7f', // 1元 绿
  500: '#9d7bb0', // 5元 紫
  1000: '#7ea6d8', // 10元 蓝
  2000: '#d89b7e', // 20元 棕
  5000: '#b0603f', // 50元 红棕
}
function color(fen: number): string {
  return COLOR[fen] ?? 'var(--c-blue)'
}
</script>

<template>
  <div class="stack">
    <div
      v-for="(p, i) in pieces"
      :key="i"
      class="piece"
      :class="p.form"
      :style="{ background: color(p.fen) }"
    >
      {{ label(p.fen) }}
    </div>
  </div>
</template>

<style scoped>
.stack {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  align-items: center;
  max-width: 440px;
}
.piece {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 800;
  font-size: var(--fs-sm);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  box-shadow: var(--shadow-card);
}
.piece.note {
  width: 88px;
  height: 46px;
  border-radius: 8px;
  border: 2px solid rgba(255, 255, 255, 0.6);
}
.piece.coin {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.6);
}
</style>
