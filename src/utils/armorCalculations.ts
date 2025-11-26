import type { WeaponArmorParams } from '@/types/weapon'
import type { ArmorLayer, AttackParams, DamageResult, DamageState } from '@/types/armor'
import { ApparelLayer } from '@/types/armor'

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

/**
 * 获取护甲层的最高层级
 * 如果一件衣物有多个层级，返回最外层（数值最大的层级）
 */
function getOutermostLayer(layer: ArmorLayer): ApparelLayer {
  if (!layer.apparelLayers || layer.apparelLayers.length === 0) {
    // 如果没有明确的层级信息，默认为外套层
    return ApparelLayer.Shell
  }
  // 返回最外层（数值最大）
  return Math.max(...layer.apparelLayers)
}

/**
 * 对护甲层进行排序：从外层到内层
 * RimWorld的伤害计算顺序是从最外层开始，逐层向内计算
 */
export function sortArmorLayersOuterToInner(layers: ArmorLayer[]): ArmorLayer[] {
  return [...layers].sort((a, b) => {
    const layerA = getOutermostLayer(a)
    const layerB = getOutermostLayer(b)
    // 降序排序：外层（数值大）在前
    return layerB - layerA
  })
}

/**
 * 过滤只覆盖指定身体部位的护甲层
 * @param layers - 护甲层数组
 * @param bodyPart - 身体部位
 * @returns 过滤后的护甲层数组
 */
export function filterArmorLayersByBodyPart(layers: ArmorLayer[], bodyPart: string): ArmorLayer[] {
  return layers.filter((layer) => layer.bodyPartCoverage.includes(bodyPart))
}

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
 * 完全遵循RimWorld的多层护甲机制：
 *
 * 关键规则：
 * 1. 伤害从最外层向内逐层计算
 * 2. 每层独立进行随机判定（0-100随机数 vs 有效护甲值）
 * 3. AP值在所有层保持不变（不会被消耗）
 * 4. 如果Sharp伤害被任何一层减半，剩余伤害变为Blunt类型
 * 5. 但后续层仍使用其Sharp护甲值进行判定（不是Blunt护甲值）
 * 6. 伤害减半是乘法累积的（两层都减半 = 最终1/4伤害）
 * 7. 占据多层的装备只计算一次（如Marine armor占据middle+shell，只判定一次）
 *
 * @param armorLayers - 护甲层数组（会自动按从外到内排序并去重）
 * @param attackParams - 攻击参数
 * @returns 伤害计算结果
 */
