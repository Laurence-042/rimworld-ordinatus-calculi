<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import Plotly from 'plotly.js-dist-min'

interface ArmorSetData {
  armorSet: {
    id: number
    name: string
    color: string
  }
  damageCurve: {
    penetrationValues: number[]
    damageValues: number[]
    expectedDamageGrid: number[][]
  }
}

const props = defineProps<{
  armorSetsData: ArmorSetData[]
  damageType: 'blunt' | 'sharp' | 'heat'
}>()

const chartContainer = ref<HTMLElement | null>(null)
const selectedArmorIndex = ref(0)

const damageTypeLabel = computed(() => {
  const labels = {
    blunt: '钝器',
    sharp: '利器',
    heat: '热能',
  }
  return labels[props.damageType]
})

const currentArmorData = computed(() => {
  return props.armorSetsData[selectedArmorIndex.value]
})

function renderChart() {
  if (!chartContainer.value || !currentArmorData.value) return

  const { armorSet, damageCurve } = currentArmorData.value
  const { penetrationValues, damageValues, expectedDamageGrid } = damageCurve

  const data = [
    {
      type: 'surface' as const,
      x: penetrationValues,
      y: damageValues,
      z: expectedDamageGrid,
      colorscale: 'Viridis' as const,
      name: armorSet.name,
      hovertemplate: '护甲穿透: %{x}%<br>单发伤害: %{y}<br>期望受伤: %{z:.2f}<extra></extra>',
    },
  ]

  const layout = {
    title: { text: `${armorSet.name} - ${damageTypeLabel.value}伤害受伤期望` },
    scene: {
      xaxis: { title: { text: '护甲穿透 (%)' } },
      yaxis: { title: { text: '单发伤害' } },
      zaxis: { title: { text: '期望受伤' } },
      camera: {
        eye: {
          x: -2, // 负值表示从左侧（低穿甲）观察
          y: -1, // 负值表示从前侧（低伤害）观察
          z: 0.1, // 正值表示从上方观察
        },
      },
    },
    autosize: true,
    margin: { l: 0, r: 0, t: 40, b: 0 },
  }

  Plotly.newPlot(chartContainer.value, data, layout, {
    responsive: true,
    displayModeBar: true,
  })
}

watch(() => [props.armorSetsData, props.damageType, selectedArmorIndex.value], renderChart, {
  deep: true,
})

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
    <div v-if="armorSetsData.length > 1" class="armor-selector">
      <el-select v-model="selectedArmorIndex" placeholder="选择护甲套装">
        <el-option
          v-for="(setData, index) in armorSetsData"
          :key="setData.armorSet.id"
          :label="setData.armorSet.name"
          :value="index"
        />
      </el-select>
    </div>
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

.armor-selector {
  margin-bottom: 10px;
}

.chart {
  flex: 1;
  height: 100%;
  width: 100%;
}
</style>
