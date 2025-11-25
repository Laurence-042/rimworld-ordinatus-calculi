<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import Plotly from 'plotly.js-dist'
import type { WeaponDetailParams } from '@/utils/weaponCalculations'
import { calculateHitChance, calculateMaxDPS } from '@/utils/weaponCalculations'
import type { WeaponParams } from '@/utils/armorCalculations'
import { calculateDPSDistribution } from '@/utils/armorCalculations'

const props = defineProps<{
  weaponParams: {
    damage: number
    warmUp: number
    cooldown: number
    burstCount: number
    burstTicks: number
  }
  accuracyParams: {
    touchAccuracy: number
    shortAccuracy: number
    mediumAccuracy: number
    longAccuracy: number
  }
  armorPenetration: number
}>()

const chartContainer = ref<HTMLDivElement | null>(null)

// 生成3D曲面数据
function generateSurfaceData() {
  // 目标距离范围：0-50格
  const distances = []
  for (let d = 0; d <= 50; d += 2) {
    distances.push(d)
  }

  // 护甲值范围：0-200%
  const armorValues = []
  for (let a = 0; a <= 200; a += 5) {
    armorValues.push(a)
  }

  // 计算每个点的DPS和详细信息
  const zData: number[][] = []
  const hoverTexts: string[][] = []

  for (let i = 0; i < distances.length; i++) {
    const row: number[] = []
    const hoverRow: string[] = []
    const distance = distances[i]

    // 计算该距离下的命中率
    const detailParams: WeaponDetailParams = {
      ...props.accuracyParams,
      ...props.weaponParams,
      armorPenetration: props.armorPenetration,
    }
    const hitChance = calculateHitChance(detailParams, distance)
    const maxDPS = calculateMaxDPS(detailParams)

    for (let j = 0; j < armorValues.length; j++) {
      const armor = armorValues[j] / 100

      const weaponParams: WeaponParams = {
        hitChance,
        maxDPS,
        armorPenetration: props.armorPenetration / 100,
      }

      const distribution = calculateDPSDistribution(weaponParams, armor)
      const expectedDPS = distribution.expectedDPS

      row.push(expectedDPS)

      // 构建悬停文本
      const hoverText = [
        `<b>目标距离:</b> ${distance} 格`,
        `<b>护甲值:</b> ${armorValues[j]}%`,
        `<b>命中率:</b> ${(hitChance * 100).toFixed(2)}%`,
        `<b>最大DPS:</b> ${maxDPS.toFixed(2)}`,
        `━━━━━━━━━━━━━━━━`,
        `<b>期望DPS:</b> ${expectedDPS.toFixed(3)}`,
        `━━━━━━━━━━━━━━━━`,
        `<b>未命中:</b> ${(distribution.missProb * 100).toFixed(2)}%`,
        `<b>完全偏转 (0伤害):</b> ${(distribution.zeroDamageProb * 100).toFixed(2)}%`,
        `<b>部分偏转 (50%伤害):</b> ${(distribution.halfDamageProb * 100).toFixed(2)}% → ${distribution.halfDPS.toFixed(3)} DPS`,
        `<b>穿透 (100%伤害):</b> ${(distribution.fullDamageProb * 100).toFixed(2)}% → ${distribution.fullDPS.toFixed(3)} DPS`,
      ].join('<br>')

      hoverRow.push(hoverText)
    }
    zData.push(row)
    hoverTexts.push(hoverRow)
  }

  return { distances, armorValues, zData, hoverTexts }
}

// 绘制3D图表
function plotSurface() {
  if (!chartContainer.value) return

  const { distances, armorValues, zData, hoverTexts } = generateSurfaceData()

  const data: Plotly.Data[] = [
    {
      type: 'surface',
      x: armorValues, // 护甲值
      y: distances, // 目标距离
      z: zData, // DPS
      text: hoverTexts, // 悬停文本
      hovertemplate: '%{text}<extra></extra>',
      colorscale: 'Viridis',
      colorbar: {
        title: {
          text: '期望DPS',
          side: 'right',
          font: { size: 14 },
        },
        thickness: 20,
        len: 0.7,
      },
      contours: {
        z: {
          show: true,
          usecolormap: true,
          highlightcolor: '#42f462',
          project: { z: true },
        },
      },
    },
  ]

  const layout: Partial<Plotly.Layout> = {
    title: {
      text: 'DPS 三维曲面图',
      font: { size: 18 },
    },
    autosize: true,
    scene: {
      xaxis: {
        title: {
          text: '护甲值 (%)',
          font: { size: 14 },
        },
        gridcolor: 'rgb(200, 200, 200)',
        showbackground: true,
        backgroundcolor: 'rgb(240, 240, 240)',
      },
      yaxis: {
        title: {
          text: '目标距离 (格)',
          font: { size: 14 },
        },
        gridcolor: 'rgb(200, 200, 200)',
        showbackground: true,
        backgroundcolor: 'rgb(240, 240, 240)',
      },
      zaxis: {
        title: {
          text: '期望DPS',
          font: { size: 14 },
        },
        gridcolor: 'rgb(200, 200, 200)',
        showbackground: true,
        backgroundcolor: 'rgb(240, 240, 240)',
      },
      camera: {
        eye: { x: 1.5, y: 1.5, z: 1.3 },
      },
    },
    margin: {
      l: 0,
      r: 0,
      b: 0,
      t: 50,
    },
  }

  const config: Partial<Plotly.Config> = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
  }

  Plotly.newPlot(chartContainer.value, data, layout, config)
}

// 监听参数变化，重新绘制
watch(
  () => [props.weaponParams, props.accuracyParams, props.armorPenetration],
  () => {
    plotSurface()
  },
  { deep: true },
)

onMounted(() => {
  plotSurface()
})
</script>

<template>
  <div ref="chartContainer" class="chart-container"></div>
</template>

<style scoped>
.chart-container {
  width: 100%;
  height: 600px;
}
</style>
