<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Delete, QuestionFilled } from '@element-plus/icons-vue'
import {
  calculateHitChance,
  calculateMaxDPS,
  getWeaponDataSources,
  getActualArmorPenetration,
  getActualDamage,
  getActualAccuracies,
} from '@/utils/weaponCalculations'
import type { Weapon, WeaponDataSource } from '@/types/weapon'
import { QualityCategory, getQualityOptions } from '@/types/quality'
import DPSChart from './DPSChart.vue'
import DPSSurface3D from './DPSSurface3D.vue'
import SliderInput from './SliderInput.vue'

const { t, locale } = useI18n()

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
  label: '', // 默认为空字符串
  armorPenetration: 15,
  burstCount: 3,
  burstTicks: 8,
  cooldown: 1.0,
  damage: 12,
  accuracyLong: 50,
  accuracyMedium: 70,
  quality: QualityCategory.Masterwork,
  range: 50,
  accuracyShort: 85,
  accuracyTouch: 95,
  warmUp: 1.5,
}

// 状态
const chartMode = ref<'2d' | '3d'>('3d')
const targetDistance = ref(17)
const weaponDataSources = ref<WeaponDataSource[]>([])

let nextWeaponId = 1
const weapons = ref<Weapon[]>([
  createWeapon(t('weapon.defaultName', { n: 1 }), '#409EFF', {
    armorPenetration: 35,
    burstCount: 1,
    burstTicks: 0,
    cooldown: 2.1,
    damage: 15,
    accuracyLong: 85,
    accuracyMedium: 90,
    range: 44.9,
    accuracyShort: 80,
    accuracyTouch: 60,
    warmUp: 2.5,
  }),
  createWeapon(t('weapon.defaultName', { n: 2 }), '#67C23A', {
    armorPenetration: 9,
    burstCount: 3,
    burstTicks: 7,
    cooldown: 0.9,
    damage: 6,
    accuracyLong: 15,
    accuracyMedium: 35,
    range: 19.9,
    accuracyShort: 65,
    accuracyTouch: 90,
    warmUp: 0.5,
  }),
])

// 品质选项
const qualityOptions = getQualityOptions()

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

// 方法
const addWeapon = () => {
  const colorIndex = weapons.value.length % WEAPON_COLORS.length
  const newWeapon = createWeapon(
    t('weapon.defaultName', { n: weapons.value.length + 1 }),
    WEAPON_COLORS[colorIndex]!,
  )
  weapons.value.push(newWeapon)
}

const applyPreset = (weapon: Weapon, dataSourceId: string, weaponIndex: number) => {
  const dataSource = weaponDataSources.value.find((s) => s.id === dataSourceId)
  if (!dataSource) return

  const preset = dataSource.weapons[weaponIndex]
  if (!preset) return

  weapon.selectedDataSourceId = dataSourceId
  weapon.selectedWeaponIndex = weaponIndex
  weapon.name = preset.params.label
  weapon.armorPenetration = preset.params.armorPenetration
  weapon.burstCount = preset.params.burstCount
  weapon.burstTicks = preset.params.burstTicks
  weapon.cooldown = preset.params.cooldown
  weapon.damage = preset.params.damage
  weapon.accuracyLong = preset.params.accuracyLong
  weapon.accuracyMedium = preset.params.accuracyMedium
  weapon.quality = preset.params.quality
  weapon.range = preset.params.range
  weapon.accuracyShort = preset.params.accuracyShort
  weapon.accuracyTouch = preset.params.accuracyTouch
  weapon.warmUp = preset.params.warmUp
}

const removeWeapon = (id: number) => {
  if (weapons.value.length > 1) {
    weapons.value = weapons.value.filter((w) => w.id !== id)
  }
}

// 计算辅助函数
const getWeaponStats = (weapon: Weapon) => {
  const hitChance = calculateHitChance(weapon, targetDistance.value)
  const maxDPS = calculateMaxDPS(weapon)
  const armorPenetration = getActualArmorPenetration(weapon)
  const damage = getActualDamage(weapon)
  const accuracies = getActualAccuracies(weapon)
  return { hitChance, maxDPS, armorPenetration, damage, accuracies }
}

