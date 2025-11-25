<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  calculateDPSCurve,
  calculateDPSDistribution,
  type WeaponParams,
} from '@/utils/armorCalculations'

// 武器参数 (转换为百分比形式便于 slider 使用)
const hitChance = ref(80) // 0-100
const maxDPS = ref(10)
const armorPenetration = ref(10) // 0-100
const targetArmor = ref(50) // 0-200

// 折叠面板状态
const activeCollapse = ref<string[]>([])

// 计算DPS曲线
const dpsCurve = computed(() => {
  const params: WeaponParams = {
    hitChance: hitChance.value / 100,
    maxDPS: maxDPS.value,
    armorPenetration: armorPenetration.value / 100,
  }
  return calculateDPSCurve(params)
})

// 计算特定护甲值的DPS分布
const dpsDistribution = computed(() => {
  const params: WeaponParams = {
    hitChance: hitChance.value / 100,
    maxDPS: maxDPS.value,
    armorPenetration: armorPenetration.value / 100,
  }
  return calculateDPSDistribution(params, targetArmor.value / 100)
})

// 样本数据用于表格展示
const sampleData = computed(() => {
  return [0, 25, 50, 75, 100, 125, 150, 175, 200].map((i) => ({
    armor: `${i}%`,
    dps: dpsCurve.value.dpsValues[i].toFixed(3),
  }))
})
</script>

<template>
  <div class="calculator">
    <el-card class="header-card">
      <template #header>
        <h2>RimWorld DPS 计算器</h2>
      </template>
    </el-card>

    <el-card class="input-section">
      <template #header>
        <h3>武器参数</h3>
      </template>

      <el-form label-width="120px">
        <el-form-item label="命中率">
          <div class="slider-input-group">
            <el-slider v-model="hitChance" :min="0" :max="100" :step="1" />
            <el-input-number
              v-model="hitChance"
              :min="0"
              :max="100"
              :step="1"
              controls-position="right"
              class="input-number-fixed"
            />
            <span class="unit">%</span>
          </div>
        </el-form-item>

        <el-form-item label="最大DPS">
          <div class="slider-input-group">
            <el-slider v-model="maxDPS" :min="0" :max="50" :step="0.1" />
            <el-input-number
              v-model="maxDPS"
              :min="0"
              :max="1000"
              :step="0.1"
              :precision="1"
              controls-position="right"
              class="input-number-fixed"
            />
            <span class="unit-placeholder"></span>
          </div>
        </el-form-item>

        <el-form-item label="护甲穿透">
          <div class="slider-input-group">
            <el-slider v-model="armorPenetration" :min="0" :max="100" :step="1" />
            <el-input-number
              v-model="armorPenetration"
              :min="0"
              :max="100"
              :step="1"
              controls-position="right"
              class="input-number-fixed"
            />
            <span class="unit">%</span>
          </div>
        </el-form-item>

        <el-form-item label="目标护甲值">
          <div class="slider-input-group">
            <el-slider v-model="targetArmor" :min="0" :max="200" :step="1" />
            <el-input-number
              v-model="targetArmor"
              :min="0"
              :max="200"
              :step="1"
              controls-position="right"
              class="input-number-fixed"
            />
            <span class="unit">%</span>
          </div>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="results-section">
      <template #header>
        <h3>DPS曲线数据</h3>
      </template>

      <el-alert
        title="数据点信息"
        type="info"
        :closable="false"
        show-icon
        :description="`计算了 ${dpsCurve.dpsValues.length} 个数据点（护甲值 0% - 200%）`"
      />

      <el-collapse v-model="activeCollapse" class="data-collapse">
        <el-collapse-item title="查看部分数据" name="1">
          <el-table :data="sampleData" stripe style="width: 100%">
            <el-table-column prop="armor" label="护甲值" width="120" />
            <el-table-column prop="dps" label="期望DPS" />
          </el-table>
        </el-collapse-item>
      </el-collapse>
    </el-card>

    <el-card class="distribution-section">
      <template #header>
        <h3>DPS分布概率（护甲值 {{ targetArmor }}%）</h3>
      </template>

      <el-descriptions :column="1" border>
        <el-descriptions-item label="未命中">
          <el-tag type="info">{{ (dpsDistribution.missProb * 100).toFixed(2) }}%</el-tag>
          <span class="dps-value">DPS: 0</span>
        </el-descriptions-item>

        <el-descriptions-item label="完全偏转（0伤害）">
          <el-tag type="danger">{{ (dpsDistribution.zeroDamageProb * 100).toFixed(2) }}%</el-tag>
          <span class="dps-value">DPS: 0</span>
        </el-descriptions-item>

        <el-descriptions-item label="部分偏转（50%伤害）">
          <el-tag type="warning">{{ (dpsDistribution.halfDamageProb * 100).toFixed(2) }}%</el-tag>
          <span class="dps-value">DPS: {{ dpsDistribution.halfDPS.toFixed(2) }}</span>
        </el-descriptions-item>

        <el-descriptions-item label="穿透（100%伤害）">
          <el-tag type="success">{{ (dpsDistribution.fullDamageProb * 100).toFixed(2) }}%</el-tag>
          <span class="dps-value">DPS: {{ dpsDistribution.fullDPS.toFixed(2) }}</span>
        </el-descriptions-item>

        <el-descriptions-item label="期望DPS">
          <el-tag type="primary" effect="dark">
            {{ dpsDistribution.expectedDPS.toFixed(3) }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<style scoped>
.calculator {
  padding: 20px;
}

.header-card {
  margin-bottom: 20px;
}

.input-section,
.results-section,
.distribution-section {
  margin-bottom: 20px;
}

.slider-input-group {
  display: flex;
  align-items: center;
  gap: 15px;
  width: 100%;
}

.slider-input-group :deep(.el-slider) {
  flex: 1;
}

.input-number-fixed {
  width: 150px;
}

.unit {
  width: 20px;
  color: #909399;
}

.unit-placeholder {
  width: 20px;
}

.data-collapse {
  margin-top: 15px;
}

.dps-value {
  margin-left: 15px;
  color: #606266;
}
</style>
