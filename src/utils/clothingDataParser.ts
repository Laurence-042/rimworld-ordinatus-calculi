import Papa from 'papaparse'
import { ApparelLayer } from '@/types/armor'
import { BodyPart } from '@/types/bodyPart'

/**
 * 衣物数据接口
 */
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
                clothing.bodyPartCoverage = parseBodyParts(coverage)
              }

              // 解析层次
              const layers = row['层']?.trim()
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
 * 中文身体部位名称到 BodyPart 枚举的映射
 */
const bodyPartNameMap: Record<string, BodyPart> = {
  躯干: BodyPart.Torso,
  颈部: BodyPart.Neck,
  头部: BodyPart.Head,
  头骨: BodyPart.Skull,
  颅骨: BodyPart.Skull,
  大脑: BodyPart.Brain,
  眼睛: BodyPart.Eyes,
  左眼: BodyPart.Eyes,
  右眼: BodyPart.Eyes,
  耳朵: BodyPart.Ears,
  左耳: BodyPart.Ears,
  右耳: BodyPart.Ears,
  鼻子: BodyPart.Nose,
  舌头: BodyPart.Tongue,
  下颌: BodyPart.Jaw,
  脊柱: BodyPart.Spine,
  骨盆: BodyPart.Pelvis,
  胸骨: BodyPart.Sternum,
  肋骨: BodyPart.Ribcage,
  肺: BodyPart.Lung,
  胃: BodyPart.Stomach,
  肝脏: BodyPart.Liver,
  心脏: BodyPart.Heart,
  肾脏: BodyPart.Kidney,
  肩部: BodyPart.Shoulder,
  左肩: BodyPart.Shoulder,
  右肩: BodyPart.Shoulder,
  锁骨: BodyPart.Clavicle,
  手臂: BodyPart.Arm,
  左臂: BodyPart.Arm,
  右臂: BodyPart.Arm,
  肱骨: BodyPart.Humerus,
  桡骨: BodyPart.Radius,
  手: BodyPart.Hand,
  左手: BodyPart.Hand,
  右手: BodyPart.Hand,
  手指: BodyPart.Fingers,
  腿: BodyPart.Leg,
  左腿: BodyPart.Leg,
  右腿: BodyPart.Leg,
  股骨: BodyPart.Femur,
  胫骨: BodyPart.Tibia,
  脚: BodyPart.Foot,
  左脚: BodyPart.Foot,
  右脚: BodyPart.Foot,
  脚趾: BodyPart.Toes,
}

/**
 * 中文层级名称到 ApparelLayer 枚举的映射
 */
const apparelLayerNameMap: Record<string, ApparelLayer> = {
  皮肤: ApparelLayer.Skin,
  贴身: ApparelLayer.OnSkin,
  夹层: ApparelLayer.Middle,
  外套: ApparelLayer.Shell,
  配件: ApparelLayer.Belt,
  头饰: ApparelLayer.Overhead,
  眼饰: ApparelLayer.EyeCover,
}

/**
 * 解析身体部位字符串为 BodyPart 枚举数组
 */
function parseBodyParts(coverageStr: string): BodyPart[] {
  const parts = coverageStr
    .split(/[,，、]/)
    .map((part) => part.trim())
    .filter(Boolean)

  const bodyParts = new Set<BodyPart>()
  for (const partStr of parts) {
    const bodyPart = bodyPartNameMap[partStr]
    if (bodyPart) {
      bodyParts.add(bodyPart)
    }
  }

  return Array.from(bodyParts)
}

/**
 * 解析服装层级字符串为 ApparelLayer 枚举数组
 */
function parseApparelLayers(layersStr: string): ApparelLayer[] {
  const layers = layersStr
    .split(/[,，、]/)
    .map((layer) => layer.trim())
    .filter(Boolean)

  const apparelLayers: ApparelLayer[] = []
  for (const layerStr of layers) {
    const layer = apparelLayerNameMap[layerStr]
    if (layer !== undefined) {
      apparelLayers.push(layer)
    }
  }

  return apparelLayers
}

// 缓存
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
