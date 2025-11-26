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
 * 解析材料CSV数据
 */
export async function parseMaterialDataFromCSV(csvContent: string): Promise<MaterialData[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(csvContent, {
      complete: (results) => {
        try {
          const materialData = results.data
            .filter((row) => row['名称'] && row['名称'].trim())
            .map((row) => {
              const category = row['分类'] || ''
              const tags = parseMaterialTags(category)

              const material: MaterialData = {
                name: row['名称']!.trim(),
                armorSharp: parsePercentage(row['护甲 - 利器']?.trim() || '0%'),
                armorBlunt: parsePercentage(row['护甲 - 钝器']?.trim() || '0%'),
                armorHeat: parsePercentage(row['护甲 - 热能']?.trim() || '0%'),
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
 */
function groupMaterialsByTags(materials: MaterialData[]): MaterialDataSource['materials'] {
  const grouped: MaterialDataSource['materials'] = {
    [MaterialTag.Metal]: [],
    [MaterialTag.Wood]: [],
    [MaterialTag.Leather]: [],
    [MaterialTag.Fabric]: [],
  }

  materials.forEach((material) => {
    material.tags.forEach((tag) => {
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

// 缓存
let cachedMaterialDataSources: MaterialDataSource[] | null = null

/**
 * 加载材料数据源
 */
export async function getMaterialDataSources(): Promise<MaterialDataSource[]> {
  if (cachedMaterialDataSources) {
    return cachedMaterialDataSources
  }

  const dataSources: MaterialDataSource[] = []

  try {
    // 动态导入 Vanilla 材料数据
    const vanillaCSV = await import('./material_data/Vanilla.csv?raw')
    const vanillaMaterials = await parseMaterialDataFromCSV(vanillaCSV.default)
    const groupedMaterials = groupMaterialsByTags(vanillaMaterials)

    dataSources.push({
      id: 'vanilla',
      label: 'Vanilla',
      materials: groupedMaterials,
    })
  } catch (error) {
    console.error('Failed to load Vanilla materials:', error)
  }

  cachedMaterialDataSources = dataSources
  return dataSources
}
