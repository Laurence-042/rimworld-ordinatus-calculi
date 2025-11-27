import Papa from 'papaparse'
import { ApparelLayer } from '@/types/armor'
import { BodyPart } from '@/types/bodyPart'

/**
 * 衣物数据接口
 */
export interface ClothingData {
  defName: string
  label: string
  // 直接护甲值（如果有的话）
  armorBlunt?: number // 护甲 - 钝器
  armorSharp?: number // 护甲 - 利器
  armorHeat?: number // 护甲 - 热能
  // 材料系数（如果需要从材料计算的话）
  materialCoefficient?: number // 护甲 - 材料系数
  acceptedMaterials?: string[] // 材质
  // 覆盖部位和层次
  bodyPartCoverage?: BodyPart[] // 覆盖的身体部位
  apparelLayers?: ApparelLayer[] // 服装层级
}

/**
 * 衣物数据源接口
 */
export interface ClothingDataSource {
  id: string
  label: string
  clothing: ClothingData[]
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
            .filter((row) => row['defName'] && row['defName'].trim())
            .map((row) => {
              const clothing: ClothingData = {
                defName: row['defName']!.trim(),
                label: row['label']?.trim() || row['defName']!.trim(),
              }

              // 解析直接护甲值 (CSV中已经是小数格式 0-2)
              const armorBlunt = row['armorBlunt']?.trim()
              const armorSharp = row['armorSharp']?.trim()
              const armorHeat = row['armorHeat']?.trim()

              if (armorBlunt && armorBlunt !== '') {
                clothing.armorBlunt = parseFloat(armorBlunt)
              }
              if (armorSharp && armorSharp !== '') {
                clothing.armorSharp = parseFloat(armorSharp)
              }
              if (armorHeat && armorHeat !== '') {
                clothing.armorHeat = parseFloat(armorHeat)
              }

              // 解析材料系数
              const materialCoeff = row['materialCoefficient']?.trim()
              if (materialCoeff && materialCoeff !== '') {
                clothing.materialCoefficient = parseFloat(materialCoeff)
              }

              // 解析接受的材质
              const materials = row['acceptedMaterials']?.trim()
              if (materials) {
                clothing.acceptedMaterials = materials
                  .split(/[、，,]/)
                  .map((m) => m.trim())
                  .filter(Boolean)
              }

              // 解析覆盖部位
              const coverage = row['bodyPartCoverage']?.trim()
              if (coverage) {
                clothing.bodyPartCoverage = parseBodyParts(coverage)
              }

              // 解析层次
              const layers = row['apparelLayers']?.trim()
              if (layers) {
                clothing.apparelLayers = parseApparelLayers(layers)
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
 * 缓存所有在CSV中见过的身体部位字符串（用于调试）
 */
const seenBodyPartStrings = new Set<string>()

/**
 * 解析身体部位字符串为 BodyPart 枚举数组
 * CSV中存储的是BodyPart枚举值，用逗号或顿号分隔
 */
function parseBodyParts(coverageStr: string): BodyPart[] {
  const parts = coverageStr
    .split(/[,，、]/)
    .map((part) => part.trim())
    .filter(Boolean)

  const bodyParts = new Set<BodyPart>()
  for (const partStr of parts) {
    // 记录所有见过的部位字符串
    seenBodyPartStrings.add(partStr)

    // 直接验证是否是有效的BodyPart枚举值
    if (Object.values(BodyPart).includes(partStr as BodyPart)) {
      bodyParts.add(partStr as BodyPart)
    } else if (DEBUG_MODE) {
      console.warn(`未知的身体部位: ${partStr}`)
    }
  }

  return Array.from(bodyParts)
}

/**
 * 解析服装层级字符串为 ApparelLayer 枚举数组
 * CSV中存储的是ApparelLayer枚举数值（0-5），用逗号或顿号分隔
 */
function parseApparelLayers(layersStr: string): ApparelLayer[] {
  const layers = layersStr
    .split(/[,，、]/)
    .map((layer) => layer.trim())
    .filter(Boolean)

  const apparelLayers: ApparelLayer[] = []
  for (const layerStr of layers) {
    const layerNum = parseInt(layerStr, 10)
    if (!isNaN(layerNum) && layerNum >= 0 && layerNum <= 5) {
      apparelLayers.push(layerNum as ApparelLayer)
    } else if (DEBUG_MODE) {
      console.warn(`未知的服装层级: ${layerStr}`)
    }
  }

  return apparelLayers
}

const DEBUG_MODE = false // 设置为true以启用调试输出// 缓存
let cachedClothingDataSources: ClothingDataSource[] | null = null

/**
 * 加载衣物数据源
 */
export async function getClothingDataSources(): Promise<ClothingDataSource[]> {
  if (cachedClothingDataSources) {
    return cachedClothingDataSources
  }

  const dataSources: ClothingDataSource[] = []

  try {
    // 动态导入 Vanilla 衣物数据
    const vanillaCSV = await import('./clothing_data/Vanilla.csv?raw')
    const vanillaClothing = await parseClothingDataFromCSV(vanillaCSV.default)

    dataSources.push({
      id: 'vanilla',
      label: 'Vanilla',
      clothing: vanillaClothing,
    })
  } catch (error) {
    console.error('Failed to load Vanilla clothing:', error)
  }

  cachedClothingDataSources = dataSources
  return dataSources
}
