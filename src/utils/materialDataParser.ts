import Papa from 'papaparse'
import {
  type MaterialData,
  type MaterialDataSource,
  MaterialTag,
  parseMaterialTags,
} from '@/types/material'

// 重新导出类型供外部使用
export type { MaterialData, MaterialDataSource }
export { MaterialTag }

/**
 * 解析百分比字符串为数值（0-2范围）
 * 例如："100%" -> 1.0, "200%" -> 2.0
 */
function parsePercentage(value: string): number {
  if (!value) return 0

  // 移除百分号和其他非数字字符（保留小数点和负号）
  const numStr = value.replace(/[^\d.-]/g, '')
  const num = parseFloat(numStr)

  if (isNaN(num)) return 0

  // 转换为0-2范围（假设输入是百分比）
  return num / 100
}

/**
 * 解析纯数值字符串（0-2范围，直接使用）
 * 例如："1.14" -> 1.14
 */
function parseNumeric(value: string): number {
  if (!value) return 0
  const num = parseFloat(value.trim())
  return isNaN(num) ? 0 : num
}

/**
 * XML原始材料类别到MaterialTag枚举的映射
 */
const STUFF_CATEGORY_MAP: Record<string, MaterialTag> = {
  Metallic: MaterialTag.Metal,
  Woody: MaterialTag.Wood,
  Leathery: MaterialTag.Leather,
  Fabric: MaterialTag.Fabric,
}

/**
 * 解析材料标签列表（逗号分隔的MaterialTag枚举值或XML原始category）
 * 例如："Metallic,Woody" -> [MaterialTag.Metal, MaterialTag.Wood]
 * 或："metal,fabric" -> [MaterialTag.Metal, MaterialTag.Fabric]（兼容旧格式）
 */
function parseCategoryTags(value: string): MaterialTag[] {
  if (!value || !value.trim()) return []

  const tags: MaterialTag[] = []
  const parts = value.split(',').map((s) => s.trim())

  for (const part of parts) {
    // 先尝试映射XML原始category（如"Metallic" -> MaterialTag.Metal）
    const mappedTag = STUFF_CATEGORY_MAP[part]
    if (mappedTag) {
      tags.push(mappedTag)
      continue
    }

    // 如果映射失败，尝试直接匹配MaterialTag枚举值（兼容旧格式）
    const tag = part as MaterialTag
    if (Object.values(MaterialTag).includes(tag)) {
      tags.push(tag)
    }
  }

  return tags
}

/**
 * 解析材料CSV数据（支持中英文两种格式）
 */
export async function parseMaterialDataFromCSV(csvContent: string): Promise<MaterialData[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(csvContent, {
      complete: (results) => {
        try {
          const materialData = results.data
            .filter((row) => {
              // 支持中文列名（旧格式）或英文列名（XML生成格式）
              const name = row['名称'] || row['label']
              return name && name.trim()
            })
            .map((row) => {
              // 判断是旧格式（中文列名）还是新格式（英文列名）
              const isLegacyFormat = '名称' in row

              let name: string
              let tags: MaterialTag[]
              let armorSharp: number
              let armorBlunt: number
              let armorHeat: number

              if (isLegacyFormat) {
                // 旧格式：中文列名，百分比格式，从描述性分类中解析标签
                name = row['名称']!.trim()
                const category = row['分类'] || ''
                tags = parseMaterialTags(category)
                armorSharp = parsePercentage(row['护甲 - 利器']?.trim() || '0%')
                armorBlunt = parsePercentage(row['护甲 - 钝器']?.trim() || '0%')
                armorHeat = parsePercentage(row['护甲 - 热能']?.trim() || '0%')
              } else {
                // 新格式：英文列名，数值格式，从categories字段解析标签
                name = row['label']!.trim()
                tags = parseCategoryTags(row['categories'] || '')
                armorSharp = parseNumeric(row['armorSharp'] || '0')
                armorBlunt = parseNumeric(row['armorBlunt'] || '0')
                armorHeat = parseNumeric(row['armorHeat'] || '0')
              }

              const material: MaterialData = {
                name,
                armorSharp,
                armorBlunt,
                armorHeat,
                tags,
              }

              return material
            })

          resolve(materialData)
        } catch (error) {
          reject(new Error(`解析材料数据失败: ${error}`))
        }
      },
      error: (error: Error) => {
        reject(new Error(`CSV解析错误: ${error.message}`))
      },
      header: true,
      skipEmptyLines: true,
    })
  })
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
    [MaterialTag.Metal]: [],
    [MaterialTag.Wood]: [],
    [MaterialTag.Leather]: [],
    [MaterialTag.Fabric]: [],
  }

  materials.forEach((material) => {
    // 检查是否同时拥有皮革和织物标签
    const hasLeather = material.tags.includes(MaterialTag.Leather)
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

// 缓存（按语言代码）
const cachedMaterialDataSources = new Map<string, MaterialDataSource[]>()

/**
 * 从所有 MOD 目录加载材料数据
 * 根据指定语言加载对应的 CSV 文件
 *
 * @param locale - 语言代码（如 'zh-CN', 'en-US'）
 * @returns 材料数据源数组
 */
export async function getMaterialDataSources(
  locale: string = 'zh-CN',
): Promise<MaterialDataSource[]> {
  // 检查缓存
  if (cachedMaterialDataSources.has(locale)) {
    return cachedMaterialDataSources.get(locale)!
  }

  const dataSources: MaterialDataSource[] = []

  try {
    // 动态加载所有 MOD 目录下的 CSV 文件
    const csvFilesGlob = import.meta.glob('./material_data/**/*.csv', {
      query: '?raw',
      eager: false,
    })

    const pathRegex = /\.\/material_data\/([^/]+)\/([^/]+)\.csv$/

    // 按 MOD 分组加载
    const modMaterialsMap = new Map<string, MaterialData[]>()

    for (const [path, importFn] of Object.entries(csvFilesGlob)) {
      const match = path.match(pathRegex)
      if (!match) continue

      const [, modName, fileLocale] = match
      if (!modName || !fileLocale) continue

      // 只加载指定语言的文件
      if (fileLocale !== locale) continue

      try {
        const module = (await importFn()) as { default: string }
        const csvContent = module.default
        const materials = await parseMaterialDataFromCSV(csvContent)

        modMaterialsMap.set(modName, materials)
      } catch (error) {
        console.error(`Failed to load materials from ${modName}:`, error)
      }
    }

    // 转换为 MaterialDataSource 格式
    for (const [modName, materials] of modMaterialsMap.entries()) {
      const groupedMaterials = groupMaterialsByTags(materials)

      dataSources.push({
        id: modName.toLowerCase(),
        label: modName,
        materials: groupedMaterials,
      })
    }

    // 如果没有找到任何数据，尝试加载旧版 Vanilla.csv（后备方案）
    if (dataSources.length === 0 && locale === 'zh-CN') {
      try {
        const vanillaCSV = await import('./material_data/Vanilla.csv?raw')
        const vanillaMaterials = await parseMaterialDataFromCSV(vanillaCSV.default)
        const groupedMaterials = groupMaterialsByTags(vanillaMaterials)

        dataSources.push({
          id: 'vanilla',
          label: 'Vanilla',
          materials: groupedMaterials,
        })
      } catch (error) {
        console.error('Failed to load legacy Vanilla.csv:', error)
      }
    }
  } catch (error) {
    console.error('Failed to load material data sources:', error)
  }

  cachedMaterialDataSources.set(locale, dataSources)
  return dataSources
}
