import * as fs from 'fs'
import * as path from 'path'
import { parseStringPromise } from 'xml2js'
import type { WeaponCSVData } from '../../src/utils/weaponDataParser.js'
import { MOD_CONFIGS, OUTPUT_DIR_OVERRIDE, DEBUG_OPTIONS } from './config.js'

const DEFAULT_OUTPUT_DIR = path.join(__dirname, '..', '..', 'src', 'utils', 'weapon_data')
const OUTPUT_DIR = OUTPUT_DIR_OVERRIDE || DEFAULT_OUTPUT_DIR

interface ThingDefNode {
  defName?: string
  parentName?: string
  label?: string
  description?: string
  abstract?: boolean
  category?: string

  // 武器属性
  accuracyTouch?: number
  accuracyShort?: number
  accuracyMedium?: number
  accuracyLong?: number
  cooldown?: number
  warmupTime?: number
  range?: number
  burstShotCount?: number
  ticksBetweenBurstShots?: number

  // 子弹引用
  defaultProjectile?: string

  // 市场价值
  marketValue?: number

  // 原始XML数据（用于后续解析）
  rawData?: unknown

  // 依赖关系
  children: Set<string>
  resolved: boolean
}

interface ProjectileNode {
  defName: string
  damageAmountBase?: number
  armorPenetrationBase?: number
  stoppingPower?: number

  rawData?: unknown
}

class ModDataParser {
  private thingDefMap: Map<string, ThingDefNode> = new Map()
  private projectileMap: Map<string, ProjectileNode> = new Map()
  private modName: string = ''
  private modDir: string

  constructor(modDir: string, customOutputName?: string) {
    this.modDir = modDir
    // 从About.xml获取MOD名称
    this.extractModName(modDir)
    // 如果提供了自定义名称，使用自定义名称
    if (customOutputName) {
      this.modName = customOutputName
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  private getStringValue(obj: unknown, key: string): string | undefined {
    if (!this.isRecord(obj)) return undefined
    const value = obj[key]
    return typeof value === 'string' ? value : undefined
  }

  private extractModName(modDir: string): void {
    const aboutXmlPath = path.join(modDir, 'About', 'About.xml')
    if (fs.existsSync(aboutXmlPath)) {
      const content = fs.readFileSync(aboutXmlPath, 'utf-8')
      const match = content.match(/<name>(.*?)<\/name>/i)
      if (match) {
        this.modName = match[1].trim().replace(/[^\w\s-]/g, '_')
      }
    }

    if (!this.modName) {
      this.modName = path.basename(modDir)
    }
  }

  async parse(): Promise<void> {
    console.log(`开始解析MOD: ${this.modName}`)

    // 1. 扫描所有XML文件
    const xmlFiles = this.scanXMLFiles(this.modDir)
    console.log(`找到 ${xmlFiles.length} 个XML文件`)

    if (xmlFiles.length === 0) {
      console.warn('警告：未找到任何XML文件')
      return
    }

    // 2. 解析所有XML文件，建立映射关系
    for (const xmlFile of xmlFiles) {
      await this.parseXMLFile(xmlFile)
    }

    console.log(
      `解析完成: ${this.thingDefMap.size} 个ThingDef, ${this.projectileMap.size} 个Projectile`,
    )

    // 3. 解析继承关系
    this.resolveInheritance()

    // 4. 提取武器数据并生成CSV
    await this.generateWeaponCSV()
  }

  private scanXMLFiles(dir: string): string[] {
    const results: string[] = []

    if (!fs.existsSync(dir)) {
      console.error(`目录不存在: ${dir}`)
      return results
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        results.push(...this.scanXMLFiles(fullPath))
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.xml')) {
        results.push(fullPath)
      }
    }

    return results
  }

  private async parseXMLFile(filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const result = await parseStringPromise(content, {
        explicitArray: false,
        mergeAttrs: true,
        attrkey: 'attr',
      })

      if (!result.Defs) {
        return
      }

      // 处理ThingDef
      const thingDefs = this.extractNodes(result.Defs, 'ThingDef')
      for (const thingDef of thingDefs) {
        if (this.isRecord(thingDef)) {
          this.parseThingDef(thingDef)
        }
      }
    } catch (error) {
      console.warn(`解析文件失败: ${filePath}`, error)
    }
  }

