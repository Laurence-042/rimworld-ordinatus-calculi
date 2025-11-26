<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

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

interface DPSDistribution {
  missProb: number
  zeroDamageProb: number
  halfDamageProb: number
  fullDamageProb: number
  halfDPS: number
  fullDPS: number
  expectedDPS: number
}

interface Props {
  armorValues: number[]
  dpsValues: number[]
  distributions: DPSDistribution[]
}

const props = defineProps<Props>()

const chartData = computed(() => ({
  labels: props.armorValues.map((v) => `${v}%`),
  datasets: [
    {
      label: 'DPS期望',
      data: props.dpsValues,
      borderColor: '#409EFF',
      backgroundColor: 'rgba(64, 158, 255, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 6,
    },
  ],
}))

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
        label: (context: { parsed: { y: number | null }; dataIndex: number }) => {
          const y = context.parsed.y
          if (y === null) return ''
          return `期望DPS: ${y.toFixed(3)}`
        },
        afterLabel: (context: { dataIndex: number }) => {
          const index = context.dataIndex
          const dist = props.distributions[index]
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
