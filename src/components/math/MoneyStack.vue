<script setup lang="ts">
import type { MoneyPiece } from '@/types/models'
import { t } from '@/engine/i18n'

/** 一组人民币：纸币画成矩形，硬币画成圆形，面额居中。 */
defineProps<{ pieces: MoneyPiece[] }>()

/** 面额文字（跟随全局语言） */
function label(fen: number): string {
  return t({ k: 'money.amount', p: { fen } })
}

// 纸币面额 → 配色（贴近 2019 版人民币的主色调，课本一下 p78）
const NOTE_COLOR: Record<number, string> = {
  100: '#7fae6a', // 1元 橄榄绿
  500: '#9d7bb0', // 5元 紫
  1000: '#5f8fcf', // 10元 蓝
  2000: '#b9825a', // 20元 棕
  5000: '#3f9a6b', // 50元 绿
  10000: '#d2524c', // 100元 红
}
// 硬币：1元、1角是银白色，5角是金黄色；分币是浅灰的铝币（画小一号）
const COIN_COLOR: Record<number, string> = {
  100: '#8e98a5',
  50: '#b8953e',
  10: '#9aa3ae',
  5: '#a9b0b9',
  2: '#a9b0b9',
  1: '#a9b0b9',
}
function color(p: MoneyPiece): string {
  return (p.form === 'coin' ? COIN_COLOR[p.fen] : NOTE_COLOR[p.fen]) ?? 'var(--c-blue)'
}
</script>

<template>
  <div class="stack">
    <div
      v-for="(p, i) in pieces"
      :key="i"
      class="piece"
      :class="[p.form, { fen: p.form === 'coin' && p.fen < 10 }]"
      :style="{ background: color(p) }"
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
/* 分币比角币、元币小一圈 */
.piece.coin.fen {
  width: 44px;
  height: 44px;
  font-size: calc(var(--fs-sm) * 0.9);
}
</style>
