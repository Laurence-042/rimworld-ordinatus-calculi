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

interface Props {
  armorValues: number[]
  dpsValues: number[]
  targetArmor?: number
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
        label: (context: { parsed: { y: number } }) => {
          return `DPS: ${context.parsed.y.toFixed(3)}`
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
