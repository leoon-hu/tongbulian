<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{ maxLen?: number }>(), { maxLen: 3 })
const emit = defineEmits<{ confirm: [value: number] }>()

const value = ref('')

function tapDigit(d: number): void {
  if (value.value.length >= props.maxLen) return
  if (value.value === '' && d === 0) {
    value.value = '0'
    return
  }
  value.value = value.value === '0' ? String(d) : value.value + String(d)
}

function backspace(): void {
  value.value = value.value.slice(0, -1)
}

function confirm(): void {
  if (value.value === '') return
  emit('confirm', parseInt(value.value, 10))
}
</script>

<template>
  <div class="numpad">
    <div class="display" :class="{ empty: value === '' }">
      {{ value === '' ? '?' : value }}
    </div>
    <div class="grid">
      <button v-for="d in 9" :key="d" class="key" @click="tapDigit(d)">{{ d }}</button>
      <button class="key func" @click="backspace">⌫</button>
      <button class="key" @click="tapDigit(0)">0</button>
      <button class="key ok" :disabled="value === ''" @click="confirm">✓</button>
    </div>
  </div>
</template>

<style scoped>
.numpad {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  width: 100%;
  max-width: 360px;
  margin: 0 auto;
}
.display {
  min-width: 140px;
  padding: 4px 24px;
  border-radius: var(--radius-md);
  background: var(--c-card);
  border: 3px dashed var(--c-primary);
  font-size: var(--fs-huge);
  font-weight: 800;
  text-align: center;
  color: var(--c-primary-dark);
}
.display.empty {
  color: var(--c-locked);
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  width: 100%;
}
.key {
  height: var(--tap-min);
  border-radius: var(--radius-md);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--c-text);
  transition: transform 0.08s ease;
}
.key:active {
  transform: scale(0.92);
}
.key.func {
  color: var(--c-red);
}
.key.ok {
  background: var(--c-green);
  color: #fff;
}
.key.ok:disabled {
  background: var(--c-locked);
}
</style>
