<script setup lang="ts">
import type { Question } from '@/types/models'
import type { BlankFill } from '@/components/practice/blank'
import RubyText from '@/components/ui/RubyText.vue'
import TenFrame from '@/components/math/TenFrame.vue'
import CountingObjects from '@/components/math/CountingObjects.vue'
import CompareRows from '@/components/math/CompareRows.vue'
import TimesRows from '@/components/math/TimesRows.vue'
import ClockFace from '@/components/math/ClockFace.vue'
import MoneyStack from '@/components/math/MoneyStack.vue'
import ShapeGlyph from '@/components/math/ShapeGlyph.vue'
import ShapeGroup from '@/components/math/ShapeGroup.vue'
import TileGrid from '@/components/math/TileGrid.vue'
import PatternSequence from '@/components/math/PatternSequence.vue'
import Lineup from '@/components/math/Lineup.vue'
import NumberLine from '@/components/math/NumberLine.vue'
import RulerGauge from '@/components/math/RulerGauge.vue'
import AngleGlyph from '@/components/math/AngleGlyph.vue'
import VerticalForm from '@/components/math/VerticalForm.vue'

/**
 * withSpeaker：题干第一行开头放一个小喇叭（点读的提示），点击由外层处理。
 * fill：练习页把按的数字填进算式的「?」与竖式的答案行（blank.ts，U5）；不传就原样画「?」（对战）。
 */
withDefaults(defineProps<{ question: Question; withSpeaker?: boolean; fill?: BlankFill | null }>(), {
  withSpeaker: false,
  fill: null,
})
</script>

<template>
  <div class="stem">
    <template v-for="(part, i) in question.stem" :key="i">
      <p v-if="part.kind === 'text'" class="stem-text">
        <span v-if="withSpeaker && i === 0" class="speaker" aria-hidden="true">🔊</span><RubyText :text="part.text" />
      </p>
      <div v-else-if="part.kind === 'expr'" class="stem-expr" :class="{ long: part.expr.length > 12 }">
        <span v-if="withSpeaker && i === 0" class="speaker" aria-hidden="true">🔊</span>
        <template v-if="fill && part.expr.includes('?')">
          <template v-for="(seg, k) in part.expr.split('?')" :key="k">
            <span v-if="k > 0" class="fill-slot" :class="{ empty: fill.value === '', done: fill.done }">{{ fill.value || '?' }}</span>{{ seg }}
          </template>
        </template>
        <template v-else>{{ part.expr }}</template>
      </div>
      <TenFrame
        v-else-if="part.kind === 'tenframe'"
        :filled="part.filled"
        :extra="part.extra ?? 0"
        :taken="part.taken ?? 0"
      />
      <CountingObjects
        v-else-if="part.kind === 'objects'"
        :icon="part.icon"
        :count="part.count"
      />
      <div v-else-if="part.kind === 'scatter'" class="scatter">
        <span v-for="(it, k) in part.items" :key="k" class="scatter-item">{{ it }}</span>
      </div>
      <CompareRows v-else-if="part.kind === 'compare-rows'" :rows="part.rows" />
      <TimesRows v-else-if="part.kind === 'times-rows'" :icon="part.icon" :per="part.per" :rows="part.rows" />
      <ClockFace v-else-if="part.kind === 'clock'" :hour="part.hour" :minute="part.minute" />
      <MoneyStack v-else-if="part.kind === 'money'" :pieces="part.pieces" />
      <ShapeGlyph v-else-if="part.kind === 'shape'" :shape="part.shape" :size="96" />
      <ShapeGroup v-else-if="part.kind === 'shape-group'" :shapes="part.shapes" />
      <TileGrid v-else-if="part.kind === 'tiles'" :rows="part.rows" :cols="part.cols" />
      <PatternSequence v-else-if="part.kind === 'sequence'" :cells="part.cells" />
      <Lineup
        v-else-if="part.kind === 'lineup'"
        :items="part.items"
        :highlight="part.highlight"
        :axis="part.axis"
      />
      <NumberLine
        v-else-if="part.kind === 'number-line'"
        :from="part.from"
        :to="part.to"
        :marks="part.marks"
      />
      <RulerGauge
        v-else-if="part.kind === 'ruler'"
        :length="part.length"
        :from="part.from"
        :to="part.to"
      />
      <VerticalForm
        v-else-if="part.kind === 'vertical'"
        :a="part.a"
        :op="part.op"
        :b="part.b"
        :answer="fill?.value"
        :done="fill?.done"
      />
      <div v-else-if="part.kind === 'angles'" class="angles" :class="{ single: part.items.length === 1 }">
        <AngleGlyph
          v-for="(ag, k) in part.items"
          :key="k"
          :deg="ag.deg"
          :rot="ag.rot"
          :size="part.items.length === 1 ? 128 : 84"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.stem {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.stem-text {
  font-size: var(--fs-lg);
  font-weight: 700;
  text-align: center;
}
.stem-expr {
  font-size: var(--fs-huge);
  font-weight: 800;
  letter-spacing: 4px;
  color: var(--c-text);
  text-align: center;
}
/* 练习页把按的数字填在「?」的位置：虚线框里，还没按是淡色「?」，判完变绿 */
.fill-slot {
  display: inline-block;
  min-width: 1.1em;
  padding: 0 0.12em;
  border: 3px dashed var(--c-primary);
  border-radius: 12px;
  color: var(--c-primary-dark);
  letter-spacing: 0;
  line-height: 1.1;
  text-align: center;
}
.fill-slot.empty {
  color: var(--c-locked);
}
.fill-slot.done {
  border-style: solid;
  border-color: var(--c-green);
  color: var(--c-green);
}
/* 三位数的算式在手机上放不下一行，缩一号 */
.stem-expr.long {
  font-size: 40px;
  letter-spacing: 2px;
}
.speaker {
  font-size: 0.75em;
  margin-right: 0.35em;
  letter-spacing: 0;
  vertical-align: 0.08em;
}
.angles {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  justify-content: center;
  align-items: center;
  max-width: 440px;
  padding: 10px;
  background: var(--c-bg);
  border-radius: var(--radius-md);
}
.scatter {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 12px;
  justify-content: center;
  align-items: center;
  max-width: 420px;
  font-size: 40px;
  line-height: 1;
  background: var(--c-bg);
  border-radius: var(--radius-md);
  padding: 16px;
}
</style>
