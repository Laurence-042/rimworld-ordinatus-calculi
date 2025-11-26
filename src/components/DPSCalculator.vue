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
import DPSSurface3D from './DPSSurface3D.vue'

// 图表模式：2D曲线 或 3D曲面
const chartMode = ref<'2d' | '3d'>('2d')

// 选中的武器预设索引
const selectedPresetIndex = ref<number | null>(null)

// 命中率参数
const accuracyParams = ref({
  touchAccuracy: 95,
  shortAccuracy: 85,
  mediumAccuracy: 70,
  longAccuracy: 50,
})
const targetDistance = ref(25) // 目标距离（格）

// 武器属性
const weaponParams = ref({
  damage: 12,
  warmUp: 1.5, // 秒
  cooldown: 1.0, // 秒
  burstCount: 3,
  burstTicks: 8,
})

// 护甲穿透（共用）
const armorPenetration = ref(15) // 0-100

// 计算实际的命中率
const actualHitChance = computed(() => {
  const detailParams: WeaponDetailParams = {
    ...accuracyParams.value,
    ...weaponParams.value,
    armorPenetration: armorPenetration.value,
  }
  return calculateHitChance(detailParams, targetDistance.value)
})

// 计算最大DPS
const actualMaxDPS = computed(() => {
  const detailParams: WeaponDetailParams = {
    ...accuracyParams.value,
    ...weaponParams.value,
    armorPenetration: armorPenetration.value,
  }
  return calculateMaxDPS(detailParams)
})

