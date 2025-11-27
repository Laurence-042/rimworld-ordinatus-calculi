<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import Plotly from 'plotly.js-dist-min'
import { useResizeObserver } from '@vueuse/core'
import type { WeaponWithCalculations } from '@/types/weapon'
import type { SimplifiedWeaponParams } from '@/types/weapon'
import { calculateHitChance, calculateMaxDPS } from '@/utils/weaponCalculations'
import { calculateDPSDistribution } from '@/utils/armorCalculations'
import { transposeMatrix } from '@/utils/plotlyUtils'

interface Props {
  weaponsData: WeaponWithCalculations[]
}

const props = defineProps<Props>()

const chartContainer = ref<HTMLDivElement | null>(null)

// 为单个武器生成3D曲面数据
function generateWeaponSurfaceData(weaponData: WeaponWithCalculations) {
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
      const hitChance = calculateHitChance(weaponData.weapon, distance)
      const maxDPS = calculateMaxDPS(weaponData.weapon)

      const weaponParams: SimplifiedWeaponParams = {
        armorPenetration: weaponData.weapon.armorPenetration / 100,
        hitChance,
        maxDPS,
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

// 查找两组DPS数组在相邻位置的交点
function findIntersections(
  dps1Array: number[],
  dps2Array: number[],
  axisValues: number[],
): Array<{ index: number; t: number; dps: number }> {
  const intersections: Array<{ index: number; t: number; dps: number }> = []

  for (let i = 0; i < axisValues.length - 1; i++) {
    const diff1 = dps1Array[i]! - dps2Array[i]!
    const diff2 = dps1Array[i + 1]! - dps2Array[i + 1]!

    // 如果符号改变，说明有交点
    if (diff1 * diff2 < 0) {
      // 线性插值找到精确的交点
      const t = Math.abs(diff1) / (Math.abs(diff1) + Math.abs(diff2))
      const dpsIntersect = dps1Array[i]! + t * (dps1Array[i + 1]! - dps1Array[i]!)

      intersections.push({
        index: i,
        t,
        dps: dpsIntersect,
      })
    }
  }

  return intersections
}

// 计算两个曲面的交线
function calculateIntersectionLine(
  zData1: number[][],
  zData2: number[][],
  distances: number[],
  armorValues: number[],
) {
  const intersectionPoints: Array<{ x: number; y: number; z: number }> = []

  // 方法1：沿距离方向（固定护甲值），找到DPS相等的距离
  for (let armorIndex = 0; armorIndex < armorValues.length; armorIndex++) {
    const armor = armorValues[armorIndex]!
    const dps1Array = zData1.map((row) => row[armorIndex]!)
    const dps2Array = zData2.map((row) => row[armorIndex]!)

    const intersections = findIntersections(dps1Array, dps2Array, distances)
    for (const { index, t, dps } of intersections) {
      const distanceIntersect = distances[index]! + t * (distances[index + 1]! - distances[index]!)
      intersectionPoints.push({
        x: distanceIntersect,
        y: armor,
        z: dps,
      })
    }
  }

  // 方法2：沿护甲方向（固定距离），找到DPS相等的护甲值
  for (let distIndex = 0; distIndex < distances.length; distIndex++) {
    const distance = distances[distIndex]!
    const dps1Array = zData1[distIndex]!
    const dps2Array = zData2[distIndex]!

    const intersections = findIntersections(dps1Array, dps2Array, armorValues)
    for (const { index, t, dps } of intersections) {
      const armorIntersect =
        armorValues[index]! + t * (armorValues[index + 1]! - armorValues[index]!)
      intersectionPoints.push({
        x: distance,
        y: armorIntersect,
        z: dps,
      })
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
        if (minIndex >= 0 && minDist < 0.2) {
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

  // 先为所有武器生成曲面数据
  const surfaceDataCache = props.weaponsData.map((weaponData) =>
    generateWeaponSurfaceData(weaponData),
  )

  // 为每个武器创建一个曲面
  surfaceDataCache.forEach((surfaceData, index) => {
    const { distances, armorValues, zData, hoverTexts } = surfaceData
    const weaponData = props.weaponsData[index]!

    // 数据结构：zData[distanceIndex][armorIndex]
    // 目标映射：x=distances, y=armorValues, z=DPS
    // Plotly 要求：z[i][j] 对应 y[i] 和 x[j]（第一维=Y轴，第二维=X轴）
    // 因此需要转置：将 [distance][armor] 转为 [armor][distance]
    const zDataTransposed = transposeMatrix(zData)

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
    // 为每对武器计算交线
    for (let i = 0; i < props.weaponsData.length; i++) {
      for (let j = i + 1; j < props.weaponsData.length; j++) {
        const surface1 = surfaceDataCache[i]!
        const surface2 = surfaceDataCache[j]!
        const weaponData1 = props.weaponsData[i]!
        const weaponData2 = props.weaponsData[j]!

        const intersectionCurves = calculateIntersectionLine(
          surface1.zData,
          surface2.zData,
          surface1.distances,
          surface1.armorValues,
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

// 监听容器尺寸变化（包括 splitter 拖动）
useResizeObserver(chartContainer, () => {
  if (chartContainer.value) {
    Plotly.Plots.resize(chartContainer.value)
  }
})

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
