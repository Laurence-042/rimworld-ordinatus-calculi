<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Plotly from 'plotly.js-dist-min'
import { useResizeObserver } from '@vueuse/core'
import type { ArmorSet, DamageType } from '@/types/armor'
import { BodyPart } from '@/types/bodyPart'
import {
  calculateMultiLayerDamageReduction,
  filterArmorLayersByBodyPart,
} from '@/utils/armorCalculations'

const { t } = useI18n()

const props = defineProps<{
  armorSets: ArmorSet[]
  damageType: DamageType
  fixedPenetration: number
  selectedBodyPart: BodyPart
}>()

const chartContainer = ref<HTMLElement | null>(null)

const damageTypeLabel = computed(() => {
  const labels: Record<DamageType, string> = {
    blunt: t('damageType.blunt'),
    sharp: t('damageType.sharp'),
    heat: t('damageType.heat'),
  }
  return labels[props.damageType]
})

// 在组件内部计算所有护甲套装的伤害分布数据
// 护甲层已包含 resolvedMaterialData，getActualArmorValue 会自动计算材料加成
const armorSetsData = computed(() => {
  return props.armorSets.map((armorSet) => {
    // 过滤只覆盖选中身体部位的护甲层
    const filteredLayers = filterArmorLayersByBodyPart(armorSet.layers, props.selectedBodyPart)

    // 计算在固定穿甲条件下的伤害分布
    const result = calculateMultiLayerDamageReduction(filteredLayers, {
      armorPenetration: props.fixedPenetration / 100,
      damageType: props.damageType,
    })

    return {
      armorSet,
      fixedDamageResult: {
        damageReduction: result.damageReduction,
        damageStates: result.damageStates,
      },
    }
  })
})

function renderChart() {
  if (!chartContainer.value || armorSetsData.value.length === 0) return

  // 1. 汇总所有套装的 damageMultiplier，去重后从低到高排序
  const allMultipliers = new Set<number>()
  armorSetsData.value.forEach((setData) => {
    setData.fixedDamageResult.damageStates.forEach((state) => {
      allMultipliers.add(state.damageMultiplier)
    })
  })
  const sortedMultipliers = Array.from(allMultipliers).sort((a, b) => a - b)

  // 为每个护甲套装创建帕累托图数据
  const traces: Array<Partial<Plotly.PlotData>> = []

  armorSetsData.value.forEach((setData) => {
    const { armorSet, fixedDamageResult } = setData
    const { damageStates } = fixedDamageResult

    // 3. 映射数据：为每个 damageMultiplier 创建概率映射
    const multiplierToProbability = new Map<number, number>()
    damageStates.forEach((state) => {
      const existing = multiplierToProbability.get(state.damageMultiplier) || 0
      multiplierToProbability.set(state.damageMultiplier, existing + state.probability)
    })

    // 4. 按照统一的 sortedMultipliers 顺序映射概率
    const probabilities = sortedMultipliers.map(
      (multiplier) => (multiplierToProbability.get(multiplier) || 0) * 100,
    )

    // 5. 计算累积概率（从低伤害到高伤害累积）
    const cumulativeProbabilities: number[] = []
    let cumulative = 0
    for (const prob of probabilities) {
      cumulative += prob
      cumulativeProbabilities.push(cumulative)
    }

    // 准备hover文本（显示减伤比例）
    const hoverTexts = sortedMultipliers.map((multiplier, index) => {
      const damageReduction = ((1 - multiplier) * 100).toFixed(1)
      const prob = probabilities[index] ?? 0
      return t('chart.reductionHoverText', {
        reduction: damageReduction,
        prob: prob.toFixed(2),
      })
    })

    const reductions = sortedMultipliers.map((v) => 1 - v)

    // 柱状图（概率）
    traces.push({
      name: `${armorSet.name} - ${t('chart.probabilityLabel')}`,
      type: 'bar',
      x: reductions,
      y: probabilities,
      text: hoverTexts,
      marker: { color: armorSet.color },
      yaxis: 'y',
      hovertemplate: '%{text}<extra></extra>',
    })

    // 折线图描边（白色粗线）- 先绘制作为背景
    traces.push({
      name: `${armorSet.name} - 累积 (描边)`,
      type: 'scatter',
      mode: 'lines',
      x: reductions,
      y: cumulativeProbabilities,
      line: { color: '#ffffff', width: 6 },
      yaxis: 'y2',
      showlegend: false,
      hoverinfo: 'skip',
    })

    // 准备累积概率的hover文本
    const cumulativeHoverTexts = sortedMultipliers.map((multiplier, index) => {
      const cumulativeProb = cumulativeProbabilities[index] ?? 0
      const damageReduction = ((1 - multiplier) * 100).toFixed(1)
      return t('chart.cumulativeProbText', {
        prob: cumulativeProb.toFixed(2),
        reduction: damageReduction,
      })
    })

    // 折线图（累积概率）
    traces.push({
      name: `${armorSet.name} - ${t('chart.cumulativeLabel')}`,
      type: 'scatter',
      mode: 'lines+markers',
      x: reductions,
      y: cumulativeProbabilities,
      text: cumulativeHoverTexts,
      line: { color: armorSet.color, dash: 'dash', width: 3 },
      marker: {
        size: 8,
        color: armorSet.color,
        line: { color: '#ffffff', width: 2 },
      },
      yaxis: 'y2',
      hovertemplate: '%{text}<extra></extra>',
    })
  })

  const layout: Partial<Plotly.Layout> = {
    title: {
      text: t('chart.damageReductionDistribution', {
        damageType: damageTypeLabel.value,
        penetration: props.fixedPenetration,
      }),
    },
    xaxis: {
      title: { text: t('chart.damageReductionRatio') },
      tickformat: '.0%',
      autorange: 'reversed',
    },
    yaxis: {
      title: { text: `${t('chart.probability')} (%)` },
      side: 'left' as const,
      rangemode: 'tozero' as const,
    },
    yaxis2: {
      title: { text: `${t('chart.cumulativeProbability')} (%)` },
      side: 'right' as const,
      overlaying: 'y' as const,
      range: [0, 100],
      showgrid: false,
    },
    autosize: true,
    margin: { l: 60, r: 60, t: 80, b: 80 },
    showlegend: true,
    legend: {
      orientation: 'v' as const,
      x: 1.1,
      y: 1,
    },
    hovermode: 'closest' as const,
    barmode: 'group' as const,
  }

  Plotly.newPlot(chartContainer.value, traces, layout, {
    responsive: true,
    displayModeBar: true,
  })
}

watch(
  () => [props.armorSets, props.damageType, props.fixedPenetration, props.selectedBodyPart],
  renderChart,
  { deep: true },
)

// 监听容器尺寸变化（包括 splitter 拖动）
useResizeObserver(chartContainer, () => {
  if (chartContainer.value) {
    Plotly.Plots.resize(chartContainer.value)
  }
})

onMounted(() => {
  renderChart()
})
</script>

<template>
  <div class="chart-wrapper">
    <div ref="chartContainer" class="chart"></div>
  </div>
</template>

<style scoped>
.chart-wrapper {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  width: 100%;
  min-height: 400px;
}

.chart {
  flex: 1;
  height: 100%;
  width: 100%;
}

@media (max-width: 768px) {
  .chart-wrapper {
    min-height: 350px;
  }
}

@media (max-width: 480px) {
  .chart-wrapper {
    min-height: 300px;
  }
}
</style>
