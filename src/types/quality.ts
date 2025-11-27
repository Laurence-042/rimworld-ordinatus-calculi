/**
 * 品质系统 (Quality System)
 * 定义武器和装备的品质等级及其对应的系数
 */

/**
 * 品质等级枚举
 */
export enum QualityCategory {
  Awful = 'awful', // 极差
  Poor = 'poor', // 较差
  Normal = 'normal', // 一般
  Good = 'good', // 良好
  Excellent = 'excellent', // 极佳
  Masterwork = 'masterwork', // 大师
  Legendary = 'legendary', // 传奇
}

/**
 * 品质等级名称映射（中文）
 */
export const QualityNames: Record<QualityCategory, string> = {
  [QualityCategory.Awful]: '极差',
  [QualityCategory.Poor]: '较差',
  [QualityCategory.Normal]: '一般',
  [QualityCategory.Good]: '良好',
  [QualityCategory.Excellent]: '极佳',
  [QualityCategory.Masterwork]: '大师',
  [QualityCategory.Legendary]: '传奇',
}

/**
 * 品质等级颜色（基于RimWorld Quality Colors mod）
 */
export const QualityColors: Record<QualityCategory, string> = {
  [QualityCategory.Awful]: '#ff0000', // 红色
  [QualityCategory.Poor]: '#9e6700', // 橙棕色 (0.62109375, 0.40234375, 0)
  [QualityCategory.Normal]: '#ffffff', // 白色
  [QualityCategory.Good]: '#00ff00', // 绿色
  [QualityCategory.Excellent]: '#73abff', // 蓝色 (0.451, 0.671, 1.000)
  [QualityCategory.Masterwork]: '#8a547e', // 紫色 (89/128, 33/64, 95/128)
  [QualityCategory.Legendary]: '#ffff00', // 黄色
}

/**
 * 武器品质系数
 * 影响远程精度、远程伤害、远程护甲穿透
 */
export interface WeaponQualityMultipliers {
  rangedAccuracy: number // 远程精度系数
  rangedDamage: number // 远程伤害系数
  rangedArmorPenetration: number // 远程护甲穿透系数
}

/**
 * 武器品质系数表
 */
export const WeaponQualityMultipliers: Record<QualityCategory, WeaponQualityMultipliers> = {
  [QualityCategory.Awful]: {
    rangedAccuracy: 0.8,
    rangedDamage: 0.9,
    rangedArmorPenetration: 0.9,
  },
  [QualityCategory.Poor]: {
    rangedAccuracy: 0.9,
    rangedDamage: 1.0,
    rangedArmorPenetration: 1.0,
  },
  [QualityCategory.Normal]: {
    rangedAccuracy: 1.0,
    rangedDamage: 1.0,
    rangedArmorPenetration: 1.0,
  },
  [QualityCategory.Good]: {
    rangedAccuracy: 1.1,
    rangedDamage: 1.0,
    rangedArmorPenetration: 1.0,
  },
  [QualityCategory.Excellent]: {
    rangedAccuracy: 1.2,
    rangedDamage: 1.0,
    rangedArmorPenetration: 1.0,
  },
  [QualityCategory.Masterwork]: {
    rangedAccuracy: 1.35,
    rangedDamage: 1.25,
    rangedArmorPenetration: 1.25,
  },
  [QualityCategory.Legendary]: {
    rangedAccuracy: 1.5,
    rangedDamage: 1.5,
    rangedArmorPenetration: 1.5,
  },
}

/**
 * 装备品质系数
 * 影响护甲值
 */
export interface ApparelQualityMultipliers {
  armor: number // 护甲系数
}

/**
 * 装备品质系数表
 */
export const ApparelQualityMultipliers: Record<QualityCategory, ApparelQualityMultipliers> = {
  [QualityCategory.Awful]: {
    armor: 0.6,
  },
  [QualityCategory.Poor]: {
    armor: 0.8,
  },
  [QualityCategory.Normal]: {
    armor: 1.0,
  },
  [QualityCategory.Good]: {
    armor: 1.15,
  },
  [QualityCategory.Excellent]: {
    armor: 1.3,
  },
  [QualityCategory.Masterwork]: {
    armor: 1.45,
  },
  [QualityCategory.Legendary]: {
    armor: 1.8,
  },
}

/**
 * 获取所有品质等级选项（用于UI）
 */
export function getQualityOptions() {
  return Object.values(QualityCategory).map((quality) => ({
    value: quality,
    label: QualityNames[quality],
    color: QualityColors[quality],
  }))
}
