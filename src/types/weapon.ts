/**
 * 武器类型定义
 * 统一的武器数据结构，按字母顺序排列
 */

/**
 * 武器基础参数（游戏数据）
 */
export interface WeaponParams {
  armorPenetration: number // 护甲穿透 (0-100)
  burstCount: number // 连发数量
  burstTicks: number // 连发间隔 (ticks)
  cooldown: number // 冷却时间 (秒)
  damage: number // 伤害值
  longAccuracy: number // Long 命中率 (≤40格) (0-100)
  mediumAccuracy: number // Medium 命中率 (≤25格) (0-100)
  range: number // 射程 (格/tiles)
  shortAccuracy: number // Short 命中率 (≤12格) (0-100)
  touchAccuracy: number // Touch 命中率 (≤3格) (0-100)
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
 * 护甲计算中使用的武器参数
 */
export interface WeaponArmorParams {
  armorPenetration?: number // 护甲穿透 (0-1, 可选，默认为0)
  hitChance: number // 武器命中率 (0-1)
  maxDPS: number // 命中率100%、目标无护甲时武器的最大DPS
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
