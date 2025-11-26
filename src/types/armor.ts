/**
 * 护甲类型定义
 */

/**
 * 服装层级枚举（按从内到外的顺序）
 */
export enum ApparelLayer {
  /** 皮肤层（最内层，通常不显示） */
  Skin = 0,
  /** 贴身层 */
  OnSkin = 1,
  /** 夹层 */
  Middle = 2,
  /** 外套层 */
  Shell = 3,
  /** 配件层 */
  Belt = 4,
  /** 头饰层 */
  Overhead = 5,
  /** 眼饰层（最外层） */
  EyeCover = 6,
}

/**
 * 服装层级名称映射
 */
export const ApparelLayerNames: Record<string, ApparelLayer> = {
  皮肤: ApparelLayer.Skin,
  贴身: ApparelLayer.OnSkin,
  夹层: ApparelLayer.Middle,
  外套: ApparelLayer.Shell,
  腰: ApparelLayer.Belt,
  配件: ApparelLayer.Belt,
  头饰: ApparelLayer.Overhead,
  眼饰: ApparelLayer.EyeCover,
}

/**
 * 获取层级的显示名称
 */
export function getApparelLayerName(layer: ApparelLayer): string {
  const names: Record<ApparelLayer, string> = {
    [ApparelLayer.Skin]: '皮肤',
    [ApparelLayer.OnSkin]: '贴身',
    [ApparelLayer.Middle]: '夹层',
    [ApparelLayer.Shell]: '外套',
    [ApparelLayer.Belt]: '配件',
    [ApparelLayer.Overhead]: '头饰',
    [ApparelLayer.EyeCover]: '眼饰',
  }
  return names[layer] || '未知'
}

export interface ArmorLayer {
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
  /** 使用的全局材料类型 */
  selectedMaterial?: 'metal' | 'wood' | 'leather' | 'fabric'
  /** 支持的材料类型（从预设加载） */
  supportedMaterials?: Array<'metal' | 'wood' | 'leather' | 'fabric'>
  /** 服装层级（从CSV加载，可能有多个） */
  apparelLayers: ApparelLayer[]
  /** 覆盖的身体部位（使用BodyPart枚举） */
  bodyPartCoverage: string[] // BodyPart[] - 使用string[]以便与Element Plus TreeSelect兼容
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
