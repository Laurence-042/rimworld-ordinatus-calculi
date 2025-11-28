import Papa from 'papaparse'
import { ApparelLayer } from '@/types/armor'
import { BodyPart } from '@/types/bodyPart'
import { DataSourceType, getDataSourcePathRegex } from './dataSourceConfig'

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
 * 衣物预设数据（来自 CSV）
 */
export interface ClothingPreset {
  defName: string
  data: ClothingData
}

/**
 * 衣物数据源分组
 */
export interface ClothingDataSource {
  id: string // 数据源ID，如 'Vanilla', 'Mod1'
  label: string // 显示名称，如 'Vanilla', 'Mod 1'
  clothing: ClothingPreset[]
}

/**
 * 通用的字段解析函数
 */
const parseFloatField = (value: string | undefined): number | undefined => {
  if (!value || value.trim() === '') return undefined
  return parseFloat(value.trim())
}

const parseStringArrayField = (value: string | undefined): string[] | undefined => {
  if (!value || value.trim() === '') return undefined
  return splitDelimitedString(value.trim())
}

/**
 * 通用的分隔字符串解析函数
 * 用于处理逗号/顿号分隔的字符串
 */
const splitDelimitedString = (value: string): string[] => {
  return value
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

/**
 * 解析衣物CSV数据
 */
export async function parseClothingDataFromCSV(csvContent: string): Promise<ClothingPreset[]> {
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
              clothing.armorBlunt = parseFloatField(row['armorBlunt'])
              clothing.armorSharp = parseFloatField(row['armorSharp'])
              clothing.armorHeat = parseFloatField(row['armorHeat'])

              // 解析材料系数
              clothing.materialCoefficient = parseFloatField(row['materialCoefficient'])

              // 解析接受的材质
              clothing.acceptedMaterials = parseStringArrayField(row['acceptedMaterials'])

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

          // 转换为 ClothingPreset 结构
          const clothingPresets: ClothingPreset[] = clothingData.map((clothing) => ({
            defName: clothing.defName,
            data: clothing,
          }))

          resolve(clothingPresets)
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
  const parts = splitDelimitedString(coverageStr)

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
  const layers = splitDelimitedString(layersStr)

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

const DEBUG_MODE = false // 设置为true以启用调试输出

/**
 * 从所有 MOD 目录加载衣物数据
 * 根据指定语言加载对应的 CSV 文件
 *
 * @param locale - 语言代码（如 'zh-CN', 'en-US'）
 * @returns 衣物数据源数组
 */
export async function getApparelDataSources(locale: string): Promise<ClothingDataSource[]> {
  // 动态加载所有 MOD 目录下的 CSV 文件
  const csvFilesGlob = import.meta.glob('./apparel_data/**/*.csv', {
    query: '?raw',
    eager: false,
  })

  const dataSources: ClothingDataSource[] = []
  const pathRegex = getDataSourcePathRegex(DataSourceType.Apparel)

  // 按 MOD 目录分组
  const modGroups = new Map<
    string,
    { locale: string; path: string; loader: () => Promise<unknown> }
  >()

  for (const [path, loader] of Object.entries(csvFilesGlob)) {
    // 解析路径：./apparel_data/<MOD_NAME>/<locale>.csv
    const match = path.match(pathRegex)
    if (!match) continue

    const modName = match[1]
    const fileLocale = match[2]

    if (!modName || !fileLocale) continue

    // 如果该 MOD 还没有加载，或者当前文件匹配目标语言
    if (!modGroups.has(modName) || fileLocale === locale) {
      modGroups.set(modName, { locale: fileLocale, path, loader })
    }
  }

  // 加载每个 MOD 的数据
  for (const [modName, { locale: fileLocale, path, loader }] of modGroups.entries()) {
    try {
      const module = (await loader()) as { default: string }
      const csvContent = module.default

      const clothing = await parseClothingDataFromCSV(csvContent)

      if (clothing.length > 0) {
        dataSources.push({
          id: modName,
          label: modName,
          clothing,
        })
        console.log(`Loaded ${clothing.length} clothing items from ${modName} (${fileLocale})`)
      }
    } catch (error) {
      console.warn(`Failed to load data from ${path}:`, error)
    }
  }

  return dataSources
}
