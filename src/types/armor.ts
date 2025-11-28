/**
 * 护甲类型定义
 */

import { QualityCategory } from './quality'
import { MaterialTag } from './material'

/**
 * 服装层级枚举（按从内到外的顺序）
 * 注意：Outer（外套）在精灵显示上位于最上层，但在机制上被视为低于Belt/Headgear/Eyes
 */
export enum ApparelLayer {
  /** 贴身层（最接近身体的一层，主要用于头部以下的服装） */
  Skin = 0,
  /** 夹层（从身体开始的第二层，主要用于头部以下的服装） */
  Middle = 1,
  /** 外套层（从身体开始的第三层，显示在精灵最上层但机制上低于后续层级） */
  Outer = 2,
  /** 配件层（第四层，实用物品的独特层级，允许与其他服装同时装备但不能与其他实用物品同时装备） */
  Belt = 3,
  /** 头饰层（第五层，用于头饰，可覆盖其他层级占用的身体部位） */
  Headgear = 4,
  /** 眼饰层（最外层，仅用于眼罩，允许与头饰一起佩戴） */
  Eyes = 5,
}

/**
 * 服装层级名称映射
 */
export const ApparelLayerNames: Record<string, ApparelLayer> = {
  贴身: ApparelLayer.Skin,
  夹层: ApparelLayer.Middle,
  外套: ApparelLayer.Outer,
  腰: ApparelLayer.Belt,
  配件: ApparelLayer.Belt,
  头饰: ApparelLayer.Headgear,
  眼饰: ApparelLayer.Eyes,
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
  /** 品质等级 */
  quality: QualityCategory
  /** 是否依赖材料计算护甲 */
  useMaterial?: boolean
  /** 材料系数 (0-2) */
  materialCoefficient?: number
  /** 使用的全局材料类型 */
  selectedMaterial?: MaterialTag
  /** 支持的材料类型（从预设加载） */
  supportedMaterials?: MaterialTag[]
  /** 服装层级（从CSV加载，可能有多个） */
  apparelLayers: ApparelLayer[]
  /** 覆盖的身体部位（使用BodyPart枚举） */
  bodyPartCoverage: string[] // BodyPart[] - 使用string[]以便与Element Plus TreeSelect兼容
  /** 选中的数据源ID（用于预设选择） */
  selectedDataSourceId?: string | null
  /** 选中的衣物defName（用于预设选择） */
  selectedClothingDefName?: string | null
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

export enum DamageType {
  Blunt = 'blunt',
  Sharp = 'sharp',
  Heat = 'heat',
}

export interface AttackParams {
  /** 武器护甲穿透 (0-2) */
  armorPenetration: number
  /** 伤害类型 */
  damageType: DamageType
}

// 概率状态追踪
export interface DamageState {
  damageMultiplier: number // 当前伤害倍率（0, 0.25, 0.5, 1等）
  probability: number // 该状态的概率
  damageType: DamageType // 当前伤害类型
}

export interface DamageResult {
  /** 各种伤害状态及其概率 */
  damageStates: DamageState[]
  /** 减伤比例 (0-100) */
  damageReduction: number
  /** 期望伤害倍率 (0-1) */
  expectedDamageMultiplier: number
  /** 各层伤害详情 */
  layerDetails: Array<{
    layerName: string
    effectiveArmor: number
    damageMultiplierAfterLayer: number
  }>
}
