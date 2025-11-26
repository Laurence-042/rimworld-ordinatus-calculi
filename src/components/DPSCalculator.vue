<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import { calculateDPSCurve, calculateDPSDistribution } from '@/utils/armorCalculations'
import {
  calculateHitChance,
  calculateMaxDPS,
  getWeaponDataSources,
} from '@/utils/weaponCalculations'
import type { Weapon, SimplifiedWeaponParams, WeaponDataSource } from '@/types/weapon'
import DPSChart from './DPSChart.vue'
import DPSSurface3D from './DPSSurface3D.vue'
import SliderInput from './SliderInput.vue'

// 常量
const WEAPON_COLORS = [
  '#409EFF',
  '#67C23A',
  '#E6A23C',
  '#F56C6C',
  '#909399',
  '#00D9FF',
  '#FF00FF',
  '#FFD700',
]

const DEFAULT_WEAPON_PARAMS = {
  armorPenetration: 15,
  burstCount: 3,
  burstTicks: 8,
  cooldown: 1.0,
  damage: 12,
  longAccuracy: 50,
  mediumAccuracy: 70,
  range: 50,
  shortAccuracy: 85,
  touchAccuracy: 95,
  warmUp: 1.5,
}

// 状态
const chartMode = ref<'2d' | '3d'>('3d')
const targetDistance = ref(17)
const weaponDataSources = ref<WeaponDataSource[]>([])

let nextWeaponId = 1
const weapons = ref<Weapon[]>([
  createWeapon('武器 1', '#409EFF', {
    armorPenetration: 35,
    burstCount: 1,
    burstTicks: 0,
    cooldown: 2.1,
    damage: 15,
    longAccuracy: 85,
    mediumAccuracy: 90,
    range: 44.9,
    shortAccuracy: 80,
    touchAccuracy: 60,
    warmUp: 2.5,
  }),
  createWeapon('武器 2', '#67C23A', {
    armorPenetration: 9,
    burstCount: 3,
    burstTicks: 7,
    cooldown: 0.9,
    damage: 6,
    longAccuracy: 15,
    mediumAccuracy: 35,
    range: 19.9,
    shortAccuracy: 65,
    touchAccuracy: 90,
    warmUp: 0.5,
  }),
])

// 辅助函数
function createWeapon(name: string, color: string, params?: Partial<Weapon>): Weapon {
  return {
    ...DEFAULT_WEAPON_PARAMS,
    ...params,
    color,
    id: nextWeaponId++,
    name,
    selectedDataSourceId: null,
    selectedWeaponIndex: null,
  }
}

function toArmorCalculationParams(weapon: Weapon): SimplifiedWeaponParams {
  const hitChance = calculateHitChance(weapon, targetDistance.value)
  const maxDPS = calculateMaxDPS(weapon)
  return {
    armorPenetration: weapon.armorPenetration / 100, // 转换为 0-1 范围
    hitChance,
    maxDPS,
  }
}

// 方法
const addWeapon = () => {
  const colorIndex = weapons.value.length % WEAPON_COLORS.length
  const newWeapon = createWeapon(`武器 ${weapons.value.length + 1}`, WEAPON_COLORS[colorIndex]!)
  weapons.value.push(newWeapon)
}

const applyPreset = (weapon: Weapon, dataSourceId: string, weaponIndex: number) => {
  const dataSource = weaponDataSources.value.find((s) => s.id === dataSourceId)
  if (!dataSource) return

  const preset = dataSource.weapons[weaponIndex]
  if (!preset) return

  weapon.selectedDataSourceId = dataSourceId
  weapon.selectedWeaponIndex = weaponIndex
  weapon.name = preset.name
  weapon.armorPenetration = preset.params.armorPenetration
  weapon.burstCount = preset.params.burstCount
  weapon.burstTicks = preset.params.burstTicks
  weapon.cooldown = preset.params.cooldown
  weapon.damage = preset.params.damage
  weapon.longAccuracy = preset.params.longAccuracy
  weapon.mediumAccuracy = preset.params.mediumAccuracy
  weapon.range = preset.params.range
  weapon.shortAccuracy = preset.params.shortAccuracy
  weapon.touchAccuracy = preset.params.touchAccuracy
  weapon.warmUp = preset.params.warmUp
}

const removeWeapon = (id: number) => {
  if (weapons.value.length > 1) {
    weapons.value = weapons.value.filter((w) => w.id !== id)
  }
}

// 计算属性
const allWeaponsData = computed(() => {
  return weapons.value.map((weapon) => {
    const armorParams = toArmorCalculationParams(weapon)
    const dpsCurve = calculateDPSCurve(armorParams)
    const distributions = dpsCurve.armorValues.map((armor) =>
      calculateDPSDistribution(armorParams, armor / 100),
    )

    return {
      distributions,
      dpsCurve,
      hitChance: armorParams.hitChance,
      maxDPS: armorParams.maxDPS,
      weapon,
    }
  })
})

// 生命周期
onMounted(async () => {
  weaponDataSources.value = await getWeaponDataSources()

  const vanillaSource = weaponDataSources.value.find((s) => s.id === 'vanilla')
  if (!vanillaSource) return

  const needleGunIndex = vanillaSource.weapons.findIndex((w) => w.name === '栓动步枪')
  if (needleGunIndex >= 0) {
    applyPreset(weapons.value[0]!, vanillaSource.id, needleGunIndex)
  }

  const machinePistolIndex = vanillaSource.weapons.findIndex((w) => w.name === '冲锋手枪')
  if (machinePistolIndex >= 0) {
    applyPreset(weapons.value[1]!, vanillaSource.id, machinePistolIndex)
  }
})
</script>

