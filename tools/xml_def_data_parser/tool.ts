import * as fs from 'fs'
import * as path from 'path'
import { parseStringPromise } from 'xml2js'
import * as semver from 'semver'
import {
  DataSourceType,
  type DataManifest,
  type ModDataConfig,
} from '../../src/utils/dataSourceConfig'
import { MOD_CONFIGS, DEBUG_OPTIONS } from './config'
import { BaseThingDefNode, BaseParserUtils, LANGUAGE_MAP } from './baseParser'
import { ProjectileNode, ProjectileParser } from './projectileParser'
import { WeaponThingDefNode, isWeaponNode, WeaponParser } from './weaponParser'
import { ApparelThingDefNode, isApparelNode, ApparelParser } from './apparelParser'
import { MaterialThingDefNode, isMaterialNode, MaterialParser } from './materialParser'

// 数据输出目录（public/data/）
function resolveOutputDir(): string {
  const outputDir = DEBUG_OPTIONS.outputDirectory || 'data'
  // 如果是绝对路径，直接使用；否则相对于 public 目录
  if (path.isAbsolute(outputDir)) {
    return outputDir
  }
  return path.join(__dirname, '..', '..', 'public', outputDir)
}

const PUBLIC_DATA_DIR = resolveOutputDir()
const WEAPON_OUTPUT_DIR = path.join(PUBLIC_DATA_DIR, 'weapon')
const APPAREL_OUTPUT_DIR = path.join(PUBLIC_DATA_DIR, 'apparel')
const MATERIAL_OUTPUT_DIR = path.join(PUBLIC_DATA_DIR, 'material')

// 通用ThingDef节点类型（用于解析时的临时存储）
type ThingDefNode =
  | BaseThingDefNode
  | WeaponThingDefNode
  | ApparelThingDefNode
  | MaterialThingDefNode

/**
 * 单个MOD的元数据
 */
interface ModMetadata {
  name: string
  dir: string
  customOutputName?: string
  sourceUrl: string
}

/**
 * 单个MOD的数据集合
 */
interface ModDataCollection {
  name: string
  outputName: string
  sourceUrl: string
  // 记录此MOD定义的节点标识符（不包括继承的节点）
  ownedIdentifiers: Set<string>
}

class ModDataParser {
  // 全局共享的数据映射（跨所有MOD）
  private thingDefMap: Map<string, ThingDefNode> = new Map()
  private projectileMap: Map<string, ProjectileNode> = new Map()
  private languageData: Map<string, Map<string, string>> = new Map() // language -> (defName.property -> translation)

  // 当前正在处理的MOD信息
  private currentMod: ModMetadata = {
    name: '',
    dir: '',
    sourceUrl: '',
  }

  // 记录每个MOD的数据集合
  private modDataCollections: ModDataCollection[] = []

  constructor() {
    // 构造函数不再需要参数，改为批量处理所有MOD
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return BaseParserUtils.isRecord(value)
  }

  private getStringValue(obj: unknown, key: string): string | undefined {
    return BaseParserUtils.getStringValue(obj, key)
  }

  private extractModName(modDir: string, customOutputName?: string): string {
    if (customOutputName) {
      return customOutputName
    }

    const aboutXmlPath = path.join(modDir, 'About', 'About.xml')
    if (fs.existsSync(aboutXmlPath)) {
      const content = fs.readFileSync(aboutXmlPath, 'utf-8')
      const match = content.match(/<name>(.*?)<\/name>/i)
      if (match) {
        return match[1].trim().replace(/[^\w\s-]/g, '_')
      }
    }

    return path.basename(modDir)
  }

  /**
   * 解析单个MOD的XML定义和语言文件
   */
  private async parseMod(
    modDir: string,
    sourceUrl: string,
    customOutputName?: string,
  ): Promise<void> {
    const modName = this.extractModName(modDir, customOutputName)
    const outputName = customOutputName || modName

    this.currentMod = { name: modName, dir: modDir, customOutputName, sourceUrl }

    console.log(`开始解析MOD: ${modName}`)

    // 创建此MOD的数据集合并立即添加到数组（以便 parseThingDef 中能访问到）
    const modCollection: ModDataCollection = {
      name: modName,
      outputName: outputName,
      sourceUrl,
      ownedIdentifiers: new Set<string>(),
    }
    this.modDataCollections.push(modCollection)

    // 记录解析前的节点数量
    const beforeCount = this.thingDefMap.size

    // 1. 扫描所有XML文件
    const xmlFiles = this.scanXMLFiles(modDir)
    console.log(`  找到 ${xmlFiles.length} 个XML文件`)

    if (xmlFiles.length === 0) {
      console.warn('  警告：未找到任何XML文件')
      return
    }

    // 2. 解析所有XML文件，建立映射关系（解析过程中会自动添加到 ownedIdentifiers）
    for (const xmlFile of xmlFiles) {
      await this.parseXMLFile(xmlFile)
    }

    console.log(`  此MOD定义了 ${this.thingDefMap.size - beforeCount} 个新节点`)

    // 3. 解析语言文件
    await this.parseLanguageFiles()
  }