// 生命周期
onMounted(async () => {
  weaponDataSources.value = await getWeaponDataSources()

  const vanillaSource = weaponDataSources.value.find((s) => s.id === 'vanilla')
  if (!vanillaSource) return

  const needleGunIndex = vanillaSource.weapons.findIndex((w) => w.defName === 'Gun_BoltActionRifle')
  if (needleGunIndex >= 0) {
    applyPreset(weapons.value[0]!, vanillaSource.id, needleGunIndex)
  }

  const machinePistolIndex = vanillaSource.weapons.findIndex(
    (w) => w.defName === 'Gun_MachinePistol',
  )
  if (machinePistolIndex >= 0) {
    applyPreset(weapons.value[1]!, vanillaSource.id, machinePistolIndex)
  }
})

// 监听语言变化，重新加载数据
watch(locale, async () => {
  weaponDataSources.value = await getWeaponDataSources()
})
</script>

<template>
  <div class="calculator">
    <el-splitter class="main-layout">
      <!-- 左侧：参数输入 -->
      <el-splitter-panel size="35%" min="20%" max="60%" collapsible class="left-panel">
        <!-- 全局参数：目标距离 -->
        <el-card v-if="chartMode === '2d'" class="global-section">
          <template #header>
            <h3>{{ t('weapon.globalParams') }}</h3>
          </template>
          <el-form label-width="8em">
            <el-form-item :label="t('weapon.targetDistance')">
              <SliderInput
                v-model="targetDistance"
                :min="0"
                :max="100"
                :step="1"
                :unit="t('unit.tile')"
              />
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 武器卡片列表 -->
        <el-card
          v-for="weapon in weapons"
          :key="weapon.id"
          class="weapon-card"
          :style="{ borderLeft: `4px solid ${weapon.color}` }"
        >
          <template #header>
            <div class="weapon-header">
              <div class="weapon-header-top">
                <el-input
                  v-model="weapon.name"
                  :placeholder="t('weapon.namePlaceholder')"
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
                  :placeholder="t('weapon.selectDataSource')"
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
                  :placeholder="t('weapon.selectWeapon')"
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
                    :label="preset.params.label"
                    :value="presetIdx"
                  />
                </el-select>
              </div>
            </div>
          </template>

          <el-form label-width="13em">
            <el-form-item :label="t('quality.label')">
              <el-radio-group v-model="weapon.quality">
                <el-radio-button
                  v-for="option in qualityOptions"
                  :key="option.value"
                  :value="option.value"
                  :style="{ '--quality-color': option.color }"
                  class="quality-button"
                >
                  {{ option.label }}
                </el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-divider content-position="left">
              <el-tooltip effect="dark" placement="top" raw-content>
                <template #content>
                  <div style="max-width: 300px; line-height: 1.5">
                    {{ t('weapon.qualityTooltip') }}
                  </div>
                </template>
                <el-icon style="margin-left: 8px; cursor: help"
                  ><QuestionFilled
                /></el-icon> </el-tooltip
            ></el-divider>

            <el-form-item :label="t('weapon.accuracyTouch')">
              <SliderInput
                v-model="weapon.accuracyTouch"
                :min="0"
                :max="100"
                :step="0.1"
                unit="%"
              />
            </el-form-item>

            <el-form-item :label="t('weapon.accuracyShort')">
              <SliderInput
                v-model="weapon.accuracyShort"
                :min="0"
                :max="100"
                :step="0.1"
                unit="%"
              />
            </el-form-item>

            <el-form-item :label="t('weapon.accuracyMedium')">
              <SliderInput
                v-model="weapon.accuracyMedium"
                :min="0"
                :max="100"
                :step="0.1"
                unit="%"
              />
            </el-form-item>

            <el-form-item :label="t('weapon.accuracyLong')">
              <SliderInput v-model="weapon.accuracyLong" :min="0" :max="100" :step="0.1" unit="%" />
            </el-form-item>

            <el-form-item :label="t('weapon.damage')">
              <SliderInput v-model="weapon.damage" :min="1" :max="100" :step="1" />
            </el-form-item>

            <el-form-item :label="t('weapon.armorPenetration')">
              <SliderInput
                v-model="weapon.armorPenetration"
                :min="0"
                :max="200"
                :step="1"
                :precision="1"
                unit="%"
              />
            </el-form-item>

            <el-form-item :label="t('weapon.warmUp')">
              <SliderInput
                v-model="weapon.warmUp"
                :min="0"
                :max="10"
                :step="0.1"
                :precision="2"
                :unit="t('unit.second')"
              />
            </el-form-item>

            <el-form-item :label="t('weapon.cooldown')">
              <SliderInput
                v-model="weapon.cooldown"
                :min="0"
                :max="10"
                :step="0.1"
                :precision="2"
                :unit="t('unit.second')"
              />
            </el-form-item>

            <el-form-item :label="t('weapon.burstCount')">
              <SliderInput v-model="weapon.burstCount" :min="1" :max="20" :step="1" />
            </el-form-item>

            <el-form-item :label="t('weapon.burstTicks')">
              <SliderInput v-model="weapon.burstTicks" :min="0" :max="60" :step="1" unit="ticks" />
            </el-form-item>

            <el-form-item :label="t('weapon.range')">
              <SliderInput
                v-model="weapon.range"
                :min="0"
                :max="50"
                :step="0.5"
                :precision="1"
                :unit="t('unit.tile')"
              />
            </el-form-item>

            <!-- 实际数值显示（含品质加成） -->
            <el-alert :closable="false" type="success" style="margin-top: 10px">
              <template #title>
                <span class="actual-stats-label">{{ t('weapon.actualStats') }}</span>
              </template>
              <template #default>
                <div class="actual-stats-grid">
                  <div class="stat-row">
                    <span class="stat-label">{{ t('weapon.damage') }}:</span>
                    <span class="stat-value">{{ getWeaponStats(weapon).damage.toFixed(1) }}</span>
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">{{ t('weapon.armorPenetrationShort') }}:</span>
                    <span class="stat-value"
                      >{{ getWeaponStats(weapon).armorPenetration.toFixed(1) }}%</span
                    >
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">{{ t('weapon.accuracyTouch') }}:</span>
                    <span class="stat-value"
                      >{{ getWeaponStats(weapon).accuracies.touch.toFixed(1) }}%</span
                    >
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">{{ t('weapon.accuracyShort') }}:</span>
                    <span class="stat-value"
                      >{{ getWeaponStats(weapon).accuracies.short.toFixed(1) }}%</span
                    >
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">{{ t('weapon.accuracyMedium') }}:</span>
                    <span class="stat-value"
                      >{{ getWeaponStats(weapon).accuracies.medium.toFixed(1) }}%</span
                    >
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">{{ t('weapon.accuracyLong') }}:</span>
                    <span class="stat-value"
                      >{{ getWeaponStats(weapon).accuracies.long.toFixed(1) }}%</span
                    >
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">{{ t('weapon.maxDPS') }}:</span>
                    <span class="stat-value highlight">{{
                      getWeaponStats(weapon).maxDPS.toFixed(2)
                    }}</span>
                  </div>
                </div>
              </template>
            </el-alert>

            <el-alert
              v-if="chartMode === '2d'"
              :title="t('weapon.calculationResult')"
              type="info"
              :closable="false"
              style="margin-top: 10px"
              :description="
                t('weapon.resultSummary2D', {
                  hitChance: (getWeaponStats(weapon).hitChance * 100).toFixed(2),
                })
              "
            />
          </el-form>
        </el-card>

        <!-- 添加武器按钮（最备2个） -->
        <el-button
          v-if="weapons.length < 2"
          type="primary"
          @click="addWeapon"
          style="width: 100%; margin-top: 20px"
        >
          {{ t('weapon.addWeapon') }}
        </el-button>
        <el-alert
          v-else
          type="info"
          :closable="false"
          style="margin-top: 20px"
          :title="t('weapon.maxWeaponsReached')"
          :description="t('weapon.maxWeaponsHint')"
        />
      </el-splitter-panel>
      <!-- 右侧：结果显示 -->
      <el-splitter-panel class="right-panel">
        <div class="chart-controls">
          <el-radio-group v-model="chartMode" size="default">
            <el-radio-button value="2d">{{ t('chart.mode2D') }}</el-radio-button>
            <el-radio-button value="3d">{{ t('chart.mode3D') }}</el-radio-button>
          </el-radio-group>
          <p class="chart-hint">
            <template v-if="chartMode === '2d'">{{ t('chart.hint2D') }}</template>
            <template v-else>{{ t('chart.hint3D') }}</template>
          </p>
        </div>

        <div class="chart-container">
          <DPSChart
            v-if="chartMode === '2d'"
            :weapons="weapons"
            :target-distance="targetDistance"
          />
          <DPSSurface3D v-else :weapons="weapons" />
        </div>
      </el-splitter-panel>
    </el-splitter>
  </div>
