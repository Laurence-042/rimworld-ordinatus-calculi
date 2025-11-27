import type { SimplifiedWeaponParams } from '@/types/weapon'
import type { ArmorLayer, AttackParams, DamageResult, DamageState } from '@/types/armor'
import { ApparelLayer, DamageType } from '@/types/armor'
import { ApparelQualityMultipliers } from '@/types/quality'

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
 * 获取应用品质系数后的护甲值
 *
 * @param layer - 护甲层
 * @param damageType - 伤害类型
 * @returns 实际护甲值 (0-2)
 */
export function getActualArmorValue(layer: ArmorLayer, damageType: DamageType): number {
  const qualityMultipliers = ApparelQualityMultipliers[layer.quality]
  const armorMultiplier = qualityMultipliers.armor

  let baseArmor: number
  if (damageType === DamageType.Blunt) {
    baseArmor = layer.armorBlunt
  } else if (damageType === DamageType.Sharp) {
    baseArmor = layer.armorSharp
  } else {
    baseArmor = layer.armorHeat
  }

  return baseArmor * armorMultiplier
}

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
 * **RimWorld 护甲伤害计算机制详解：**
 *
 * 当攻击命中时，游戏会生成一个 0-100 的随机数，与有效护甲值比较：
 *
 * 1. 如果随机数 < 有效护甲值的一半：
 *    - 伤害被**完全偏转**，造成 0% 伤害
 *    - 概率 = (有效护甲值 / 2) / 100
 *
 * 2. 如果随机数 >= 有效护甲值的一半 且 < 有效护甲值：
 *    - 伤害被**部分偏转**，造成 50% 伤害
 *    - 概率 = (有效护甲值 / 2) / 100
 *
 * 3. 如果随机数 >= 有效护甲值：
 *    - 护甲**无效**，造成 100% 伤害
 *    - 概率 = (100 - 有效护甲值) / 100
 *
 * **示例：**
 * - 有效护甲值 = 60%
 *   - 0-30: 完全偏转 (30% 概率, 0% 伤害)
 *   - 30-60: 部分偏转 (30% 概率, 50% 伤害)
 *   - 60-100: 护甲无效 (40% 概率, 100% 伤害)
 *   - 期望伤害倍率 = 0.3×0 + 0.3×0.5 + 0.4×1.0 = 0.55
 *
 * @param effectiveArmor - 有效护甲值 (0-100)，已减去武器的护甲穿透
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
 * @param params - 简化的武器参数（包含护甲穿透、命中率、最大DPS）
 * @returns DPS计算结果，包含201个元素的数组（护甲值0%-200%）
 */