  /**
   * 批量解析所有MOD，然后统一解析继承关系和生成CSV
   */
  async parseAll(
    configs: Array<{
      path: string
      sourceUrl: string
      outputName?: string
    }>,
  ): Promise<void> {
    console.log('='.repeat(60))
    console.log('阶段 1: 解析所有MOD的XML定义')
    console.log('='.repeat(60))

    // 按顺序解析所有MOD（保证依赖顺序）
    for (const config of configs) {
      await this.parseMod(config.path, config.sourceUrl, config.outputName)
      console.log()
    }

    console.log('='.repeat(60))
    console.log(
      `XML解析完成: ${this.thingDefMap.size} 个ThingDef, ${this.projectileMap.size} 个Projectile`,
    )
    console.log('='.repeat(60))
    console.log()

    // 统一解析继承关系（此时所有MOD的节点都已加载）
    console.log('阶段 2: 解析跨MOD继承关系...')
    this.resolveInheritance()
    console.log()

    // 清理旧的输出目录
    console.log('阶段 3: 清理旧的输出目录...')
    this.cleanOutputDirectories()
    console.log()

    // 为每个MOD生成CSV
    console.log('='.repeat(60))
    console.log('阶段 4: 生成CSV文件')
    console.log('='.repeat(60))

    // 记录生成的MOD信息用于生成manifest
    const generatedMods: {
      weapon: Map<string, string[]>
      apparel: Map<string, string[]>
      material: Map<string, string[]>
    } = {
      weapon: new Map(),
      apparel: new Map(),
      material: new Map(),
    }

    for (const modCollection of this.modDataCollections) {
      console.log(`\n生成 ${modCollection.name} 的数据文件...`)
      const weaponLocales = await this.generateWeaponCSV(modCollection)
      const apparelLocales = await this.generateClothingCSV(modCollection)
      const materialLocales = await this.generateMaterialCSV(modCollection)

      if (weaponLocales.length > 0) {
        generatedMods.weapon.set(modCollection.outputName, weaponLocales)
      }
      if (apparelLocales.length > 0) {
        generatedMods.apparel.set(modCollection.outputName, apparelLocales)
      }
      if (materialLocales.length > 0) {
        generatedMods.material.set(modCollection.outputName, materialLocales)
      }
    }

    // 生成manifest.json文件
    console.log('\n阶段 5: 生成manifest.json文件...')
    this.generateManifests(generatedMods)

    // 生成README.md文件
    console.log('\n阶段 6: 生成README.md文件...')
    this.generateReadme()
  }

  /**
   * 生成统一的manifest.json文件
   */
  private generateManifests(generatedMods: {
    weapon: Map<string, string[]>
    apparel: Map<string, string[]>
    material: Map<string, string[]>
  }): void {
    // 收集所有MOD名称
    const allModNames = new Set<string>()
    for (const mods of [generatedMods.weapon, generatedMods.apparel, generatedMods.material]) {
      for (const modName of mods.keys()) {
        allModNames.add(modName)
      }
    }

    // 为每个MOD构建配置
    const modConfigs: ModDataConfig[] = []
    for (const modName of allModNames) {
      const types: DataSourceType[] = []
      const localesSet = new Set<string>()

      // 检查weapon
      const weaponLocales = generatedMods.weapon.get(modName)
      if (weaponLocales && weaponLocales.length > 0) {
        types.push(DataSourceType.Weapon)
        weaponLocales.forEach((l) => localesSet.add(l))
      }

      // 检查apparel
      const apparelLocales = generatedMods.apparel.get(modName)
      if (apparelLocales && apparelLocales.length > 0) {
        types.push(DataSourceType.Apparel)
        apparelLocales.forEach((l) => localesSet.add(l))
      }

      // 检查material
      const materialLocales = generatedMods.material.get(modName)
      if (materialLocales && materialLocales.length > 0) {
        types.push(DataSourceType.Material)
        materialLocales.forEach((l) => localesSet.add(l))
      }

      if (types.length > 0) {
        modConfigs.push({
          name: modName,
          locales: Array.from(localesSet),
          types,
        })
      }
    }

    const manifest: DataManifest = {
      mods: modConfigs,
      generatedAt: new Date().toISOString(),
    }

    const manifestPath = path.join(PUBLIC_DATA_DIR, 'manifest.json')
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
    console.log(`  生成统一manifest.json (${modConfigs.length} 个MOD)`)
  }

