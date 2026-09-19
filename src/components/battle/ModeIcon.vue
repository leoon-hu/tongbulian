<script setup lang="ts">
// 「跟谁打」三张卡的示意图（B27）：一台手机横着放，左半边红队、右半边蓝队；
// 打机器人时右半边是机器人；各用各的是两台手机各装一队，中间画信号。
// 纯 SVG、颜色走 tokens，没有文字（文字在卡片的注音标签里）。
import type { LocalMode } from '@/stores/battle'

defineProps<{ mode: LocalMode | 'online' }>()
</script>

<template>
  <svg class="mode-pic" viewBox="0 0 120 72" aria-hidden="true" focusable="false">
    <!-- 一台横屏手机：打机器人 / 两人一台 -->
    <g v-if="mode !== 'online'" class="phone landscape">
      <rect class="body" x="2" y="2" width="116" height="68" rx="12" />
      <path class="half red" d="M14 8H60V64H14A6 6 0 0 1 8 58V14A6 6 0 0 1 14 8Z" />
      <path class="half blue" d="M60 8H106A6 6 0 0 1 112 14V58A6 6 0 0 1 106 64H60Z" />
      <line class="divider" x1="60" y1="8" x2="60" y2="64" />
      <rect class="notch" x="3.5" y="32" width="2" height="8" rx="1" />
      <g class="person red">
        <circle cx="34" cy="28" r="8.5" />
        <path d="M20 57A14 13 0 0 1 48 57Z" />
      </g>
      <g v-if="mode === 'ai'" class="robot blue">
        <line class="antenna" x1="86" y1="13" x2="86" y2="19" />
        <circle cx="86" cy="12" r="2.4" />
        <rect x="74" y="19" width="24" height="19" rx="5" />
        <rect x="70.5" y="25" width="3.5" height="7" rx="1.5" />
        <rect x="98" y="25" width="3.5" height="7" rx="1.5" />
        <circle class="eye" cx="81" cy="28" r="2.8" />
        <circle class="eye" cx="91" cy="28" r="2.8" />
        <rect class="mouth" x="81" y="33" width="10" height="2" rx="1" />
        <rect x="76" y="41" width="20" height="16" rx="4" />
      </g>
      <g v-else class="person blue">
        <circle cx="86" cy="28" r="8.5" />
        <path d="M72 57A14 13 0 0 1 100 57Z" />
      </g>
    </g>

    <!-- 两台竖屏手机：各用各的 -->
    <template v-else>
      <g class="phone portrait">
        <rect class="body" x="2" y="2" width="50" height="68" rx="10" />
        <rect class="half red" x="8" y="8" width="38" height="56" rx="5" />
        <rect class="notch" x="23" y="4" width="8" height="2" rx="1" />
        <g class="person red">
          <circle cx="27" cy="28" r="8.5" />
          <path d="M13 57A14 13 0 0 1 41 57Z" />
        </g>
      </g>
      <g class="phone portrait">
        <rect class="body" x="68" y="2" width="50" height="68" rx="10" />
        <rect class="half blue" x="74" y="8" width="38" height="56" rx="5" />
        <rect class="notch" x="89" y="4" width="8" height="2" rx="1" />
        <g class="person blue">
          <circle cx="93" cy="28" r="8.5" />
          <path d="M79 57A14 13 0 0 1 107 57Z" />
        </g>
      </g>
      <g class="signal">
        <circle cx="60" cy="40" r="2.2" />
        <path d="M56.1 35.4A6 6 0 0 1 63.9 35.4" />
        <path d="M53.3 32A10.5 10.5 0 0 1 66.7 32" />
      </g>
    </template>
  </svg>
</template>

<style scoped>
.mode-pic {
  display: block;
  width: 100%;
  max-width: 132px;
  height: auto;
}
.body {
  fill: var(--c-text);
}
.notch {
  fill: rgba(255, 255, 255, 0.55);
}
.half.red {
  fill: #ffe3e3;
}
.half.blue {
  fill: #dcecff;
}
.divider {
  stroke: var(--c-text);
  stroke-width: 1.5;
  opacity: 0.35;
}
.person.red,
.robot.red {
  fill: var(--c-red);
}
.person.blue,
.robot.blue {
  fill: var(--c-blue);
}
.robot .antenna {
  stroke: var(--c-blue);
  stroke-width: 2;
  stroke-linecap: round;
}
.robot .eye,
.robot .mouth {
  fill: #fff;
}
.signal circle {
  fill: var(--c-text-light);
}
.signal path {
  fill: none;
  stroke: var(--c-text-light);
  stroke-width: 2;
  stroke-linecap: round;
}
</style>