<template>
  <div class="calculator">
    <div class="main-layout">
      <!-- 左侧：参数输入 -->
      <div class="left-panel">
        <!-- 全局参数：目标距离 -->
        <el-card v-if="chartMode === '2d'" class="global-section">
          <template #header>
            <h3>全局参数</h3>
          </template>
          <el-form label-width="8em">
            <el-form-item label="目标距离">
              <SliderInput v-model="targetDistance" :min="0" :max="100" :step="1" unit="格" />
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
                  :icon="Delete"
                  circle
                  @click="removeWeapon(weapon.id)"
                />
              </div>
              <div class="weapon-preset">
                <el-select
                  v-model="weapon.selectedDataSourceId"
                  placeholder="选择数据源"
                  style="width: 100%; margin-bottom: 10px"
                  clearable
                  filterable
                  @change="weapon.selectedWeaponIndex = null"
                >
                  <el-option
                    v-for="source in weaponDataSources"
                    :key="source.id"
                    :label="source.label"
                    :value="source.id"
                  />
                </el-select>
                <el-select
                  v-model="weapon.selectedWeaponIndex"
                  placeholder="选择武器"
                  style="width: 100%"
                  clearable
                  filterable
                  :disabled="!weapon.selectedDataSourceId"
                  @change="
                    weapon.selectedDataSourceId &&
                    weapon.selectedWeaponIndex !== null &&
                    applyPreset(weapon, weapon.selectedDataSourceId, weapon.selectedWeaponIndex)
                  "
                >
                  <el-option
                    v-for="(preset, presetIdx) in weaponDataSources.find(
                      (s) => s.id === weapon.selectedDataSourceId,
                    )?.weapons || []"
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
              <SliderInput v-model="weapon.touchAccuracy" :min="0" :max="100" :step="1" unit="%" />
            </el-form-item>

            <el-form-item label="近 (≤12格)">
              <SliderInput v-model="weapon.shortAccuracy" :min="0" :max="100" :step="1" unit="%" />
            </el-form-item>

            <el-form-item label="中 (≤25格)">
              <SliderInput v-model="weapon.mediumAccuracy" :min="0" :max="100" :step="1" unit="%" />
            </el-form-item>

            <el-form-item label="远 (≤40格)">
              <SliderInput v-model="weapon.longAccuracy" :min="0" :max="100" :step="1" unit="%" />
            </el-form-item>

            <!-- 武器属性 -->
            <el-divider content-position="left">武器属性</el-divider>

            <el-form-item label="伤害">
              <SliderInput v-model="weapon.damage" :min="1" :max="200" :step="1" />
            </el-form-item>

            <el-form-item label="预热时间 (Warm-Up)">
              <SliderInput
                v-model="weapon.warmUp"
                :min="0"
                :max="10"
                :step="0.1"
                :precision="2"
                unit="秒"
              />
            </el-form-item>

            <el-form-item label="冷却时间 (Cooldown)">
              <SliderInput
                v-model="weapon.cooldown"
                :min="0"
                :max="10"
                :step="0.1"
                :precision="2"
                unit="秒"
              />
            </el-form-item>

            <el-form-item label="连发数量 (Burst Count)">
              <SliderInput v-model="weapon.burstCount" :min="1" :max="20" :step="1" />
            </el-form-item>

            <el-form-item label="连发间隔 (Burst Ticks)">
              <SliderInput v-model="weapon.burstTicks" :min="0" :max="60" :step="1" unit="ticks" />
            </el-form-item>

            <el-form-item label="射程 (Range)">
              <SliderInput
                v-model="weapon.range"
                :min="0"
                :max="50"
                :step="0.5"
                :precision="1"
                unit="格"
              />
            </el-form-item>

            <!-- 护甲穿透 -->
            <el-divider content-position="left">护甲穿透</el-divider>
            <el-form-item label="护甲穿透 (AP)">
              <SliderInput
                v-model="weapon.armorPenetration"
                :min="0"
                :max="100"
                :step="1"
                unit="%"
              />
            </el-form-item>

            <el-alert
              v-if="chartMode === '2d'"
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
  height: 100%;
  overflow: hidden;
}

/* 主布局：左右分栏，占满视口 */
.main-layout {
  display: flex;
  gap: 20px;
  height: 100%;
  overflow: hidden;
  width: 100%;
}

/* 左侧面板：可滚动 */
.left-panel {
  flex: 0 0 500px;
  min-width: 500px;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 20px 10px 20px 20px;
}

/* 右侧面板：固定，不滚动 */
.right-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 600px;
  overflow: hidden;
  padding: 20px 20px 20px 10px;
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
  align-items: center;
  display: flex;
  gap: 10px;
}

.weapon-name-input {
  flex: 1;
}

.weapon-name-input :deep(.el-input__inner) {
  color: var(--weapon-color);
  font-size: 1.1em;
  font-weight: 600;
}

.weapon-preset {
  width: 100%;
}

.chart-controls {
  align-items: center;
  display: flex;
  flex-shrink: 0;
  justify-content: space-between;
  margin-bottom: 15px;
}

.chart-hint {
  color: #909399;
  font-size: 0.9em;
  margin: 0;
}

.chart-container {
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
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
    height: auto;
    overflow: visible;
    width: 100%;
  }

  .right-panel {
    min-height: 600px;
  }
}
</style>
