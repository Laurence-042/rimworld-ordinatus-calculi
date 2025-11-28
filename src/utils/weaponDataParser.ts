import type { WeaponParams } from '@/types/weapon'
import { QualityCategory } from '@/types/quality'
import {
  DataSourceType,
  parseCSV,
  parseNumeric,
  parsePercentage,
  loadCSVByLocale,
  normalizeModName,
} from './csvParserUtils'

/**
 * CSV武器数据行
 */
interface WeaponCSVRow extends Record<string, string> {
  defName: string
  label: string
  damage: string
  armorPenetration: string
  range: string
  accuracyTouch: string
  accuracyShort: string
  accuracyMedium: string
  accuracyLong: string
  cooldown: string
  warmupTime: string
  burstShotCount: string
  ticksBetweenBurstShots: string
}

/**
 * 武器数据源
 */
export interface WeaponDataSource {
  id: string
  label: string
  weapons: Array<{ defName: string; params: WeaponParams }>
}

/**
 * 将CSV行转换为武器参数
 */
function convertRowToWeaponParams(row: WeaponCSVRow): {
  defName: string
  params: WeaponParams
} {
  return {
    defName: row.defName,
    params: {
      label: row.label,
      damage: parseNumeric(row.damage),
      armorPenetration: parsePercentage(row.armorPenetration),
      range: parseNumeric(row.range),
      accuracyTouch: parsePercentage(row.accuracyTouch),
      accuracyShort: parsePercentage(row.accuracyShort),
      accuracyMedium: parsePercentage(row.accuracyMedium),
      accuracyLong: parsePercentage(row.accuracyLong),
      cooldown: parseNumeric(row.cooldown),
      warmUp: parseNumeric(row.warmupTime),
      burstCount: parseNumeric(row.burstShotCount) || 1,
      burstTicks: parseNumeric(row.ticksBetweenBurstShots),
      quality: QualityCategory.Masterwork,
    },
  }
}

/**
 * 验证是否为有效武器
 */
function isValidWeapon(row: WeaponCSVRow): boolean {
  if (row.defName.startsWith('特化')) return false

  const damage = parseNumeric(row.damage)
  const cooldown = parseNumeric(row.cooldown)
  const hasAccuracy = row.accuracyShort || row.accuracyMedium || row.accuracyLong

  return damage > 0 && cooldown > 0 && !!hasAccuracy
}

/**
 * 解析武器CSV数据
 */
async function parseWeaponCSV(
  csvContent: string,
): Promise<Array<{ defName: string; params: WeaponParams }>> {
  const rows = await parseCSV<WeaponCSVRow>(csvContent)
  return rows.filter(isValidWeapon).map(convertRowToWeaponParams)
}

/**
 * 加载所有武器数据源
 * @param locale 语言代码
 * @returns 武器数据源数组
 */
export async function getWeaponDataSources(locale: string): Promise<WeaponDataSource[]> {
  const modCSVMap = await loadCSVByLocale(DataSourceType.Weapon, locale)

  // 按数据源ID分组
  const dataSourceMap = new Map<string, Array<{ defName: string; params: WeaponParams }>>()

  for (const [modName, csvContent] of modCSVMap.entries()) {
    try {
      const weapons = await parseWeaponCSV(csvContent)
      if (weapons.length === 0) continue

      const sourceId = normalizeModName(modName)

      // 合并到对应的数据源
      if (!dataSourceMap.has(sourceId)) {
        dataSourceMap.set(sourceId, [])
      }
      dataSourceMap.get(sourceId)!.push(...weapons)
    } catch (error) {
      console.error(`Failed to parse weapons from ${modName}:`, error)
    }
  }

  // 转换为数据源数组
  const dataSources: WeaponDataSource[] = []
  for (const [sourceId, weapons] of dataSourceMap.entries()) {
    dataSources.push({
      id: sourceId,
      label: sourceId === 'vanilla' ? 'Vanilla' : sourceId,
      weapons,
    })
  }

  return dataSources
}
