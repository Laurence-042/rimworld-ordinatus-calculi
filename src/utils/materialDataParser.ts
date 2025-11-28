import Papa from 'papaparse'
import { type MaterialData, type MaterialDataSource, MaterialTag } from '@/types/material'

// 重新导出类型供外部使用
export type { MaterialData, MaterialDataSource }
export { MaterialTag }

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
 * 解析材料标签列表（逗号分隔的MaterialTag枚举值）
 * 例如："Metallic,Woody" -> [MaterialTag.Metallic, MaterialTag.Woody]
 * 注意：由于枚举值现在就是XML原始值，直接验证即可
 */
function parseCategoryTags(value: string): MaterialTag[] {
  if (!value || !value.trim()) return []

  const tags: MaterialTag[] = []
  const parts = value.split(',').map((s) => s.trim())

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
 * 解析材料CSV数据（支持中英文两种格式）
 */
export async function parseMaterialDataFromCSV(csvContent: string): Promise<MaterialData[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(csvContent, {
      complete: (results) => {
        try {
          const materialData = results.data
            .filter((row) => {
              const name = row['label']
              return name && name.trim()
            })
            .map((row) => {
              const material: MaterialData = {
                name: row['label']!.trim(),
                armorSharp: parseNumeric(row['armorSharp'] || '0'),
                armorBlunt: parseNumeric(row['armorBlunt'] || '0'),
                armorHeat: parseNumeric(row['armorHeat'] || '0'),
                tags: parseCategoryTags(row['categories'] || ''),
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
  } catch (error) {
    console.error('Failed to load material data sources:', error)
  }

  cachedMaterialDataSources.set(locale, dataSources)
  return dataSources
}
