/**
 * 材料解析模块
 * 处理材料ThingDef的解析和CSV生成
 */

import * as fs from 'fs'
import * as path from 'path'
import { MaterialTag } from '../../src/types/material'
import { BaseThingDefNode, BaseParserUtils } from './baseParser'

/**
 * 材料ThingDef节点
 */
export interface MaterialThingDefNode extends BaseThingDefNode {
  category: 'Material'

  // 材料护甲属性（stuffProps.statBases）
  stuffPowerArmorSharp?: number // StuffPower_Armor_Sharp
  stuffPowerArmorBlunt?: number // StuffPower_Armor_Blunt
  stuffPowerArmorHeat?: number // StuffPower_Armor_Heat

  // 材料类别（stuffProps.categories）
  stuffCategories?: string[] // e.g., ["Metallic", "Woody", "Leathery", "Fabric"]
}

/**
 * CSV格式的材料数据（用于写入文件）
 */
export interface MaterialCSVData extends Record<string, string> {
  defName: string
  label: string
  armorSharp: string
  armorBlunt: string
  armorHeat: string
  categories: string // 逗号分隔的类别标签
}

/**
 * 类型守卫：判断是否为材料节点
 */
export function isMaterialNode(node: BaseThingDefNode): node is MaterialThingDefNode {
  return node.category === 'Material'
}

/**
 * 材料类别映射（RimWorld XML -> MaterialTag枚举）
 */
export const STUFF_CATEGORY_MAP: Record<string, MaterialTag> = {
  Metallic: MaterialTag.Metal,
  Woody: MaterialTag.Wood,
  Leathery: MaterialTag.Leather,
  Fabric: MaterialTag.Fabric,
}

/**
 * 材料解析器
 */
export class MaterialParser {
  /**
   * 从XML节点解析材料特有属性
   */
  static parseMaterialProperties(
    xmlNode: Record<string, unknown>,
  ): Partial<MaterialThingDefNode> | null {
    const props: Partial<MaterialThingDefNode> = {
      category: 'Material',
    }

    // 解析 stuffProps（材料属性）
    if (BaseParserUtils.isRecord(xmlNode.stuffProps)) {
      const stuffProps = xmlNode.stuffProps as Record<string, unknown>

      // 解析材料类别
      if (stuffProps.categories) {
        props.stuffCategories = BaseParserUtils.parseArrayField(stuffProps.categories)
      }

      // 解析材料护甲数据（存储在 statBases 或 statFactors 的顶层）
      // 注意：RimWorld材料数据通常在statBases中直接定义护甲值
    }

    // 解析统计数据中的材料护甲属性
    if (BaseParserUtils.isRecord(xmlNode.statBases)) {
      const stats = xmlNode.statBases as Record<string, unknown>
      props.stuffPowerArmorSharp = BaseParserUtils.parseFloat(stats.StuffPower_Armor_Sharp)
      props.stuffPowerArmorBlunt = BaseParserUtils.parseFloat(stats.StuffPower_Armor_Blunt)
      props.stuffPowerArmorHeat = BaseParserUtils.parseFloat(stats.StuffPower_Armor_Heat)
    }

    // 判断是否为有效材料：必须有stuffProps且有categories
    const hasMaterialIndicators = xmlNode.stuffProps && props.stuffCategories !== undefined

    return hasMaterialIndicators ? props : null
  }

  /**
   * 从父节点继承材料属性
   */
  static inheritMaterialProperties(
    child: MaterialThingDefNode,
    parent: MaterialThingDefNode,
  ): void {
    const materialProps: (keyof MaterialThingDefNode)[] = [
      'stuffPowerArmorSharp',
      'stuffPowerArmorBlunt',
      'stuffPowerArmorHeat',
    ]

    for (const prop of materialProps) {
      if (child[prop] === undefined && parent[prop] !== undefined) {
        ;(child as unknown as Record<string, unknown>)[prop] = parent[prop]
      }
    }

    // 特殊处理数组属性（合并而非覆盖）
    if (parent.stuffCategories && (!child.stuffCategories || child.stuffCategories.length === 0)) {
      child.stuffCategories = [...parent.stuffCategories]
    }
  }

  /**
   * 筛选有效的材料节点
   */
  static filterValidMaterials(materials: MaterialThingDefNode[]): MaterialThingDefNode[] {
    return materials.filter((material) => {
      // 跳过抽象定义
      if (material.abstract) return false

      // 必须有材料类别
      if (!material.stuffCategories || material.stuffCategories.length === 0) return false

      // 必须至少有一个护甲值
      const hasArmorValue =
        material.stuffPowerArmorSharp !== undefined ||
        material.stuffPowerArmorBlunt !== undefined ||
        material.stuffPowerArmorHeat !== undefined

      return hasArmorValue
    })
  }

  /**
   * 创建材料CSV行数据
   */
  static createMaterialRow(
    material: MaterialThingDefNode,
    translations: Map<string, string> | null,
  ): MaterialCSVData {
    // 获取翻译后的label（如果有翻译数据）
    let label = material.label || material.defName || material.identifier || ''
    const keyForTranslation = material.defName || material.identifier
    if (translations && keyForTranslation) {
      const translationKey = `${keyForTranslation}.label`
      const translatedLabel = translations.get(translationKey)
      if (translatedLabel) {
        label = translatedLabel
      }
    }

    const row: MaterialCSVData = {
      defName: material.defName || '',
      label: label,
      armorSharp: BaseParserUtils.formatNumber(material.stuffPowerArmorSharp),
      armorBlunt: BaseParserUtils.formatNumber(material.stuffPowerArmorBlunt),
      armorHeat: BaseParserUtils.formatNumber(material.stuffPowerArmorHeat),
      categories: material.stuffCategories?.join(',') || '', // 保持XML原始category值
    }

    return row
  }

  /**
   * 写入材料CSV文件
   */
  static writeMaterialCSV(data: MaterialCSVData[], outputDir: string, languageCode: string): void {
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const outputPath = path.join(outputDir, `${languageCode}.csv`)

    // CSV头部（匹配MaterialCSVData接口）
    const headers = ['defName', 'label', 'armorSharp', 'armorBlunt', 'armorHeat', 'categories']

    BaseParserUtils.writeCSVFile(outputPath, headers, data, fs)

    console.log(`    材料CSV文件已生成: ${outputPath}`)
  }
}
