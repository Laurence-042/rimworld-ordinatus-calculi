<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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

// 武器接口定义
interface Weapon {
  id: number
  name: string
  selectedPresetIndex: number | null
  accuracyParams: {
    touchAccuracy: number
    shortAccuracy: number
    mediumAccuracy: number
    longAccuracy: number
  }
  weaponParams: {
    damage: number
    warmUp: number
    cooldown: number
    burstCount: number
    burstTicks: number
    range: number
  }
  armorPenetration: number
  color: string
}

// 图表模式：2D曲线 或 3D曲面
const chartMode = ref<'2d' | '3d'>('3d')

// 目标距离（全局共享）
const targetDistance = ref(25) // 目标距离（格）

// 武器列表
let nextWeaponId = 1
const weapons = ref<Weapon[]>([
  {
    id: nextWeaponId++,
    name: '武器 1',
    selectedPresetIndex: null,
    accuracyParams: {
      touchAccuracy: 60,
      shortAccuracy: 80,
      mediumAccuracy: 90,
      longAccuracy: 85,
    },
    weaponParams: {
      damage: 15,
      warmUp: 2.5,
      cooldown: 2.1,
      burstCount: 1,
      burstTicks: 0,
      range: 44.9,
    },
    armorPenetration: 35,
    color: '#409EFF',
  },
  {
    id: nextWeaponId++,
    name: '武器 2',
    selectedPresetIndex: null,
    accuracyParams: {
      touchAccuracy: 90,
      shortAccuracy: 65,
      mediumAccuracy: 35,
      longAccuracy: 15,
    },
    weaponParams: {
      damage: 6,
      warmUp: 0.5,
      cooldown: 0.9,
      burstCount: 3,
      burstTicks: 7,
      range: 19.9,
    },
    armorPenetration: 9,
    color: '#67C23A',
  },
])

// 预定义颜色列表
const weaponColors = [
  '#409EFF',
  '#67C23A',
  '#E6A23C',
  '#F56C6C',
  '#909399',
  '#00D9FF',
  '#FF00FF',
  '#FFD700',
]

// 添加武器
const addWeapon = () => {
  const newWeapon: Weapon = {
    id: nextWeaponId++,
    name: `武器 ${weapons.value.length + 1}`,
    selectedPresetIndex: null,
    accuracyParams: {
      touchAccuracy: 95,
      shortAccuracy: 85,
      mediumAccuracy: 70,
      longAccuracy: 50,
    },
    weaponParams: {
      damage: 12,
      warmUp: 1.5,
      cooldown: 1.0,
      burstCount: 3,
      burstTicks: 8,
      range: 50,
    },
    armorPenetration: 15,
    color: weaponColors[weapons.value.length % weaponColors.length] || '#409EFF',
  }
  weapons.value.push(newWeapon)
}

// 移除武器
const removeWeapon = (id: number) => {
  if (weapons.value.length > 1) {
    weapons.value = weapons.value.filter((w) => w.id !== id)
  }
}

// 应用武器预设
const applyPreset = (weapon: Weapon, presetIndex: number) => {
  weapon.selectedPresetIndex = presetIndex
  const preset = weaponPresets[presetIndex]

  if (!preset) return

  // 更新武器名称
  weapon.name = preset.name

  // 更新命中率参数
  weapon.accuracyParams = {
    touchAccuracy: preset.params.touchAccuracy,
    shortAccuracy: preset.params.shortAccuracy,
    mediumAccuracy: preset.params.mediumAccuracy,
    longAccuracy: preset.params.longAccuracy,
  }
  // 更新武器属性
  weapon.weaponParams = {
    damage: preset.params.damage,
    warmUp: preset.params.warmUp,
    cooldown: preset.params.cooldown,
    burstCount: preset.params.burstCount,
    burstTicks: preset.params.burstTicks,
    range: preset.params.range,
  }
  weapon.armorPenetration = preset.params.armorPenetration
}

