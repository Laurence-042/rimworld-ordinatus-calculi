import type { WeaponArmorParams } from '@/types/weapon'

/**
 * RimWorld 护甲计算工具
 *
 * RimWorld 护甲机制：
 * 1. 受到伤害时，护甲值首先会减去攻击武器的护甲穿透值
 * 2. 剩余护甲值与0到100之间的随机数进行比较
 * 3. 如果随机数 < 剩余护甲值的一半，则伤害无效（0%伤害）
 * 4. 如果随机数 >= 剩余护甲值的一半 且 < 剩余护甲值，则伤害减半（50%伤害）
 * 5. 如果随机数 >= 剩余护甲值，则护甲无效（100%伤害）
 */

// 向后兼容的类型别名
export type WeaponParams = WeaponArmorParams

/**
 * 计算结果接口
 */
export interface DPSCalculationResult {
  /** DPS期望值数组，索引0-200对应护甲值0%-200% */
  dpsValues: number[]
  /** 护甲值数组，便于绘图 */
  armorValues: number[]
}

/**
 * 计算在特定护甲值下，单次攻击的期望伤害倍率
 *
 * @param effectiveArmor - 有效护甲值 (0-100)
 * @returns 期望伤害倍率 (0-1)
 */
function calculateDamageMultiplier(effectiveArmor: number): number {
  // 确保护甲值在有效范围内
  effectiveArmor = Math.max(0, Math.min(100, effectiveArmor))

  const halfArmor = effectiveArmor / 2

  // 计算三种情况的概率和伤害
  // 情况1: 随机数 < 护甲值的一半 -> 0%伤害
  const noDeflectChance = halfArmor / 100
  const noDeflectDamage = 0

  // 情况2: 护甲值的一半 <= 随机数 < 护甲值 -> 50%伤害
  const halfDeflectChance = (effectiveArmor - halfArmor) / 100
  const halfDeflectDamage = 0.5

  // 情况3: 随机数 >= 护甲值 -> 100%伤害
  const fullDamageChance = (100 - effectiveArmor) / 100
  const fullDamage = 1.0

  // 计算期望伤害倍率
  const expectedMultiplier =
    noDeflectChance * noDeflectDamage +
    halfDeflectChance * halfDeflectDamage +
    fullDamageChance * fullDamage

  return expectedMultiplier
}

/**
 * 计算武器在不同护甲值下的DPS期望曲线
 *
 * @param params - 武器参数
 * @returns DPS计算结果，包含201个元素的数组（护甲值0%-200%）
 */
export function calculateDPSCurve(params: WeaponParams): DPSCalculationResult {
  const { hitChance, maxDPS, armorPenetration = 0 } = params

  // 验证输入参数
  if (hitChance < 0 || hitChance > 1) {
    throw new Error('命中率必须在0到1之间')
  }
  if (maxDPS < 0) {
    throw new Error('最大DPS不能为负数')
  }
  if (armorPenetration < 0 || armorPenetration > 1) {
    throw new Error('护甲穿透值必须在0到1之间')
  }

  const dpsValues: number[] = []
  const armorValues: number[] = []

  // 计算护甲值从0%到200%的DPS期望
  for (let armorPercent = 0; armorPercent <= 200; armorPercent++) {
    // 护甲值（百分比形式）
    const armor = armorPercent / 100

    // 计算有效护甲值（减去武器的护甲穿透）
    const effectiveArmor = Math.max(0, armor - armorPenetration) * 100

    // 计算伤害倍率
    const damageMultiplier = calculateDamageMultiplier(effectiveArmor)

    // 计算期望DPS = 基础DPS × 命中率 × 伤害倍率
    const expectedDPS = maxDPS * hitChance * damageMultiplier

    dpsValues.push(expectedDPS)
    armorValues.push(armorPercent)
  }

  return {
    dpsValues,
    armorValues,
  }
}

/**
 * 计算在特定护甲值下的DPS分布概率
 *
 * @param params - 武器参数
 * @param targetArmor - 目标护甲值 (0-2, 对应0%-200%)
 * @returns DPS分布概率对象
 */
export interface DPSDistribution {
  /** 0伤害的概率 */
  zeroDamageProb: number
  /** 50%伤害的概率 */
  halfDamageProb: number
  /** 100%伤害的概率 */
  fullDamageProb: number
  /** 未命中的概率 */
  missProb: number
  /** 对应的DPS值 */
  zeroDPS: number
  halfDPS: number
  fullDPS: number
  /** 期望DPS */
  expectedDPS: number
}

/**
 * 计算给定护甲值时的DPS分布概率
 *
 * @param params - 武器参数
 * @param targetArmor - 目标护甲值 (0-2)
 * @returns DPS分布详情
 */
export function calculateDPSDistribution(
  params: WeaponParams,
  targetArmor: number,
): DPSDistribution {
  const { hitChance, maxDPS, armorPenetration = 0 } = params

  // 计算有效护甲值
  const effectiveArmor = Math.max(0, targetArmor - armorPenetration) * 100
  const clampedArmor = Math.max(0, Math.min(100, effectiveArmor))

  const halfArmor = clampedArmor / 2

  // 在命中的情况下，计算三种伤害结果的概率
  const zeroDamageProb = halfArmor / 100
  const halfDamageProb = (clampedArmor - halfArmor) / 100
  const fullDamageProb = (100 - clampedArmor) / 100

  // 计算对应的DPS值
  const zeroDPS = 0
  const halfDPS = maxDPS * 0.5
  const fullDPS = maxDPS

  // 计算期望DPS（考虑命中率）
  const expectedDPS = maxDPS * hitChance * calculateDamageMultiplier(clampedArmor)

  return {
    zeroDamageProb: zeroDamageProb * hitChance,
    halfDamageProb: halfDamageProb * hitChance,
    fullDamageProb: fullDamageProb * hitChance,
    missProb: 1 - hitChance,
    zeroDPS,
    halfDPS,
    fullDPS,
    expectedDPS,
  }
}
