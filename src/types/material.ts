/**
 * 材料类型定义
 */

/**
 * 材料标签枚举
 * 值与RimWorld XML中的stuffProps.categories保持一致
 */
export enum MaterialTag {
  /** 金属材料 */
  Metallic = 'Metallic',
  /** 木材材料 */
  Woody = 'Woody',
  /** 皮革材料 */
  Leathery = 'Leathery',
  /** 织物材料 */
  Fabric = 'Fabric',
}

/**
 * 材料标签名称映射（用于从服装CSV的acceptedMaterials解析）
 */
export const MaterialTagNames: Record<string, MaterialTag> = {
  // XML原始值
  Metallic: MaterialTag.Metallic,
  Woody: MaterialTag.Woody,
  Leathery: MaterialTag.Leathery,
  Fabric: MaterialTag.Fabric,
  // 中文名称（服装CSV中的acceptedMaterials字段）
  金属: MaterialTag.Metallic,
  木材: MaterialTag.Woody,
  木: MaterialTag.Woody,
  皮革: MaterialTag.Leathery,
  织物: MaterialTag.Fabric,
  纤维: MaterialTag.Fabric,
}

/**
 * 解析接受的材料列表
 * @param acceptedMaterials - 材料名称数组（如 ["纤维", "皮革"]）
 * @returns 材料标签数组
 */
export function parseAcceptedMaterials(acceptedMaterials?: string[]): MaterialTag[] {
  if (!acceptedMaterials || acceptedMaterials.length === 0) {
    return [MaterialTag.Metallic, MaterialTag.Woody, MaterialTag.Leathery, MaterialTag.Fabric]
  }

  const tags: MaterialTag[] = []
  acceptedMaterials.forEach((material) => {
    const trimmed = material.trim()
    const tag = MaterialTagNames[trimmed]
    if (tag && !tags.includes(tag)) {
      tags.push(tag)
    }
  })

  return tags.length > 0
    ? tags
    : [MaterialTag.Metallic, MaterialTag.Woody, MaterialTag.Leathery, MaterialTag.Fabric]
}

/**
 * 材料数据接口
 */
export interface MaterialData {
  name: string
  armorSharp: number // 护甲 - 利器
  armorBlunt: number // 护甲 - 钝器
  armorHeat: number // 护甲 - 热能
  tags: MaterialTag[] // 材料标签
}

/**
 * 材料数据源接口
 */
export interface MaterialDataSource {
  id: string
  label: string
  materials: {
    [MaterialTag.Metallic]: MaterialData[]
    [MaterialTag.Woody]: MaterialData[]
    [MaterialTag.Leathery]: MaterialData[]
    [MaterialTag.Fabric]: MaterialData[]
  }
}