  /**
   * 生成 README.md 文件
   */
  private generateReadme(): void {
    // 读取模板文件
    const templatePath = path.join(__dirname, 'README.template.md')
    if (!fs.existsSync(templatePath)) {
      console.warn('  警告: README.template.md 模板文件不存在，跳过生成')
      return
    }

    const template = fs.readFileSync(templatePath, 'utf-8')

    // 收集有数据输出的MOD（去重，基于outputName）
    const processedMods = new Map<string, { name: string; sourceUrl: string }>()
    for (const modCollection of this.modDataCollections) {
      // 只添加第一次出现的（避免翻译MOD覆盖原MOD信息）
      if (!processedMods.has(modCollection.outputName)) {
        processedMods.set(modCollection.outputName, {
          name: modCollection.name,
          sourceUrl: modCollection.sourceUrl,
        })
      }
    }

    // 生成来源列表
    let sourceListContent = '\n\n---\n\n## 📚 Data Sources / 数据来源\n\n'
    for (const mod of processedMods.values()) {
      sourceListContent += `- **${mod.name}**: <${mod.sourceUrl}>\n`
    }

    // 合并模板和来源列表
    const readmeContent = template + sourceListContent

    // 写入 README.md
    const readmePath = path.join(PUBLIC_DATA_DIR, 'README.md')
    fs.writeFileSync(readmePath, readmeContent, 'utf-8')
    console.log(`  生成 README.md (${processedMods.size} 个MOD来源信息)`)
  }

  /**
   * 清理所有MOD的输出目录
   */
  private cleanOutputDirectories(): void {
    for (const modCollection of this.modDataCollections) {
      const dirs = [
        path.join(WEAPON_OUTPUT_DIR, modCollection.outputName),
        path.join(APPAREL_OUTPUT_DIR, modCollection.outputName),
        path.join(MATERIAL_OUTPUT_DIR, modCollection.outputName),
      ]

      for (const dir of dirs) {
        if (fs.existsSync(dir)) {
          // 删除目录下的所有文件
          const files = fs.readdirSync(dir)
          for (const file of files) {
            fs.unlinkSync(path.join(dir, file))
          }
          console.log(`  已清理: ${dir}`)
        }
      }
    }
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

    // 首先检查是否有版本号子目录（如 1.5, 1.6 等），取版本号最大的
    const versionDir = this.findLatestVersionDir(dir)
    const searchRoot = versionDir || dir

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

    search(searchRoot, 0)
    return results
  }

  /**
   * 查找MOD目录下版本号最大的子目录
   * 版本号目录格式如：1.4, 1.5, 1.6
   */
  private findLatestVersionDir(modDir: string): string | null {
    if (!fs.existsSync(modDir)) {
      return null
    }

    const entries = fs.readdirSync(modDir, { withFileTypes: true })
    const versionDirs = entries
      .filter((e) => e.isDirectory() && semver.coerce(e.name))
      .map((e) => e.name)

    // semver.maxSatisfying 在空数组或无匹配时返回 null
    const latest = semver.maxSatisfying(versionDirs, '*', { loose: true })
    if (!latest) {
      return null
    }

    if (DEBUG_OPTIONS.verbose) {
      console.log(`  找到版本目录: ${latest}`)
    }
    return path.join(modDir, latest)
  }

