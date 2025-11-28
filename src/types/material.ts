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
 * 材料标签名称映射（中文/英文 → 枚举）
 */
export const MaterialTagNames: Record<string, MaterialTag> = {
  // XML原始值
  Metallic: MaterialTag.Metallic,
  Woody: MaterialTag.Woody,
  Leathery: MaterialTag.Leathery,
  Fabric: MaterialTag.Fabric,
  // 中文
  金属: MaterialTag.Metallic,
  木材: MaterialTag.Woody,
  木: MaterialTag.Woody,
  皮革: MaterialTag.Leathery,
  织物: MaterialTag.Fabric,
  纤维: MaterialTag.Fabric,
  // 兼容旧值
  metal: MaterialTag.Metallic,
  Metal: MaterialTag.Metallic,
  wood: MaterialTag.Woody,
  Wood: MaterialTag.Woody,
  leather: MaterialTag.Leathery,
  Leather: MaterialTag.Leathery,
  fabric: MaterialTag.Fabric,
  cloth: MaterialTag.Fabric,
  Cloth: MaterialTag.Fabric,
}

/**
 * 获取材料标签的显示名称
 */
export function getMaterialTagName(tag: MaterialTag): string {
  const names: Record<MaterialTag, string> = {
    [MaterialTag.Metallic]: '金属',
    [MaterialTag.Woody]: '木材',
    [MaterialTag.Leathery]: '皮革',
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

  // XML原始值（优先匹配）
  if (category === 'Metallic' || lowerCategory.includes('metallic')) {
    tags.push(MaterialTag.Metallic)
  }
  if (category === 'Woody' || lowerCategory.includes('woody')) {
    tags.push(MaterialTag.Woody)
  }
  if (category === 'Leathery' || lowerCategory.includes('leathery')) {
    tags.push(MaterialTag.Leathery)
  }
  if (category === 'Fabric' || lowerCategory.includes('fabric')) {
    tags.push(MaterialTag.Fabric)
  }

  // 兼容旧格式
  if (lowerCategory.includes('金属') || lowerCategory.includes('metal')) {
    tags.push(MaterialTag.Metallic)
  }
  if (
    lowerCategory.includes('木材') ||
    lowerCategory.includes('木') ||
    lowerCategory.includes('wood')
  ) {
    tags.push(MaterialTag.Woody)
  }
  if (lowerCategory.includes('皮革') || lowerCategory.includes('leather')) {
    tags.push(MaterialTag.Leathery)
  }
  if (
    lowerCategory.includes('织物') ||
    lowerCategory.includes('纤维') ||
    lowerCategory.includes('cloth')
  ) {
    tags.push(MaterialTag.Fabric)
  }

  // 去重
  return Array.from(new Set(tags))
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