</template>

<style scoped>
.calculator {
  display: flex;
  height: 100%;
  overflow: hidden;
}

/* 主布局：使用 splitter */
.main-layout {
  height: 100%;
  width: 100%;
}

/* 左侧面板：可滚动 */
:deep(.left-panel) {
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 20px;
}

/* 右侧面板：固定，不滚动 */
:deep(.right-panel) {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 20px;
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

/* 品质按钮样式 */
.quality-button:deep(.el-radio-button__inner) {
  border-color: var(--quality-color);
  border-width: 2px;
}

.quality-button:deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background-color: var(--quality-color);
  border-color: var(--quality-color);
  border-width: 2px;
  box-shadow: -2px 0 0 0 var(--quality-color);
  color: #000;
  font-weight: 600;
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

  :deep(.left-panel),
  :deep(.right-panel) {
    height: auto;
    overflow: visible;
    width: 100%;
  }

  :deep(.right-panel) {
    min-height: 600px;
  }
}

/* 平板适配 */
@media (max-width: 768px) {
  :deep(.left-panel) {
    padding: 15px;
  }

  :deep(.right-panel) {
    padding: 15px;
    min-height: 500px;
  }

  .weapon-card :deep(.el-form-item) {
    margin-bottom: 12px;
  }

  .weapon-card :deep(.el-form-item__label) {
    width: 8em !important;
    font-size: 0.9em;
  }

  .chart-controls {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .chart-hint {
    font-size: 0.85em;
  }

  /* 品质按钮在平板上换行 */
  .quality-button:deep(.el-radio-button__inner) {
    padding: 8px 12px;
    font-size: 0.85em;
  }

  .actual-stats-grid {
    grid-template-columns: 1fr;
    gap: 6px;
  }
}

/* 手机适配 */
@media (max-width: 480px) {
  :deep(.left-panel) {
    padding: 10px;
  }

  :deep(.right-panel) {
    padding: 10px;
    min-height: 400px;
  }

  .weapon-card {
    margin-bottom: 15px;
  }

  .weapon-card :deep(.el-card__header) {
    padding: 12px;
  }

  .weapon-card :deep(.el-card__body) {
    padding: 12px;
  }

  .weapon-card :deep(.el-form-item) {
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 10px;
  }

  .weapon-card :deep(.el-form-item__label) {
    width: 100% !important;
    text-align: left !important;
    justify-content: flex-start !important;
    padding-bottom: 4px;
    padding-right: 0 !important;
    font-size: 0.85em;
  }

  .weapon-card :deep(.el-form-item__content) {
    width: 100%;
    margin-left: 0 !important;
  }

  .weapon-header-top {
    flex-direction: column;
    align-items: stretch;
  }

  .weapon-name-input {
    width: 100%;
  }

  .weapon-name-input :deep(.el-input__inner) {
    font-size: 1em;
  }

  /* 品质按钮在手机上 */
  .weapon-card :deep(.el-radio-group) {
    flex-wrap: wrap;
  }

  .quality-button:deep(.el-radio-button__inner) {
    padding: 6px 10px;
    font-size: 12px;
  }

  .chart-controls :deep(.el-radio-button__inner) {
    padding: 8px 10px;
    font-size: 12px;
  }

  .stat-label {
    font-size: 0.85em;
  }

  .stat-value {
    font-size: 0.85em;
  }
}

/* 实际数值显示样式 */
.actual-stats-label {
  font-weight: 600;
}

.actual-stats-grid {
  display: grid;
  gap: 8px 16px;
  grid-template-columns: repeat(2, 1fr);
  margin-top: 8px;
}

.stat-row {
  display: flex;
  gap: 8px;
  justify-content: space-between;
}

.stat-label {
  color: #606266;
}

.stat-value {
  color: #409eff;
  font-weight: 500;
}

.stat-value.highlight {
  color: #67c23a;
  font-size: 1.1em;
  font-weight: 600;
}
</style>