  private async parseLanguageFiles(): Promise<void> {
    const languagesDirs = this.findLanguagesDirectories(this.currentMod.dir)
    if (languagesDirs.length === 0) {
      console.log('  未找到 Languages 目录')
      return
    }

    console.log(`  找到 ${languagesDirs.length} 个 Languages 目录`)

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
            console.log(`    跳过不支持的语言: ${folder.name}`)
          }
          continue
        }

        if (DEBUG_OPTIONS.verbose) {
          console.log(`    解析语言: ${folder.name} (${languageCode})`)
        }

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

    // 将合并后的翻译存储到 languageData（累加到全局翻译）
    for (const [languageCode, translations] of languageTranslations.entries()) {
      let globalTranslations = this.languageData.get(languageCode)
      if (!globalTranslations) {
        globalTranslations = new Map<string, string>()
        this.languageData.set(languageCode, globalTranslations)
      }

      // 合并翻译（后加载的MOD会覆盖先加载的同名条目）
      for (const [key, value] of translations.entries()) {
        globalTranslations.set(key, value)
      }

      console.log(
        `  ${languageCode}: +${translations.size} 个翻译条目 (累计: ${globalTranslations.size})`,
      )
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

    // 尝试解析材料属性（优先级最高，因为材料可能同时有weaponClasses等属性）
    const materialProps = MaterialParser.parseMaterialProperties(xmlNode)
    // 尝试解析武器属性
    const weaponProps = WeaponParser.parseWeaponProperties(xmlNode)
    // 尝试解析服装属性
    const apparelProps = ApparelParser.parseApparelProperties(xmlNode)
    // 尝试解析投射物属性
    const projectileProps = ProjectileParser.parseProjectileProperties(xmlNode)

    let finalNode: ThingDefNode

    if (materialProps) {
      // 创建材料节点（优先级最高）
      finalNode = {
        ...baseNode,
        ...materialProps,
      } as MaterialThingDefNode
    } else if (weaponProps) {
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

    // 如果是投射物定义，单独存储到 projectileMap
    if (projectileProps) {
      this.projectileMap.set(projectileProps.defName, projectileProps)
    }

    // 记录此节点属于当前正在解析的MOD（添加到最后一个 modDataCollection）
    if (this.modDataCollections.length > 0) {
      const currentCollection = this.modDataCollections[this.modDataCollections.length - 1]
      currentCollection.ownedIdentifiers.add(identifier)
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

    // 如果父子都是材料节点，继承材料属性
    if (child.category === 'Material' && parent.category === 'Material') {
      MaterialParser.inheritMaterialProperties(
        child as MaterialThingDefNode,
        parent as MaterialThingDefNode,
      )
    }
  }

  private async generateWeaponCSV(modCollection: ModDataCollection): Promise<string[]> {
    const weapons: WeaponThingDefNode[] = []

    // 只收集此MOD自己定义的节点
    for (const identifier of modCollection.ownedIdentifiers) {
      const node = this.thingDefMap.get(identifier)
      if (node && isWeaponNode(node)) {
        weapons.push(node)
      }
    }

    const validWeapons = WeaponParser.filterValidWeapons(weapons)
    console.log(`  武器: ${validWeapons.length} 个`)

    if (validWeapons.length === 0) {
      return []
    }

    // 创建 MOD 专用目录
    const modOutputDir = path.join(WEAPON_OUTPUT_DIR, modCollection.outputName)
    if (!fs.existsSync(modOutputDir)) {
      fs.mkdirSync(modOutputDir, { recursive: true })
    }

    const generatedLocales: string[] = ['en-US']

    // 生成默认语言（使用原始label）的CSV
    const defaultWeapons = validWeapons.map((node) =>
      WeaponParser.createWeaponRow(node, this.projectileMap, null),
    )
    WeaponParser.writeWeaponCSV(defaultWeapons, modOutputDir, 'en-US')

    // 为每种语言生成单独的CSV
    for (const [languageCode, translations] of this.languageData.entries()) {
      const localizedWeapons = validWeapons.map((node) =>
        WeaponParser.createWeaponRow(node, this.projectileMap, translations),
      )
      WeaponParser.writeWeaponCSV(localizedWeapons, modOutputDir, languageCode)
      generatedLocales.push(languageCode)
    }

    return generatedLocales
  }

  private async generateClothingCSV(modCollection: ModDataCollection): Promise<string[]> {
    const clothing: ApparelThingDefNode[] = []

    // 只收集此MOD自己定义的节点
    for (const identifier of modCollection.ownedIdentifiers) {
      const node = this.thingDefMap.get(identifier)
      if (node && isApparelNode(node)) {
        clothing.push(node)
      }
    }

    const validClothing = ApparelParser.filterValidApparel(clothing)
    console.log(`  衣物: ${validClothing.length} 个`)

    if (validClothing.length === 0) {
      return []
    }

    // 创建 MOD 专用目录
    const modOutputDir = path.join(APPAREL_OUTPUT_DIR, modCollection.outputName)
    if (!fs.existsSync(modOutputDir)) {
      fs.mkdirSync(modOutputDir, { recursive: true })
    }

    const generatedLocales: string[] = ['en-US']

    // 生成默认语言（使用原始label）的CSV
    const defaultClothing = validClothing.map((node) => ApparelParser.createClothingRow(node, null))
    ApparelParser.writeClothingCSV(defaultClothing, modOutputDir, 'en-US')

    // 为每种语言生成单独的CSV
    for (const [languageCode, translations] of this.languageData.entries()) {
      const localizedClothing = validClothing.map((node) =>
        ApparelParser.createClothingRow(node, translations),
      )
      ApparelParser.writeClothingCSV(localizedClothing, modOutputDir, languageCode)
      generatedLocales.push(languageCode)
    }

    return generatedLocales
  }

  private async generateMaterialCSV(modCollection: ModDataCollection): Promise<string[]> {
    const materials: MaterialThingDefNode[] = []

    // 只收集此MOD自己定义的节点
    for (const identifier of modCollection.ownedIdentifiers) {
      const node = this.thingDefMap.get(identifier)
      if (node && isMaterialNode(node)) {
        materials.push(node)
      }
    }

    const validMaterials = MaterialParser.filterValidMaterials(materials)
    console.log(`  材料: ${validMaterials.length} 个`)

    if (validMaterials.length === 0) {
      return []
    }

    // 创建 MOD 专用目录
    const modOutputDir = path.join(MATERIAL_OUTPUT_DIR, modCollection.outputName)
    if (!fs.existsSync(modOutputDir)) {
      fs.mkdirSync(modOutputDir, { recursive: true })
    }

    const generatedLocales: string[] = ['en-US']

    // 生成默认语言（使用原始label）的CSV
    const defaultMaterials = validMaterials.map((node) =>
      MaterialParser.createMaterialRow(node, null),
    )
    MaterialParser.writeMaterialCSV(defaultMaterials, modOutputDir, 'en-US')

    // 为每种语言生成单独的CSV
    for (const [languageCode, translations] of this.languageData.entries()) {
      const localizedMaterials = validMaterials.map((node) =>
        MaterialParser.createMaterialRow(node, translations),
      )
      MaterialParser.writeMaterialCSV(localizedMaterials, modOutputDir, languageCode)
      generatedLocales.push(languageCode)
    }

    return generatedLocales
  }
}

// 主函数
async function main() {
  console.log('='.repeat(60))
  console.log('RimWorld MOD 数据解析工具')
  console.log('='.repeat(60))
  console.log()

  const enabledConfigs = MOD_CONFIGS.filter((config) => config.enabled !== false)

  if (enabledConfigs.length === 0) {
    console.error('错误：未找到启用的MOD配置')
    console.log('请编辑 tools/xml_def_data_parser/config.ts 添加MOD路径')
    process.exit(1)
  }

  // 验证所有MOD目录存在
  const validConfigs = []
  let invalidCount = 0

  for (const config of enabledConfigs) {
    if (!fs.existsSync(config.path)) {
      console.error(`❌ MOD目录不存在: ${config.path}`)
      invalidCount++
    } else {
      validConfigs.push(config)
    }
  }

  if (validConfigs.length === 0) {
    console.error('错误：没有有效的MOD配置')
    process.exit(1)
  }

  console.log(`将按顺序解析 ${validConfigs.length} 个MOD:`)
  validConfigs.forEach((config, index) => {
    const modName = path.basename(config.path)
    console.log(`  ${index + 1}. ${modName} (${config.path})`)
  })

  if (invalidCount > 0) {
    console.warn(`\n⚠️  跳过 ${invalidCount} 个无效路径\n`)
  }
  console.log()

  try {
    const parser = new ModDataParser()
    await parser.parseAll(validConfigs)

    console.log()
    console.log('='.repeat(60))
    console.log('✅ 所有MOD解析完成！')
    console.log('='.repeat(60))
  } catch (error) {
    console.error()
    console.error('='.repeat(60))
    console.error('❌ 解析失败:', error instanceof Error ? error.message : error)
    console.error('='.repeat(60))

    if (DEBUG_OPTIONS.verbose && error instanceof Error) {
      console.error('\n堆栈跟踪:')
      console.error(error.stack)
    }

    process.exit(1)
  }
}

main()
