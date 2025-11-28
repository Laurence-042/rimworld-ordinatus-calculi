import * as fs from 'fs'
import * as path from 'path'
import { parseStringPromise } from 'xml2js'
import { DataSourceType, DATA_SOURCE_PATHS } from '../../src/utils/dataSourceConfig'
import { MOD_CONFIGS, OUTPUT_DIR_OVERRIDE, DEBUG_OPTIONS } from './config'
import { BaseThingDefNode, ProjectileNode, BaseParserUtils, LANGUAGE_MAP } from './baseParser'
import { WeaponThingDefNode, isWeaponNode, WeaponParser } from './weaponParser'
import { ApparelThingDefNode, isApparelNode, ApparelParser } from './apparelParser'

const DEFAULT_WEAPON_OUTPUT_DIR = path.join(
  __dirname,
  '..',
  '..',
  'src',
  'utils',
  DATA_SOURCE_PATHS[DataSourceType.Weapon],
)
const DEFAULT_APPAREL_OUTPUT_DIR = path.join(
  __dirname,
  '..',
  '..',
  'src',
  'utils',
  DATA_SOURCE_PATHS[DataSourceType.Apparel],
)
const WEAPON_OUTPUT_DIR = OUTPUT_DIR_OVERRIDE || DEFAULT_WEAPON_OUTPUT_DIR
const APPAREL_OUTPUT_DIR = OUTPUT_DIR_OVERRIDE
  ? path.join(OUTPUT_DIR_OVERRIDE, '..', DATA_SOURCE_PATHS[DataSourceType.Apparel])
  : DEFAULT_APPAREL_OUTPUT_DIR

// 通用ThingDef节点类型（用于解析时的临时存储）
type ThingDefNode = BaseThingDefNode | WeaponThingDefNode | ApparelThingDefNode

