<script setup lang="ts">
import type { Question } from '@/types/models'
import type { BlankFill } from '@/components/practice/blank'
import RubyText from '@/components/ui/RubyText.vue'
import MathText from '@/components/ui/MathText.vue'
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
import MotionFigs from '@/components/math/MotionFigs.vue'
import LongDivision from '@/components/math/LongDivision.vue'
import TenBlocks from '@/components/math/TenBlocks.vue'
import CodeStrip from '@/components/math/CodeStrip.vue'
import ScaleDial from '@/components/math/ScaleDial.vue'
import SolidScene from '@/components/math/SolidScene.vue'
import ViewGlyph from '@/components/math/ViewGlyph.vue'
import DiceGlyph from '@/components/math/DiceGlyph.vue'
import NetGrid from '@/components/math/NetGrid.vue'
import GeoFigure from '@/components/math/GeoFigure.vue'
import FracShape from '@/components/math/FracShape.vue'
import FracLine from '@/components/math/FracLine.vue'
import FracSet from '@/components/math/FracSet.vue'
import TallySheet from '@/components/math/TallySheet.vue'
import StatTable from '@/components/math/StatTable.vue'
import MonthCalendar from '@/components/math/MonthCalendar.vue'
// 四年级数学 A
import BigNum from '@/components/math/BigNum.vue'
import CounterRods from '@/components/math/CounterRods.vue'
import AbacusFrame from '@/components/math/AbacusFrame.vue'
import PlaceTable from '@/components/math/PlaceTable.vue'
// 四年级数学 B
import Protractor from '@/components/math/Protractor.vue'
// 四年级数学 C
// 四年级数学 D
import BarChart from '@/components/math/BarChart.vue'
import PlanMap from '@/components/math/PlanMap.vue'
import CompassRose from '@/components/math/CompassRose.vue'
import HanziGrid from '@/components/chinese/HanziGrid.vue'
import PinyinCard from '@/components/chinese/PinyinCard.vue'
import ListenCue from '@/components/chinese/ListenCue.vue'
import PictureCard from '@/components/chinese/PictureCard.vue'
import VerseLine from '@/components/chinese/VerseLine.vue'

