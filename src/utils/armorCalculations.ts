import type { WeaponArmorParams } from '@/types/weapon'
import type { ArmorLayer, AttackParams, DamageResult } from '@/types/armor'

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

/**
 * 计算多层护甲的伤害期望
 * 遵循RimWorld的多层护甲机制：
 * - 伤害从最外层向内逐层计算
 * - 每层独立计算伤害减免
 * - 如果利器伤害被减半，伤害类型变为钝器，但后续层仍使用利器护甲值计算
 *
 * @param armorLayers - 护甲层数组（应按从外到内的顺序排列）
 * @param attackParams - 攻击参数
 * @returns 伤害计算结果
 */
export function calculateMultiLayerDamage(
  armorLayers: ArmorLayer[],
  attackParams: AttackParams,
): DamageResult {
  const { armorPenetration, damagePerShot, damageType } = attackParams

  let currentDamage = damagePerShot
  let currentDamageType = damageType
  const layerDetails: DamageResult['layerDetails'] = []

  // 概率追踪：[noDeflect, halfDeflect, fullDamage] 的概率
  let probabilities = [0, 0, 0, 1] // 初始状态：100%概率造成全伤害

  for (const layer of armorLayers) {
    // 根据当前伤害类型选择护甲值
    let armorValue: number
    if (currentDamageType === 'blunt') {
      armorValue = layer.armorBlunt
    } else if (currentDamageType === 'sharp') {
      armorValue = layer.armorSharp
    } else {
      armorValue = layer.armorHeat
    }

    // 如果护甲值为0，伤害直接穿过
    if (armorValue === 0) {
      layerDetails.push({
        layerName: layer.itemName,
        effectiveArmor: 0,
        damageAfterLayer: currentDamage,
      })
      continue
    }

    // 计算有效护甲值（减去护甲穿透）
    const effectiveArmor = Math.max(0, armorValue - armorPenetration) * 100
    const clampedArmor = Math.max(0, Math.min(100, effectiveArmor))

    const halfArmor = clampedArmor / 2

    // 计算本层的三种结果概率
    const layerNoDeflect = halfArmor / 100
    const layerHalfDeflect = (clampedArmor - halfArmor) / 100
    const layerFullDamage = (100 - clampedArmor) / 100

    // 更新总概率分布
    // 新的概率分布需要考虑之前的状态
    const newProbs = [0, 0, 0, 0]

    // 如果之前的伤害被完全抵挡（probabilities[0]），这层不影响
    newProbs[0] = probabilities[0]!

    // 如果之前的伤害被减半（probabilities[1]），本层继续计算
    newProbs[0] += probabilities[1]! * layerNoDeflect
    newProbs[1] = probabilities[1]! * layerHalfDeflect
    // 注意：如果利器伤害在上一层被减半，它会变成钝器伤害
    // 但本层仍然使用利器护甲值进行计算
    if (currentDamageType === 'sharp' && probabilities[1]! > 0) {
      // 伤害类型改变只影响下一层
      // 这里我们简化处理，因为已经选择了正确的护甲值
    }

    // 如果之前是全伤害（probabilities[3]），本层正常计算
    newProbs[0] += probabilities[3]! * layerNoDeflect
    newProbs[1] = (newProbs[1] || 0) + probabilities[3]! * layerHalfDeflect
    newProbs[3] = probabilities[3]! * layerFullDamage

    probabilities = newProbs

    // 更新当前伤害
    if (probabilities[1]! > 0) {
      currentDamage = currentDamage * 0.5
      // 如果利器伤害被减半，变为钝器
      if (currentDamageType === 'sharp') {
        currentDamageType = 'blunt'
      }
    }

    layerDetails.push({
      layerName: layer.itemName,
      effectiveArmor: clampedArmor,
      damageAfterLayer: currentDamage,
    })

    // 如果伤害已经被完全抵挡，提前退出
    if (currentDamage === 0) {
      break
    }
  }

  // 计算期望伤害
  const expectedDamage =
    probabilities[0]! * 0 + // 无伤害
    probabilities[1]! * (damagePerShot * 0.5) + // 减半伤害
    probabilities[3]! * damagePerShot // 全伤害

  return {
    noDeflectProb: probabilities[0]!,
    halfDeflectProb: probabilities[1]!,
    fullDamageProb: probabilities[3]!,
    expectedDamage,
    layerDetails,
  }
}

/**
 * 计算护甲套装在不同攻击参数下的受伤期望曲线
 * 用于绘制3D曲面或2D曲线
 *
 * @param armorLayers - 护甲层数组
 * @param damageType - 伤害类型
 * @returns 期望受伤曲线数据
 */
export function calculateArmorDamageCurve(
  armorLayers: ArmorLayer[],
  damageType: 'blunt' | 'sharp' | 'heat',
): {
  penetrationValues: number[] // 护甲穿透值数组 (0%-100%)
  damageValues: number[] // 单发伤害数组 (1-50)
  expectedDamageGrid: number[][] // 期望受伤二维数组 [penetration][damage]
} {
  const penetrationValues: number[] = []
  const damageValues: number[] = []
  const expectedDamageGrid: number[][] = []

  // 护甲穿透从0%到100%
  for (let pen = 0; pen <= 100; pen += 5) {
    penetrationValues.push(pen)
    const damageRow: number[] = []

    // 单发伤害从1到50
    for (let dmg = 1; dmg <= 50; dmg += 1) {
      if (pen === 0) {
        damageValues.push(dmg)
      }

      const attackParams: AttackParams = {
        armorPenetration: pen / 100,
        damagePerShot: dmg,
        damageType,
      }

      const result = calculateMultiLayerDamage(armorLayers, attackParams)
      damageRow.push(result.expectedDamage)
    }

    expectedDamageGrid.push(damageRow)
  }

  return {
    penetrationValues,
    damageValues,
    expectedDamageGrid,
  }
}