class ModDataParser {
  private thingDefMap: Map<string, ThingDefNode> = new Map()
  private projectileMap: Map<string, ProjectileNode> = new Map()
  private languageData: Map<string, Map<string, string>> = new Map() // language -> (defName.property -> translation)
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
    return BaseParserUtils.isRecord(value)
  }

  private getStringValue(obj: unknown, key: string): string | undefined {
    return BaseParserUtils.getStringValue(obj, key)
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

    // 3. 解析语言文件
    await this.parseLanguageFiles()

    // 4. 解析继承关系
    this.resolveInheritance()

    // 5. 提取武器数据并生成CSV
    await this.generateWeaponCSV()

    // 6. 提取衣物数据并生成CSV
    await this.generateClothingCSV()
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

  private findLanguagesDirectories(dir: string, maxDepth: number = 2): string[] {
    const results: string[] = []

    const search = (currentDir: string, depth: number) => {
      if (!fs.existsSync(currentDir) || depth > maxDepth) {
        return
      }

      const entries = fs.readdirSync(currentDir, { withFileTypes: true })

      // 检查当前目录是否包含 Languages 目录
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name === 'Languages') {
          results.push(path.join(currentDir, entry.name))
        }
      }

      // 如果还没到最大深度，继续搜索子目录
      if (depth < maxDepth) {
        for (const entry of entries) {
          if (entry.isDirectory() && entry.name !== 'Languages') {
            search(path.join(currentDir, entry.name), depth + 1)
          }
        }
      }
    }

    search(dir, 0)
    return results
  }

  private async parseLanguageFiles(): Promise<void> {
    console.log('开始解析语言文件...')

    const languagesDirs = this.findLanguagesDirectories(this.modDir)
    if (languagesDirs.length === 0) {
      console.log('未找到 Languages 目录')
      return
    }

    console.log(`找到 ${languagesDirs.length} 个 Languages 目录:`)
    languagesDirs.forEach((dir) => console.log(`  - ${dir}`))

    // 为每种语言创建翻译映射
    const languageTranslations = new Map<string, Map<string, string>>()

    // 遍历所有 Languages 目录
    for (const languagesDir of languagesDirs) {
      const languageFolders = fs.readdirSync(languagesDir, { withFileTypes: true })

      for (const folder of languageFolders) {
        if (!folder.isDirectory()) continue

        const languageCode = LANGUAGE_MAP[folder.name]
        if (!languageCode) {
          if (DEBUG_OPTIONS.verbose) {
            console.log(`跳过不支持的语言: ${folder.name}`)
          }
          continue
        }

        console.log(`解析语言: ${folder.name} (${languageCode}) 从 ${languagesDir}`)

        const languagePath = path.join(languagesDir, folder.name)
        const xmlFiles = this.scanXMLFiles(languagePath)

        // 获取或创建该语言的翻译映射
        let translations = languageTranslations.get(languageCode)
        if (!translations) {
          translations = new Map<string, string>()
          languageTranslations.set(languageCode, translations)
        }

        for (const xmlFile of xmlFiles) {
          await this.parseLanguageFile(xmlFile, translations)
        }
      }
    }

    // 将合并后的翻译存储到 languageData
    for (const [languageCode, translations] of languageTranslations.entries()) {
      this.languageData.set(languageCode, translations)
      console.log(`  ${languageCode}: 共 ${translations.size} 个翻译条目`)
    }
  }

  private async parseLanguageFile(
    filePath: string,
    translations: Map<string, string>,
  ): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const result = await parseStringPromise(content, {
        explicitArray: false,
        mergeAttrs: true,
      })

      if (!result.LanguageData) {
        return
      }

      const languageData = result.LanguageData

      // 遍历 LanguageData 中的所有键值对
      for (const [key, value] of Object.entries(languageData)) {
        if (typeof value === 'string' && key.includes('.')) {
          // key 格式为 "DefName.property"
          translations.set(key, value)
        }
      }
    } catch (error) {
      if (DEBUG_OPTIONS.verbose) {
        console.warn(`解析语言文件失败: ${filePath}`, error)
      }
    }
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
    const name = this.getStringValue(xmlNode, 'Name')
    const defName = this.getStringValue(xmlNode, 'defName')
    const identifier = name || defName

    if (!identifier) {
      return
    }

    // 创建基础节点
    const baseNode: BaseThingDefNode = {
      identifier,
      name,
      defName,
      parentName:
        this.getStringValue(xmlNode, 'ParentName') || this.getStringValue(xmlNode, 'parentName'),
      label: this.getStringValue(xmlNode, 'label'),
      description: this.getStringValue(xmlNode, 'description'),
      abstract: this.getStringValue(xmlNode, 'Abstract') === 'True',
      children: new Set(),
      resolved: false,
      rawData: xmlNode,
    }

    // 解析基础统计数据
    const stats = BaseParserUtils.parseStatBases(xmlNode)
    baseNode.marketValue = stats.marketValue

    // 尝试解析武器属性
    const weaponProps = WeaponParser.parseWeaponProperties(xmlNode)
    // 尝试解析服装属性
    const apparelProps = ApparelParser.parseApparelProperties(xmlNode)

    let finalNode: ThingDefNode

    if (weaponProps) {
      // 创建武器节点
      finalNode = {
        ...baseNode,
        ...weaponProps,
      } as WeaponThingDefNode
    } else if (apparelProps) {
      // 创建服装节点
      finalNode = {
        ...baseNode,
        ...apparelProps,
      } as ApparelThingDefNode
    } else {
      // 未分类的基础节点
      finalNode = baseNode
    }

    this.thingDefMap.set(identifier, finalNode)

    // 如果是子弹定义（投射物必须有defName才能被引用）
    if (defName && BaseParserUtils.isProjectile(xmlNode)) {
      this.parseProjectile(xmlNode)
    }
  }

  private parseProjectile(xmlNode: Record<string, unknown>): void {
    const projectile = BaseParserUtils.parseProjectile(xmlNode)
    if (projectile) {
      this.projectileMap.set(projectile.defName, projectile)
    }
  }

  private resolveInheritance(): void {
    console.log('开始解析继承关系...')

    // 建立父子关系（使用identifier）
    for (const node of this.thingDefMap.values()) {
      if (node.parentName) {
        const parent = this.thingDefMap.get(node.parentName)
        if (parent) {
          parent.children.add(node.identifier)
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
    // 基础属性继承
    const baseProps: (keyof BaseThingDefNode)[] = ['marketValue', 'category']

    for (const prop of baseProps) {
      if (
        (child as unknown as Record<string, unknown>)[prop] === undefined &&
        (parent as unknown as Record<string, unknown>)[prop] !== undefined
      ) {
        ;(child as unknown as Record<string, unknown>)[prop] = (
          parent as unknown as Record<string, unknown>
        )[prop]
      }
    }

    // 如果父子都是武器节点，继承武器属性
    if (child.category === 'Weapon' && parent.category === 'Weapon') {
      WeaponParser.inheritWeaponProperties(
        child as WeaponThingDefNode,
        parent as WeaponThingDefNode,
      )
    }

    // 如果父子都是衣物节点，继承衣物属性
    if (child.category === 'Apparel' && parent.category === 'Apparel') {
      ApparelParser.inheritApparelProperties(
        child as ApparelThingDefNode,
        parent as ApparelThingDefNode,
      )
    }
  }

  private async generateWeaponCSV(): Promise<void> {
    console.log('开始生成武器CSV...')

    const weapons: WeaponThingDefNode[] = []

    for (const node of this.thingDefMap.values()) {
      if (isWeaponNode(node)) {
        weapons.push(node)
      }
    }

    const validWeapons = WeaponParser.filterValidWeapons(weapons)
    console.log(`找到 ${validWeapons.length} 个武器定义`)

    if (validWeapons.length === 0) {
      console.warn('未找到有效的武器定义')
      return
    }

    // 创建 MOD 专用目录
    const modOutputDir = path.join(WEAPON_OUTPUT_DIR, this.modName)
    if (!fs.existsSync(modOutputDir)) {
      fs.mkdirSync(modOutputDir, { recursive: true })
    }

    // 生成默认语言（使用原始label）的CSV
    const defaultWeapons = validWeapons.map((node) =>
      WeaponParser.createWeaponRow(node, this.projectileMap, null),
    )
    WeaponParser.writeWeaponCSV(defaultWeapons, modOutputDir, 'en-US')

    // 为每种语言生成单独的CSV
    for (const [languageCode, translations] of this.languageData.entries()) {
      console.log(`生成 ${languageCode} 语言的武器CSV...`)
      const localizedWeapons = validWeapons.map((node) =>
        WeaponParser.createWeaponRow(node, this.projectileMap, translations),
      )
      WeaponParser.writeWeaponCSV(localizedWeapons, modOutputDir, languageCode)
    }
  }

  private async generateClothingCSV(): Promise<void> {
    console.log('开始生成衣物CSV...')

    const clothing: ApparelThingDefNode[] = []

    for (const node of this.thingDefMap.values()) {
      if (isApparelNode(node)) {
        clothing.push(node)
      }
    }

    const validClothing = ApparelParser.filterValidApparel(clothing)
    console.log(`找到 ${validClothing.length} 个衣物定义`)

    if (validClothing.length === 0) {
      console.warn('未找到有效的衣物定义')
      return
    }

    // 创建 MOD 专用目录
    const modOutputDir = path.join(APPAREL_OUTPUT_DIR, this.modName)
    if (!fs.existsSync(modOutputDir)) {
      fs.mkdirSync(modOutputDir, { recursive: true })
    }

    // 生成默认语言（使用原始label）的CSV
    const defaultClothing = validClothing.map((node) => ApparelParser.createClothingRow(node, null))
    ApparelParser.writeClothingCSV(defaultClothing, modOutputDir, 'en-US')

    // 为每种语言生成单独的CSV
    for (const [languageCode, translations] of this.languageData.entries()) {
      console.log(`生成 ${languageCode} 语言的衣物CSV...`)
      const localizedClothing = validClothing.map((node) =>
        ApparelParser.createClothingRow(node, translations),
      )
      ApparelParser.writeClothingCSV(localizedClothing, modOutputDir, languageCode)
    }
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
