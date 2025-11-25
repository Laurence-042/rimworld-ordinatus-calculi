<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  calculateDPSCurve,
  calculateDPSDistribution,
  type WeaponParams,
} from '@/utils/armorCalculations'
import {
  calculateHitChance,
  calculateMaxDPS,
  weaponPresets,
  type WeaponDetailParams,
} from '@/utils/weaponCalculations'
import DPSChart from './DPSChart.vue'

// 输入模式：'simple' 直接输入 | 'detailed' 详细参数
const inputMode = ref<'simple' | 'detailed'>('simple')

// 简单模式参数
const hitChance = ref(80) // 0-100
const maxDPS = ref(10)

// 详细模式参数
const detailParams = ref<WeaponDetailParams>({
  touchAccuracy: 95,
  shortAccuracy: 85,
  mediumAccuracy: 70,
  longAccuracy: 50,
  warmupTime: 1.5,
  burstShotCount: 3,
  ticksBetweenBurstShots: 8,
  cooldownTime: 1.0,
  damagePerShot: 12,
})

// 通用参数
const armorPenetration = ref(10) // 0-100
const targetArmor = ref(50) // 0-200
const targetDistance = ref(25) // 目标距离（格）

// 根据模式计算实际的命中率和DPS
const actualHitChance = computed(() => {
  if (inputMode.value === 'simple') {
    return hitChance.value / 100
  } else {
    return calculateHitChance(detailParams.value, targetDistance.value)
  }
})

const actualMaxDPS = computed(() => {
  if (inputMode.value === 'simple') {
    return maxDPS.value
  } else {
    return calculateMaxDPS(detailParams.value)
  }
})

// 应用武器预设
const applyPreset = (presetIndex: number) => {
  const preset = weaponPresets[presetIndex]
  detailParams.value = {
    ...preset.params,
  }
}

// 计算DPS曲线
const dpsCurve = computed(() => {
  const params: WeaponParams = {
    hitChance: actualHitChance.value,
    maxDPS: actualMaxDPS.value,
    armorPenetration: armorPenetration.value / 100,
  }
  return calculateDPSCurve(params)
})

