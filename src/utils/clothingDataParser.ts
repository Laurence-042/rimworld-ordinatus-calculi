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
 * 基于 RimWorld 官方中文部位名称
 */
const bodyPartNameMap: Record<string, BodyPart> = {
  // 核心部位
  躯干: BodyPart.Torso,
  颈部: BodyPart.Neck,
  头: BodyPart.Head,
  头部: BodyPart.Head,
  腰: BodyPart.Waist,

  // 头部子部位
  颅骨: BodyPart.Skull,
  头骨: BodyPart.Skull,
  大脑: BodyPart.Brain,
  脑: BodyPart.Brain,
  左眼: BodyPart.LeftEye,
  右眼: BodyPart.RightEye,
  眼: BodyPart.LeftEye, // 通用"眼"默认映射到左眼（CSV中通常会同时列出左右）
  眼睛: BodyPart.LeftEye,
  左耳: BodyPart.LeftEar,
  右耳: BodyPart.RightEar,
  耳: BodyPart.LeftEar, // 通用"耳"默认映射到左耳
  耳朵: BodyPart.LeftEar,
  鼻: BodyPart.Nose,
  鼻子: BodyPart.Nose,
  下颌: BodyPart.Jaw,
  下颚: BodyPart.Jaw,
  舌: BodyPart.Tongue,
  舌头: BodyPart.Tongue,

  // 躯干内部器官
  脊椎: BodyPart.Spine,
  脊柱: BodyPart.Spine,
  肋骨: BodyPart.Ribcage,
  胸骨: BodyPart.Sternum,
  骨盆: BodyPart.Pelvis,
  心脏: BodyPart.Heart,
  心: BodyPart.Heart,
  左肺: BodyPart.LeftLung,
  右肺: BodyPart.RightLung,
  肺: BodyPart.LeftLung, // 通用"肺"默认映射到左肺
  肝: BodyPart.Liver,
  肝脏: BodyPart.Liver,
  胃: BodyPart.Stomach,
  左肾: BodyPart.LeftKidney,
  右肾: BodyPart.RightKidney,
  肾: BodyPart.LeftKidney, // 通用"肾"默认映射到左肾
  肾脏: BodyPart.LeftKidney,

  // 上肢
  左肩: BodyPart.LeftShoulder,
  右肩: BodyPart.RightShoulder,
  肩: BodyPart.LeftShoulder,
  肩部: BodyPart.LeftShoulder,
  左锁骨: BodyPart.LeftClavicle,
  右锁骨: BodyPart.RightClavicle,
  锁骨: BodyPart.LeftClavicle,
  左臂: BodyPart.LeftArm,
  右臂: BodyPart.RightArm,
  左手臂: BodyPart.LeftArm,
  右手臂: BodyPart.RightArm,
  手臂: BodyPart.LeftArm,
  臂: BodyPart.LeftArm,
  左肱骨: BodyPart.LeftHumerus,
  右肱骨: BodyPart.RightHumerus,
  肱骨: BodyPart.LeftHumerus,
  左桡骨: BodyPart.LeftRadius,
  右桡骨: BodyPart.RightRadius,
  桡骨: BodyPart.LeftRadius,
  左手: BodyPart.LeftHand,
  右手: BodyPart.RightHand,
  手: BodyPart.LeftHand,

  // 手指（统称，映射到左右手指）
  左手指: BodyPart.LeftFingers,
  右手指: BodyPart.RightFingers,
  手指: BodyPart.LeftFingers,
  // 具体手指（都映射到对应侧的手指，因为枚举中没有细分）
  尾指: BodyPart.LeftFingers,
  小指: BodyPart.LeftFingers,
  无名指: BodyPart.LeftFingers,
  中指: BodyPart.LeftFingers,
  食指: BodyPart.LeftFingers,
  拇指: BodyPart.LeftFingers,

  // 下肢
  左腿: BodyPart.LeftLeg,
  右腿: BodyPart.RightLeg,
  腿: BodyPart.LeftLeg,
  左股骨: BodyPart.LeftFemur,
  右股骨: BodyPart.RightFemur,
  股骨: BodyPart.LeftFemur,
  左胫骨: BodyPart.LeftTibia,
  右胫骨: BodyPart.RightTibia,
  胫骨: BodyPart.LeftTibia,
  左脚: BodyPart.LeftFoot,
  右脚: BodyPart.RightFoot,
  脚: BodyPart.LeftFoot,

  // 脚趾（统称，映射到左右脚趾）
  左脚趾: BodyPart.LeftToes,
  右脚趾: BodyPart.RightToes,
  脚趾: BodyPart.LeftToes,
  // 具体脚趾（都映射到对应侧的脚趾，因为枚举中没有细分）
  小趾: BodyPart.LeftToes,
  次小趾: BodyPart.LeftToes,
  三趾: BodyPart.LeftToes,
  二趾: BodyPart.LeftToes,
  大拇趾: BodyPart.LeftToes,
  大趾: BodyPart.LeftToes,
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
 * 缓存所有在CSV中见过的身体部位字符串
 */
const seenBodyPartStrings = new Set<string>()

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
    // 记录所有见过的部位字符串
    seenBodyPartStrings.add(partStr)

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

    // 输出所有在CSV中见过的身体部位
    if (seenBodyPartStrings.size > 0) {
      console.log('CSV中出现的所有身体部位字符串：')
      const sortedParts = Array.from(seenBodyPartStrings).sort()
      sortedParts.forEach((part) => {
        const mapped = bodyPartNameMap[part]
        if (mapped) {
          console.log(`  ✓ ${part} → ${mapped}`)
        } else {
          console.warn(`  ✗ ${part} → 未映射`)
        }
      })
      console.log(`总计: ${seenBodyPartStrings.size} 个不同的身体部位字符串`)

      // 统计未映射的部位
      const unmappedParts = sortedParts.filter((part) => !bodyPartNameMap[part])
      if (unmappedParts.length > 0) {
        console.warn(`警告: 有 ${unmappedParts.length} 个身体部位未映射:`, unmappedParts)
      }
    }
  } catch (error) {
    console.error('Failed to load Vanilla clothing:', error)
  }

  cachedClothingDataSources = dataSources
  return dataSources
}
