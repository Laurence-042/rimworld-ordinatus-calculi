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
  armorBlunt: number // 护甲 - 钝器
  armorSharp: number // 护甲 - 利器
  armorHeat: number // 护甲 - 热能
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
              const material: MaterialData = {
                name: row['名称']!.trim(),
                armorBlunt: parsePercentage(row['护甲 - 钝器']?.trim() || '0%'),
                armorSharp: parsePercentage(row['护甲 - 利器']?.trim() || '0%'),
                armorHeat: parsePercentage(row['护甲 - 热能']?.trim() || '0%'),
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
): { armorBlunt: number; armorSharp: number; armorHeat: number } {
  return {
    armorBlunt: materialCoefficient * material.armorBlunt,
    armorSharp: materialCoefficient * material.armorSharp,
    armorHeat: materialCoefficient * material.armorHeat,
  }
}
