import { ApparelLayer } from '@/types/armor'
import { BodyPart } from '@/types/bodyPart'
import {
  DataSourceType,
  parseCSV,
  parseOptionalNumeric,
  parseOptionalDelimitedString,
  parseDelimitedString,
  loadCSVByLocale,
  normalizeModName,
} from './csvParserUtils'

/**
 * 衣物数据接口
 */
export interface ClothingData {
  defName: string
  label: string
  armorBlunt?: number
  armorSharp?: number
  armorHeat?: number
  materialCoefficient?: number
  acceptedMaterials?: string[]
  bodyPartCoverage?: BodyPart[]
  apparelLayers?: ApparelLayer[]
}

/**
 * 衣物数据源
 */
export interface ClothingDataSource {
  id: string
  label: string
  clothing: ClothingData[]
}

/**
 * CSV衣物数据行
 */
interface ApparelCSVRow extends Record<string, string> {
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
 * 解析身体部位
 */
function parseBodyParts(value: string): BodyPart[] {
  const parts = parseDelimitedString(value)
  const bodyParts = new Set<BodyPart>()

  for (const partStr of parts) {
    if (Object.values(BodyPart).includes(partStr as BodyPart)) {
      bodyParts.add(partStr as BodyPart)
    }
  }

  return Array.from(bodyParts)
}

/**
 * 解析服装层级
 */
function parseApparelLayers(value: string): ApparelLayer[] {
  const layers = parseDelimitedString(value)
  const apparelLayers: ApparelLayer[] = []

  for (const layerStr of layers) {
    const layerNum = parseInt(layerStr, 10)
    if (!isNaN(layerNum) && layerNum >= 0 && layerNum <= 5) {
      apparelLayers.push(layerNum as ApparelLayer)
    }
  }

  return apparelLayers
}

/**
 * 解析衣物CSV数据
 */
async function parseApparelCSV(csvContent: string): Promise<ClothingData[]> {
  const rows = await parseCSV<ApparelCSVRow>(csvContent)

  return rows
    .filter((row) => row.defName && row.defName.trim())
    .map((row) => {
      const clothing: ClothingData = {
        defName: row.defName.trim(),
        label: row.label?.trim() || row.defName.trim(),
        armorBlunt: parseOptionalNumeric(row.armorBlunt),
        armorSharp: parseOptionalNumeric(row.armorSharp),
        armorHeat: parseOptionalNumeric(row.armorHeat),
        materialCoefficient: parseOptionalNumeric(row.materialCoefficient),
        acceptedMaterials: parseOptionalDelimitedString(row.acceptedMaterials),
        bodyPartCoverage: row.bodyPartCoverage ? parseBodyParts(row.bodyPartCoverage) : undefined,
        apparelLayers: row.apparelLayers ? parseApparelLayers(row.apparelLayers) : undefined,
      }
      return clothing
    })
}

/**
 * 加载所有衣物数据源
 * @param locale 语言代码
 * @returns 衣物数据源数组
 */
export async function getApparelDataSources(locale: string): Promise<ClothingDataSource[]> {
  const modCSVMap = await loadCSVByLocale(DataSourceType.Apparel, locale)

  // 按数据源ID分组
  const dataSourceMap = new Map<string, ClothingData[]>()

  for (const [modName, csvContent] of modCSVMap.entries()) {
    try {
      const clothing = await parseApparelCSV(csvContent)
      if (clothing.length === 0) continue

      const sourceId = normalizeModName(modName)

      // 合并到对应的数据源
      if (!dataSourceMap.has(sourceId)) {
        dataSourceMap.set(sourceId, [])
      }
      dataSourceMap.get(sourceId)!.push(...clothing)
    } catch (error) {
      console.error(`Failed to parse apparel from ${modName}:`, error)
    }
  }

  // 转换为数据源数组
  const dataSources: ClothingDataSource[] = []
  for (const [sourceId, clothing] of dataSourceMap.entries()) {
    dataSources.push({
      id: sourceId,
      label: sourceId === 'vanilla' ? 'Vanilla' : sourceId,
      clothing,
    })
  }

  return dataSources
}
