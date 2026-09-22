<script setup lang="ts">
// 角色的对话框（需求 B71）：点了游戏里的角色，在点按处上方冒一个气泡写它的台词（注音），2.6 秒收起；朗读由竞技场做。
// 放在游戏盒子（.strip）里绝对定位：x / y 是盒子里的 CSS 像素；靠边的左右夹住，太靠上的就挂在点按处下面。
import { computed } from 'vue'
import type { Team } from '@/battle/protocol'
import RubyText from '@/components/ui/RubyText.vue'

const props = defineProps<{ line: { id: number; key: string; team: Team; x: number; y: number } }>()
/** 离盒子顶边不到这么多就翻到下面 */
const FLIP_BELOW = 48
const below = computed(() => props.line.y < FLIP_BELOW)
const style = computed(() => ({
  left: `clamp(70px, ${Math.round(props.line.x)}px, calc(100% - 70px))`,
  top: `${Math.round(below.value ? props.line.y + 10 : props.line.y - 8)}px`,
}))
</script>

<template>
  <div :key="line.id" class="char-bubble" :class="[line.team, { below }]" :style="style" role="status">
    <RubyText :text="{ k: line.key }" />
  </div>
</template>

<style scoped>
.char-bubble {
  position: absolute;
  z-index: 5;
  transform: translate(-50%, -100%);
  max-width: min(320px, 80%);
  padding: 4px 12px;
  border-radius: 14px;
  background: #fff;
  border: 2px solid var(--c-red);
  box-shadow: var(--shadow-card);
  font-size: var(--fs-sm);
  font-weight: 700;
  line-height: 1.5;
  color: var(--c-text);
  text-align: center;
  pointer-events: none;
  animation: bubble-pop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.char-bubble.blue {
  border-color: var(--c-blue);
}
/* 小尾巴：指向点的地方 */
.char-bubble::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -9px;
  width: 12px;
  height: 12px;
  background: #fff;
  border-right: 2px solid var(--c-red);
  border-bottom: 2px solid var(--c-red);
  transform: translateX(-50%) rotate(45deg);
}
.char-bubble.blue::after {
  border-color: var(--c-blue);
}
.char-bubble.below {
  transform: translate(-50%, 0);
}
.char-bubble.below::after {
  bottom: auto;
  top: -9px;
  transform: translateX(-50%) rotate(-135deg);
}
@keyframes bubble-pop {
  from {
    opacity: 0;
    scale: 0.6;
  }
  to {
    opacity: 1;
    scale: 1;
  }
}
</style>
