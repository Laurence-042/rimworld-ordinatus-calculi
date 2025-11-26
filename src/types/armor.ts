/**
 * 护甲类型定义
 */

export interface ArmorLayer {
  /** 层名称（贴身、夹层、外套等） */
  layerName: string
  /** 衣物名称 */
  itemName: string
  /** 利器护甲值 (0-2) */
  armorSharp: number
  /** 钝器护甲值 (0-2) */
  armorBlunt: number
  /** 热能护甲值 (0-2) */
  armorHeat: number
  /** 是否依赖材料计算护甲 */
  useMaterial?: boolean
  /** 材料系数 (0-2) */
  materialCoefficient?: number
  /** 接受的材料类型 */
  acceptedMaterialTags?: Array<'metal' | 'wood' | 'leather' | 'fabric'>
}

export interface ArmorSet {
  /** 护甲套装ID */
  id: number
  /** 护甲套装名称 */
  name: string
  /** 护甲层（按从外到内的顺序） */
  layers: ArmorLayer[]
  /** 颜色（用于图表） */
  color: string
}

export interface AttackParams {
  /** 武器护甲穿透 (0-1) */
  armorPenetration: number
  /** 武器单发伤害 */
  damagePerShot: number
  /** 伤害类型 */
  damageType: 'blunt' | 'sharp' | 'heat'
}

export interface DamageResult {
  /** 0伤害的概率 */
  noDeflectProb: number
  /** 减半伤害的概率 */
  halfDeflectProb: number
  /** 全伤害的概率 */
  fullDamageProb: number
  /** 期望伤害值 */
  expectedDamage: number
  /** 各层伤害详情 */
  layerDetails: Array<{
    layerName: string
    effectiveArmor: number
    damageAfterLayer: number
  }>
}
