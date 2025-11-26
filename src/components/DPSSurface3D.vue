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
      range: number
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

// 计算两个曲面的交线
function calculateIntersectionLine(
  weaponData1: WeaponData,
  weaponData2: WeaponData,
  distances: number[],
  armorValues: number[],
) {
  const intersectionPoints: Array<{ x: number; y: number; z: number }> = []

  // 对每个距离，找到DPS相等的护甲值
  for (const distance of distances) {
    // 计算两个武器在此距离下的DPS曲线
    const dps1Array: number[] = []
    const dps2Array: number[] = []

    for (const armor of armorValues) {
      // 武器1
      const detailParams1: WeaponDetailParams = {
        ...weaponData1.weapon.accuracyParams,
        ...weaponData1.weapon.weaponParams,
        armorPenetration: weaponData1.weapon.armorPenetration,
      }
      const hitChance1 = calculateHitChance(detailParams1, distance)
      const maxDPS1 = calculateMaxDPS(detailParams1)
      const weaponParams1: WeaponParams = {
        hitChance: hitChance1,
        maxDPS: maxDPS1,
        armorPenetration: weaponData1.weapon.armorPenetration / 100,
      }
      const dist1 = calculateDPSDistribution(weaponParams1, armor / 100)
      dps1Array.push(dist1.expectedDPS)

      // 武器2
      const detailParams2: WeaponDetailParams = {
        ...weaponData2.weapon.accuracyParams,
        ...weaponData2.weapon.weaponParams,
        armorPenetration: weaponData2.weapon.armorPenetration,
      }
      const hitChance2 = calculateHitChance(detailParams2, distance)
      const maxDPS2 = calculateMaxDPS(detailParams2)
      const weaponParams2: WeaponParams = {
        hitChance: hitChance2,
        maxDPS: maxDPS2,
        armorPenetration: weaponData2.weapon.armorPenetration / 100,
      }
      const dist2 = calculateDPSDistribution(weaponParams2, armor / 100)
      dps2Array.push(dist2.expectedDPS)
    }

    // 查找交点（DPS差值从正变负或从负变正的点）
    for (let i = 0; i < armorValues.length - 1; i++) {
      const diff1 = dps1Array[i]! - dps2Array[i]!
      const diff2 = dps1Array[i + 1]! - dps2Array[i + 1]!

      // 如果符号改变，说明有交点
      if (diff1 * diff2 < 0) {
        // 线性插值找到精确的交点
        const t = Math.abs(diff1) / (Math.abs(diff1) + Math.abs(diff2))
        const armorIntersect = armorValues[i]! + t * (armorValues[i + 1]! - armorValues[i]!)
        const dpsIntersect = dps1Array[i]! + t * (dps1Array[i + 1]! - dps1Array[i]!)

        intersectionPoints.push({
          x: distance,
          y: armorIntersect,
          z: dpsIntersect,
        })
      }
    }
  }

  // 使用最近邻算法连接点，但避免长距离跳跃
  // 将点分组为多条独立的曲线
  const curves: Array<typeof intersectionPoints> = []

  if (intersectionPoints.length > 1) {
    const remaining = [...intersectionPoints]

    while (remaining.length > 0) {
      const currentCurve: typeof intersectionPoints = [remaining[0]!]
      remaining.splice(0, 1)

      // 持续添加最近的点，直到距离超过阈值
      let foundNext = true
      while (foundNext && remaining.length > 0) {
        const last = currentCurve[currentCurve.length - 1]!
        let minDist = Infinity
        let minIndex = -1

        // 找到离最后一个点最近的点
        for (let i = 0; i < remaining.length; i++) {
          const point = remaining[i]!
          // 使用归一化距离：考虑x、y的实际范围
          const distX = (point.x - last.x) / 50 // 距离范围 0-50
          const distY = (point.y - last.y) / 200 // 护甲范围 0-200
          const distZ = (point.z - last.z) / Math.max(last.z, 1) // 归一化DPS差异
          const dist = Math.sqrt(distX * distX + distY * distY + distZ * distZ)

          if (dist < minDist) {
            minDist = dist
            minIndex = i
          }
        }

        // 如果最近的点距离太远，认为是不同的曲线段
        // 阈值：归一化距离 > 0.1 表示跳跃太大
        if (minIndex >= 0 && minDist < 0.1) {
          currentCurve.push(remaining[minIndex]!)
          remaining.splice(minIndex, 1)
        } else {
          foundNext = false
        }
      }

      curves.push(currentCurve)
    }
  } else if (intersectionPoints.length === 1) {
    curves.push([intersectionPoints[0]!])
  }

  // 转换为三个数组的数组（每条曲线一组）
  return curves.map((curve) => ({
    x: curve.map((p) => p.x),
    y: curve.map((p) => p.y),
    z: curve.map((p) => p.z),
  }))
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

  // 如果有多个武器，绘制曲面相交线
  if (props.weaponsData.length >= 2) {
    // 使用第一个武器的距离和护甲值范围
    const { distances, armorValues } = generateWeaponSurfaceData(props.weaponsData[0]!)

    // 为每对武器计算交线
    for (let i = 0; i < props.weaponsData.length; i++) {
      for (let j = i + 1; j < props.weaponsData.length; j++) {
        const weaponData1 = props.weaponsData[i]!
        const weaponData2 = props.weaponsData[j]!
        const intersectionCurves = calculateIntersectionLine(
          weaponData1,
          weaponData2,
          distances,
          armorValues,
        )

        // 为每条独立的交线段添加一个轨迹
        intersectionCurves.forEach((curve, curveIndex) => {
          if (curve.x.length > 0) {
            plotData.push({
              type: 'scatter3d',
              mode: 'lines',
              name:
                curveIndex === 0
                  ? `${weaponData1.weapon.name} ∩ ${weaponData2.weapon.name}`
                  : `${weaponData1.weapon.name} ∩ ${weaponData2.weapon.name} (${curveIndex + 1})`,
              x: curve.x,
              y: curve.y,
              z: curve.z,
              line: {
                color: '#FF0000',
                width: 6,
              },
              hovertemplate:
                '<b>交线</b><br>' +
                '距离: %{x} 格<br>' +
                '护甲: %{y:.1f}%<br>' +
                'DPS: %{z:.2f}<br>' +
                '<extra></extra>',
            } as unknown as Plotly.Data)
          }
        })
      }
    }
  }

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