export function calculateDPSCurve(params: SimplifiedWeaponParams): DPSCalculationResult {
  const { hitChance, maxDPS, armorPenetration = 0 } = params

  // 验证输入参数
  if (hitChance < 0 || hitChance > 1) {
    console.warn(`命中率超出有效范围 [0, 1]: ${hitChance}，已自动限制`)
  }
  if (maxDPS < 0) {
    console.warn(`最大DPS为负数: ${maxDPS}，已自动设为 0`)
  }
  if (armorPenetration < 0 || armorPenetration > 1) {
    console.warn(`护甲穿透值超出有效范围 [0, 1]: ${armorPenetration}，已自动限制`)
  }

  // 确保参数在有效范围内
  const validHitChance = Math.max(0, Math.min(1, hitChance))
  const validMaxDPS = Math.max(0, maxDPS)
  const validArmorPenetration = Math.max(0, Math.min(1, armorPenetration))

  const dpsValues: number[] = []
  const armorValues: number[] = []

  // 计算护甲值从0%到200%的DPS期望
  for (let armorPercent = 0; armorPercent <= 200; armorPercent++) {
    // 护甲值（百分比形式）
    const armor = armorPercent / 100

    // 计算有效护甲值（减去武器的护甲穿透）
    const effectiveArmor = Math.max(0, armor - validArmorPenetration) * 100

    // 计算伤害倍率
    const damageMultiplier = calculateDamageMultiplier(effectiveArmor)

    // 计算期望DPS = 基础DPS × 命中率 × 伤害倍率
    const expectedDPS = validMaxDPS * validHitChance * damageMultiplier

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
 * @param params - 简化的武器参数（包含护甲穿透、命中率、最大DPS）
 * @param targetArmor - 目标护甲值 (0-2)
 * @returns DPS分布详情
 */
export function calculateDPSDistribution(
  params: SimplifiedWeaponParams,
  targetArmor: number,
): DPSDistribution {
  const { hitChance, maxDPS, armorPenetration = 0 } = params

  // 验证并限制输入参数
  const validHitChance = Math.max(0, Math.min(1, hitChance))
  const validMaxDPS = Math.max(0, maxDPS)
  const validArmorPenetration = Math.max(0, Math.min(1, armorPenetration))
  const validTargetArmor = Math.max(0, targetArmor)

  // 计算有效护甲值
  const effectiveArmor = Math.max(0, validTargetArmor - validArmorPenetration) * 100
  const clampedArmor = Math.max(0, Math.min(100, effectiveArmor))

  const halfArmor = clampedArmor / 2

  // 在命中的情况下，计算三种伤害结果的概率
  const zeroDamageProb = halfArmor / 100
  const halfDamageProb = (clampedArmor - halfArmor) / 100
  const fullDamageProb = (100 - clampedArmor) / 100

  // 计算对应的DPS值
  const zeroDPS = 0
  const halfDPS = validMaxDPS * 0.5
  const fullDPS = validMaxDPS

  // 计算期望DPS（考虑命中率）
  const expectedDPS = validMaxDPS * validHitChance * calculateDamageMultiplier(clampedArmor)

  return {
    zeroDamageProb: zeroDamageProb * validHitChance,
    halfDamageProb: halfDamageProb * validHitChance,
    fullDamageProb: fullDamageProb * validHitChance,
    missProb: 1 - validHitChance,
    zeroDPS,
    halfDPS,
    fullDPS,
    expectedDPS,
  }
}

/**
 * 计算多层护甲的伤害期望
 *
 * **RimWorld 多层护甲机制详解：**
 *
 * 核心规则：
 * 1. **从外到内逐层计算**：伤害从最外层护甲开始，逐层向内传递
 * 2. **独立随机判定**：每层护甲独立进行 0-100 随机数判定
 * 3. **AP 值不消耗**：护甲穿透值在所有层保持不变
 * 4. **Sharp → Blunt 转换**：如果 Sharp 伤害被任何一层减半，剩余伤害变为 Blunt 类型
 * 5. **使用原始护甲值**：即使伤害已变为 Blunt，后续层仍使用其 Sharp 护甲值进行判定
 * 6. **乘法累积**：伤害减半是乘法累积的（两层都减半 = 最终 1/4 伤害）
 * 7. **多层装备去重**：占据多层的装备只计算一次（如海军装甲占据 middle+shell，只判定一次）
 *
 * **概率状态追踪：**
 * 算法使用状态机追踪所有可能的伤害结果及其概率：
 * - 初始状态：100% 概率造成全伤害（倍率 1.0）
 * - 每经过一层：每个状态分裂为 3 个新状态（完全偏转/部分偏转/穿透）
 * - 最终状态：多个可能的伤害倍率及其对应概率
 *
 * **示例：**
 * ```
 * 装备：防弹背心(100% Sharp护甲) + 防弹夹克(55% Sharp护甲)
 * 攻击：Sharp伤害，35% AP
 *
 * 第1层（背心）：
 *   有效护甲 = 100% - 35% = 65%
 *   - 32.5% 概率：完全偏转 → 0% 伤害
 *   - 32.5% 概率：减半 → 50% 伤害，转为 Blunt
 *   - 35.0% 概率：穿透 → 100% 伤害，仍为 Sharp
 *
 * 第2层（夹克）：
 *   对于 50% 伤害状态（已转为 Blunt，但仍用 Sharp 护甲值判定）：
 *     有效护甲 = 55% - 35% = 20%
 *     - 10% 概率 × 32.5% = 3.25%：再次偏转 → 0% 伤害
 *     - 10% 概率 × 32.5% = 3.25%：再次减半 → 25% 伤害
 *     - 80% 概率 × 32.5% = 26.0%：穿透 → 50% 伤害
 *
 *   对于 100% 伤害状态（仍为 Sharp）：
 *     有效护甲 = 55% - 35% = 20%
 *     - 10% 概率 × 35.0% = 3.5%：偏转 → 0% 伤害
 *     - 10% 概率 × 35.0% = 3.5%：减半 → 50% 伤害
 *     - 80% 概率 × 35.0% = 28.0%：穿透 → 100% 伤害
 *
 * 最终结果：
 *   - 0% 伤害：32.5% + 3.25% + 3.5% = 39.25%
 *   - 25% 伤害：3.25%
 *   - 50% 伤害：26.0% + 3.5% = 29.5%
 *   - 100% 伤害：28.0%
 *   - 期望伤害 = 0×39.25% + 0.25×3.25% + 0.5×29.5% + 1.0×28.0% = 43.56%
 * ```
 *
 * @param armorLayers - 护甲层数组（会自动按从外到内排序并去重）
 * @param attackParams - 攻击参数（护甲穿透、单发伤害、伤害类型）
 * @returns 伤害计算结果，包含所有可能的伤害状态及其概率
 */
export function calculateMultiLayerDamage(
  armorLayers: ArmorLayer[],
  attackParams: AttackParams,
): DamageResult {
  const { armorPenetration, damagePerShot, damageType } = attackParams

  // 验证输入参数
  if (!armorLayers || armorLayers.length === 0) {
    // 无护甲时，100% 概率造成全伤害
    return {
      damageStates: [
        {
          damageMultiplier: 1.0,
          probability: 1.0,
          damageType: damageType,
        },
      ],
      expectedDamage: damagePerShot,
      layerDetails: [],
    }
  }

  // 确保参数在有效范围内
  const validArmorPenetration = Math.max(0, Math.min(1, armorPenetration))
  const validDamagePerShot = Math.max(0, damagePerShot)

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
      // 如果这个状态的伤害已经是0，说明已经被阻挡了，不需要详细计算，直接传递到下一层提供概率
      if (state.damageMultiplier === 0) {
        newStates.push(state)
        continue
      }

      // 确定本层使用的护甲类型
      // 关键：即使伤害已变为Blunt，仍使用原始damageType的护甲值
      // 并应用品质系数
      const armorValue = getActualArmorValue(layer, damageType)

      // 计算有效护甲值（护甲值 - AP）
      // AP不会被消耗，每层都使用完整的AP值
      const effectiveArmor = Math.max(0, armorValue - validArmorPenetration) * 100

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
          damageType: state.damageType === DamageType.Sharp ? DamageType.Blunt : state.damageType,
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
      currentStates.reduce((sum, s) => sum + s.damageMultiplier * s.probability, 0) *
      validDamagePerShot

    layerDetails.push({
      layerName: layer.itemName,
      effectiveArmor:
        Math.max(0, getActualArmorValue(layer, damageType) - validArmorPenetration) * 100,
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
    (sum, state) => sum + state.damageMultiplier * state.probability * validDamagePerShot,
    0,
  )

  // 验证：期望伤害不应超过单发伤害
  if (expectedDamage > validDamagePerShot + 0.001) {
    // 添加小误差容忍度
    console.error('护甲计算错误：期望伤害超过单发伤害', {
      expectedDamage,
      damagePerShot: validDamagePerShot,
      armorPenetration: validArmorPenetration,
      damageType,
      layerCount: uniqueLayers.length,
      layers: uniqueLayers.map((l) => ({
        name: l.itemName,
        sharp: l.armorSharp,
        blunt: l.armorBlunt,
        heat: l.armorHeat,
      })),
      finalStates,
    })
  }

  // 验证：所有概率之和应该等于1
  const totalProbability = finalStates.reduce((sum, state) => sum + state.probability, 0)
  if (Math.abs(totalProbability - 1.0) > 0.001) {
    console.error('护甲计算错误：概率之和不等于1', {
      totalProbability,
      finalStates,
    })
  }

  // 验证：所有伤害倍率应该在[0, 1]范围内
  for (const state of finalStates) {
    if (state.damageMultiplier < 0 || state.damageMultiplier > 1.0 + 0.001) {
      console.error('护甲计算错误：伤害倍率超出范围', {
        damageMultiplier: state.damageMultiplier,
        state,
      })
    }
  }

  return {
    damageStates: finalStates,
    expectedDamage: Math.min(expectedDamage, validDamagePerShot), // 确保不超过单发伤害
    layerDetails,
  }
}
