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

  // 为每个护甲套装创建帕累托图数据
  const traces: Array<Partial<Plotly.PlotData>> = []

  props.armorSetsData.forEach((setData) => {
    const { armorSet, fixedDamageResult } = setData
    const { damageStates } = fixedDamageResult

    // 按概率从高到低排序（帕累托图的关键特征）
    const sortedStates = [...damageStates].sort((a, b) => b.probability - a.probability)

    // 准备数据
    const labels = sortedStates.map((state) => {
      const multiplierPercent = (state.damageMultiplier * 100).toFixed(0)
      const damageTypeIcon =
        state.damageType === 'sharp' ? '🗡️' : state.damageType === 'blunt' ? '🔨' : '🔥'
      return `${multiplierPercent}%伤害${damageTypeIcon}`
    })

    const probabilities = sortedStates.map((state) => state.probability * 100)

    // 计算累积概率（帕累托图的折线）
    const cumulativeProbabilities: number[] = []
    let cumulative = 0
    for (const prob of probabilities) {
      cumulative += prob
      cumulativeProbabilities.push(cumulative)
    }

    // 柱状图（概率）
    traces.push({
      name: `${armorSet.name} - 概率`,
      type: 'bar',
      x: labels,
      y: probabilities,
      marker: { color: armorSet.color },
      yaxis: 'y',
      hovertemplate: '%{y:.2f}%<extra></extra>',
    })

    // 折线图（累积概率）
    traces.push({
      name: `${armorSet.name} - 累积`,
      type: 'scatter',
      mode: 'lines+markers',
      x: labels,
      y: cumulativeProbabilities,
      line: { color: armorSet.color, dash: 'dash', width: 2 },
      marker: { size: 6 },
      yaxis: 'y2',
      hovertemplate: '累积: %{y:.2f}%<extra></extra>',
    })
  })

  const layout: Partial<Plotly.Layout> = {
    title: {
      text: `护甲伤害分布帕累托图 - ${damageTypeLabel.value}伤害`,
    },
    xaxis: {
      title: { text: '伤害状态' },
      tickangle: -45,
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
    margin: { l: 60, r: 60, t: 80, b: 100 },
    showlegend: true,
    legend: {
      orientation: 'v' as const,
      x: 1.1,
      y: 1,
    },
    hovermode: 'closest' as const,
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
