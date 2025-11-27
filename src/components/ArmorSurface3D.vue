<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import Plotly from 'plotly.js-dist-min'
import { useResizeObserver } from '@vueuse/core'
import { transposeMatrix, calculateSurfaceIntersection } from '@/utils/plotlyUtils'
import type { ArmorSet, ArmorLayer, DamageType } from '@/types/armor'
import { BodyPart } from '@/types/bodyPart'
import { calculateMultiLayerDamage, filterArmorLayersByBodyPart } from '@/utils/armorCalculations'

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

// 为单个护甲套装生成3D曲面数据
function generateArmorSurfaceData(armorSet: ArmorSet) {
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

  // 护甲穿透范围：0%-200%
  const penetrationValues: number[] = []
  for (let pen = 0; pen <= 200; pen += 4) {
    penetrationValues.push(pen)
  }

  // 单发伤害范围：1-50
  const damageValues: number[] = []
  for (let dmg = 1; dmg <= 50; dmg += 1) {
    damageValues.push(dmg)
  }

  // 计算每个点的期望受伤和详细信息
  // zData[i][j] 对应 penetrationValues[i], damageValues[j]
  const zData: number[][] = []
  const hoverTexts: string[][] = []

  for (let i = 0; i < penetrationValues.length; i++) {
    const row: number[] = []
    const hoverRow: string[] = []
    const pen = penetrationValues[i]!

    for (let j = 0; j < damageValues.length; j++) {
      const dmg = damageValues[j]!

      const attackParams = {
        armorPenetration: pen / 100,
        damagePerShot: dmg,
        damageType: props.damageType,
      }

      const result = calculateMultiLayerDamage(filteredLayers, attackParams)

      // 验证：期望伤害不应超过单发伤害
      if (result.expectedDamage > dmg + 0.001) {
        console.error('曲面计算错误：期望伤害超过单发伤害', {
          expectedDamage: result.expectedDamage,
          damagePerShot: dmg,
          penetration: pen,
        })
      }

      // 计算减伤比例：(单发伤害 - 期望受伤) / 单发伤害 × 100%
      const damageReduction = ((dmg - result.expectedDamage) / dmg) * 100

      row.push(damageReduction)

      // 构建详细的悬停文本
      const damageStatesText = result.damageStates
        .sort((a, b) => a.damageMultiplier - b.damageMultiplier)
        .map((state) => {
          const percent = (state.damageMultiplier * 100).toFixed(0)
          const prob = (state.probability * 100).toFixed(2)
          return `  ${percent}%伤害: ${prob}%`
        })
        .join('<br>')

      const hoverText = [
        `<b>${armorSet.name}</b>`,
        `----------------`,
        `<b>护甲穿透:</b> ${pen}%`,
        `<b>单发伤害:</b> ${dmg}`,
        `----------------`,
        `<b>伤害分布:</b>`,
        damageStatesText,
        `----------------`,
        `<b>期望受伤:</b> ${result.expectedDamage.toFixed(2)}`,
        `<b>减伤比例:</b> ${damageReduction.toFixed(1)}%`,
      ].join('<br>')

      hoverRow.push(hoverText)
    }
    zData.push(row)
    hoverTexts.push(hoverRow)
  }

  // 计算最大减伤比例（用于交线归一化，理论上是100%）
  const maxDamageReduction = Math.max(...zData.flat())

  return {
    armorSet,
    penetrationValues,
    damageValues,
    zData,
    hoverTexts,
    maxDamageReduction,
  }
}

// 绘制3D图表
function renderChart() {
  if (!chartContainer.value || !props.armorSets || props.armorSets.length === 0) return

  const plotData: Plotly.Data[] = []

  // 先为所有护甲套装生成曲面数据（最多2个）
  const surfaceDataCache = props.armorSets
    .slice(0, 2)
    .map((armorSet) => generateArmorSurfaceData(armorSet))

  // 为每个护甲套装创建一个曲面
  surfaceDataCache.forEach((surfaceData, index) => {
    const { armorSet, penetrationValues, damageValues, zData, hoverTexts } = surfaceData

    // 数据结构：zData[penetrationIndex][damageIndex]
    // 目标映射：x=penetrationValues, y=damageValues, z=expectedDamage
    // Plotly 要求：z[i][j] 对应 y[i] 和 x[j]（第一维=Y轴，第二维=X轴）
    // 因此需要转置：将 [penetration][damage] 转为 [damage][penetration]
    const zDataTransposed = transposeMatrix(zData)

    plotData.push({
      type: 'surface',
      name: armorSet.name,
      x: penetrationValues, // 护甲穿透
      y: damageValues, // 单发伤害
      z: zDataTransposed, // 减伤比例
      customdata: hoverTexts,
      hovertemplate: '%{customdata}<extra></extra>',
      colorscale: 'Viridis',
      showscale: index === 0, // 只显示第一个颜色条
      opacity: 0.85,
      colorbar:
        index === 0
          ? {
              title: {
                text: '减伤比例(%)',
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
  if (surfaceDataCache.length === 2) {
    const surface1 = surfaceDataCache[0]!
    const surface2 = surfaceDataCache[1]!

    const intersectionCurves = calculateSurfaceIntersection(
      surface1.zData,
      surface2.zData,
      surface1.penetrationValues,
      surface1.damageValues,
      {
        x: 100, // 穿透范围 0-100%
        y: Math.max(...surface1.damageValues), // 伤害范围
        z: Math.max(surface1.maxDamageReduction, surface2.maxDamageReduction),
      },
    )

    // 为每条独立的交线段添加一个轨迹
    intersectionCurves.forEach((curve, curveIndex) => {
      if (curve.x.length > 0) {
        plotData.push({
          type: 'scatter3d',
          mode: 'lines',
          name:
            curveIndex === 0
              ? `${surface1.armorSet.name} ∩ ${surface2.armorSet.name}`
              : `${surface1.armorSet.name} ∩ ${surface2.armorSet.name} (${curveIndex + 1})`,
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
            '减伤比例: %{z:.1f}%<br>' +
            '<extra></extra>',
        } as unknown as Plotly.Data)
      }
    })
  }

  // 伤害类型标签
  const damageTypeLabels = {
    blunt: '钝器',
    sharp: '利器',
    heat: '热能',
  }
  const damageTypeLabel = damageTypeLabels[props.damageType]

  const layout: Partial<Plotly.Layout> = {
    title: {
      text:
        surfaceDataCache.length === 2
          ? `护甲对比 - ${damageTypeLabel}伤害减伤比例`
          : `${surfaceDataCache[0]?.armorSet.name || ''} - ${damageTypeLabel}伤害减伤比例`,
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
        title: { text: '减伤比例 (%)', font: { size: 14 } },
        gridcolor: 'rgb(200, 200, 200)',
        showbackground: true,
        backgroundcolor: 'rgb(240, 240, 240)',
      },
      camera: {
        eye: {
          x: 2, // 负值表示从左侧（低穿甲）观察
          y: 1, // 负值表示从前侧（低伤害）观察
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

// 监听参数变化，重新绘制
watch(
  () => [props.armorSets, props.damageType, props.selectedBodyPart],
  () => {
    renderChart()
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
