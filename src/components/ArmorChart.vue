<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import Plotly from 'plotly.js-dist-min'
import type { DamageType, DamageState } from '@/types/armor'

interface ArmorSetData {
  armorSet: {
    id: number
    name: string
    color: string
  }
  fixedDamageResult: {
    expectedDamage: number
    damageStates: DamageState[]
  }
}

const props = defineProps<{
  armorSetsData: ArmorSetData[]
  damageType: DamageType
}>()

const chartContainer = ref<HTMLElement | null>(null)

const damageTypeLabel = computed(() => {
  const labels = {
    blunt: '钝器',
    sharp: '利器',
    heat: '热能',
  }
  return labels[props.damageType]
})

function renderChart() {
  if (!chartContainer.value || props.armorSetsData.length === 0) return

  // 1. 汇总所有套装的 damageMultiplier，去重后从低到高排序
  const allMultipliers = new Set<number>()
  props.armorSetsData.forEach((setData) => {
    setData.fixedDamageResult.damageStates.forEach((state) => {
      allMultipliers.add(state.damageMultiplier)
    })
  })
  const sortedMultipliers = Array.from(allMultipliers).sort((a, b) => a - b)

  // 为每个护甲套装创建帕累托图数据
  const traces: Array<Partial<Plotly.PlotData>> = []

  props.armorSetsData.forEach((setData) => {
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

    // 准备hover文本
    const hoverTexts = sortedMultipliers.map((multiplier, index) => {
      const percent = (multiplier * 100).toFixed(0)
      const prob = probabilities[index] ?? 0
      return `${percent}%伤害<br>概率: ${prob.toFixed(2)}%`
    })

    // 柱状图（概率）
    traces.push({
      name: `${armorSet.name} - 概率`,
      type: 'bar',
      x: sortedMultipliers,
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
      x: sortedMultipliers,
      y: cumulativeProbabilities,
      line: { color: '#ffffff', width: 6 },
      yaxis: 'y2',
      showlegend: false,
      hoverinfo: 'skip',
    })

    // 折线图（累积概率）
    traces.push({
      name: `${armorSet.name} - 累积`,
      type: 'scatter',
      mode: 'lines+markers',
      x: sortedMultipliers,
      y: cumulativeProbabilities,
      line: { color: armorSet.color, dash: 'dash', width: 3 },
      marker: {
        size: 8,
        color: armorSet.color,
        line: { color: '#ffffff', width: 2 },
      },
      yaxis: 'y2',
      hovertemplate: '%{x:.0%}伤害<br>累积概率: %{y:.2f}%<extra></extra>',
    })
  })

  const layout: Partial<Plotly.Layout> = {
    title: {
      text: `护甲伤害分布累积图 - ${damageTypeLabel.value}伤害`,
    },
    xaxis: {
      title: { text: '伤害倍率 (从低到高)' },
      tickformat: '.0%',
    },
    yaxis: {
      title: { text: '概率 (%)' },
      side: 'left' as const,
      rangemode: 'tozero' as const,
    },
    yaxis2: {
      title: { text: '累积概率 (%)' },
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

watch(() => [props.armorSetsData, props.damageType], renderChart, { deep: true })

onMounted(() => {
  renderChart()
  window.addEventListener('resize', renderChart)
})

onUnmounted(() => {
  window.removeEventListener('resize', renderChart)
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
}

.chart {
  flex: 1;
  height: 100%;
  width: 100%;
}
</style>
