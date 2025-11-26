import Papa from 'papaparse'

export interface ClothingData {
  name: string
  // 直接护甲值（如果有的话）
  armorBlunt?: number // 护甲 - 钝器
  armorSharp?: number // 护甲 - 利器
  armorHeat?: number // 护甲 - 热能
  // 材料系数（如果需要从材料计算的话）
  materialCoefficient?: number // 护甲 - 材料系数
  acceptedMaterials?: string[] // 材质
  // 覆盖部位和层次
  coverage?: string // 覆盖
  layers?: string[] // 层
}

export interface MaterialData {
  name: string
  armorSharp: number // 护甲 - 利器
  armorBlunt: number // 护甲 - 钝器
  armorHeat: number // 护甲 - 热能
  tags: MaterialTag[] // 材料标签
}

export type MaterialTag = 'metal' | 'wood' | 'leather' | 'fabric'

export interface MaterialDataSource {
  id: string
  label: string
  materials: {
    metal: MaterialData[]
    wood: MaterialData[]
    leather: MaterialData[]
    fabric: MaterialData[]
  }
}

/**
 * 根据分类判断材料标签
 */
function parseMaterialTags(category: string): MaterialTag[] {
  const tags: MaterialTag[] = []
  const lowerCategory = category.toLowerCase()

  if (lowerCategory.includes('金属') || lowerCategory.includes('metal')) {
    tags.push('metal')
  }
  if (lowerCategory.includes('木材') || lowerCategory.includes('wood')) {
    tags.push('wood')
  }
  if (lowerCategory.includes('皮革') || lowerCategory.includes('leather')) {
    tags.push('leather')
  }
  if (
    lowerCategory.includes('织物') ||
    lowerCategory.includes('纤维') ||
    lowerCategory.includes('fabric') ||
    lowerCategory.includes('cloth')
  ) {
    tags.push('fabric')
  }

  return tags
}

/**
 * 解析衣物CSV数据
 */
export async function parseClothingDataFromCSV(csvContent: string): Promise<ClothingData[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(csvContent, {
      complete: (results) => {
        try {
          const clothingData = results.data
            .filter((row) => row['名称'] && row['名称'].trim())
            .map((row) => {
              const clothing: ClothingData = {
                name: row['名称']!.trim(),
              }

              // 解析直接护甲值
              const armorBlunt = row['护甲 - 钝器']?.trim()
              const armorSharp = row['护甲 - 利器']?.trim()
              const armorHeat = row['护甲 - 热能']?.trim()

              if (armorBlunt) {
                clothing.armorBlunt = parsePercentage(armorBlunt)
              }
              if (armorSharp) {
                clothing.armorSharp = parsePercentage(armorSharp)
              }
              if (armorHeat) {
                clothing.armorHeat = parsePercentage(armorHeat)
              }

              // 解析材料系数
              const materialCoeff = row['护甲 - 材料系数']?.trim()
              if (materialCoeff) {
                clothing.materialCoefficient = parsePercentage(materialCoeff)
              }

              // 解析接受的材质
              const materials = row['材质']?.trim()
              if (materials) {
                clothing.acceptedMaterials = materials
                  .split(/[、，,]/)
                  .map((m) => m.trim())
                  .filter(Boolean)
              }

              // 解析覆盖部位
              const coverage = row['覆盖']?.trim()
              if (coverage) {
                clothing.coverage = coverage
              }

              // 解析层次
              const layers = row['层']?.trim()
              if (layers) {
                clothing.layers = layers
                  .split(/[、，,]/)
                  .map((l) => l.trim())
                  .filter(Boolean)
              }

              return clothing
            })

          resolve(clothingData)
        } catch (error) {
          reject(new Error(`解析衣物数据失败: ${error}`))
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
 * 将材料列表按标签分组
 */
function groupMaterialsByTags(materials: MaterialData[]): MaterialDataSource['materials'] {
  const grouped: MaterialDataSource['materials'] = {
    metal: [],
    wood: [],
    leather: [],
    fabric: [],
  }

  materials.forEach((material) => {
    material.tags.forEach((tag) => {
      grouped[tag].push(material)
    })
  })

  return grouped
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
