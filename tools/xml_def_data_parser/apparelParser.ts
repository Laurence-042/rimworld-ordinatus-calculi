/**
 * 服装解析模块
 * 处理服装ThingDef的解析和CSV生成
 */

import * as fs from 'fs'
import * as path from 'path'
import { BodyPart } from '../../src/types/bodyPart'
import { ApparelLayer } from '../../src/types/armor'
import { BaseThingDefNode, BaseParserUtils } from './baseParser'

/**
 * 服装ThingDef节点
 */
export interface ApparelThingDefNode extends BaseThingDefNode {
  category: 'Apparel'

  // 衣物属性
  armorRatingSharp?: number // ArmorRating_Sharp
  armorRatingBlunt?: number // ArmorRating_Blunt
  armorRatingHeat?: number // ArmorRating_Heat
  stuffEffectMultiplierArmor?: number // StuffEffectMultiplierArmor (材料系数)
  stuffCategories?: string[] // 接受的材料类别
  bodyPartGroups?: string[] // 覆盖的身体部位组
  apparelLayers?: string[] // 服装层级
}

/**
 * CSV格式的衣物数据（用于写入文件）
 */
export interface ClothingCSVData extends Record<string, string> {
  defName: string
  label: string
  armorBlunt: string
  armorSharp: string
  armorHeat: string
  materialCoefficient: string
  acceptedMaterials: string
  bodyPartCoverage: string
  apparelLayers: string
}

/**
 * 类型守卫：判断是否为衣物节点
 */
export function isApparelNode(node: BaseThingDefNode): node is ApparelThingDefNode {
  return node.category === 'Apparel'
}

/**
 * 身体部位组映射（RimWorld XML -> BodyPart枚举）
 */
export const BODY_PART_GROUP_MAP: Record<string, BodyPart[]> = {
  Torso: [BodyPart.Torso],
  Neck: [BodyPart.Neck],
  Head: [BodyPart.Head],
  Shoulders: [BodyPart.LeftShoulder, BodyPart.RightShoulder],
  Arms: [BodyPart.LeftArm, BodyPart.RightArm],
  Hands: [BodyPart.LeftArm, BodyPart.RightArm], // 手部覆盖映射到手臂
  Legs: [BodyPart.LeftLeg, BodyPart.RightLeg],
  Waist: [BodyPart.Waist],
  Eyes: [BodyPart.LeftEye, BodyPart.RightEye],
  Ears: [BodyPart.LeftEar, BodyPart.RightEar],
  Nose: [BodyPart.Nose],
  Jaw: [BodyPart.Jaw],
  FullHead: [
    BodyPart.Head,
    BodyPart.LeftEye,
    BodyPart.RightEye,
    BodyPart.LeftEar,
    BodyPart.RightEar,
    BodyPart.Nose,
    BodyPart.Jaw,
  ],
}

/**
 * 服装层级映射（RimWorld XML -> ApparelLayer枚举）
 */
export const APPAREL_LAYER_MAP: Record<string, ApparelLayer> = {
  OnSkin: ApparelLayer.Skin,
  Skin: ApparelLayer.Skin,
  Middle: ApparelLayer.Middle,
  Shell: ApparelLayer.Outer,
  Outer: ApparelLayer.Outer,
  Belt: ApparelLayer.Belt,
  Overhead: ApparelLayer.Headgear,
  Headgear: ApparelLayer.Headgear,
  EyeCover: ApparelLayer.Eyes,
  Eyes: ApparelLayer.Eyes,
}

/**
 * 服装解析器
 */
export class ApparelParser {
  /**
   * 从XML节点解析服装特有属性
   */
  static parseApparelProperties(
    xmlNode: Record<string, unknown>,
  ): Partial<ApparelThingDefNode> | null {
    const props: Partial<ApparelThingDefNode> = {
      category: 'Apparel',
    }

    // 解析统计数据
    if (BaseParserUtils.isRecord(xmlNode.statBases)) {
      const stats = xmlNode.statBases as Record<string, unknown>
      props.armorRatingSharp = BaseParserUtils.parseFloat(stats.ArmorRating_Sharp)
      props.armorRatingBlunt = BaseParserUtils.parseFloat(stats.ArmorRating_Blunt)
      props.armorRatingHeat = BaseParserUtils.parseFloat(stats.ArmorRating_Heat)
      props.stuffEffectMultiplierArmor = BaseParserUtils.parseFloat(
        stats.StuffEffectMultiplierArmor,
      )
    }

    // 解析apparel（服装属性）
    if (BaseParserUtils.isRecord(xmlNode.apparel)) {
      const apparel = xmlNode.apparel as Record<string, unknown>

      // 解析身体部位组
      if (apparel.bodyPartGroups) {
        props.bodyPartGroups = BaseParserUtils.parseArrayField(apparel.bodyPartGroups)
      }

      // 解析服装层级
      if (apparel.layers) {
        props.apparelLayers = BaseParserUtils.parseArrayField(apparel.layers)
      }
    }

    // 解析材料类别
    if (xmlNode.stuffCategories) {
      props.stuffCategories = BaseParserUtils.parseArrayField(xmlNode.stuffCategories)
    }

    // 判断是否为有效服装
    const hasApparelIndicators =
      xmlNode.apparel ||
      props.apparelLayers ||
      props.bodyPartGroups ||
      props.armorRatingSharp !== undefined ||
      props.armorRatingBlunt !== undefined ||
      props.armorRatingHeat !== undefined

    return hasApparelIndicators ? props : null
  }

