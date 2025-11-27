<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'
import type { Weapon } from '@/types/weapon'
import { calculateHitChance, calculateMaxDPS } from '@/utils/weaponCalculations'
import { calculateDPSCurve, calculateDPSDistribution } from '@/utils/armorCalculations'

// 注册 Chart.js 组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

interface Props {
  weapons: Weapon[]
  targetDistance: number
}

const props = defineProps<Props>()

// 在组件内部计算所有武器的 DPS 数据
const weaponsData = computed(() => {
  return props.weapons.map((weapon) => {
    const hitChance = calculateHitChance(weapon, props.targetDistance)
    const maxDPS = calculateMaxDPS(weapon)
    const armorParams = {
      armorPenetration: weapon.armorPenetration / 100,
      hitChance,
      maxDPS,
    }
    const dpsCurve = calculateDPSCurve(armorParams)
    const distributions = dpsCurve.armorValues.map((armor) =>
      calculateDPSDistribution(armorParams, armor / 100),
    )

    return {
      weapon,
      hitChance,
      maxDPS,
      dpsCurve,
      distributions,
    }
  })
})

const chartData = computed(() => {
  if (!weaponsData.value || weaponsData.value.length === 0) {
    return {
      labels: [],
      datasets: [],
    }
  }

  // 使用第一个武器的护甲值作为标签（假设所有武器使用相同的护甲值范围）
  const labels = weaponsData.value[0]!.dpsCurve.armorValues.map((v) => `${v}%`)

  const datasets = weaponsData.value.map((weaponData) => ({
    label: weaponData.weapon.name,
    data: weaponData.dpsCurve.dpsValues,
    borderColor: weaponData.weapon.color,
    backgroundColor: `${weaponData.weapon.color}20`,
    borderWidth: 2,
    fill: true,
    tension: 0.4,
    pointRadius: 0,
    pointHoverRadius: 6,
  }))

  return {
    labels,
    datasets,
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top' as const,
    },
    tooltip: {
      mode: 'index' as const,
      intersect: false,
      callbacks: {
        label: (context: {
          parsed: { y: number | null }
          dataIndex: number
          datasetIndex: number
        }) => {
          const y = context.parsed.y
          if (y === null) return ''

          const weaponData = weaponsData.value[context.datasetIndex]
          if (!weaponData) return ''
          return `${weaponData.weapon.name} - 期望DPS: ${y.toFixed(3)}`
        },
        afterLabel: (context: { dataIndex: number; datasetIndex: number }) => {
          const index = context.dataIndex
          const weaponData = weaponsData.value[context.datasetIndex]
          if (!weaponData) return []
          const dist = weaponData.distributions[index]
          if (!dist) return []

          return [
            '',
            `未命中: ${(dist.missProb * 100).toFixed(2)}%`,
            `完全偏转(0伤害): ${(dist.zeroDamageProb * 100).toFixed(2)}%`,
            `部分偏转(50%伤害): ${(dist.halfDamageProb * 100).toFixed(2)}% → DPS ${dist.halfDPS.toFixed(2)}`,
            `穿透(100%伤害): ${(dist.fullDamageProb * 100).toFixed(2)}% → DPS ${dist.fullDPS.toFixed(2)}`,
          ]
        },
      },
    },
  },
  scales: {
    x: {
      title: {
        display: true,
        text: '护甲值',
      },
      ticks: {
        maxTicksLimit: 21,
      },
    },
    y: {
      title: {
        display: true,
        text: 'DPS',
      },
      beginAtZero: true,
    },
  },
  interaction: {
    mode: 'nearest' as const,
    axis: 'x' as const,
    intersect: false,
  },
}))
</script>

<template>
  <div class="chart-container">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>

<style scoped>
.chart-container {
  height: 400px;
  position: relative;
}
</style>
