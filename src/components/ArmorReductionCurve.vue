<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { Line } from 'vue-chartjs'
import type { ArmorSet, ArmorLayer, DamageType } from '@/types/armor'
import { BodyPart } from '@/types/bodyPart'
import {
  calculateMultiLayerDamageReduction,
  filterArmorLayersByBodyPart,
} from '@/utils/armorCalculations'

const { t } = useI18n()

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

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

const damageTypeLabel = computed(() => {
  const labels: Record<DamageType, string> = {
    blunt: t('damageType.blunt'),
    sharp: t('damageType.sharp'),
    heat: t('damageType.heat'),
  }
  return labels[props.damageType]
})

// 为单个护甲套装生成减伤曲线数据
function generateArmorReductionCurve(armorSet: ArmorSet) {
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
  const damageReductions: number[] = []
  const detailedInfo: Array<{
    damageStates: Array<{ damageMultiplier: number; probability: number }>
  }> = []

  for (let pen = 0; pen <= 100; pen += 1) {
    const result = calculateMultiLayerDamageReduction(filteredLayers, {
      armorPenetration: pen / 100,
      damageType: props.damageType,
    })

    penetrationValues.push(pen)
    damageReductions.push(result.damageReduction)
    detailedInfo.push({
      damageStates: result.damageStates,
    })
  }

  return {
    armorSet,
    penetrationValues,
    damageReductions,
    detailedInfo,
  }
}

// 生成Chart.js图表数据
const chartData = computed<ChartData<'line'>>(() => {
  // 为每个护甲套装生成曲线数据
  const curveDataList = props.armorSets.map((armorSet) => generateArmorReductionCurve(armorSet))

  const datasets = curveDataList.map((curveData) => {
    return {
      label: curveData.armorSet.name,
      data: curveData.damageReductions,
      borderColor: curveData.armorSet.color,
      backgroundColor: curveData.armorSet.color,
      borderWidth: 3,
      pointRadius: 0,
      pointHoverRadius: 6,
      tension: 0.1,
      // 将详细信息附加到 dataset 上，供 tooltip 使用
      detailedInfo: curveData.detailedInfo,
      armorSetName: curveData.armorSet.name,
    }
  })

  // 使用第一个套装的穿甲值作为X轴标签
  const labels = curveDataList[0]?.penetrationValues.map((v) => v.toString()) || []

  return {
    labels,
    datasets,
  }
})

const chartOptions = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    title: {
      display: true,
      text: t('chart.reductionCurve', { damageType: damageTypeLabel.value }),
      font: { size: 16 },
    },
    legend: {
      display: true,
      position: 'top',
    },
    tooltip: {
      callbacks: {
        title: (context) => {
          const pen = context[0]?.label || '0'
          return t('chart.penetrationLabel', { penetration: pen })
        },
        label: (context) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const dataset = context.dataset as any
          const pointIndex = context.dataIndex

          const armorSetName = dataset.armorSetName || dataset.label || ''
          const detailedInfo = dataset.detailedInfo as Array<{
            damageStates: Array<{ damageMultiplier: number; probability: number }>
          }>

          const damageReduction = (context.parsed.y ?? 0).toFixed(1)
          const info = detailedInfo?.[pointIndex]

          if (!info)
            return t('chart.reductionValue', { name: armorSetName, reduction: damageReduction })

          const pen = context.label || '0'

          // 返回多行文本（Chart.js会自动处理换行）
          return [
            `━━━━━━━━━━━━━━━━`,
            `【${armorSetName}】`,
            t('chart.penetrationLabel', { penetration: pen }),
            t('chart.damageDistribution') + ':',
            ...info.damageStates
              .sort(
                (a: { damageMultiplier: number }, b: { damageMultiplier: number }) =>
                  a.damageMultiplier - b.damageMultiplier,
              )
              .map((state: { damageMultiplier: number; probability: number }) => {
                const percent = (state.damageMultiplier * 100).toFixed(0)
                const prob = (state.probability * 100).toFixed(2)
                return `  ${percent}%${t('chart.damage')}: ${prob}%`
              }),
            t('chart.expectedReduction', { reduction: damageReduction }),
          ]
        },
      },
    },
  },
  scales: {
    x: {
      type: 'linear',
      title: {
        display: true,
        text: t('weapon.armorPenetration') + ' (%)',
        font: { size: 14 },
      },
      min: 0,
      max: 100,
      ticks: {
        stepSize: 10,
        callback: (value) => `${value}%`,
      },
    },
    y: {
      title: {
        display: true,
        text: t('armor.damageReduction') + ' (%)',
        font: { size: 14 },
      },
      ticks: {
        callback: (value) => `${value}%`,
      },
      // 自动调整显示范围，在数据基础上留出5%的空白边距
      grace: '5%',
    },
  },
}))
</script>

<template>
  <div class="chart-wrapper">
    <Line :data="chartData" :options="chartOptions" />
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
</style>
