/**
 * 材料类型定义
 */

/**
 * 材料标签枚举
 */
export enum MaterialTag {
  /** 金属材料 */
  Metal = 'metal',
  /** 木材材料 */
  Wood = 'wood',
  /** 皮革材料 */
  Leather = 'leather',
  /** 织物材料 */
  Fabric = 'fabric',
}

/**
 * 材料标签名称映射（中文 → 枚举）
 */
export const MaterialTagNames: Record<string, MaterialTag> = {
  金属: MaterialTag.Metal,
  metal: MaterialTag.Metal,
  Metal: MaterialTag.Metal,
  木材: MaterialTag.Wood,
  wood: MaterialTag.Wood,
  Wood: MaterialTag.Wood,
  木: MaterialTag.Wood,
  皮革: MaterialTag.Leather,
  leather: MaterialTag.Leather,
  Leather: MaterialTag.Leather,
  织物: MaterialTag.Fabric,
  纤维: MaterialTag.Fabric,
  fabric: MaterialTag.Fabric,
  Fabric: MaterialTag.Fabric,
  cloth: MaterialTag.Fabric,
  Cloth: MaterialTag.Fabric,
}

/**
 * 获取材料标签的显示名称
 */
export function getMaterialTagName(tag: MaterialTag): string {
  const names: Record<MaterialTag, string> = {
    [MaterialTag.Metal]: '金属',
    [MaterialTag.Wood]: '木材',
    [MaterialTag.Leather]: '皮革',
    [MaterialTag.Fabric]: '织物',
  }
  return names[tag] || '未知'
}

/**
 * 根据分类字符串解析材料标签
 */
export function parseMaterialTags(category: string): MaterialTag[] {
  const tags: MaterialTag[] = []
  const lowerCategory = category.toLowerCase()

  if (lowerCategory.includes('金属') || lowerCategory.includes('metal')) {
    tags.push(MaterialTag.Metal)
  }
  if (
    lowerCategory.includes('木材') ||
    lowerCategory.includes('木') ||
    lowerCategory.includes('wood')
  ) {
    tags.push(MaterialTag.Wood)
  }
  if (lowerCategory.includes('皮革') || lowerCategory.includes('leather')) {
    tags.push(MaterialTag.Leather)
  }
  if (
    lowerCategory.includes('织物') ||
    lowerCategory.includes('纤维') ||
    lowerCategory.includes('fabric') ||
    lowerCategory.includes('cloth')
  ) {
    tags.push(MaterialTag.Fabric)
  }

  return tags
}

/**
 * 解析接受的材料列表
 * @param acceptedMaterials - 材料名称数组（如 ["纤维", "皮革"]）
 * @returns 材料标签数组
 */
export function parseAcceptedMaterials(acceptedMaterials?: string[]): MaterialTag[] {
  if (!acceptedMaterials || acceptedMaterials.length === 0) {
    return [MaterialTag.Metal, MaterialTag.Wood, MaterialTag.Leather, MaterialTag.Fabric]
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
    : [MaterialTag.Metal, MaterialTag.Wood, MaterialTag.Leather, MaterialTag.Fabric]
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
    [MaterialTag.Metal]: MaterialData[]
    [MaterialTag.Wood]: MaterialData[]
    [MaterialTag.Leather]: MaterialData[]
    [MaterialTag.Fabric]: MaterialData[]
  }
}
