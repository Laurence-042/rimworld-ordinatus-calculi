/**
 * 投射物解析模块
 * 处理RimWorld的投射物（Projectile）定义
 */

import { BaseParserUtils } from './baseParser'

/**
 * 投射物节点
 */
export interface ProjectileNode {
  defName: string
  damageAmountBase?: number
  armorPenetrationBase?: number
  stoppingPower?: number

  rawData?: unknown
}

/**
 * 类型守卫：判断是否为投射物节点
 */
export function isProjectileNode(node: unknown): node is ProjectileNode {
  return (
    BaseParserUtils.isRecord(node) && typeof (node as Record<string, unknown>).defName === 'string'
  )
}

/**
 * 投射物解析器
 */
export class ProjectileParser {
  /**
   * 判断是否为投射物定义
   */
  static isProjectile(xmlNode: Record<string, unknown>): boolean {
    return (
      xmlNode.projectile !== undefined ||
      xmlNode.thingClass === 'Bullet' ||
      xmlNode.category === 'Projectile'
    )
  }

  /**
   * 从 XML 节点解析投射物属性
   * @param xmlNode XML节点
   * @returns 如果是有效的投射物定义则返回 ProjectileNode，否则返回 null
   */
  static parseProjectileProperties(xmlNode: Record<string, unknown>): ProjectileNode | null {
    const defName = BaseParserUtils.getStringValue(xmlNode, 'defName')

    // 投射物必须有 defName 才能被引用
    if (!defName || !this.isProjectile(xmlNode)) {
      return null
    }

    const projectile: ProjectileNode = {
      defName,
      rawData: xmlNode,
    }

    if (BaseParserUtils.isRecord(xmlNode.projectile)) {
      const proj = xmlNode.projectile as Record<string, unknown>
      projectile.damageAmountBase = BaseParserUtils.parseFloat(
        proj.damageAmountBase || proj.DamageAmountBase,
      )
      projectile.armorPenetrationBase = BaseParserUtils.parseFloat(
        proj.armorPenetrationBase || proj.ArmorPenetrationBase,
      )
      projectile.stoppingPower = BaseParserUtils.parseFloat(
        proj.stoppingPower || proj.StoppingPower,
      )
    }

    return projectile
  }
}