export function calculateMultiLayerDamage(
  armorLayers: ArmorLayer[],
  attackParams: AttackParams,
): DamageResult {
  const { armorPenetration, damagePerShot, damageType } = attackParams

  // 自动排序：从外层到内层
  const sortedLayers = sortArmorLayersOuterToInner(armorLayers)

  // 去重：如果一件装备占据多个层级，只计算一次
  // 使用itemName作为唯一标识
  const uniqueLayers: ArmorLayer[] = []
  const processedItems = new Set<string>()

  for (const layer of sortedLayers) {
    if (!processedItems.has(layer.itemName)) {
      uniqueLayers.push(layer)
      processedItems.add(layer.itemName)
    }
  }

  const layerDetails: DamageResult['layerDetails'] = []

  // 初始状态：100%概率造成全伤害，伤害类型未改变
  let currentStates: DamageState[] = [
    {
      damageMultiplier: 1.0,
      probability: 1.0,
      damageType: damageType,
    },
  ]

  // 遍历每一层护甲
  for (const layer of uniqueLayers) {
    const newStates: DamageState[] = []

    // 对当前所有可能的状态，计算本层护甲的影响
    for (const state of currentStates) {
      // 如果这个状态的伤害已经是0，说明已经被阻挡了，不会传递到下一层
      if (state.damageMultiplier === 0) {
        continue
      }

      // 确定本层使用的护甲类型
      // 关键：即使伤害已变为Blunt，仍使用原始damageType的护甲值
      let armorValue: number
      if (damageType === 'blunt') {
        armorValue = layer.armorBlunt
      } else if (damageType === 'sharp') {
        armorValue = layer.armorSharp
      } else {
        armorValue = layer.armorHeat
      }

      // 计算有效护甲值（护甲值 - AP）
      // AP不会被消耗，每层都使用完整的AP值
      const effectiveArmor = Math.max(0, armorValue - armorPenetration) * 100

      // 如果有效护甲值为0，伤害完全穿透
      if (effectiveArmor === 0) {
        newStates.push(state)
        continue
      }

      const halfArmor = effectiveArmor / 2

      // 三种随机判定结果及其概率
      const deflectProb = Math.min(halfArmor / 100, 100) // 随机数 < 护甲/2：完全偏转
      const halfDamageProb = Math.min((Math.min(effectiveArmor, 100) - halfArmor) / 100, 100) // 护甲/2 <= 随机数 < 护甲：伤害减半
      const noPenetrationProb = 1 - (deflectProb + halfDamageProb) // 随机数 >= 护甲：护甲无效

      // 情况1：伤害被完全偏转（0伤害）
      if (deflectProb > 0) {
        newStates.push({
          damageMultiplier: 0,
          probability: state.probability * deflectProb,
          damageType: state.damageType,
        })
      }

      // 情况2：伤害被减半
      if (halfDamageProb > 0) {
        // 如果这一层受到的是Sharp伤害，转换为Blunt给下一层
        newStates.push({
          damageMultiplier: state.damageMultiplier * 0.5,
          probability: state.probability * halfDamageProb,
          damageType: state.damageType === 'sharp' ? 'blunt' : state.damageType,
        })
      }

      // 情况3：护甲无效，伤害完全穿透
      if (noPenetrationProb > 0) {
        newStates.push({
          damageMultiplier: state.damageMultiplier,
          probability: state.probability * noPenetrationProb,
          damageType: state.damageType,
        })
      }
    }

    // 合并相同damageMultiplier的状态（优化）
    const mergedStates = new Map<number, DamageState>()
    for (const state of newStates) {
      const existing = mergedStates.get(state.damageMultiplier)
      if (existing) {
        existing.probability += state.probability
      } else {
        mergedStates.set(state.damageMultiplier, { ...state })
      }
    }

    currentStates = Array.from(mergedStates.values())

    // 记录本层的详细信息（用于调试和展示）
    const avgDamageAfterLayer =
      currentStates.reduce((sum, s) => sum + s.damageMultiplier * s.probability, 0) * damagePerShot

    layerDetails.push({
      layerName: layer.itemName,
      effectiveArmor:
        Math.max(
          0,
          (damageType === 'blunt'
            ? layer.armorBlunt
            : damageType === 'sharp'
              ? layer.armorSharp
              : layer.armorHeat) - armorPenetration,
        ) * 100,
      damageAfterLayer: avgDamageAfterLayer,
    })
  }

  // 汇总最终结果
  // 按相同伤害倍率 + 相同伤害类型合并状态
  const mergedFinalStates = new Map<string, DamageState>()
  for (const state of currentStates) {
    // 使用 damageMultiplier + damageType 作为唯一键
    const key = `${state.damageMultiplier}_${state.damageType}`
    const existing = mergedFinalStates.get(key)
    if (existing) {
      existing.probability += state.probability
    } else {
      mergedFinalStates.set(key, { ...state })
    }
  }

  // 转换为数组并按概率从高到低排序
  const finalStates = Array.from(mergedFinalStates.values()).sort(
    (a, b) => b.probability - a.probability,
  )

  // 计算期望伤害
  const expectedDamage = finalStates.reduce(
    (sum, state) => sum + state.damageMultiplier * state.probability * damagePerShot,
    0,
  )

  return {
    damageStates: finalStates,
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