// 应用武器预设
const applyPreset = (presetIndex: number) => {
  selectedPresetIndex.value = presetIndex
  const preset = weaponPresets[presetIndex]

  if (!preset) return

  // 更新命中率参数
  accuracyParams.value = {
    touchAccuracy: preset.params.touchAccuracy,
    shortAccuracy: preset.params.shortAccuracy,
    mediumAccuracy: preset.params.mediumAccuracy,
    longAccuracy: preset.params.longAccuracy,
  }
  // 更新武器属性
  weaponParams.value = {
    damage: preset.params.damage,
    warmUp: preset.params.warmUp,
    cooldown: preset.params.cooldown,
    burstCount: preset.params.burstCount,
    burstTicks: preset.params.burstTicks,
  }
  armorPenetration.value = preset.params.armorPenetration
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

// 为每个护甲值计算分布（用于图表悬浮显示）
const allDistributions = computed(() => {
  const params: WeaponParams = {
    hitChance: actualHitChance.value,
    maxDPS: actualMaxDPS.value,
    armorPenetration: armorPenetration.value / 100,
  }
  return dpsCurve.value.armorValues.map((armor) => calculateDPSDistribution(params, armor / 100))
})
</script>

<template>
  <div class="calculator">
    <div class="main-layout">
      <!-- 左侧：参数输入 -->
      <div class="left-panel">
        <h2 class="main-title">RimWorld DPS 计算器</h2>
        <el-card class="input-section">
          <template #header>
            <h3>武器参数</h3>
          </template>

          <el-form label-width="13em">
            <!-- 武器预设 -->
            <el-divider content-position="left">武器预设</el-divider>
            <el-form-item label="选择预设">
              <el-select
                v-model="selectedPresetIndex"
                placeholder="选择武器预设"
                @change="applyPreset"
                style="width: 300px"
              >
                <el-option
                  v-for="(preset, index) in weaponPresets"
                  :key="index"
                  :label="preset.name"
                  :value="index"
                />
              </el-select>
            </el-form-item>

            <!-- 命中率参数 -->
            <el-divider content-position="left">命中率参数</el-divider>

            <el-form-item label="贴近 (≤3格)">
              <div class="slider-input-group">
                <el-slider v-model="accuracyParams.touchAccuracy" :min="0" :max="100" :step="1" />
                <el-input-number
                  v-model="accuracyParams.touchAccuracy"
                  :min="0"
                  :max="100"
                  :step="1"
                  controls-position="right"
                  class="input-number-fixed"
                />
                <span class="unit">%</span>
              </div>
            </el-form-item>

            <el-form-item label="近 (≤12格)">
              <div class="slider-input-group">
                <el-slider v-model="accuracyParams.shortAccuracy" :min="0" :max="100" :step="1" />
                <el-input-number
                  v-model="accuracyParams.shortAccuracy"
                  :min="0"
                  :max="100"
                  :step="1"
                  controls-position="right"
                  class="input-number-fixed"
                />
                <span class="unit">%</span>
              </div>
            </el-form-item>

            <el-form-item label="中 (≤25格)">
              <div class="slider-input-group">
                <el-slider v-model="accuracyParams.mediumAccuracy" :min="0" :max="100" :step="1" />
                <el-input-number
                  v-model="accuracyParams.mediumAccuracy"
                  :min="0"
                  :max="100"
                  :step="1"
                  controls-position="right"
                  class="input-number-fixed"
                />
                <span class="unit">%</span>
              </div>
            </el-form-item>

            <el-form-item label="远 (≤40格)">
              <div class="slider-input-group">
                <el-slider v-model="accuracyParams.longAccuracy" :min="0" :max="100" :step="1" />
                <el-input-number
                  v-model="accuracyParams.longAccuracy"
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

            <!-- 武器属性 -->
            <el-divider content-position="left">武器属性</el-divider>

            <el-form-item label="伤害">
              <div class="slider-input-group">
                <el-slider v-model="weaponParams.damage" :min="1" :max="50" :step="1" />
                <el-input-number
                  v-model="weaponParams.damage"
                  :min="1"
                  :max="200"
                  :step="1"
                  controls-position="right"
                  class="input-number-fixed"
                />
                <span class="unit-placeholder"></span>
              </div>
            </el-form-item>

            <el-form-item label="预热时间 (Warm-Up)">
              <div class="slider-input-group">
                <el-slider v-model="weaponParams.warmUp" :min="0" :max="5" :step="0.1" />
                <el-input-number
                  v-model="weaponParams.warmUp"
                  :min="0"
                  :max="10"
                  :step="0.1"
                  :precision="2"
                  controls-position="right"
                  class="input-number-fixed"
                />
                <span class="unit">秒</span>
              </div>
            </el-form-item>

            <el-form-item label="冷却时间 (Cooldown)">
              <div class="slider-input-group">
                <el-slider v-model="weaponParams.cooldown" :min="0" :max="5" :step="0.1" />
                <el-input-number
                  v-model="weaponParams.cooldown"
                  :min="0"
                  :max="10"
                  :step="0.1"
                  :precision="2"
                  controls-position="right"
                  class="input-number-fixed"
                />
                <span class="unit">秒</span>
              </div>
            </el-form-item>

            <el-form-item label="连发数量 (Burst Count)">
              <div class="slider-input-group">
                <el-slider v-model="weaponParams.burstCount" :min="1" :max="10" :step="1" />
                <el-input-number
                  v-model="weaponParams.burstCount"
                  :min="1"
                  :max="20"
                  :step="1"
                  controls-position="right"
                  class="input-number-fixed"
                />
                <span class="unit-placeholder"></span>
              </div>
            </el-form-item>

            <el-form-item label="连发间隔 (Burst Ticks)">
              <div class="slider-input-group">
                <el-slider v-model="weaponParams.burstTicks" :min="0" :max="30" :step="1" />
                <el-input-number
                  v-model="weaponParams.burstTicks"
                  :min="0"
                  :max="60"
                  :step="1"
                  controls-position="right"
                  class="input-number-fixed"
                />
                <span class="unit">ticks</span>
              </div>
            </el-form-item>

            <!-- 护甲穿透（共用） -->
            <el-divider content-position="left">护甲穿透</el-divider>
            <el-form-item label="护甲穿透 (AP)">
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

            <el-alert
              title="计算结果"
              type="success"
              :closable="false"
              :description="`命中率: ${(actualHitChance * 100).toFixed(2)}% | 最大DPS: ${actualMaxDPS.toFixed(2)} | 护甲穿透: ${armorPenetration.toFixed(0)}%`"
            />
          </el-form>
        </el-card>
      </div>

      <!-- 右侧：结果显示 -->
      <div class="right-panel">
        <div class="chart-controls">
          <el-radio-group v-model="chartMode" size="default">
            <el-radio-button value="2d">2D曲线</el-radio-button>
            <el-radio-button value="3d">3D曲面</el-radio-button>
          </el-radio-group>
          <p class="chart-hint">
            <template v-if="chartMode === '2d'"> 悬停在曲线上查看该护甲值的详细DPS分布 </template>
            <template v-else> 交互式3D曲面：护甲值 × 目标距离 → DPS </template>
          </p>
        </div>

        <div class="chart-container">
          <DPSChart
            v-if="chartMode === '2d'"
            :armor-values="dpsCurve.armorValues"
            :dps-values="dpsCurve.dpsValues"
            :distributions="allDistributions"
          />
          <DPSSurface3D
            v-else
            :weapon-params="weaponParams"
            :accuracy-params="accuracyParams"
            :armor-penetration="armorPenetration"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calculator {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.main-title {
  font-size: 1.5em;
  font-weight: 600;
  color: #303133;
  margin: 0 0 20px 0;
  padding: 0;
}

/* 主布局：左右分栏，占满视口 */
.main-layout {
  display: flex;
  gap: 20px;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* 左侧面板：可滚动 */
.left-panel {
  flex: 0 0 500px;
  min-width: 500px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px;
  padding-right: 10px;
}

/* 右侧面板：固定，不滚动 */
.right-panel {
  flex: 1;
  min-width: 600px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 20px;
  padding-left: 10px;
}

.chart-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  flex-shrink: 0;
}

.chart-hint {
  font-size: 0.9em;
  color: #909399;
  margin: 0;
}

.chart-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 在小屏幕上垂直堆叠并允许整体滚动 */
@media (max-width: 1200px) {
  .calculator {
    height: auto;
    overflow: auto;
  }

  .main-layout {
    flex-direction: column;
    height: auto;
    overflow: visible;
  }

  .left-panel,
  .right-panel {
    width: 100%;
    overflow: visible;
    height: auto;
  }

  .right-panel {
    min-height: 600px;
  }
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
