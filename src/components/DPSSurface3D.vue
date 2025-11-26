<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import Plotly from 'plotly.js-dist-min'
import type { WeaponDetailParams } from '@/utils/weaponCalculations'
import { calculateHitChance, calculateMaxDPS } from '@/utils/weaponCalculations'
import type { WeaponParams } from '@/utils/armorCalculations'
import { calculateDPSDistribution } from '@/utils/armorCalculations'

interface DPSDistribution {
  missProb: number
  zeroDamageProb: number
  halfDamageProb: number
  fullDamageProb: number
  halfDPS: number
  fullDPS: number
  expectedDPS: number
}

interface WeaponData {
  weapon: {
    id: number
    name: string
    color: string
    selectedPresetIndex: number | null
    accuracyParams: {
      touchAccuracy: number
      shortAccuracy: number
      mediumAccuracy: number
      longAccuracy: number
    }
    weaponParams: {
      damage: number
      warmUp: number
      cooldown: number
      burstCount: number
      burstTicks: number
    }
    armorPenetration: number
  }
  hitChance: number
  maxDPS: number
  dpsCurve: {
    armorValues: number[]
    dpsValues: number[]
  }
  distributions: DPSDistribution[]
}

interface Props {
  weaponsData: WeaponData[]
}

const props = defineProps<Props>()

const chartContainer = ref<HTMLDivElement | null>(null)

// 为单个武器生成3D曲面数据
function generateWeaponSurfaceData(weaponData: WeaponData) {
  // 目标距离范围：0-50格
  const distances = []
  for (let d = 0; d <= 50; d += 1) {
    distances.push(d)
  }

  // 护甲值范围：0-200%
  const armorValues = []
  for (let a = 0; a <= 200; a += 4) {
    armorValues.push(a)
  }

  // 计算每个点的DPS和详细信息
  // zData[i][j] 对应 distances[i], armorValues[j]
  const zData: number[][] = []
  const hoverTexts: string[][] = []

  for (let i = 0; i < distances.length; i++) {
    const row: number[] = []
    const hoverRow: string[] = []
    const distance = distances[i]!

    for (let j = 0; j < armorValues.length; j++) {
      const armor = armorValues[j]! / 100

      // 计算该距离下的命中率
      const detailParams: WeaponDetailParams = {
        ...weaponData.weapon.accuracyParams,
        ...weaponData.weapon.weaponParams,
        armorPenetration: weaponData.weapon.armorPenetration,
      }
      const hitChance = calculateHitChance(detailParams, distance)
      const maxDPS = calculateMaxDPS(detailParams)

      const weaponParams: WeaponParams = {
        hitChance,
        maxDPS,
        armorPenetration: weaponData.weapon.armorPenetration / 100,
      }

      const distribution = calculateDPSDistribution(weaponParams, armor)
      const expectedDPS = distribution.expectedDPS

      row.push(expectedDPS)

      // 构建悬停文本
      const hoverText = [
        `<b>${weaponData.weapon.name}</b>`,
        `<b>目标距离:</b> ${distance} 格`,
        `<b>护甲值:</b> ${armorValues[j]}%`,
        `<b>命中率:</b> ${(hitChance * 100).toFixed(2)}%`,
        `<b>最大DPS:</b> ${maxDPS.toFixed(2)}`,
        `━━━━━━━━━━━━━━━━`,
        `<b>未命中:</b> ${(distribution.missProb * 100).toFixed(2)}%`,
        `<b>完全偏转 (0伤害):</b> ${(distribution.zeroDamageProb * 100).toFixed(2)}%`,
        `<b>部分偏转 (50%伤害):</b> ${(distribution.halfDamageProb * 100).toFixed(2)}% → ${distribution.halfDPS.toFixed(3)} DPS`,
        `<b>穿透 (100%伤害):</b> ${(distribution.fullDamageProb * 100).toFixed(2)}% → ${distribution.fullDPS.toFixed(3)} DPS`,
        `━━━━━━━━━━━━━━━━`,
        `<b>期望DPS:</b> ${expectedDPS.toFixed(3)}`,
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
  if (!chartContainer.value || !props.weaponsData || props.weaponsData.length === 0) return

  const plotData: Plotly.Data[] = []

  // 为每个武器创建一个曲面
  props.weaponsData.forEach((weaponData) => {
    const { distances, armorValues, zData, hoverTexts } = generateWeaponSurfaceData(weaponData)

    // 转置 zData
    const zDataTransposed: number[][] = []
    for (let i = 0; i < armorValues.length; i++) {
      const zRow: number[] = []
      for (let j = 0; j < distances.length; j++) {
        zRow.push(zData[j]![i]!)
      }
      zDataTransposed.push(zRow)
    }

    plotData.push({
      type: 'surface',
      name: weaponData.weapon.name,
      x: distances, // 目标距离
      y: armorValues, // 护甲值
      z: zDataTransposed, // DPS
      customdata: hoverTexts,
      hovertemplate: '%{customdata}<extra></extra>',
      colorscale: 'Viridis',
      showscale: plotData.length === 0, // 只显示第一个颜色条
      opacity: 0.85,
      colorbar:
        plotData.length === 0
          ? {
              title: {
                text: '期望DPS',
                side: 'right',
                font: { size: 14 },
              },
              thickness: 20,
              len: 0.7,
            }
          : undefined,
    } as unknown as Plotly.Data)
  })

  const layout: Partial<Plotly.Layout> = {
    title: {
      text: 'DPS 三维曲面对比图',
      font: { size: 18 },
    },
    autosize: true,
    scene: {
      xaxis: {
        title: {
          text: '目标距离 (格)',
          font: { size: 14 },
        },
        gridcolor: 'rgb(200, 200, 200)',
        showbackground: true,
        backgroundcolor: 'rgb(240, 240, 240)',
      },
      yaxis: {
        title: {
          text: '护甲值 (%)',
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

  Plotly.newPlot(chartContainer.value, plotData, layout, config)
}

// 监听参数变化，重新绘制
watch(
  () => props.weaponsData,
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
