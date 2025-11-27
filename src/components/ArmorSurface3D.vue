<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Plotly from 'plotly.js-dist-min'
import { useResizeObserver } from '@vueuse/core'
import { transposeMatrix, calculateSurfaceIntersection } from '@/utils/plotlyUtils'
import type { ArmorSet, ArmorLayer, DamageType } from '@/types/armor'
import { BodyPart } from '@/types/bodyPart'
import { calculateArmorDamageCurve, filterArmorLayersByBodyPart } from '@/utils/armorCalculations'

const props = defineProps<{
  armorSets: ArmorSet[]
  damageType: DamageType
  selectedBodyPart: BodyPart
  getLayerActualArmor: (layer: ArmorLayer) => {
    armorSharp: number
    armorBlunt: number
    armorHeat: number
  }
}>()

const chartContainer = ref<HTMLElement | null>(null)

const damageTypeLabel = computed(() => {
  const labels = {
    blunt: '钓器',
    sharp: '利器',
    heat: '热能',
  }
  return labels[props.damageType]
})

// 在组件内部计算所有护甲套装的伤害曲线数据
const armorSetsData = computed(() => {
  return props.armorSets.map((armorSet) => {
    // 计算实际护甲值的层
    const actualLayers = armorSet.layers.map((layer) => {
      const armor = props.getLayerActualArmor(layer)
      return {
        ...layer,
        // 将百分比转换为0-1的小数供计算使用
        armorSharp: armor.armorSharp / 100,
        armorBlunt: armor.armorBlunt / 100,
        armorHeat: armor.armorHeat / 100,
      }
    })

    // 过滤只覆盖选中身体部位的护甲层
    const filteredLayers = filterArmorLayersByBodyPart(actualLayers, props.selectedBodyPart)

    // 计算伤害曲线（穿透 vs 伤害 的网格）
    const damageCurve = calculateArmorDamageCurve(filteredLayers, props.damageType)

    return {
      armorSet,
      damageCurve,
    }
  })
})

function renderChart() {
  if (!chartContainer.value || armorSetsData.value.length === 0) return

  const plotData: Plotly.Data[] = []

  // 显示最多2个护甲套装的曲面
  const displayedSets = armorSetsData.value.slice(0, 2)

  displayedSets.forEach((setData, index) => {
    const { armorSet, damageCurve } = setData
    const { penetrationValues, damageValues, expectedDamageGrid } = damageCurve

    // 数据结构：expectedDamageGrid[penetrationIndex][damageIndex]
    // 目标映射：x=penetrationValues, y=damageValues, z=expectedDamage
    // Plotly 要求：z[i][j] 对应 y[i] 和 x[j]（第一维=Y轴，第二维=X轴）
    // 因此需要转置：将 [penetration][damage] 转为 [damage][penetration]
    const zDataTransposed = transposeMatrix(expectedDamageGrid)

    plotData.push({
      type: 'surface' as const,
      x: penetrationValues,
      y: damageValues,
      z: zDataTransposed,
      colorscale: 'Viridis' as const,
      name: armorSet.name,
      hovertemplate: '护甲穿透: %{x}%<br>单发伤害: %{y}<br>期望受伤: %{z:.2f}<extra></extra>',
      showscale: index === 0, // 只显示第一个颜色条
      opacity: 0.85,
      colorbar:
        index === 0
          ? {
              title: {
                text: '期望受伤',
                side: 'right',
                font: { size: 14 },
              },
              thickness: 20,
              len: 0.7,
            }
          : undefined,
    } as unknown as Plotly.Data)
  })

  // 如果有两个护甲套装，绘制交线
  if (displayedSets.length === 2) {
    const set1 = displayedSets[0]!
    const set2 = displayedSets[1]!

    const intersectionCurves = calculateSurfaceIntersection(
      set1.damageCurve.expectedDamageGrid,
      set2.damageCurve.expectedDamageGrid,
      set1.damageCurve.penetrationValues,
      set1.damageCurve.damageValues,
      {
        x: 100, // 穿透范围 0-100%
        y: Math.max(...set1.damageCurve.damageValues), // 伤害范围
        z: Math.max(
          ...set1.damageCurve.expectedDamageGrid.flat(),
          ...set2.damageCurve.expectedDamageGrid.flat(),
        ),
      },
    )

    // 为每条独立的交线段添加一个轨迹
    intersectionCurves.forEach((curve, curveIndex) => {
      if (curve.x.length > 0) {
        plotData.push({
          type: 'scatter3d' as const,
          mode: 'lines' as const,
          name:
            curveIndex === 0
              ? `${set1.armorSet.name} ∩ ${set2.armorSet.name}`
              : `${set1.armorSet.name} ∩ ${set2.armorSet.name} (${curveIndex + 1})`,
          x: curve.x,
          y: curve.y,
          z: curve.z,
          line: {
            color: '#FF0000',
            width: 6,
          },
          hovertemplate:
            '<b>交线</b><br>' +
            '护甲穿透: %{x}%<br>' +
            '单发伤害: %{y}<br>' +
            '期望受伤: %{z:.2f}<br>' +
            '<extra></extra>',
        } as unknown as Plotly.Data)
      }
    })
  }

  const layout: Partial<Plotly.Layout> = {
    title: {
      text:
        displayedSets.length === 2
          ? `护甲对比 - ${damageTypeLabel.value}伤害受伤期望`
          : `${displayedSets[0]?.armorSet.name || ''} - ${damageTypeLabel.value}伤害受伤期望`,
      font: { size: 18 },
    },
    autosize: true,
    scene: {
      xaxis: {
        title: { text: '护甲穿透 (%)', font: { size: 14 } },
        gridcolor: 'rgb(200, 200, 200)',
        showbackground: true,
        backgroundcolor: 'rgb(240, 240, 240)',
      },
      yaxis: {
        title: { text: '单发伤害', font: { size: 14 } },
        gridcolor: 'rgb(200, 200, 200)',
        showbackground: true,
        backgroundcolor: 'rgb(240, 240, 240)',
      },
      zaxis: {
        title: { text: '期望受伤', font: { size: 14 } },
        gridcolor: 'rgb(200, 200, 200)',
        showbackground: true,
        backgroundcolor: 'rgb(240, 240, 240)',
      },
      camera: {
        eye: {
          x: -2, // 负值表示从左侧（低穿甲）观察
          y: -1, // 负值表示从前侧（低伤害）观察
          z: 0.1, // 正值表示从上方观察
        },
      },
    },
    margin: { l: 0, r: 0, t: 50, b: 0 },
  }

  Plotly.newPlot(chartContainer.value, plotData, layout, {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
  })
}

watch(() => [props.armorSets, props.damageType, props.selectedBodyPart], renderChart, {
  deep: true,
})

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
  <div ref="chartContainer" class="chart"></div>
</template>

<style scoped>
.chart {
  height: 100%;
  width: 100%;
}
</style>
