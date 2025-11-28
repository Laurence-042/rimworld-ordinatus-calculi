import { type MaterialData, type MaterialDataSource, MaterialTag } from '@/types/material'
import {
  DataSourceType,
  parseCSV,
  parseNumeric,
  parseDelimitedString,
  loadCSVByLocale,
  normalizeModName,
} from './csvParserUtils'
import { useExtendedDataSourceManager } from './extendedDataSourceManager'

// 重新导出类型供外部使用
export type { MaterialData, MaterialDataSource }
export { MaterialTag }

/**
 * CSV材料数据行
 */
interface MaterialCSVRow extends Record<string, string> {
  defName: string
  label: string
  armorSharp: string
  armorBlunt: string
  armorHeat: string
  categories: string
}

/**
 * 解析材料类别标签
 */
function parseCategoryTags(value: string): MaterialTag[] {
  if (!value || !value.trim()) return []

  const tags: MaterialTag[] = []
  const parts = parseDelimitedString(value)

  for (const part of parts) {
    // 直接验证是否为有效的MaterialTag枚举值
    if (Object.values(MaterialTag).includes(part as MaterialTag)) {
      tags.push(part as MaterialTag)
    } else if (part === 'Stony') {
      // 特殊处理：石材归类为金属性质
      tags.push(MaterialTag.Metallic)
    }
  }

  return tags
}

/**
 * 解析材料CSV数据
 */
async function parseMaterialCSV(csvContent: string): Promise<MaterialData[]> {
  const rows = await parseCSV<MaterialCSVRow>(csvContent)

  return rows
    .filter((row) => row.label && row.label.trim())
    .map((row) => ({
      defName: row.defName?.trim() || '',
      label: row.label.trim(),
      armorSharp: parseNumeric(row.armorSharp),
      armorBlunt: parseNumeric(row.armorBlunt),
      armorHeat: parseNumeric(row.armorHeat),
      tags: parseCategoryTags(row.categories),
    }))
}

/**
 * 将材料列表按标签分组
 *
 * 优先级规则：
 * - 如果同时拥有皮革和织物标签，归类为皮革
 * - 其他情况下，材料可以同时归入多个分类
 */
function groupMaterialsByTags(materials: MaterialData[]): MaterialDataSource['materials'] {
  const grouped: MaterialDataSource['materials'] = {
    [MaterialTag.Metallic]: [],
    [MaterialTag.Woody]: [],
    [MaterialTag.Leathery]: [],
    [MaterialTag.Fabric]: [],
  }

  materials.forEach((material) => {
    // 检查是否同时拥有皮革和织物标签
    const hasLeather = material.tags.includes(MaterialTag.Leathery)
    const hasFabric = material.tags.includes(MaterialTag.Fabric)

    material.tags.forEach((tag) => {
      // 如果同时拥有皮革和织物标签，跳过织物分类
      if (hasLeather && hasFabric && tag === MaterialTag.Fabric) {
        return
      }
      grouped[tag].push(material)
    })
  })

  return grouped
}

/**
 * 根据材料和系数计算实际护甲值
 */
export function calculateArmorFromMaterial(
  materialCoefficient: number,
  material: MaterialData,
): { armorSharp: number; armorBlunt: number; armorHeat: number } {
  return {
    armorSharp: materialCoefficient * material.armorSharp,
    armorBlunt: materialCoefficient * material.armorBlunt,
    armorHeat: materialCoefficient * material.armorHeat,
  }
}

/**
 * 扩展材料数据源接口（添加 isExtended 标记）
 */
export interface ExtendedMaterialDataSource extends MaterialDataSource {
  /** 是否为扩展数据源 */
  isExtended?: boolean
}

/**
 * 加载所有材料数据源（包括扩展数据源）
 * @param locale 语言代码
 * @returns 材料数据源数组
 */
export async function getMaterialDataSources(
  locale: string = 'zh-CN',
): Promise<ExtendedMaterialDataSource[]> {
  const modCSVMap = await loadCSVByLocale(DataSourceType.Material, locale)

  // 按数据源ID分组
  const dataSourceMap = new Map<string, MaterialData[]>()

  for (const [modName, csvContent] of modCSVMap.entries()) {
    try {
      const materials = await parseMaterialCSV(csvContent)
      if (materials.length === 0) continue

      const sourceId = normalizeModName(modName)

      // 合并到对应的数据源
      if (!dataSourceMap.has(sourceId)) {
        dataSourceMap.set(sourceId, [])
      }
      dataSourceMap.get(sourceId)!.push(...materials)
    } catch (error) {
      console.error(`Failed to parse materials from ${modName}:`, error)
    }
  }

  // 转换为数据源数组
  const dataSources: ExtendedMaterialDataSource[] = []
  for (const [sourceId, materials] of dataSourceMap.entries()) {
    dataSources.push({
      id: sourceId,
      label: sourceId === 'vanilla' ? 'Vanilla' : sourceId,
      materials: groupMaterialsByTags(materials),
      isExtended: false,
    })
  }

  // 加载扩展数据源
  try {
    const extendedManager = useExtendedDataSourceManager()
    const extendedCSVMap = await extendedManager.loadExtendedCSVByLocale(
      DataSourceType.Material,
      locale,
    )

    // 扩展数据按源分组
    const extendedSourceMap = new Map<string, MaterialData[]>()

    for (const [key, csvContent] of extendedCSVMap.entries()) {
      try {
        const materials = await parseMaterialCSV(csvContent)
        if (materials.length === 0) continue

        // key 格式: sourceId:modName
        const parts = key.split(':')
        const sourceId = parts[0] || 'unknown'
        const modName = parts.slice(1).join(':') || 'unknown'
        const extendedSourceId = `extended:${sourceId}:${normalizeModName(modName)}`

        if (!extendedSourceMap.has(extendedSourceId)) {
          extendedSourceMap.set(extendedSourceId, [])
        }
        extendedSourceMap.get(extendedSourceId)!.push(...materials)
      } catch (error) {
        console.error(`Failed to parse extended materials from ${key}:`, error)
      }
    }

    // 添加扩展数据源
    for (const [sourceId, materials] of extendedSourceMap.entries()) {
      // 从 sourceId 提取显示名称 (格式: extended:sourceId:modName)
      const parts = sourceId.split(':')
      const displayName = parts.length >= 3 ? parts.slice(2).join(':') : sourceId

      dataSources.push({
        id: sourceId,
        label: `[Extended] ${displayName}`,
        materials: groupMaterialsByTags(materials),
        isExtended: true,
      })
    }
  } catch (error) {
    console.warn('Failed to load extended material data sources:', error)
  }

  return dataSources
}