// 计算特定护甲值的DPS分布
const dpsDistribution = computed(() => {
  const params: WeaponParams = {
    hitChance: actualHitChance.value,
    maxDPS: actualMaxDPS.value,
    armorPenetration: armorPenetration.value / 100,
  }
  return calculateDPSDistribution(params, targetArmor.value / 100)
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
        <div style="display: flex; justify-content: space-between; align-items: center">
          <h3>武器参数</h3>
          <el-radio-group v-model="inputMode" size="small">
            <el-radio-button value="simple">简单模式</el-radio-button>
            <el-radio-button value="detailed">详细模式</el-radio-button>
          </el-radio-group>
        </div>
      </template>

      <!-- 简单模式 -->
      <el-form v-if="inputMode === 'simple'" label-width="120px">
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

      <!-- 详细模式 -->
      <div v-else>
        <el-form label-width="140px">
          <el-divider content-position="left">武器预设</el-divider>
          <el-form-item label="选择预设">
            <el-select placeholder="选择武器预设" @change="applyPreset" style="width: 300px">
              <el-option
                v-for="(preset, index) in weaponPresets"
                :key="index"
                :label="preset.name"
                :value="index"
              />
            </el-select>
          </el-form-item>

          <el-divider content-position="left">命中率参数</el-divider>
          <el-form-item label="贴近命中率 (≤3格)">
            <div class="slider-input-group">
              <el-slider v-model="detailParams.touchAccuracy" :min="0" :max="100" :step="1" />
              <el-input-number
                v-model="detailParams.touchAccuracy"
                :min="0"
                :max="100"
                :step="1"
                controls-position="right"
                class="input-number-fixed"
              />
              <span class="unit">%</span>
            </div>
          </el-form-item>

          <el-form-item label="近距离命中率 (≤12格)">
            <div class="slider-input-group">
              <el-slider v-model="detailParams.shortAccuracy" :min="0" :max="100" :step="1" />
              <el-input-number
                v-model="detailParams.shortAccuracy"
                :min="0"
                :max="100"
                :step="1"
                controls-position="right"
                class="input-number-fixed"
              />
              <span class="unit">%</span>
            </div>
          </el-form-item>

          <el-form-item label="中距离命中率 (≤25格)">
            <div class="slider-input-group">
              <el-slider v-model="detailParams.mediumAccuracy" :min="0" :max="100" :step="1" />
              <el-input-number
                v-model="detailParams.mediumAccuracy"
                :min="0"
                :max="100"
                :step="1"
                controls-position="right"
                class="input-number-fixed"
              />
              <span class="unit">%</span>
            </div>
          </el-form-item>

          <el-form-item label="远距离命中率 (≤40格)">
            <div class="slider-input-group">
              <el-slider v-model="detailParams.longAccuracy" :min="0" :max="100" :step="1" />
              <el-input-number
                v-model="detailParams.longAccuracy"
                :min="0"
                :max="100"
                :step="1"
                controls-position="right"
                class="input-number-fixed"
              />
              <span class="unit">%</span>
            </div>
          </el-form-item>

          <el-form-item label="目标距离">
            <div class="slider-input-group">
              <el-slider v-model="targetDistance" :min="0" :max="50" :step="1" />
              <el-input-number
                v-model="targetDistance"
                :min="0"
                :max="100"
                :step="1"
                controls-position="right"
                class="input-number-fixed"
              />
              <span class="unit">格</span>
            </div>
          </el-form-item>

          <el-divider content-position="left">DPS参数</el-divider>
          <el-form-item label="瞄准时间">
            <div class="slider-input-group">
              <el-slider v-model="detailParams.warmupTime" :min="0" :max="5" :step="0.1" />
              <el-input-number
                v-model="detailParams.warmupTime"
                :min="0"
                :max="10"
                :step="0.1"
                :precision="1"
                controls-position="right"
                class="input-number-fixed"
              />
              <span class="unit">秒</span>
            </div>
          </el-form-item>

          <el-form-item label="连射次数">
            <div class="slider-input-group">
              <el-slider v-model="detailParams.burstShotCount" :min="1" :max="10" :step="1" />
              <el-input-number
                v-model="detailParams.burstShotCount"
                :min="1"
                :max="20"
                :step="1"
                controls-position="right"
                class="input-number-fixed"
              />
              <span class="unit-placeholder"></span>
            </div>
          </el-form-item>

          <el-form-item label="连射间隔">
            <div class="slider-input-group">
              <el-slider
                v-model="detailParams.ticksBetweenBurstShots"
                :min="0"
                :max="30"
                :step="1"
              />
              <el-input-number
                v-model="detailParams.ticksBetweenBurstShots"
                :min="0"
                :max="60"
                :step="1"
                controls-position="right"
                class="input-number-fixed"
              />
              <span class="unit">ticks</span>
            </div>
          </el-form-item>

          <el-form-item label="冷却时间">
            <div class="slider-input-group">
              <el-slider v-model="detailParams.cooldownTime" :min="0" :max="5" :step="0.1" />
              <el-input-number
                v-model="detailParams.cooldownTime"
                :min="0"
                :max="10"
                :step="0.1"
                :precision="1"
                controls-position="right"
                class="input-number-fixed"
              />
              <span class="unit">秒</span>
            </div>
          </el-form-item>

          <el-form-item label="单发伤害">
            <div class="slider-input-group">
              <el-slider v-model="detailParams.damagePerShot" :min="1" :max="50" :step="1" />
              <el-input-number
                v-model="detailParams.damagePerShot"
                :min="1"
                :max="200"
                :step="1"
                controls-position="right"
                class="input-number-fixed"
              />
              <span class="unit-placeholder"></span>
            </div>
          </el-form-item>

          <el-divider content-position="left">护甲参数</el-divider>
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

          <el-alert
            title="计算结果"
            type="success"
            :closable="false"
            :description="`命中率: ${(actualHitChance * 100).toFixed(2)}% | 最大DPS: ${actualMaxDPS.toFixed(2)}`"
          />
        </el-form>
      </div>
    </el-card>

    <el-card class="results-section">
      <template #header>
        <h3>DPS曲线图</h3>
      </template>

      <DPSChart
        :armor-values="dpsCurve.armorValues"
        :dps-values="dpsCurve.dpsValues"
        :target-armor="targetArmor"
      />
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

.dps-value {
  margin-left: 15px;
  color: #606266;
}
</style>
