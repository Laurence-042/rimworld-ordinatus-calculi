import * as fs from 'fs'
import * as path from 'path'
import { parseStringPromise } from 'xml2js'
import type { WeaponCSVData } from '../../src/utils/weaponDataParser'
import { BodyPart } from '../../src/types/bodyPart'
import { ApparelLayer } from '../../src/types/armor'
import { MOD_CONFIGS, OUTPUT_DIR_OVERRIDE, DEBUG_OPTIONS } from './config'

const DEFAULT_WEAPON_OUTPUT_DIR = path.join(__dirname, '..', '..', 'src', 'utils', 'weapon_data')
const DEFAULT_CLOTHING_OUTPUT_DIR = path.join(
  __dirname,
  '..',
  '..',
  'src',
  'utils',
  'clothing_data',
)
const WEAPON_OUTPUT_DIR = OUTPUT_DIR_OVERRIDE || DEFAULT_WEAPON_OUTPUT_DIR
const CLOTHING_OUTPUT_DIR = OUTPUT_DIR_OVERRIDE
  ? path.join(OUTPUT_DIR_OVERRIDE, '..', 'clothing_data')
  : DEFAULT_CLOTHING_OUTPUT_DIR

// 语言映射配置
const LANGUAGE_MAP: Record<string, string> = {
  'ChineseSimplified (简体中文)': 'zh-CN',
  English: 'en-US',
}

// 身体部位组映射（RimWorld XML -> BodyPart枚举）
const BODY_PART_GROUP_MAP: Record<string, BodyPart[]> = {
  Torso: [BodyPart.Torso],
  Neck: [BodyPart.Neck],
  Head: [BodyPart.Head],
  Shoulders: [BodyPart.LeftShoulder, BodyPart.RightShoulder],
  Arms: [BodyPart.LeftArm, BodyPart.RightArm],
  Hands: [BodyPart.LeftArm, BodyPart.RightArm], // 手部覆盖映射到手臂
  Legs: [BodyPart.LeftLeg, BodyPart.RightLeg],
  Waist: [BodyPart.Waist],
  Eyes: [BodyPart.LeftEye, BodyPart.RightEye],
  Ears: [BodyPart.LeftEar, BodyPart.RightEar],
  Nose: [BodyPart.Nose],
  Jaw: [BodyPart.Jaw],
  FullHead: [
    BodyPart.Head,
    BodyPart.LeftEye,
    BodyPart.RightEye,
    BodyPart.LeftEar,
    BodyPart.RightEar,
    BodyPart.Nose,
    BodyPart.Jaw,
  ],
}

// 服装层级映射（RimWorld XML -> ApparelLayer枚举）
const APPAREL_LAYER_MAP: Record<string, ApparelLayer> = {
  OnSkin: ApparelLayer.Skin,
  Skin: ApparelLayer.Skin,
  Middle: ApparelLayer.Middle,
  Shell: ApparelLayer.Outer,
  Outer: ApparelLayer.Outer,
  Belt: ApparelLayer.Belt,
  Overhead: ApparelLayer.Headgear,
  Headgear: ApparelLayer.Headgear,
  EyeCover: ApparelLayer.Eyes,
  Eyes: ApparelLayer.Eyes,
}

/**
 * ThingDef基类节点
 * 包含所有ThingDef共有的属性
 */
interface BaseThingDefNode {
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
 * 武器ThingDef节点
 */
interface WeaponThingDefNode extends BaseThingDefNode {
  category: 'Weapon'

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
}

/**
 * 衣物ThingDef节点
 */
interface ApparelThingDefNode extends BaseThingDefNode {
  category: 'Apparel'

  // 衣物属性
  armorRatingSharp?: number // ArmorRating_Sharp
  armorRatingBlunt?: number // ArmorRating_Blunt
  armorRatingHeat?: number // ArmorRating_Heat
  stuffEffectMultiplierArmor?: number // StuffEffectMultiplierArmor (材料系数)
  stuffCategories?: string[] // 接受的材料类别
  bodyPartGroups?: string[] // 覆盖的身体部位组
  apparelLayers?: string[] // 服装层级
}

/**
 * 通用ThingDef节点（用于解析时的临时存储）
 */
type ThingDefNode = BaseThingDefNode | WeaponThingDefNode | ApparelThingDefNode

/**
 * 类型守卫：判断是否为武器节点
 */
function isWeaponNode(node: ThingDefNode): node is WeaponThingDefNode {
  return node.category === 'Weapon'
}

/**
 * 类型守卫：判断是否为衣物节点
 */
function isApparelNode(node: ThingDefNode): node is ApparelThingDefNode {
  return node.category === 'Apparel'
}

interface ProjectileNode {
  defName: string
  damageAmountBase?: number
  armorPenetrationBase?: number
  stoppingPower?: number

