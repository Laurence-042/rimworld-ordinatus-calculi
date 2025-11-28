/**
 * 基础解析工具模块
 * 包含通用的类型定义、工具函数和基础解析逻辑
 */

/**
 * ThingDef基类节点
 * 包含所有ThingDef共有的属性
 */
export interface BaseThingDefNode {
  identifier: string // 并非xml节点信息，而是程序内部使用的唯一标识符
  name?: string // 节点标识符，用于继承关系
  defName?: string // 游戏内物品ID，通常只有叶节点持有
  parentName?: string
  label?: string
  description?: string
  abstract?: boolean
  category?: string
  marketValue?: number

  // 原始XML数据（用于后续解析）
  rawData?: unknown

  // 依赖关系
  children: Set<string>
  resolved: boolean
}

/**
 * 语言映射配置
 */
export const LANGUAGE_MAP: Record<string, string> = {
  'ChineseSimplified (简体中文)': 'zh-CN',
  ChineseSimplified: 'zh-CN',
  English: 'en-US',
}

/**
 * 基础解析工具类
 * 提供通用的XML解析辅助方法
 */
export class BaseParserUtils {
  /**
   * 类型守卫：判断是否为Record类型
   */
  static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  /**
   * 安全获取字符串值
   */
  static getStringValue(obj: unknown, key: string): string | undefined {
    if (!this.isRecord(obj)) return undefined
    const value = obj[key]
    return typeof value === 'string' ? value : undefined
  }

  /**
   * 解析数组字段（支持XML2JS的li格式）
   */
  static parseArrayField(value: unknown): string[] {
    if (!value) return []

    // 如果是对象且包含li属性（XML2JS解析的列表格式）
    if (this.isRecord(value) && value.li) {
      const items = Array.isArray(value.li) ? value.li : [value.li]
      return items.map((item) => String(item)).filter(Boolean)
    }

    // 如果直接是数组
    if (Array.isArray(value)) {
      return value.map((item) => String(item)).filter(Boolean)
    }

    // 如果是字符串
    if (typeof value === 'string') {
      return [value]
    }

    return []
  }

  /**
   * 解析浮点数
   */
  static parseFloat(value: unknown): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined
    }
    const num = parseFloat(String(value))
    return isNaN(num) ? undefined : num
  }

  /**
   * 解析整数
   */
  static parseInt(value: unknown): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined
    }
    const num = parseInt(String(value), 10)
    return isNaN(num) ? undefined : num
  }

  /**
   * 格式化数字为字符串
   */
  static formatNumber(val?: number): string {
    return val !== undefined ? val.toString() : ''
  }

  /**
   * 从XML节点提取特定类型的节点列表
   */
  static extractNodes(obj: unknown, nodeName: string): unknown[] {
    if (!this.isRecord(obj)) {
      return []
    }

    const results: unknown[] = []

    if (obj[nodeName]) {
      if (Array.isArray(obj[nodeName])) {
        results.push(...obj[nodeName])
      } else {
        results.push(obj[nodeName])
      }
    }

    return results
  }

  /**
   * 解析统计数据（statBases节点）
   */
  static parseStatBases(xmlNode: Record<string, unknown>): Record<string, number | undefined> {
    const stats: Record<string, number | undefined> = {}

    if (this.isRecord(xmlNode.statBases)) {
      const statBases = xmlNode.statBases as Record<string, unknown>
      stats.marketValue = this.parseFloat(statBases.MarketValue)
    }

    return stats
  }

  /**
   * 写入CSV文件（带BOM）
   */
  static writeCSVFile<T extends Record<string, string>>(
    outputPath: string,
    headers: string[],
    data: T[],
    fs: typeof import('fs'),
  ): void {
    // 构建CSV内容
    const lines = [headers.join(',')]

    for (const row of data) {
      const values = headers.map((header) => {
        const value = row[header] || ''
        // 如果包含逗号或引号，需要转义
        if (value.includes(',') || value.includes('"')) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      })
      lines.push(values.join(','))
    }

    const csvContent = lines.join('\n')
    fs.writeFileSync(outputPath, '\uFEFF' + csvContent, 'utf-8') // 添加BOM以支持Excel打开
  }
}