  private extractNodes(obj: unknown, nodeName: string): unknown[] {
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

  private parseThingDef(xmlNode: Record<string, unknown>): void {
    const defName = this.getStringValue(xmlNode, 'defName')
    if (!defName) {
      return
    }

    const node: ThingDefNode = {
      defName,
      parentName:
        this.getStringValue(xmlNode, 'ParentName') || this.getStringValue(xmlNode, 'parentName'),
      label: this.getStringValue(xmlNode, 'label'),
      description: this.getStringValue(xmlNode, 'description'),
      abstract:
        (this.isRecord(xmlNode.Name) &&
          (xmlNode.Name as Record<string, unknown>).attr === 'True') ||
        (this.isRecord(xmlNode.attr) && xmlNode.attr.Abstract === 'True'),
      children: new Set(),
      resolved: false,
      rawData: xmlNode,
    }

    // 解析统计数据
    if (this.isRecord(xmlNode.statBases)) {
      const stats = xmlNode.statBases as Record<string, unknown>
      node.accuracyTouch = this.parseFloat(stats.AccuracyTouch)
      node.accuracyShort = this.parseFloat(stats.AccuracyShort)
      node.accuracyMedium = this.parseFloat(stats.AccuracyMedium)
      node.accuracyLong = this.parseFloat(stats.AccuracyLong)
      node.cooldown = this.parseFloat(stats.RangedWeapon_Cooldown)
      node.marketValue = this.parseFloat(stats.MarketValue)
    }

    // 解析verbs（射击属性）
    if (this.isRecord(xmlNode.verbs) && xmlNode.verbs.li) {
      const verb = Array.isArray(xmlNode.verbs.li) ? xmlNode.verbs.li[0] : xmlNode.verbs.li
      if (this.isRecord(verb)) {
        node.warmupTime = this.parseFloat(verb.warmupTime)
        node.range = this.parseFloat(verb.range)
        node.burstShotCount = this.parseInt(verb.burstShotCount)
        node.ticksBetweenBurstShots = this.parseInt(verb.ticksBetweenBurstShots)
        node.defaultProjectile = this.getStringValue(verb, 'defaultProjectile')
      }
    }

    // 识别武器类别
    if (xmlNode.weaponClasses || xmlNode.weaponTags || node.defaultProjectile) {
      node.category = 'Weapon'
    }

    this.thingDefMap.set(defName, node)

    // 如果是子弹定义
    if (this.isProjectile(xmlNode)) {
      this.parseProjectile(xmlNode)
    }
  }

  private isProjectile(xmlNode: Record<string, unknown>): boolean {
    return (
      xmlNode.projectile !== undefined ||
      xmlNode.thingClass === 'Bullet' ||
      xmlNode.category === 'Projectile'
    )
  }

  private parseProjectile(xmlNode: Record<string, unknown>): void {
    const defName = this.getStringValue(xmlNode, 'defName')
    if (!defName) {
      return
    }

    const projectile: ProjectileNode = {
      defName,
      rawData: xmlNode,
    }

    if (this.isRecord(xmlNode.projectile)) {
      const proj = xmlNode.projectile as Record<string, unknown>
      projectile.damageAmountBase = this.parseFloat(proj.damageAmountBase || proj.DamageAmountBase)
      projectile.armorPenetrationBase = this.parseFloat(
        proj.armorPenetrationBase || proj.ArmorPenetrationBase,
      )
      projectile.stoppingPower = this.parseFloat(proj.stoppingPower || proj.StoppingPower)
    }

    this.projectileMap.set(defName, projectile)
  }

  private parseFloat(value: unknown): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined
    }
    const num = parseFloat(String(value))
    return isNaN(num) ? undefined : num
  }

  private parseInt(value: unknown): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined
    }
    const num = parseInt(String(value), 10)
    return isNaN(num) ? undefined : num
  }

  private resolveInheritance(): void {
    console.log('开始解析继承关系...')

    // 建立父子关系
    for (const node of this.thingDefMap.values()) {
      if (node.parentName && node.defName) {
        const parent = this.thingDefMap.get(node.parentName)
        if (parent) {
          parent.children.add(node.defName)
        }
      }
    }

    // 递归解析所有节点
    for (const node of this.thingDefMap.values()) {
      if (!node.resolved) {
        this.resolveNode(node)
      }
    }
  }

  private resolveNode(node: ThingDefNode): void {
    if (node.resolved) {
      return
    }

    // 如果有父节点，先解析父节点
    if (node.parentName) {
      const parent = this.thingDefMap.get(node.parentName)
      if (parent && !parent.resolved) {
        this.resolveNode(parent)
      }

      // 从父节点继承未定义的属性
      if (parent) {
        this.inheritFromParent(node, parent)
      }
    }

    node.resolved = true
  }

  private inheritFromParent(child: ThingDefNode, parent: ThingDefNode): void {
    const inheritableProps: (keyof ThingDefNode)[] = [
      'accuracyTouch',
      'accuracyShort',
      'accuracyMedium',
      'accuracyLong',
      'cooldown',
      'warmupTime',
      'range',
      'burstShotCount',
      'ticksBetweenBurstShots',
      'defaultProjectile',
      'marketValue',
      'category',
    ]

    for (const prop of inheritableProps) {
      if (child[prop] === undefined && parent[prop] !== undefined) {
        ;(child as unknown as Record<string, unknown>)[prop] = parent[prop]
      }
    }
  }

  private async generateWeaponCSV(): Promise<void> {
    console.log('开始生成武器CSV...')

    const weapons: WeaponCSVData[] = []

    for (const node of this.thingDefMap.values()) {
      // 跳过抽象定义和非武器
      if (node.abstract || node.category !== 'Weapon') {
        continue
      }

      // 必须有射程和子弹（远程武器）
      if (!node.range || !node.defaultProjectile) {
        continue
      }

      const row = this.createWeaponRow(node)
      if (row) {
        weapons.push(row)
      }
    }

    console.log(`找到 ${weapons.length} 个武器定义`)

    if (weapons.length > 0) {
      await this.writeCSV(weapons)
    } else {
      console.warn('未找到有效的武器定义')
    }
  }

  private createWeaponRow(weapon: ThingDefNode): WeaponCSVData | null {
    // 获取子弹数据
    let damage = ''
    let armorPenetration = ''
    let stoppingPower = ''

    if (weapon.defaultProjectile) {
      const projectile = this.projectileMap.get(weapon.defaultProjectile)
      if (projectile) {
        damage =
          projectile.damageAmountBase !== undefined ? projectile.damageAmountBase.toString() : ''
        armorPenetration =
          projectile.armorPenetrationBase !== undefined
            ? `${Math.round(projectile.armorPenetrationBase * 100)}%`
            : ''
        stoppingPower =
          projectile.stoppingPower !== undefined ? projectile.stoppingPower.toString() : ''
      }
    }

    // 格式化数据
    const formatPercent = (val?: number) => (val !== undefined ? `${Math.round(val * 100)}%` : '')
    const formatNumber = (val?: number) => (val !== undefined ? val.toString() : '')
    const formatTime = (val?: number) => (val !== undefined ? `${val.toFixed(2)}秒` : '')

    const row: WeaponCSVData = {
      名称: weapon.label || weapon.defName || '',
      弹药伤害: damage,
      护甲穿透: armorPenetration,
      抑止能力: stoppingPower,
      瞄准时间: formatTime(weapon.warmupTime),
      冷却时间: formatTime(weapon.cooldown),
      '射程(tiles)': formatNumber(weapon.range),
      连发数量: formatNumber(weapon.burstShotCount),
      '连发间隔(ticks)': formatNumber(weapon.ticksBetweenBurstShots),
      '精度（贴近）': formatPercent(weapon.accuracyTouch),
      '精度（近）': formatPercent(weapon.accuracyShort),
      '精度（中）': formatPercent(weapon.accuracyMedium),
      '精度（远）': formatPercent(weapon.accuracyLong),
      市场价值: weapon.marketValue !== undefined ? `"${Math.round(weapon.marketValue)} 银"` : '',
    }

    return row
  }

  private async writeCSV(data: WeaponCSVData[]): Promise<void> {
    // 确保输出目录存在
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    }

    const outputPath = path.join(OUTPUT_DIR, `${this.modName}.csv`)

    // CSV头部
    const headers = [
      '名称',
      '弹药伤害',
      '护甲穿透',
      '抑止能力',
      '瞄准时间',
      '冷却时间',
      '射程(tiles)',
      '连发数量',
      '连发间隔(ticks)',
      '精度（贴近）',
      '精度（近）',
      '精度（中）',
      '精度（远）',
      '市场价值',
    ]

    // 构建CSV内容
    const lines = [headers.join(',')]

    for (const row of data) {
      const values = headers.map((header) => {
        const value = row[header as keyof WeaponCSVData] || ''
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

    console.log(`CSV文件已生成: ${outputPath}`)
  }
}

// 主函数
async function main() {
  console.log('='.repeat(60))
  console.log('RimWorld MOD 武器数据解析工具')
  console.log('='.repeat(60))
  console.log()

  const enabledConfigs = MOD_CONFIGS.filter((config) => config.enabled !== false)

  if (enabledConfigs.length === 0) {
    console.error('错误：未找到启用的MOD配置')
    console.log('请编辑 tools/xml_def_data_parser/config.ts 添加MOD路径')
    process.exit(1)
  }

  console.log(`将解析 ${enabledConfigs.length} 个MOD:`)
  enabledConfigs.forEach((config, index) => {
    console.log(`  ${index + 1}. ${config.path}`)
  })
  console.log()

  let successCount = 0
  let failCount = 0

  for (const config of enabledConfigs) {
    try {
      console.log('-'.repeat(60))

      // 检查目录是否存在
      if (!fs.existsSync(config.path)) {
        console.error(`❌ MOD目录不存在: ${config.path}`)
        console.log('   请检查路径是否正确')
        failCount++
        continue
      }

      const parser = new ModDataParser(config.path, config.outputName)

      if (DEBUG_OPTIONS.verbose) {
        console.log(`📂 MOD路径: ${config.path}`)
      }

      await parser.parse()

      if (!DEBUG_OPTIONS.skipCSVGeneration) {
        console.log('✅ 解析成功')
        successCount++
      }
    } catch (error) {
      console.error(`❌ 解析失败:`, error instanceof Error ? error.message : error)
      if (DEBUG_OPTIONS.verbose && error instanceof Error) {
        console.error(error.stack)
      }
      failCount++
    }

    console.log()
  }

  console.log('='.repeat(60))
  console.log(`解析完成！成功: ${successCount}, 失败: ${failCount}`)
  console.log('='.repeat(60))

  if (failCount > 0) {
    process.exit(1)
  }
}

main()