/**
 * withSpeaker：题干第一行开头放一个小喇叭（点读的提示），点击由外层处理。
 * fill：练习页把按的数字填进算式的「?」与竖式的答案行（blank.ts，U5）；不传就原样画「?」（对战）。
 * 语文的句子空格、大字算式里的「？」只在答完（done）时填上正确答案。
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
            <span v-if="k > 0" class="fill-slot" :class="{ empty: fill.value === '', done: fill.done }">{{ fill.value || '?' }}</span><MathText :text="seg" />
          </template>
        </template>
        <MathText v-else :text="part.expr" />
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
      <ShapeGlyph v-else-if="part.kind === 'shape'" :shape="part.shape" :size="96" :tone="part.tone" :turn="part.turn" :form="part.form" />
      <ShapeGroup v-else-if="part.kind === 'shape-group'" :shapes="part.shapes" :tones="part.tones" :turns="part.turns" :forms="part.forms" />
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
        :mm="part.mm"
      />
      <ScaleDial
        v-else-if="part.kind === 'scale'"
        :max="part.max"
        :major="part.major"
        :minor="part.minor"
        :value="part.value"
        :unit="part.unit"
      />
      <SolidScene v-else-if="part.kind === 'solid-scene'" :arrangement="part.arrangement" />
      <ViewGlyph v-else-if="part.kind === 'views'" :items="part.items" :numbered="part.numbered" />
      <DiceGlyph v-else-if="part.kind === 'dice'" :front="part.front" :top="part.top" :right="part.right" />
      <NetGrid v-else-if="part.kind === 'net'" :cells="part.cells" />
      <GeoFigure v-else-if="part.kind === 'geo'" :figs="part.figs" :numbered="part.numbered" :alt="part.alt" />
      <FracShape v-else-if="part.kind === 'frac-shape'" :items="part.items" />
      <FracLine
        v-else-if="part.kind === 'frac-line'"
        :units="part.units"
        :per="part.per"
        :bracket="part.bracket"
        :arrow="part.arrow"
        :unit="part.unit"
        :ruler="part.ruler"
        :labels="part.labels"
      />
      <FracSet
        v-else-if="part.kind === 'frac-set'"
        :icon="part.icon"
        :groups="part.groups"
        :per="part.per"
        :shaded="part.shaded"
        :dir="part.dir"
        :boxed="part.boxed"
      />
      <TallySheet v-else-if="part.kind === 'tally'" :rows="part.rows" />
      <StatTable v-else-if="part.kind === 'stat-table'" :title="part.title" :rows="part.rows" :head="part.head" :fill="fill" />
      <MonthCalendar v-else-if="part.kind === 'calendar'" :title="part.title" :days="part.days" :first="part.first" :mark="part.mark" />
      <!-- 四年级数学 A -->
      <BigNum
        v-else-if="part.kind === 'big-num'"
        :n="part.n"
        :split="part.split"
        :marks="part.marks"
        :words="part.words"
        :rel="part.rel"
        :rhs="part.rhs"
        :unit="part.unit"
        :fill="fill"
      />
      <CounterRods v-else-if="part.kind === 'counter'" :top="part.top" :beads="part.beads" />
      <AbacusFrame v-else-if="part.kind === 'abacus'" :n="part.n" />
      <PlaceTable v-else-if="part.kind === 'place-table'" :top="part.top" :ask="part.ask" />
      <!-- 四年级数学 B -->
      <Protractor
        v-else-if="part.kind === 'protractor'"
        :rays="part.rays"
        :arc="part.arc"
        :points="part.points"
        :center="part.center"
        :tilt="part.tilt"
        :name="part.name"
        :alt="part.alt"
      />
      <!-- 四年级数学 C -->
      <VerticalForm
        v-else-if="part.kind === 'mul-vertical'"
        :a="part.a"
        op="×"
        :b="part.b"
        :steps="true"
        :zeros="part.zeros"
        :work="part.work"
        :mark="part.mark"
        :answer="part.work ? undefined : fill?.value"
        :done="part.work ? undefined : fill?.done"
      />
      <!-- 四年级数学 D -->
      <BarChart
        v-else-if="part.kind === 'bar-chart'"
        :dir="part.dir"
        :title="part.title"
        :cats="part.cats"
        :series="part.series"
        :step="part.step"
        :cells="part.cells"
        :value-axis="part.valueAxis"
        :cat-axis="part.catAxis"
        :grid="part.grid"
        :numbers="part.numbers"
        :hide-scale="part.hideScale"
      />
      <PlanMap v-else-if="part.kind === 'plan-map'" :cells="part.cells" :marks="part.marks" :roads="part.roads" :title="part.title" />
      <CompassRose v-else-if="part.kind === 'compass'" :ask="part.ask" />
      <VerticalForm
        v-else-if="part.kind === 'vertical'"
        :a="part.a"
        :op="part.op"
        :b="part.b"
        :answer="fill?.value"
        :done="fill?.done"
      />
      <TenBlocks v-else-if="part.kind === 'blocks'" :groups="part.groups" :tens="part.tens" :ones="part.ones" />
      <CodeStrip
        v-else-if="part.kind === 'code-strip'"
        :digits="part.digits"
        :segs="part.segs"
        :names="part.names"
        :mark="part.mark"
        :cell="part.cell"
        :fit="part.fit"
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
      <MotionFigs v-else-if="part.kind === 'motion-figs'" :items="part.items" :arrows="part.arrows" />
      <LongDivision
        v-else-if="part.kind === 'long-division'"
        :divisor="part.divisor"
        :dividend="part.dividend"
        :quotient="part.quotient"
        :rows="part.rows"
        :box="part.box"
        :answer="fill?.value"
        :done="fill?.done"
      />
      <HanziGrid v-else-if="part.kind === 'hanzi'" :text="part.text" :mark="part.mark" :fill="fill?.done ? fill.value : undefined" />
      <PinyinCard v-else-if="part.kind === 'pinyin'" :text="part.text" />
      <ListenCue v-else-if="part.kind === 'listen'" />
      <PictureCard v-else-if="part.kind === 'picture'" :icon="part.icon" />
      <VerseLine
        v-else-if="part.kind === 'verse'"
        :text="part.text"
        :py="part.py"
        :blank="part.blank"
        :fill="fill?.done ? fill.value : undefined"
      />
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
