<script setup lang="ts">
withDefaults(
  defineProps<{
    color?: 'primary' | 'blue' | 'green' | 'ghost'
    disabled?: boolean
  }>(),
  { color: 'primary', disabled: false },
)
</script>

<template>
  <button class="big-btn" :class="color" :disabled="disabled">
    <slot />
  </button>
</template>

<style scoped>
.big-btn {
  min-height: var(--tap-min);
  padding: 0 28px;
  border-radius: var(--radius-lg);
  font-size: var(--fs-lg);
  font-weight: 700;
  color: #fff;
  box-shadow: var(--shadow-card);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}
.big-btn:active {
  transform: scale(0.95);
  box-shadow: var(--shadow-press);
}
.big-btn:disabled {
  background: var(--c-locked);
  color: #fff;
  cursor: not-allowed;
}
.primary {
  background: var(--c-primary);
}
.primary:not(:disabled):hover {
  background: var(--c-primary-dark);
}
.blue {
  background: var(--c-blue);
}
.green {
  background: var(--c-green);
}
.ghost {
  background: var(--c-card);
  color: var(--c-text);
  border: 2px solid var(--c-line);
}
</style>
