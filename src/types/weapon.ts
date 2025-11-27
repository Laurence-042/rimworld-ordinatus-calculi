/**
 * 武器类型定义
 * 统一的武器数据结构，按字母顺序排列
 */

import { QualityCategory } from './quality'

/**
 * 武器基础参数（游戏数据）
 */
export interface WeaponParams {
  armorPenetration: number // 护甲穿透 (0-200，对应0%-200%)
  burstCount: number // 连发数量
  burstTicks: number // 连发间隔 (ticks)
  cooldown: number // 冷却时间 (秒)
  damage: number // 伤害值
  accuracyLong: number // Long 命中率 (≤40格) (0-100)
  accuracyMedium: number // Medium 命中率 (≤25格) (0-100)
  quality: QualityCategory // 品质等级
  range: number // 射程 (格/tiles)
  accuracyShort: number // Short 命中率 (≤12格) (0-100)
  accuracyTouch: number // Touch 命中率 (≤3格) (0-100)
  warmUp: number // 预热时间 (秒)
}

/**
 * UI 中的武器对象（包含额外的 UI 状态）
 */
export interface Weapon extends WeaponParams {
  color: string
  id: number
  name: string
  selectedDataSourceId: string | null
  selectedWeaponIndex: number | null
}

/**
 * 武器预设数据（来自 CSV）
 */
export interface WeaponPreset {
  name: string
  params: WeaponParams
}

/**
 * 武器数据源分组
 */
export interface WeaponDataSource {
  id: string // 数据源ID，如 'vanilla', 'mod1'
  label: string // 显示名称，如 'Vanilla', 'Mod 1'
  weapons: WeaponPreset[]
}

/**
 * 简化的武器参数
 *
 * 用于护甲计算和DPS分析的抽象武器参数，只包含影响最终伤害的关键属性。
 * 相比完整的 WeaponParams，它已经将复杂的武器属性（如预热时间、连发间隔等）
 * 转换为了计算结果（命中率、最大DPS）。
 */
export interface SimplifiedWeaponParams {
  armorPenetration?: number // 护甲穿透 (0-2, 可选，默认为0)
  hitChance: number // 武器命中率 (0-1)，已根据距离计算
  maxDPS: number // 最大DPS (100%命中、无护甲时)，已根据武器属性计算
}

/**
 * 带计算结果的武器数据
 */
export interface WeaponWithCalculations {
  distributions: DPSDistribution[]
  dpsCurve: DPSCurve
  hitChance: number
  maxDPS: number
  weapon: Weapon
}

/**
 * DPS 曲线数据
 */
export interface DPSCurve {
  armorValues: number[]
  dpsValues: number[]
}

/**
 * DPS 分布概率
 */
export interface DPSDistribution {
  expectedDPS: number
  fullDamageProb: number
  fullDPS: number
  halfDamageProb: number
  halfDPS: number
  missProb: number
  zeroDamageProb: number
  zeroDPS: number
}
