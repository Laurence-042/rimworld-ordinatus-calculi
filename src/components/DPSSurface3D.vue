<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Plotly from 'plotly.js-dist-min'
import { useResizeObserver, useDebounceFn } from '@vueuse/core'
import type { ResolvedWeapon } from '@/types/weapon'
import { getResolvedHitChance } from '@/utils/weaponCalculations'
import { calculateDPSDistribution } from '@/utils/armorCalculations'
import { transposeMatrix, calculateSurfaceIntersection } from '@/utils/plotlyUtils'

const { t } = useI18n()

interface Props {
  resolvedWeapons: ResolvedWeapon[]
}

const props = defineProps<Props>()

const chartContainer = ref<HTMLDivElement | null>(null)

// 为单个武器生成3D曲面数据
function generateWeaponSurfaceData(resolved: ResolvedWeapon) {
  const weapon = resolved.original

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

      // 使用解析后的武器计算命中率
      const hitChance = getResolvedHitChance(resolved, distance)

      const weaponParams = {
        armorPenetration: resolved.armorPenetration,
        hitChance,
        maxDPS: resolved.maxDPS,
      }

      const distribution = calculateDPSDistribution(weaponParams, armor)
      const expectedDPS = distribution.expectedDPS

      row.push(expectedDPS)

      // 构建悬停文本
      const hoverText = [
        `<b>${weapon.name}</b>`,
        `----------------`,
        `<b>${t('weapon.targetDistance')}:</b> ${distance} ${t('unit.tile')}`,
        `<b>${t('armor.armorSharp')}:</b> ${armorValues[j]}%`,
        `<b>${t('weapon.hitChance')}:</b> ${(hitChance * 100).toFixed(2)}%`,
        `<b>${t('weapon.maxDPS')}:</b> ${resolved.maxDPS.toFixed(2)}`,
        `----------------`,
        `<b>${t('chart.miss')}:</b> ${(distribution.missProb * 100).toFixed(2)}%`,
        `<b>${t('chart.deflectFull')}:</b> ${(distribution.zeroDamageProb * 100).toFixed(2)}%`,
        `<b>${t('chart.deflectPartial')}:</b> ${(distribution.halfDamageProb * 100).toFixed(2)}%`,
        `<b>${t('chart.penetrate')}:</b> ${(distribution.fullDamageProb * 100).toFixed(2)}%`,
        `----------------`,
        `<b>${t('weapon.expectedDPS')}:</b> ${expectedDPS.toFixed(3)}`,
      ].join('<br>')

      hoverRow.push(hoverText)
    }
    zData.push(row)
    hoverTexts.push(hoverRow)
  }

  return { resolved, distances, armorValues, zData, hoverTexts }
}

// 定义曲面数据缓存类型
interface SurfaceDataCache {
  resolved: ResolvedWeapon
  distances: number[]
  armorValues: number[]
  zData: number[][]
  hoverTexts: string[][]
}

// 绘制3D图表
function plotSurface() {
  if (!chartContainer.value || !props.resolvedWeapons || props.resolvedWeapons.length === 0) return

  const plotData: Plotly.Data[] = []

  // 先为所有武器生成曲面数据
  const surfaceDataCache: SurfaceDataCache[] = props.resolvedWeapons.map((resolved) =>
    generateWeaponSurfaceData(resolved),
  )

  // 为每个武器创建一个曲面
  surfaceDataCache.forEach((surfaceData) => {
    const { resolved, distances, armorValues, zData, hoverTexts } = surfaceData

    // 数据结构：zData[distanceIndex][armorIndex]
    // 目标映射：x=distances, y=armorValues, z=DPS
    // Plotly 要求：z[i][j] 对应 y[i] 和 x[j]（第一维=Y轴，第二维=X轴）
    // 因此需要转置：将 [distance][armor] 转为 [armor][distance]
    const zDataTransposed = transposeMatrix(zData)

    plotData.push({
      type: 'surface',
      name: resolved.original.name,
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
                text: t('chart.expectedDPSLabel'),
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
  if (props.resolvedWeapons.length >= 2) {
    // 为每对武器计算交线
    for (let i = 0; i < props.resolvedWeapons.length; i++) {
      for (let j = i + 1; j < props.resolvedWeapons.length; j++) {
        const surface1 = surfaceDataCache[i]!
        const surface2 = surfaceDataCache[j]!

        const intersectionCurves = calculateSurfaceIntersection(
          surface1.zData,
          surface2.zData,
          surface1.distances,
          surface1.armorValues,
          { x: 50, y: 200, z: Math.max(surface1.resolved.maxDPS, surface2.resolved.maxDPS, 1) },
        )

        // 为每条独立的交线段添加一个轨迹
        intersectionCurves.forEach((curve, curveIndex) => {
          if (curve.x.length > 0) {
            plotData.push({
              type: 'scatter3d',
              mode: 'lines',
              name:
                curveIndex === 0
                  ? `${surface1.resolved.original.name} ∩ ${surface2.resolved.original.name}`
                  : `${surface1.resolved.original.name} ∩ ${surface2.resolved.original.name} (${curveIndex + 1})`,
              x: curve.x,
              y: curve.y,
              z: curve.z,
              line: {
                color: '#FF0000',
                width: 6,
              },
              hovertemplate:
                `<b>${t('chart.intersectionLine')}</b><br>` +
                `${t('chart.distance')}: %{x} ${t('unit.tile')}<br>` +
                `${t('armor.armorSharp')}: %{y:.1f}%<br>` +
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
      text: t('chart.surface3DTitle'),
      font: { size: 18 },
    },
    autosize: true,
    scene: {
      xaxis: {
        title: {
          text: t('chart.targetDistanceAxis'),
          font: { size: 14 },
        },
        gridcolor: 'rgb(200, 200, 200)',
        showbackground: true,
        backgroundcolor: 'rgb(240, 240, 240)',
      },
      yaxis: {
        title: {
          text: t('chart.armorValueAxis'),
          font: { size: 14 },
        },
        gridcolor: 'rgb(200, 200, 200)',
        showbackground: true,
        backgroundcolor: 'rgb(240, 240, 240)',
      },
      zaxis: {
        title: {
          text: t('chart.expectedDPSLabel'),
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

// 监听参数变化，重新绘制（使用防抖避免频繁计算）
const debouncedPlotSurface = useDebounceFn(() => {
  plotSurface()
}, 300)

watch(
  () => props.resolvedWeapons,
  () => {
    debouncedPlotSurface()
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

@media (max-width: 768px) {
  .chart-container {
    height: 450px;
  }
}

@media (max-width: 480px) {
  .chart-container {
    height: 350px;
  }
}
</style>