  /**
   * 从父节点继承服装属性
   */
  static inheritApparelProperties(child: ApparelThingDefNode, parent: ApparelThingDefNode): void {
    const apparelProps: (keyof ApparelThingDefNode)[] = [
      'armorRatingSharp',
      'armorRatingBlunt',
      'armorRatingHeat',
      'stuffEffectMultiplierArmor',
    ]

    for (const prop of apparelProps) {
      if (child[prop] === undefined && parent[prop] !== undefined) {
        ;(child as unknown as Record<string, unknown>)[prop] = parent[prop]
      }
    }

    // 特殊处理数组属性（合并而非覆盖）
    if (parent.stuffCategories && (!child.stuffCategories || child.stuffCategories.length === 0)) {
      child.stuffCategories = [...parent.stuffCategories]
    }
    if (parent.bodyPartGroups && (!child.bodyPartGroups || child.bodyPartGroups.length === 0)) {
      child.bodyPartGroups = [...parent.bodyPartGroups]
    }
    if (parent.apparelLayers && (!child.apparelLayers || child.apparelLayers.length === 0)) {
      child.apparelLayers = [...parent.apparelLayers]
    }
  }

  /**
   * 筛选有效的服装节点
   */
  static filterValidApparel(apparel: ApparelThingDefNode[]): ApparelThingDefNode[] {
    return apparel.filter((item) => {
      // 跳过抽象定义
      if (item.abstract) return false

      // 必须有身体部位覆盖或服装层级
      if (!item.bodyPartGroups && !item.apparelLayers) return false

      return true
    })
  }

  /**
   * 创建服装CSV行数据
   */
  static createClothingRow(
    clothing: ApparelThingDefNode,
    translations: Map<string, string> | null,
  ): ClothingCSVData {
    // 获取翻译后的label（如果有翻译数据）
    let label = clothing.label || clothing.defName || clothing.identifier || ''
    const keyForTranslation = clothing.defName || clothing.identifier
    if (translations && keyForTranslation) {
      const translationKey = `${keyForTranslation}.label`
      const translatedLabel = translations.get(translationKey)
      if (translatedLabel) {
        label = translatedLabel
      }
    }

    // 映射身体部位组到BodyPart枚举
    const bodyPartCoverage: BodyPart[] = []
    if (clothing.bodyPartGroups) {
      for (const group of clothing.bodyPartGroups) {
        const mappedParts = BODY_PART_GROUP_MAP[group]
        if (mappedParts) {
          bodyPartCoverage.push(...mappedParts)
        }
      }
    }

    // 映射服装层级到ApparelLayer枚举
    const apparelLayers: ApparelLayer[] = []
    if (clothing.apparelLayers) {
      for (const layer of clothing.apparelLayers) {
        const mappedLayer = APPAREL_LAYER_MAP[layer]
        if (mappedLayer !== undefined) {
          apparelLayers.push(mappedLayer)
        }
      }
    }

    const row: ClothingCSVData = {
      defName: clothing.defName || '',
      label: label,
      armorBlunt: BaseParserUtils.formatNumber(clothing.armorRatingBlunt),
      armorSharp: BaseParserUtils.formatNumber(clothing.armorRatingSharp),
      armorHeat: BaseParserUtils.formatNumber(clothing.armorRatingHeat),
      materialCoefficient: BaseParserUtils.formatNumber(clothing.stuffEffectMultiplierArmor),
      acceptedMaterials: clothing.stuffCategories?.join(',') || '',
      bodyPartCoverage: bodyPartCoverage.join(','), // BodyPart枚举值用逗号分隔
      apparelLayers: apparelLayers.map((l) => l.toString()).join(','), // ApparelLayer数值用逗号分隔
    }

    return row
  }

  /**
   * 写入服装CSV文件
   */
  static writeClothingCSV(data: ClothingCSVData[], outputDir: string, languageCode: string): void {
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const outputPath = path.join(outputDir, `${languageCode}.csv`)

    // CSV头部（匹配ClothingData接口）
    const headers = [
      'defName',
      'label',
      'armorBlunt',
      'armorSharp',
      'armorHeat',
      'materialCoefficient',
      'acceptedMaterials',
      'bodyPartCoverage',
      'apparelLayers',
    ]

    BaseParserUtils.writeCSVFile(outputPath, headers, data, fs)

    console.log(`衣物CSV文件已生成: ${outputPath}`)
  }
}