  rawData?: unknown
}

/**
 * CSV格式的衣物数据（用于写入文件）
 * 与ClothingData不同，这里的字段都是字符串格式
 */
interface ClothingCSVData {
  defName: string
  label: string
  armorBlunt: string
  armorSharp: string
  armorHeat: string
  materialCoefficient: string
  acceptedMaterials: string
  bodyPartCoverage: string
  apparelLayers: string
}

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
      defName, // defName可能为undefined，这是正常的（抽象节点没有defName）
      parentName:
        this.getStringValue(xmlNode, 'ParentName') || this.getStringValue(xmlNode, 'parentName'),
      label: this.getStringValue(xmlNode, 'label'),
      description: this.getStringValue(xmlNode, 'description'),
      abstract: this.getStringValue(xmlNode, 'Abstract') === 'True',
      children: new Set(),
      resolved: false,
      rawData: xmlNode,
    }

    // 用于存储所有可能的属性的临时对象
    const tempData: Record<string, unknown> = { ...baseNode }

    // 解析统计数据
    if (this.isRecord(xmlNode.statBases)) {
      const stats = xmlNode.statBases as Record<string, unknown>
      // 武器统计
      tempData.accuracyTouch = this.parseFloat(stats.AccuracyTouch)
      tempData.accuracyShort = this.parseFloat(stats.AccuracyShort)
      tempData.accuracyMedium = this.parseFloat(stats.AccuracyMedium)
      tempData.accuracyLong = this.parseFloat(stats.AccuracyLong)
      tempData.cooldown = this.parseFloat(stats.RangedWeapon_Cooldown)
      baseNode.marketValue = this.parseFloat(stats.MarketValue)

      // 衣物统计
      tempData.armorRatingSharp = this.parseFloat(stats.ArmorRating_Sharp)
      tempData.armorRatingBlunt = this.parseFloat(stats.ArmorRating_Blunt)
      tempData.armorRatingHeat = this.parseFloat(stats.ArmorRating_Heat)
      tempData.stuffEffectMultiplierArmor = this.parseFloat(stats.StuffEffectMultiplierArmor)
    }

    // 解析verbs（射击属性）
    if (this.isRecord(xmlNode.verbs) && xmlNode.verbs.li) {
      const verb = Array.isArray(xmlNode.verbs.li) ? xmlNode.verbs.li[0] : xmlNode.verbs.li
      if (this.isRecord(verb)) {
        tempData.warmupTime = this.parseFloat(verb.warmupTime)
        tempData.range = this.parseFloat(verb.range)
        tempData.burstShotCount = this.parseInt(verb.burstShotCount)
        tempData.ticksBetweenBurstShots = this.parseInt(verb.ticksBetweenBurstShots)
        tempData.defaultProjectile = this.getStringValue(verb, 'defaultProjectile')
      }
    }

    // 解析apparel（服装属性）
    if (this.isRecord(xmlNode.apparel)) {
      const apparel = xmlNode.apparel as Record<string, unknown>

      // 解析身体部位组
      if (apparel.bodyPartGroups) {
        tempData.bodyPartGroups = this.parseArrayField(apparel.bodyPartGroups)
      }

      // 解析服装层级
      if (apparel.layers) {
        tempData.apparelLayers = this.parseArrayField(apparel.layers)
      }
    }

    // 解析材料类别
    if (xmlNode.stuffCategories) {
      tempData.stuffCategories = this.parseArrayField(xmlNode.stuffCategories)
    }

    // 识别类别并创建对应类型的节点
    let finalNode: ThingDefNode

    if (
      xmlNode.weaponClasses ||
      xmlNode.weaponTags ||
      tempData.defaultProjectile ||
      tempData.range
    ) {
      // 创建武器节点
      const weaponNode: WeaponThingDefNode = {
        ...baseNode,
        category: 'Weapon',
        accuracyTouch: tempData.accuracyTouch as number | undefined,
        accuracyShort: tempData.accuracyShort as number | undefined,
        accuracyMedium: tempData.accuracyMedium as number | undefined,
        accuracyLong: tempData.accuracyLong as number | undefined,
        cooldown: tempData.cooldown as number | undefined,
        warmupTime: tempData.warmupTime as number | undefined,
        range: tempData.range as number | undefined,
        burstShotCount: tempData.burstShotCount as number | undefined,
        ticksBetweenBurstShots: tempData.ticksBetweenBurstShots as number | undefined,
        defaultProjectile: tempData.defaultProjectile as string | undefined,
      }
      finalNode = weaponNode
    } else if (
      xmlNode.apparel ||
      tempData.apparelLayers ||
      tempData.bodyPartGroups ||
      tempData.armorRatingSharp !== undefined ||
      tempData.armorRatingBlunt !== undefined ||
      tempData.armorRatingHeat !== undefined
    ) {
      // 创建衣物节点
      const apparelNode: ApparelThingDefNode = {
        ...baseNode,
        category: 'Apparel',
        armorRatingSharp: tempData.armorRatingSharp as number | undefined,
        armorRatingBlunt: tempData.armorRatingBlunt as number | undefined,
        armorRatingHeat: tempData.armorRatingHeat as number | undefined,
        stuffEffectMultiplierArmor: tempData.stuffEffectMultiplierArmor as number | undefined,
        stuffCategories: tempData.stuffCategories as string[] | undefined,
        bodyPartGroups: tempData.bodyPartGroups as string[] | undefined,
        apparelLayers: tempData.apparelLayers as string[] | undefined,
      }
      finalNode = apparelNode
    } else {
      // 未分类的基础节点
      finalNode = baseNode
    }

    // 函数入口做了检查，两个不会同时为undefined
    this.thingDefMap.set(identifier, finalNode)

    // 如果是子弹定义（投射物必须有defName才能被引用）
    if (defName && this.isProjectile(xmlNode)) {
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

  private parseArrayField(value: unknown): string[] {
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
      const weaponChild = child as WeaponThingDefNode
      const weaponParent = parent as WeaponThingDefNode

      const weaponProps: (keyof WeaponThingDefNode)[] = [
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
      ]

      for (const prop of weaponProps) {
        if (weaponChild[prop] === undefined && weaponParent[prop] !== undefined) {
          ;(weaponChild as unknown as Record<string, unknown>)[prop] = weaponParent[prop]
        }
      }
    }

    // 如果父子都是衣物节点，继承衣物属性
    if (child.category === 'Apparel' && parent.category === 'Apparel') {
      const apparelChild = child as ApparelThingDefNode
      const apparelParent = parent as ApparelThingDefNode

      const apparelProps: (keyof ApparelThingDefNode)[] = [
        'armorRatingSharp',
        'armorRatingBlunt',
        'armorRatingHeat',
        'stuffEffectMultiplierArmor',
      ]

      for (const prop of apparelProps) {
        if (apparelChild[prop] === undefined && apparelParent[prop] !== undefined) {
          ;(apparelChild as unknown as Record<string, unknown>)[prop] = apparelParent[prop]
        }
      }

      // 特殊处理数组属性（合并而非覆盖）
      if (
        apparelParent.stuffCategories &&
        (!apparelChild.stuffCategories || apparelChild.stuffCategories.length === 0)
      ) {
        apparelChild.stuffCategories = [...apparelParent.stuffCategories]
      }
      if (
        apparelParent.bodyPartGroups &&
        (!apparelChild.bodyPartGroups || apparelChild.bodyPartGroups.length === 0)
      ) {
        apparelChild.bodyPartGroups = [...apparelParent.bodyPartGroups]
      }
      if (
        apparelParent.apparelLayers &&
        (!apparelChild.apparelLayers || apparelChild.apparelLayers.length === 0)
      ) {
        apparelChild.apparelLayers = [...apparelParent.apparelLayers]
      }
    }
  }

  private async generateWeaponCSV(): Promise<void> {
    console.log('开始生成武器CSV...')

    const weapons: WeaponThingDefNode[] = []

    for (const node of this.thingDefMap.values()) {
      // 跳过抽象定义和非武器
      if (node.abstract || !isWeaponNode(node)) {
        continue
      }

      // 必须有射程和子弹（远程武器）
      if (!node.range || !node.defaultProjectile) {
        continue
      }

      weapons.push(node)
    }

    console.log(`找到 ${weapons.length} 个武器定义`)

    if (weapons.length === 0) {
      console.warn('未找到有效的武器定义')
      return
    }

    // 创建 MOD 专用目录
    const modOutputDir = path.join(WEAPON_OUTPUT_DIR, this.modName)
    if (!fs.existsSync(modOutputDir)) {
      fs.mkdirSync(modOutputDir, { recursive: true })
    }

    // 生成默认语言（使用原始label）的CSV
    const defaultWeapons = weapons.map((node) => this.createWeaponRow(node, null))
    await this.writeWeaponCSV(defaultWeapons, modOutputDir, 'en-US')

    // 为每种语言生成单独的CSV
    for (const [languageCode, translations] of this.languageData.entries()) {
      console.log(`生成 ${languageCode} 语言的武器CSV...`)
      const localizedWeapons = weapons.map((node) => this.createWeaponRow(node, translations))
      await this.writeWeaponCSV(localizedWeapons, modOutputDir, languageCode)
    }
  }

  private createWeaponRow(
    weapon: WeaponThingDefNode,
    translations: Map<string, string> | null,
  ): WeaponCSVData {
    // 获取子弹数据
    let damage = ''
    let armorPenetration = ''
    let stoppingPower = ''

    if (weapon.defaultProjectile) {
      const projectile = this.projectileMap.get(weapon.defaultProjectile)
      if (projectile) {
        damage =
          projectile.damageAmountBase !== undefined ? projectile.damageAmountBase.toString() : ''
        // 输出为小数格式（0-1），不再使用百分比
        armorPenetration =
          projectile.armorPenetrationBase !== undefined
            ? projectile.armorPenetrationBase.toString()
            : ''
        stoppingPower =
          projectile.stoppingPower !== undefined ? projectile.stoppingPower.toString() : ''
      }
    }

    // 获取翻译后的label（如果有翻译数据）
    // 翻译键使用defName或identifier
    let label = weapon.label || weapon.defName || weapon.identifier || ''
    const keyForTranslation = weapon.defName || weapon.identifier
    if (translations && keyForTranslation) {
      const translationKey = `${keyForTranslation}.label`
      const translatedLabel = translations.get(translationKey)
      if (translatedLabel) {
        label = translatedLabel
      }
    }

    // 格式化数据
    const formatNumber = (val?: number) => (val !== undefined ? val.toString() : '')

    const row: WeaponCSVData = {
      defName: weapon.defName || '',
      label: label,
      damage: damage,
      armorPenetration: armorPenetration,
      stoppingPower: stoppingPower,
      warmupTime: formatNumber(weapon.warmupTime),
      cooldown: formatNumber(weapon.cooldown),
      range: formatNumber(weapon.range),
      burstShotCount: formatNumber(weapon.burstShotCount),
      ticksBetweenBurstShots: formatNumber(weapon.ticksBetweenBurstShots),
      accuracyTouch: formatNumber(weapon.accuracyTouch),
      accuracyShort: formatNumber(weapon.accuracyShort),
      accuracyMedium: formatNumber(weapon.accuracyMedium),
      accuracyLong: formatNumber(weapon.accuracyLong),
      marketValue: formatNumber(weapon.marketValue),
    }

    return row
  }

  private async writeWeaponCSV(
    data: WeaponCSVData[],
    outputDir: string,
    languageCode: string,
  ): Promise<void> {
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const outputPath = path.join(outputDir, `${languageCode}.csv`)

    // CSV头部
    const headers = [
      'defName',
      'label',
      'damage',
      'armorPenetration',
      'stoppingPower',
      'warmupTime',
      'cooldown',
      'range',
      'burstShotCount',
      'ticksBetweenBurstShots',
      'accuracyTouch',
      'accuracyShort',
      'accuracyMedium',
      'accuracyLong',
      'marketValue',
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

    console.log(`武器CSV文件已生成: ${outputPath}`)
  }

  private async generateClothingCSV(): Promise<void> {
    console.log('开始生成衣物CSV...')

    const clothing: ApparelThingDefNode[] = []

    for (const node of this.thingDefMap.values()) {
      // 跳过抽象定义和非衣物
      if (node.abstract || !isApparelNode(node)) {
        continue
      }

      // 必须有身体部位覆盖或服装层级
      if (!node.bodyPartGroups && !node.apparelLayers) {
        continue
      }

      clothing.push(node)
    }

    console.log(`找到 ${clothing.length} 个衣物定义`)

    if (clothing.length === 0) {
      console.warn('未找到有效的衣物定义')
      return
    }

    // 创建 MOD 专用目录
    const modOutputDir = path.join(CLOTHING_OUTPUT_DIR, this.modName)
    if (!fs.existsSync(modOutputDir)) {
      fs.mkdirSync(modOutputDir, { recursive: true })
    }

    // 生成默认语言（使用原始label）的CSV
    const defaultClothing = clothing.map((node) => this.createClothingRow(node, null))
    await this.writeClothingCSV(defaultClothing, modOutputDir, 'en-US')

    // 为每种语言生成单独的CSV
    for (const [languageCode, translations] of this.languageData.entries()) {
      console.log(`生成 ${languageCode} 语言的衣物CSV...`)
      const localizedClothing = clothing.map((node) => this.createClothingRow(node, translations))
      await this.writeClothingCSV(localizedClothing, modOutputDir, languageCode)
    }
  }

  private createClothingRow(
    clothing: ApparelThingDefNode,
    translations: Map<string, string> | null,
  ): ClothingCSVData {
    // 获取翻译后的label（如果有翻译数据）
    // 翻译键使用defName或identifier
    let label = clothing.label || clothing.defName || clothing.identifier || ''
    const keyForTranslation = clothing.defName || clothing.identifier
    if (translations && keyForTranslation) {
      const translationKey = `${keyForTranslation}.label`
      const translatedLabel = translations.get(translationKey)
      if (translatedLabel) {
        label = translatedLabel
      }
    }

    // 格式化数字（保留原始小数格式，不转换为百分比）
    const formatNumber = (val?: number) => (val !== undefined ? val.toString() : '')

    // 映射身体部位组到BodyPart枚举
    const bodyPartCoverage: BodyPart[] = []
    if (clothing.bodyPartGroups) {
      for (const group of clothing.bodyPartGroups) {
        const mappedParts = BODY_PART_GROUP_MAP[group]
        if (mappedParts) {
          bodyPartCoverage.push(...mappedParts)
        }
      }
    }

    // 映射服装层级到ApparelLayer枚举
    const apparelLayers: ApparelLayer[] = []
    if (clothing.apparelLayers) {
      for (const layer of clothing.apparelLayers) {
        const mappedLayer = APPAREL_LAYER_MAP[layer]
        if (mappedLayer !== undefined) {
          apparelLayers.push(mappedLayer)
        }
      }
    }

    const row: ClothingCSVData = {
      defName: clothing.defName || '',
      label: label,
      armorBlunt: formatNumber(clothing.armorRatingBlunt),
      armorSharp: formatNumber(clothing.armorRatingSharp),
      armorHeat: formatNumber(clothing.armorRatingHeat),
      materialCoefficient: formatNumber(clothing.stuffEffectMultiplierArmor),
      acceptedMaterials: clothing.stuffCategories?.join('、') || '',
      bodyPartCoverage: bodyPartCoverage.join('、'), // BodyPart枚举值用顿号分隔
      apparelLayers: apparelLayers.map((l) => l.toString()).join('、'), // ApparelLayer数值用顿号分隔
    }

    return row
  }

  private async writeClothingCSV(
    data: ClothingCSVData[],
    outputDir: string,
    languageCode: string,
  ): Promise<void> {
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const outputPath = path.join(outputDir, `${languageCode}.csv`)

    // CSV头部（匹配ClothingData接口）
    const headers = [
      'defName',
      'label',
      'armorBlunt',
      'armorSharp',
      'armorHeat',
      'materialCoefficient',
      'acceptedMaterials',
      'bodyPartCoverage',
      'apparelLayers',
    ]

    // 构建CSV内容
    const lines = [headers.join(',')]

    for (const row of data) {
      const values = headers.map((header) => {
        const value = String(row[header as keyof ClothingCSVData] || '')
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

    console.log(`衣物CSV文件已生成: ${outputPath}`)
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
