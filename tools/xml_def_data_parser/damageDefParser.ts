/**
 * 伤害类型解析模块
 * 处理RimWorld的伤害类型（DamageDef）定义
 * 可被投射物、近战武器等多种模块使用
 */

import { BaseParserUtils } from './baseParser'

/**
 * 伤害类型定义节点
 * 用于存储 DamageDef 中的默认伤害和穿甲值
 */
export interface DamageDefNode {
  defName: string
  defaultDamage?: number // 默认伤害值
  defaultArmorPenetration?: number // 默认穿甲值（-1 表示使用 damage * 0.015）
}

/**
 * 伤害类型解析器
 */
export class DamageDefParser {
  /**
   * 判断是否为伤害类型定义 (DamageDef)
   */
  static isDamageDef(xmlNode: Record<string, unknown>): boolean {
    // DamageDef 通常有 workerClass、hediff、armorCategory 等属性
    return (
      xmlNode.workerClass !== undefined ||
      xmlNode.hediff !== undefined ||
      xmlNode.armorCategory !== undefined ||
      xmlNode.deathMessage !== undefined
    )
  }

  /**
   * 从 XML 节点解析伤害类型定义
   * @param xmlNode XML节点（DamageDef）
   * @returns 如果是有效的伤害类型定义则返回 DamageDefNode，否则返回 null
   */
  static parseDamageDefProperties(xmlNode: Record<string, unknown>): DamageDefNode | null {
    const defName = BaseParserUtils.getStringValue(xmlNode, 'defName')

    if (!defName) {
      return null
    }

    const damageDef: DamageDefNode = {
      defName,
      defaultDamage: BaseParserUtils.parseFloat(xmlNode.defaultDamage),
      defaultArmorPenetration: BaseParserUtils.parseFloat(xmlNode.defaultArmorPenetration),
    }

    return damageDef
  }
}
