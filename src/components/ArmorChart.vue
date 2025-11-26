<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import Plotly from 'plotly.js-dist-min'
import type { DamageType } from '@/types/armor'

interface ArmorSetData {
  armorSet: {
    id: number
    name: string
    color: string
  }
  fixedDamageResult: {
    expectedDamage: number
    noDeflectProb: number
    halfDeflectProb: number
    fullDamageProb: number
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

  const data = props.armorSetsData.map((setData) => {
    const { armorSet, fixedDamageResult } = setData
    return {
      name: armorSet.name,
      type: 'bar' as const,
      x: ['期望伤害', '完全抵挡', '减半伤害', '全伤害'],
      y: [
        fixedDamageResult.expectedDamage,
        fixedDamageResult.noDeflectProb * 100,
        fixedDamageResult.halfDeflectProb * 100,
        fixedDamageResult.fullDamageProb * 100,
      ],
      marker: { color: armorSet.color },
    }
  })

  const layout = {
    title: { text: `护甲套装对比 - ${damageTypeLabel.value}伤害` },
    xaxis: { title: { text: '指标' } },
    yaxis: { title: { text: '数值' } },
    barmode: 'group' as const,
    autosize: true,
    margin: { l: 60, r: 40, t: 60, b: 60 },
  }

  Plotly.newPlot(chartContainer.value, data, layout, {
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