// 为每个武器计算命中率和最大DPS
const calculateWeaponStats = (weapon: Weapon) => {
  const detailParams: WeaponDetailParams = {
    ...weapon.accuracyParams,
    ...weapon.weaponParams,
    armorPenetration: weapon.armorPenetration,
  }
  const hitChance = calculateHitChance(detailParams, targetDistance.value)
  const maxDPS = calculateMaxDPS(detailParams)
  return { hitChance, maxDPS }
}

// 计算所有武器的DPS曲线数据
const allWeaponsData = computed(() => {
  return weapons.value.map((weapon) => {
    const { hitChance, maxDPS } = calculateWeaponStats(weapon)
    const params: WeaponParams = {
      hitChance,
      maxDPS,
      armorPenetration: weapon.armorPenetration / 100,
    }
    const dpsCurve = calculateDPSCurve(params)
    const distributions = dpsCurve.armorValues.map((armor) =>
      calculateDPSDistribution(params, armor / 100),
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

// 初始化：应用默认预设
onMounted(() => {
  if (weaponPresets.length > 0) {
    // 栓动步枪 - 高穿甲，长射程
    const needleGunIndex = weaponPresets.findIndex((p) => p.name === '栓动步枪')
    if (needleGunIndex >= 0) {
      applyPreset(weapons.value[0]!, needleGunIndex)
    }
    // 冲锋手枪 - 低穿甲，短射程，连射
    const machinePistolIndex = weaponPresets.findIndex((p) => p.name === '冲锋手枪')
    if (machinePistolIndex >= 0) {
      applyPreset(weapons.value[1]!, machinePistolIndex)
    }
  }
})
</script>

<template>
  <div class="calculator">
    <div class="main-layout">
      <!-- 左侧：参数输入 -->
      <div class="left-panel">
        <h2 class="main-title">RimWorld DPS 计算器</h2>

        <!-- 全局参数：目标距离 -->
        <el-card class="global-section">
          <template #header>
            <h3>全局参数</h3>
          </template>
          <el-form label-width="8em">
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
          </el-form>
        </el-card>

        <!-- 武器卡片列表 -->
        <el-card
          v-for="(weapon, index) in weapons"
          :key="weapon.id"
          class="weapon-card"
          :style="{ borderLeft: `4px solid ${weapon.color}` }"
        >
          <template #header>
            <div class="weapon-header">
              <div class="weapon-header-top">
                <el-input
                  v-model="weapon.name"
                  placeholder="武器名称"
                  class="weapon-name-input"
                  :style="{ '--weapon-color': weapon.color }"
                />
                <el-button
                  v-if="weapons.length > 1"
                  type="danger"
                  size="small"
                  :icon="'Delete'"
                  circle
                  @click="removeWeapon(weapon.id)"
                />
              </div>
              <div class="weapon-preset">
                <el-select
                  v-model="weapon.selectedPresetIndex"
                  placeholder="选择武器预设"
                  @change="applyPreset(weapon, weapon.selectedPresetIndex!)"
                  style="width: 100%"
                  clearable
                >
                  <el-option
                    v-for="(preset, presetIdx) in weaponPresets"
                    :key="presetIdx"
                    :label="preset.name"
                    :value="presetIdx"
                  />
                </el-select>
              </div>
            </div>
          </template>

          <el-form label-width="13em">
            <!-- 命中率参数 -->
            <el-divider content-position="left">命中率参数</el-divider>

            <el-form-item label="贴近 (≤3格)">
              <div class="slider-input-group">
                <el-slider
                  v-model="weapon.accuracyParams.touchAccuracy"
                  :min="0"
                  :max="100"
                  :step="1"
                />
                <el-input-number
                  v-model="weapon.accuracyParams.touchAccuracy"
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
                <el-slider
                  v-model="weapon.accuracyParams.shortAccuracy"
                  :min="0"
                  :max="100"
                  :step="1"
                />
                <el-input-number
                  v-model="weapon.accuracyParams.shortAccuracy"
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
                <el-slider
                  v-model="weapon.accuracyParams.mediumAccuracy"
                  :min="0"
                  :max="100"
                  :step="1"
                />
                <el-input-number
                  v-model="weapon.accuracyParams.mediumAccuracy"
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
                <el-slider
                  v-model="weapon.accuracyParams.longAccuracy"
                  :min="0"
                  :max="100"
                  :step="1"
                />
                <el-input-number
                  v-model="weapon.accuracyParams.longAccuracy"
                  :min="0"
                  :max="100"
                  :step="1"
                  controls-position="right"
                  class="input-number-fixed"
                />
                <span class="unit">%</span>
              </div>
            </el-form-item>

            <!-- 武器属性 -->
            <el-divider content-position="left">武器属性</el-divider>

            <el-form-item label="伤害">
              <div class="slider-input-group">
                <el-slider v-model="weapon.weaponParams.damage" :min="1" :max="50" :step="1" />
                <el-input-number
                  v-model="weapon.weaponParams.damage"
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
                <el-slider v-model="weapon.weaponParams.warmUp" :min="0" :max="5" :step="0.1" />
                <el-input-number
                  v-model="weapon.weaponParams.warmUp"
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
                <el-slider v-model="weapon.weaponParams.cooldown" :min="0" :max="5" :step="0.1" />
                <el-input-number
                  v-model="weapon.weaponParams.cooldown"
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
                <el-slider v-model="weapon.weaponParams.burstCount" :min="1" :max="10" :step="1" />
                <el-input-number
                  v-model="weapon.weaponParams.burstCount"
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
                <el-slider v-model="weapon.weaponParams.burstTicks" :min="0" :max="30" :step="1" />
                <el-input-number
                  v-model="weapon.weaponParams.burstTicks"
                  :min="0"
                  :max="60"
                  :step="1"
                  controls-position="right"
                  class="input-number-fixed"
                />
                <span class="unit">ticks</span>
              </div>
            </el-form-item>

            <el-form-item label="射程 (Range)">
              <div class="slider-input-group">
                <el-slider v-model="weapon.weaponParams.range" :min="0" :max="50" :step="0.5" />
                <el-input-number
                  v-model="weapon.weaponParams.range"
                  :min="0"
                  :max="50"
                  :step="1"
                  controls-position="right"
                  class="input-number-fixed"
                />
                <span class="unit">格</span>
              </div>
            </el-form-item>

            <!-- 护甲穿透 -->
            <el-divider content-position="left">护甲穿透</el-divider>
            <el-form-item label="护甲穿透 (AP)">
              <div class="slider-input-group">
                <el-slider v-model="weapon.armorPenetration" :min="0" :max="100" :step="1" />
                <el-input-number
                  v-model="weapon.armorPenetration"
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
              :description="`命中率: ${((allWeaponsData[index]?.hitChance ?? 0) * 100).toFixed(2)}% | 最大DPS: ${(allWeaponsData[index]?.maxDPS ?? 0).toFixed(2)} | 护甲穿透: ${weapon.armorPenetration.toFixed(0)}%`"
            />
          </el-form>
        </el-card>

        <!-- 添加武器按钮 -->
        <el-button type="primary" @click="addWeapon" style="width: 100%; margin-top: 20px">
          + 添加武器进行对比
        </el-button>
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
          <DPSChart v-if="chartMode === '2d'" :weapons-data="allWeaponsData" />
          <DPSSurface3D v-else :weapons-data="allWeaponsData" />
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

/* 全局参数卡片 */
.global-section {
  margin-bottom: 20px;
}

/* 武器卡片 */
.weapon-card {
  margin-bottom: 20px;
}

.weapon-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.weapon-header-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.weapon-name-input {
  flex: 1;
}

.weapon-name-input :deep(.el-input__inner) {
  font-weight: 600;
  font-size: 1.1em;
  color: var(--weapon-color);
}

.weapon-preset {
  width: 100%;
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
