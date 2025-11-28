<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Delete, QuestionFilled } from '@element-plus/icons-vue'
import { useTimeoutFn } from '@vueuse/core'
import {
  getApparelDataSources,
  type ClothingDataSource,
  type ClothingData,
} from '@/utils/apparelDataParser'
import {
  getMaterialDataSources,
  type MaterialData,
  type MaterialDataSource,
} from '@/utils/materialDataParser'
import { MaterialTag, parseAcceptedMaterials } from '@/types/material'
import { type ArmorSet, ApparelLayer, DamageType } from '@/types/armor'
import { getApparelLayerName } from '@/utils/armorUtils'
import { BodyPart } from '@/types/bodyPart'
import { BodyPartNames, buildBodyPartTree } from '@/utils/bodyPartUtils'
import {
  buildCoverageMap,
  buildCoverageTree,
  getApparelLayerOptions,
  type CoverageTreeNode,
} from '@/utils/coverageUtils'
import { QualityCategory, getQualityOptions } from '@/types/quality'
import { getActualArmorValue } from '@/utils/armorCalculations'
import ArmorChart from './ArmorChart.vue'
import ArmorReductionCurve from './ArmorReductionCurve.vue'
import SliderInput from './SliderInput.vue'

const { t, locale } = useI18n()

// 常量
const ARMOR_COLORS = [
  '#409EFF',
  '#67C23A',
  '#E6A23C',
  '#F56C6C',
  '#909399',
  '#00D9FF',
  '#FF00FF',
  '#FFD700',
]

// 品质选项
const qualityOptions = getQualityOptions()

// 状态
const chartMode = ref<'distribution' | 'curve'>('curve')
const damageType = ref<DamageType>(DamageType.Sharp)
const fixedPenetration = ref(35) // 用于减伤概率分布模式

// 选中的身体部位（用于计算该部位的护甲）
const selectedBodyPart = ref<BodyPart>(BodyPart.Torso)

// 材料数据源
const materialDataSources = ref<MaterialDataSource[]>([])
// 每个材料类型的选中数据源ID
const selectedMaterialDataSourceIds = ref<Record<MaterialTag, string | null>>({
  [MaterialTag.Metallic]: null,
  [MaterialTag.Woody]: null,
  [MaterialTag.Leathery]: null,
  [MaterialTag.Fabric]: null,
})

// 衣物数据源
const clothingDataSources = ref<ClothingDataSource[]>([])

// 全局材料 - 使用 MaterialData 类型
const globalMaterials = ref<{
  [MaterialTag.Metallic]: MaterialData
  [MaterialTag.Woody]: MaterialData
  [MaterialTag.Leathery]: MaterialData
  [MaterialTag.Fabric]: MaterialData
}>({
  [MaterialTag.Metallic]: {
    defName: 'Steel',
    label: '钢铁',
    armorSharp: 100,
    armorBlunt: 36,
    armorHeat: 27,
    tags: [MaterialTag.Metallic],
  },
  [MaterialTag.Woody]: {
    defName: 'WoodLog',
    label: '木材',
    armorSharp: 54,
    armorBlunt: 18,
    armorHeat: 9,
    tags: [MaterialTag.Woody],
  },
  [MaterialTag.Leathery]: {
    defName: 'Leather_Plain',
    label: '普通皮革',
    armorSharp: 112,
    armorBlunt: 24,
    armorHeat: 35,
    tags: [MaterialTag.Leathery],
  },
  [MaterialTag.Fabric]: {
    defName: 'Synthread',
    label: '合成纤维',
    armorSharp: 81,
    armorBlunt: 12,
    armorHeat: 18,
    tags: [MaterialTag.Fabric],
  },
})

// 加载状态标志
const isLoadingPreset = ref(false)
const { start: startLoadingTimer, stop: stopLoadingTimer } = useTimeoutFn(() => {
  isLoadingPreset.value = false
}, 1000)

// 材料折叠面板
const activeMaterialPanels = ref<MaterialTag[]>([])

// 材料类型配置 - computed for i18n reactivity
const materialTypes = computed(
  () =>
    [
      { tag: MaterialTag.Metallic, name: MaterialTag.Metallic, label: t('materialType.Metallic') },
      { tag: MaterialTag.Woody, name: MaterialTag.Woody, label: t('materialType.Woody') },
      { tag: MaterialTag.Leathery, name: MaterialTag.Leathery, label: t('materialType.Leathery') },
      { tag: MaterialTag.Fabric, name: MaterialTag.Fabric, label: t('materialType.Fabric') },
    ] as const,
)

// 身体部位树数据
const bodyPartTreeData = buildBodyPartTree()

// 服装层级选项
const apparelLayerOptions = getApparelLayerOptions()

let nextArmorSetId = 1
const armorSets = ref<ArmorSet[]>([])

// 方法
const addArmorSet = () => {
  const colorIndex = armorSets.value.length % ARMOR_COLORS.length
  const newArmorSet: ArmorSet = {
    id: nextArmorSetId++,
    name: t('armor.defaultSetName', { n: armorSets.value.length + 1 }),
    color: ARMOR_COLORS[colorIndex]!,
    layers: [
      {
        itemName: t('armor.defaultApparelName'),
        armorSharp: 50,
        armorBlunt: 20,
        armorHeat: 20,
        quality: QualityCategory.Masterwork,
        useMaterial: false,
        materialCoefficient: 1.0,
        selectedMaterial: MaterialTag.Fabric,
        supportedMaterials: [
          MaterialTag.Metallic,
          MaterialTag.Woody,
          MaterialTag.Leathery,
          MaterialTag.Fabric,
        ],
        apparelLayers: [ApparelLayer.Outer],
        bodyPartCoverage: [BodyPart.Torso],
        selectedDataSourceId: null,
        selectedClothingDefName: null,
      },
    ],
  }
  armorSets.value.push(newArmorSet)
}

const removeArmorSet = (id: number) => {
  if (armorSets.value.length > 1) {
    armorSets.value = armorSets.value.filter((s) => s.id !== id)
  }
}

const addLayer = (armorSet: ArmorSet) => {
  armorSet.layers.push({
    itemName: t('armor.defaultApparelName'),
    armorSharp: 50,
    armorBlunt: 20,
    armorHeat: 20,
    quality: QualityCategory.Masterwork,
    useMaterial: false,
    materialCoefficient: 1.0,
    selectedMaterial: MaterialTag.Fabric,
    supportedMaterials: [
      MaterialTag.Metallic,
      MaterialTag.Woody,
      MaterialTag.Leathery,
      MaterialTag.Fabric,
    ],
    apparelLayers: [ApparelLayer.Outer],
    bodyPartCoverage: [BodyPart.Torso],
    selectedDataSourceId: null,
    selectedClothingDefName: null,
  })
}

const removeLayer = (armorSet: ArmorSet, index: number) => {
  if (armorSet.layers.length > 1) {
    armorSet.layers.splice(index, 1)
  }
}

// 计算层的实际护甲值（考虑材料依赖和品质）
const getLayerActualArmor = (layer: ArmorSet['layers'][number]) => {
  let baseArmor = {
    armorSharp: layer.armorSharp,
    armorBlunt: layer.armorBlunt,
    armorHeat: layer.armorHeat,
  }

  // 如果使用材料，先计算材料护甲值
  if (layer.useMaterial && layer.materialCoefficient && layer.selectedMaterial) {
    const material = globalMaterials.value[layer.selectedMaterial]
    if (material) {
      // 材料系数 × 材料护甲值
      baseArmor = {
        armorSharp: layer.materialCoefficient * material.armorSharp,
        armorBlunt: layer.materialCoefficient * material.armorBlunt,
        armorHeat: layer.materialCoefficient * material.armorHeat,
      }
    } else {
      // 如果没有材料，返回0
      baseArmor = { armorSharp: 0, armorBlunt: 0, armorHeat: 0 }
    }
  }

  // 应用品质系数到护甲值
  const actualArmorLayer = {
    ...layer,
    armorSharp: baseArmor.armorSharp / 100, // 转换为0-2范围
    armorBlunt: baseArmor.armorBlunt / 100,
    armorHeat: baseArmor.armorHeat / 100,
  }

  return {
    armorSharp: getActualArmorValue(actualArmorLayer, DamageType.Sharp) * 100, // 转回百分比
    armorBlunt: getActualArmorValue(actualArmorLayer, DamageType.Blunt) * 100,
    armorHeat: getActualArmorValue(actualArmorLayer, DamageType.Heat) * 100,
  }
}

// 根据数据源ID和材料类型获取材料列表
const getMaterialsByDataSource = (
  dataSourceId: string | null | undefined,
  materialTag: MaterialTag,
): MaterialData[] => {
  if (!dataSourceId) return []
  const source = materialDataSources.value.find((s) => s.id === dataSourceId)
  return source?.materials[materialTag] || []
}

// 应用材料预设
const applyMaterialPreset = (materialType: MaterialTag, dataSourceId: string, defName: string) => {
  const material = getMaterialsByDataSource(dataSourceId, materialType).find(
    (m) => m.defName === defName,
  )
  if (!material) return

  selectedMaterialDataSourceIds.value[materialType] = dataSourceId
  loadMaterialPreset(materialType, material)
}

// 根据数据源ID获取衣物列表
const getClothingByDataSource = (dataSourceId: string | null | undefined): ClothingData[] => {
  if (!dataSourceId) return []
  const source = clothingDataSources.value.find((s) => s.id === dataSourceId)
  return source?.clothing || []
}

// 应用衣物预设
const applyClothingPreset = (
  layer: ArmorSet['layers'][number],
  dataSourceId: string,
  defName: string,
) => {
  const clothing = getClothingByDataSource(dataSourceId).find((c) => c.defName === defName)
  if (!clothing) return

  layer.selectedDataSourceId = dataSourceId
  layer.selectedClothingDefName = defName
  loadClothingPreset(layer, clothing)
}

// 覆盖树（用于可视化哪些部位和层级被覆盖）
const allCoverageTrees = computed(() => {
  return armorSets.value.map((armorSet) => {
    // 使用 buildCoverageMap 正确合并所有层的覆盖信息
    const coverageMap = buildCoverageMap(armorSet.layers)
    return {
      armorSetId: armorSet.id,
      coverageTree: buildCoverageTree(coverageMap),
    }
  })
})

// 开始加载预设（设置标志并启动计时器）
const startLoadingPreset = () => {
  isLoadingPreset.value = true
  stopLoadingTimer() // 停止之前的计时器
  startLoadingTimer() // 启动新的计时器
}

// 全局材料值变化处理
const onMaterialValueChange = (materialType: MaterialTag) => {
  if (!isLoadingPreset.value) {
    globalMaterials.value[materialType].defName = 'Custom'
    globalMaterials.value[materialType].label = '自定义'
  }
}

// 加载全局材料预设
const loadMaterialPreset = (materialType: MaterialTag, material: MaterialData) => {
  startLoadingPreset()
  // 将0-2的材料护甲值转换为0-200的百分比
  globalMaterials.value[materialType] = {
    ...material,
    armorSharp: Math.round(material.armorSharp * 100),
    armorBlunt: Math.round(material.armorBlunt * 100),
    armorHeat: Math.round(material.armorHeat * 100),
  }
}

// 从衣物预设加载到层
const loadClothingPreset = (layer: ArmorSet['layers'][number], preset: ClothingData) => {
  startLoadingPreset()
  layer.itemName = preset.label

  // 解析层级信息
  if (preset.apparelLayers && preset.apparelLayers.length > 0) {
    layer.apparelLayers = preset.apparelLayers
  } else {
    layer.apparelLayers = [ApparelLayer.Outer] // 默认外套层
  }

  // 解析覆盖部位信息
  if (preset.bodyPartCoverage && preset.bodyPartCoverage.length > 0) {
    layer.bodyPartCoverage = preset.bodyPartCoverage
  } else {
    layer.bodyPartCoverage = [BodyPart.Torso] // 默认覆盖躯干
  }

  // 设置默认品质为大师级
  layer.quality = QualityCategory.Masterwork

  if (preset.materialCoefficient !== undefined && preset.materialCoefficient > 0) {
    // 使用材料计算
    layer.useMaterial = true
    layer.materialCoefficient = preset.materialCoefficient
    layer.supportedMaterials = parseAcceptedMaterials(preset.acceptedMaterials)
    // 选择第一个支持的材料
    layer.selectedMaterial = layer.supportedMaterials[0]
  } else {
    // 直接输入护甲值
    layer.useMaterial = false
    layer.armorSharp = (preset.armorSharp || 0) * 100
    layer.armorBlunt = (preset.armorBlunt || 0) * 100
    layer.armorHeat = (preset.armorHeat || 0) * 100
  }
}

// 检查每个护甲套装中的覆盖冲突
const armorSetConflicts = computed(() => {
  return armorSets.value.map((armorSet) => {
    const conflicts: Array<{
      layerIndex: number
      conflictingWith: number[]
      message: string
    }> = []

    // 记录每个部位+层级的占用情况
    const coverage = new Map<string, number>() // "BodyPart:Layer" -> layerIndex

    armorSet.layers.forEach((layer, layerIndex) => {
      const layerConflicts: number[] = []

      for (const bodyPart of layer.bodyPartCoverage) {
        for (const apparelLayer of layer.apparelLayers) {
          const key = `${bodyPart}:${apparelLayer}`
          const existingLayerIndex = coverage.get(key)

          if (existingLayerIndex !== undefined && existingLayerIndex !== layerIndex) {
            // 发现冲突
            if (!layerConflicts.includes(existingLayerIndex)) {
              layerConflicts.push(existingLayerIndex)
            }
          } else {
            coverage.set(key, layerIndex)
          }
        }
      }

      if (layerConflicts.length > 0) {
        conflicts.push({
          layerIndex,
          conflictingWith: layerConflicts,
          message: t('armor.coverageConflict', {
            layers: layerConflicts.map((i) => i + 1).join('、'),
          }),
        })
      }
    })

    return {
      armorSetId: armorSet.id,
      conflicts,
      hasConflicts: conflicts.length > 0,
    }
  })
})

// 处理覆盖树节点点击
const handleTreeNodeClick = (data: CoverageTreeNode) => {
  if (data.value) {
    selectedBodyPart.value = data.value as BodyPart
  }
}

// 选中部位的名称（用于显示）
const selectedBodyPartName = computed(() => {
  return BodyPartNames[selectedBodyPart.value]
})

// 监听全局材料变化，重新计算护甲
watch(
  globalMaterials,
  () => {
    // 触发计算属性重新计算
  },
  { deep: true },
)

// 辅助函数：将材料数据从0-2范围转换为0-200%范围
const convertMaterialToPercentage = (material: MaterialData): MaterialData => {
  return {
    ...material,
    armorSharp: Math.round(material.armorSharp * 100),
    armorBlunt: Math.round(material.armorBlunt * 100),
    armorHeat: Math.round(material.armorHeat * 100),
  }
}

// 生命周期
onMounted(async () => {
  // 加载材料数据
  materialDataSources.value = await getMaterialDataSources(locale.value)

  // 加载衣物数据
  clothingDataSources.value = await getApparelDataSources(locale.value)

  // 设置默认材料（从预设中加载）
  const vanillaSource = materialDataSources.value.find((s) => s.id === 'vanilla')
  if (vanillaSource) {
    // 钢铁
    const steel = vanillaSource.materials[MaterialTag.Metallic].find((m) => m.defName === 'Steel')
    if (steel) {
      globalMaterials.value[MaterialTag.Metallic] = convertMaterialToPercentage(steel)
      selectedMaterialDataSourceIds.value[MaterialTag.Metallic] = 'vanilla'
    }

    // 合成纤维
    const synthread = vanillaSource.materials[MaterialTag.Fabric].find(
      (m) => m.defName === 'Synthread',
    )
    if (synthread) {
      globalMaterials.value[MaterialTag.Fabric] = convertMaterialToPercentage(synthread)
      selectedMaterialDataSourceIds.value[MaterialTag.Fabric] = 'vanilla'
    }

    // 普通皮革
    const plainLeather = vanillaSource.materials[MaterialTag.Leathery].find(
      (m) => m.defName === 'Leather_Plain',
    )
    if (plainLeather) {
      globalMaterials.value[MaterialTag.Leathery] = convertMaterialToPercentage(plainLeather)
      selectedMaterialDataSourceIds.value[MaterialTag.Leathery] = 'vanilla'
    }

    // 木材
    const wood = vanillaSource.materials[MaterialTag.Woody].find((m) => m.defName === 'WoodLog')
    if (wood) {
      globalMaterials.value[MaterialTag.Woody] = convertMaterialToPercentage(wood)
      selectedMaterialDataSourceIds.value[MaterialTag.Woody] = 'vanilla'
    }
  }

  // 加载预设护甲套装
  const vanillaClothingSource = clothingDataSources.value.find((s) => s.id === 'vanilla')
  if (vanillaClothingSource) {
    // 第一套：双层防弹套
    const bulletproofJacket = vanillaClothingSource.clothing.find(
      (c: ClothingData) => c.defName === 'Apparel_FlakJacket',
    )
    const bulletproofVest = vanillaClothingSource.clothing.find(
      (c: ClothingData) => c.defName === 'Apparel_FlakVest',
    )

    if (bulletproofJacket && bulletproofVest) {
      const doubleBulletproofSet: ArmorSet = {
        id: nextArmorSetId++,
        name: t('armor.presetDoubleBulletproof'),
        color: ARMOR_COLORS[0]!,
        layers: [],
      }

      // 添加防弹夹克层
      const jacketLayer: ArmorSet['layers'][number] = {
        itemName: bulletproofJacket.label,
        armorSharp: 0,
        armorBlunt: 0,
        armorHeat: 0,
        quality: QualityCategory.Masterwork,
        useMaterial: false,
        materialCoefficient: 1.0,
        selectedMaterial: MaterialTag.Fabric,
        supportedMaterials: [
          MaterialTag.Metallic,
          MaterialTag.Woody,
          MaterialTag.Leathery,
          MaterialTag.Fabric,
        ],
        apparelLayers: bulletproofJacket.apparelLayers || [ApparelLayer.Outer],
        bodyPartCoverage: bulletproofJacket.bodyPartCoverage || [BodyPart.Torso],
        selectedDataSourceId: 'vanilla',
        selectedClothingDefName: 'Apparel_FlakJacket',
      }
      loadClothingPreset(jacketLayer, bulletproofJacket)
      doubleBulletproofSet.layers.push(jacketLayer)

      // 添加防弹背心层
      const vestLayer: ArmorSet['layers'][number] = {
        itemName: bulletproofVest.label,
        armorSharp: 0,
        armorBlunt: 0,
        armorHeat: 0,
        quality: QualityCategory.Masterwork,
        useMaterial: false,
        materialCoefficient: 1.0,
        selectedMaterial: MaterialTag.Fabric,
        supportedMaterials: [
          MaterialTag.Metallic,
          MaterialTag.Woody,
          MaterialTag.Leathery,
          MaterialTag.Fabric,
        ],
        apparelLayers: bulletproofVest.apparelLayers || [ApparelLayer.Middle],
        bodyPartCoverage: bulletproofVest.bodyPartCoverage || [BodyPart.Torso],
        selectedDataSourceId: 'vanilla',
        selectedClothingDefName: 'Apparel_FlakVest',
      }
      loadClothingPreset(vestLayer, bulletproofVest)
      doubleBulletproofSet.layers.push(vestLayer)

      armorSets.value.push(doubleBulletproofSet)
    }

    // 第二套：单层海军甲
    const marineArmor = vanillaClothingSource.clothing.find(
      (c: ClothingData) => c.defName === 'Apparel_PowerArmor',
    )

    if (marineArmor) {
      const singleMarineSet: ArmorSet = {
        id: nextArmorSetId++,
        name: t('armor.presetSingleMarine'),
        color: ARMOR_COLORS[1]!,
        layers: [],
      }

      const marineLayer: ArmorSet['layers'][number] = {
        itemName: marineArmor.label,
        armorSharp: 0,
        armorBlunt: 0,
        armorHeat: 0,
        quality: QualityCategory.Masterwork,
        useMaterial: false,
        materialCoefficient: 1.0,
        selectedMaterial: MaterialTag.Fabric,
        supportedMaterials: [
          MaterialTag.Metallic,
          MaterialTag.Woody,
          MaterialTag.Leathery,
          MaterialTag.Fabric,
        ],
        apparelLayers: marineArmor.apparelLayers || [ApparelLayer.Outer, ApparelLayer.Middle],
        bodyPartCoverage: marineArmor.bodyPartCoverage || [BodyPart.Torso],
        selectedDataSourceId: 'vanilla',
        selectedClothingDefName: 'Apparel_PowerArmor',
      }
      loadClothingPreset(marineLayer, marineArmor)
      singleMarineSet.layers.push(marineLayer)

      armorSets.value.push(singleMarineSet)
    }
  }

  // 如果没有成功加载任何预设，添加一个默认的空套装
  if (armorSets.value.length === 0) {
    addArmorSet()
  }
})
</script>

<template>
  <div class="calculator">
    <el-splitter class="main-layout">
      <!-- 左侧：参数输入 -->
      <el-splitter-panel size="30%" min="20%" collapsible class="left-panel">
        <!-- 全局参数 -->
        <el-card class="global-section">
          <template #header>
            <h3>{{ t('armor.globalParams') }}</h3>
          </template>
          <el-form label-width="10em">
            <el-form-item :label="t('armor.damageTypeLabel')">
              <el-radio-group v-model="damageType">
                <el-radio-button :value="DamageType.Sharp">{{
                  t('damageType.sharp')
                }}</el-radio-button>
                <el-radio-button :value="DamageType.Blunt">{{
                  t('damageType.blunt')
                }}</el-radio-button>
                <el-radio-button :value="DamageType.Heat">{{
                  t('damageType.heat')
                }}</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <template v-if="chartMode === 'distribution'">
              <el-form-item :label="t('armor.fixedPenetration')">
                <SliderInput v-model="fixedPenetration" :min="0" :max="100" :step="1" unit="%" />
              </el-form-item>
            </template>

            <el-form-item :label="t('armor.globalMaterialPresets')">
              <el-collapse v-model="activeMaterialPanels" accordion class="material-collapse">
                <el-collapse-item
                  v-for="materialType in materialTypes"
                  :key="materialType.tag"
                  :title="materialType.label"
                  :name="materialType.name"
                >
                  <div class="material-preset-section">
                    <div class="preset-selectors">
                      <el-select
                        v-model="selectedMaterialDataSourceIds[materialType.tag]"
                        :placeholder="t('armor.selectDataSource')"
                        style="width: 100%; margin-bottom: 8px"
                        clearable
                        filterable
                      >
                        <el-option
                          v-for="source in materialDataSources"
                          :key="source.id"
                          :label="source.label"
                          :value="source.id"
                        />
                      </el-select>
                      <el-select
                        :model-value="globalMaterials[materialType.tag].defName"
                        :placeholder="t('armor.selectMaterialPreset', { type: materialType.label })"
                        style="width: 100%"
                        clearable
                        filterable
                        :disabled="!selectedMaterialDataSourceIds[materialType.tag]"
                        @change="
                          (defName: string) => {
                            if (selectedMaterialDataSourceIds[materialType.tag] && defName) {
                              applyMaterialPreset(
                                materialType.tag,
                                selectedMaterialDataSourceIds[materialType.tag]!,
                                defName,
                              )
                            }
                          }
                        "
                      >
                        <el-option
                          v-for="material in getMaterialsByDataSource(
                            selectedMaterialDataSourceIds[materialType.tag],
                            materialType.tag,
                          )"
                          :key="material.defName"
                          :label="`${material.label} (${t('damageType.sharp')}${Math.round(material.armorSharp * 100)}% ${t('damageType.blunt')}${Math.round(material.armorBlunt * 100)}% ${t('damageType.heat')}${Math.round(material.armorHeat * 100)}%)`"
                          :value="material.defName"
                        />
                      </el-select>
                    </div>

                    <div class="material-sliders">
                      <div class="slider-row">
                        <span class="slider-label">{{ t('armor.armorSharp') }}</span>
                        <SliderInput
                          v-model="globalMaterials[materialType.tag].armorSharp"
                          :min="0"
                          :max="200"
                          :step="1"
                          :format-tooltip="(val: number) => `${val}%`"
                          unit="%"
                          @change="() => onMaterialValueChange(materialType.tag)"
                        />
                      </div>
                      <div class="slider-row">
                        <span class="slider-label">{{ t('armor.armorBlunt') }}</span>
                        <SliderInput
                          v-model="globalMaterials[materialType.tag].armorBlunt"
                          :min="0"
                          :max="200"
                          :step="1"
                          :format-tooltip="(val: number) => `${val}%`"
                          unit="%"
                          @change="() => onMaterialValueChange(materialType.tag)"
                        />
                      </div>
                      <div class="slider-row">
                        <span class="slider-label">{{ t('armor.armorHeat') }}</span>
                        <SliderInput
                          v-model="globalMaterials[materialType.tag].armorHeat"
                          :min="0"
                          :max="300"
                          :step="1"
                          :format-tooltip="(val: number) => `${val}%`"
                          unit="%"
                          @change="() => onMaterialValueChange(materialType.tag)"
                        />
                      </div>
                    </div>
                  </div>
                </el-collapse-item>
              </el-collapse>
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 护甲套装卡片列表 -->
        <el-card
          v-for="armorSet in armorSets"
          :key="armorSet.id"
          class="armor-card"
          :style="{ borderLeft: `4px solid ${armorSet.color}` }"
        >
          <template #header>
            <div class="armor-header">
              <el-input
                v-model="armorSet.name"
                :placeholder="t('armor.setNamePlaceholder')"
                class="armor-name-input"
                :style="{ '--armor-color': armorSet.color }"
              />
              <el-button
                v-if="armorSets.length > 1"
                type="danger"
                size="small"
                :icon="Delete"
                circle
                @click="removeArmorSet(armorSet.id)"
              />
            </div>
          </template>

          <!-- 护甲层列表 -->
          <div class="layers-section">
            <el-alert
              v-if="armorSet.layers.length > 1"
              :closable="false"
              type="info"
              style="margin-bottom: 10px"
            >
              <template #title>
                <span style="font-size: 0.9em">{{ t('armor.layerOrderHint') }}</span>

                <el-tooltip effect="dark" placement="top" raw-content>
                  <template #content>
                    <div style="max-width: 300px; line-height: 1.5">
                      {{ t('weapon.qualityTooltip') }}
                    </div>
                  </template>
                  <el-icon style="margin-left: 8px; cursor: help"><QuestionFilled /></el-icon>
                </el-tooltip>
              </template>
            </el-alert>

            <div
              v-for="(layer, layerIndex) in armorSet.layers"
              :key="layerIndex"
              class="layer-item"
            >
              <div class="layer-header">
                <span class="layer-title"
                  >{{ t('armor.layerNumber', { n: layerIndex + 1 }) }}
                </span>
                <el-button
                  v-if="armorSets.length > 1"
                  type="danger"
                  size="small"
                  :icon="Delete"
                  circle
                  @click="removeLayer(armorSet, layerIndex)"
                />
              </div>

              <!-- 覆盖冲突警告 -->
              <el-alert
                v-if="
                  armorSetConflicts
                    .find((c) => c.armorSetId === armorSet.id)
                    ?.conflicts.find((conf) => conf.layerIndex === layerIndex)
                "
                type="warning"
                :closable="false"
                style="margin-bottom: 10px"
              >
                {{
                  armorSetConflicts
                    .find((c) => c.armorSetId === armorSet.id)
                    ?.conflicts.find((conf) => conf.layerIndex === layerIndex)?.message
                }}
              </el-alert>

              <el-form label-width="10em" size="small">
                <el-form-item :label="t('armor.loadPreset')">
                  <div class="preset-selectors">
                    <el-select
                      v-model="layer.selectedDataSourceId"
                      :placeholder="t('armor.selectDataSource')"
                      style="width: 100%; margin-bottom: 8px"
                      clearable
                      filterable
                      @change="layer.selectedClothingDefName = null"
                    >
                      <el-option
                        v-for="source in clothingDataSources"
                        :key="source.id"
                        :label="source.label"
                        :value="source.id"
                      />
                    </el-select>
                    <el-select
                      v-model="layer.selectedClothingDefName"
                      :placeholder="t('armor.selectClothing')"
                      style="width: 100%"
                      clearable
                      filterable
                      :disabled="!layer.selectedDataSourceId"
                      @change="
                        layer.selectedDataSourceId &&
                        layer.selectedClothingDefName &&
                        applyClothingPreset(
                          layer,
                          layer.selectedDataSourceId,
                          layer.selectedClothingDefName,
                        )
                      "
                    >
                      <el-option
                        v-for="clothing in getClothingByDataSource(layer.selectedDataSourceId)"
                        :key="clothing.defName"
                        :label="clothing.label"
                        :value="clothing.defName"
                      />
                    </el-select>
                  </div>
                </el-form-item>

                <el-form-item :label="t('quality.label')">
                  <el-radio-group v-model="layer.quality">
                    <el-radio-button
                      v-for="option in qualityOptions"
                      :key="option.value"
                      :value="option.value"
                      :style="{ '--quality-color': option.color }"
                      class="quality-button"
                    >
                      {{ option.label }}
                    </el-radio-button>
                  </el-radio-group>
                </el-form-item>

                <el-divider content-position="left">
                  <el-tooltip effect="dark" placement="top" raw-content>
                    <template #content>
                      <div style="max-width: 300px; line-height: 1.5">
                        {{ t('weapon.qualityTooltip') }}
                      </div>
                    </template>
                    <el-icon style="margin-left: 8px; cursor: help"
                      ><QuestionFilled
                    /></el-icon> </el-tooltip
                ></el-divider>

                <el-form-item :label="t('armor.apparelLayer')">
                  <el-checkbox-group v-model="layer.apparelLayers">
                    <el-checkbox-button
                      v-for="option in apparelLayerOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ getApparelLayerName(option.value) }}
                    </el-checkbox-button>
                  </el-checkbox-group>
                </el-form-item>

                <el-form-item :label="t('armor.coverageParts')">
                  <el-tree-select
                    v-model="layer.bodyPartCoverage"
                    :data="bodyPartTreeData"
                    multiple
                    clearable
                    collapse-tags
                    collapse-tags-tooltip
                    :max-collapse-tags="10"
                    check-strictly
                    :placeholder="t('armor.selectCoverageParts')"
                    style="width: 100%"
                    :props="{ label: 'label', value: 'value' }"
                    node-key="value"
                  />
                </el-form-item>

                <el-form-item :label="t('armor.armorSource')">
                  <el-radio-group v-model="layer.useMaterial">
                    <el-radio-button :value="false">{{ t('armor.fixedValue') }}</el-radio-button>
                    <el-radio-button :value="true">{{
                      t('armor.dependOnMaterial')
                    }}</el-radio-button>
                  </el-radio-group>
                </el-form-item>

                <template v-if="!layer.useMaterial">
                  <el-form-item :label="t('armor.armorSharp')">
                    <SliderInput
                      v-model="layer.armorSharp"
                      :min="0"
                      :max="200"
                      :step="1"
                      :format-tooltip="(val: number) => `${val}%`"
                      unit="%"
                    />
                  </el-form-item>

                  <el-form-item :label="t('armor.armorBlunt')">
                    <SliderInput
                      v-model="layer.armorBlunt"
                      :min="0"
                      :max="200"
                      :step="1"
                      :format-tooltip="(val: number) => `${val}%`"
                      unit="%"
                    />
                  </el-form-item>

                  <el-form-item :label="t('armor.armorHeat')">
                    <SliderInput
                      v-model="layer.armorHeat"
                      :min="0"
                      :max="300"
                      :step="1"
                      :format-tooltip="(val: number) => `${val}%`"
                      unit="%"
                    />
                  </el-form-item>
                </template>

                <template v-else>
                  <el-form-item :label="t('armor.materialCoefficient')">
                    <SliderInput
                      v-model="layer.materialCoefficient!"
                      :min="0"
                      :max="2"
                      :step="0.01"
                      :precision="2"
                      :format-tooltip="(val: number) => `${(val * 100).toFixed(0)}%`"
                      unit="x"
                    />
                  </el-form-item>

                  <el-form-item :label="t('armor.usedMaterial')">
                    <el-radio-group v-model="layer.selectedMaterial">
                      <el-radio-button
                        value="metal"
                        :disabled="
                          layer.supportedMaterials &&
                          !layer.supportedMaterials.includes(MaterialTag.Metallic)
                        "
                      >
                        {{ t('materialType.metalButton') }}
                      </el-radio-button>
                      <el-radio-button
                        value="wood"
                        :disabled="
                          layer.supportedMaterials &&
                          !layer.supportedMaterials.includes(MaterialTag.Woody)
                        "
                      >
                        {{ t('materialType.woodButton') }}
                      </el-radio-button>
                      <el-radio-button
                        value="leather"
                        :disabled="
                          layer.supportedMaterials &&
                          !layer.supportedMaterials.includes(MaterialTag.Leathery)
                        "
                      >
                        {{ t('materialType.leatherButton') }}
                      </el-radio-button>
                      <el-radio-button
                        value="fabric"
                        :disabled="
                          layer.supportedMaterials &&
                          !layer.supportedMaterials.includes(MaterialTag.Fabric)
                        "
                      >
                        {{ t('materialType.fabricButton') }}
                      </el-radio-button>
                    </el-radio-group>
                  </el-form-item>

                  <el-alert
                    v-if="layer.useMaterial"
                    :closable="false"
                    type="info"
                    style="margin-top: 10px"
                  >
                    <template #title>
                      {{ t('armor.calculatedArmor') }} =
                      {{
                        (() => {
                          const armor = getLayerActualArmor(layer)
                          return `${t('damageType.sharp')}${armor.armorSharp.toFixed(0)}% ${t('damageType.blunt')}${armor.armorBlunt.toFixed(0)}% ${t('damageType.heat')}${armor.armorHeat.toFixed(0)}%`
                        })()
                      }}
                    </template>
                  </el-alert>
                </template>
              </el-form>

              <el-divider v-if="layerIndex < armorSet.layers.length - 1" />
            </div>

            <el-button type="primary" text @click="addLayer(armorSet)" style="width: 100%">
              {{ t('armor.addLayerButton') }}
            </el-button>
          </div>
        </el-card>

        <!-- 添加护甲套装按钮（最多2个） -->
        <el-button
          v-if="armorSets.length < 2"
          type="primary"
          @click="addArmorSet"
          style="width: 100%; margin-top: 20px"
        >
          {{ t('armor.addArmorSet') }}
        </el-button>
        <el-alert
          v-else
          type="info"
          :closable="false"
          style="margin-top: 20px"
          :title="t('armor.maxSetsReached')"
          :description="t('armor.maxSetsDescription')"
        />
      </el-splitter-panel>
      <!-- 中间：覆盖范围可视化 -->
      <el-splitter-panel size="30%" min="20%" collapsible class="middle-panel">
        <el-card>
          <template #header>
            <h3>{{ t('armor.coverageTitle') }}</h3>
            <p class="coverage-hint">{{ t('armor.coverageHint') }}</p>
          </template>

          <div
            v-for="{ armorSetId, coverageTree } in allCoverageTrees"
            :key="armorSetId"
            class="coverage-tree-section"
          >
            <h4 class="coverage-tree-title">
              {{ armorSets.find((s) => s.id === armorSetId)?.name }}
            </h4>

            <el-tree
              :data="coverageTree"
              default-expand-all
              node-key="value"
              :highlight-current="true"
              :current-node-key="selectedBodyPart"
              :expand-on-click-node="false"
              @node-click="handleTreeNodeClick"
            >
              <template #default="{ node, data }">
                <div class="tree-node-content">
                  <span class="tree-node-label">{{ node.label }}</span>
                  <div
                    v-if="data.coveredLayers && data.coveredLayers.length > 0"
                    class="layer-tags"
                  >
                    <el-tag
                      v-for="layer in data.coveredLayers"
                      :key="layer"
                      size="small"
                      type="info"
                      disable-transitions
                    >
                      {{ getApparelLayerName(layer) }}
                    </el-tag>
                  </div>
                </div>
              </template>
            </el-tree>
          </div>
        </el-card>
      </el-splitter-panel>
      <!-- 右侧：结果显示 -->
      <el-splitter-panel class="right-panel">
        <div class="chart-controls">
          <div>
            <el-radio-group v-model="chartMode" size="default">
              <el-radio-button value="distribution"
                >{{ t('chart.damageReductionDistribution') }} -
                {{ selectedBodyPartName }}</el-radio-button
              >
              <el-radio-button value="curve"
                >{{ t('chart.damageReductionExpectedCurve') }} -
                {{ selectedBodyPartName }}</el-radio-button
              >
            </el-radio-group>
          </div>
          <p class="chart-hint">
            <template v-if="chartMode === 'distribution'">
              {{ t('chart.distributionDescription') }}
            </template>
            <template v-else> {{ t('chart.curveDescription') }} </template>
          </p>
        </div>

        <div class="chart-container">
          <ArmorChart
            v-if="chartMode === 'distribution'"
            :armor-sets="armorSets"
            :damage-type="damageType"
            :fixed-penetration="fixedPenetration"
            :selected-body-part="selectedBodyPart"
            :get-layer-actual-armor="getLayerActualArmor"
          />
          <ArmorReductionCurve
            v-else
            :armor-sets="armorSets"
            :damage-type="damageType"
            :selected-body-part="selectedBodyPart"
            :get-layer-actual-armor="getLayerActualArmor"
          />
        </div>
      </el-splitter-panel>
    </el-splitter>
  </div>
</template>

<style scoped>
.calculator {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.main-layout {
  height: 100%;
  width: 100%;
}

:deep(.left-panel) {
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 20px;
}

:deep(.middle-panel) {
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 20px;
}

:deep(.right-panel) {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 20px;
}

.global-section {
  margin-bottom: 20px;
}

.armor-card {
  margin-bottom: 20px;
}

.armor-header {
  align-items: center;
  display: flex;
  gap: 10px;
}

.armor-name-input {
  flex: 1;
}

.armor-name-input :deep(.el-input__inner) {
  color: var(--armor-color);
  font-size: 1.1em;
  font-weight: 600;
}

.layers-section {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.layer-item {
  background-color: #f5f7fa;
  border-radius: 8px;
  padding: 15px;
}

.layer-header {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.layer-title {
  flex: 1;
  color: #303133;
  font-size: 0.95em;
  font-weight: 600;
}

.layer-badge {
  background: #e1f3d8;
  border-radius: 4px;
  color: #67c23a;
  font-size: 0.85em;
  font-weight: 500;
  margin-left: 8px;
  padding: 2px 8px;
}

.chart-controls {
  align-items: center;
  display: flex;
  flex-shrink: 0;
  justify-content: space-between;
  margin-bottom: 15px;
}

.coverage-hint {
  color: #909399;
  font-size: 0.85em;
  margin: 5px 0 0 0;
}

.chart-hint {
  color: #909399;
  font-size: 0.9em;
  margin: 0;
}

.chart-container {
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}

@media (max-width: 1200px) {
  .calculator {
    height: auto;
    overflow: auto;
  }

  .main-layout {
    flex-direction: column;
    height: auto;
    overflow: visible;
  }

  .left-panel,
  .right-panel {
    height: auto;
    overflow: visible;
    width: 100%;
  }

  .right-panel {
    min-height: 600px;
  }
}

.coverage-tree-section {
  margin-bottom: 20px;
}

.coverage-tree-section:last-child {
  margin-bottom: 0;
}

.coverage-tree-title {
  color: #303133;
  font-size: 1em;
  font-weight: 600;
  margin: 0 0 10px 0;
}

.tree-node-content {
  align-items: center;
  display: flex;
  gap: 10px;
  width: 100%;
}

.tree-node-label {
  flex-shrink: 0;
}

.layer-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* 预设选择器容器 */
.preset-selectors {
  width: 100%;
}

/* 材料折叠面板固定宽度 */
.material-collapse {
  width: 100%;
}

/* 材料预设区域 */
.material-preset-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.material-sliders {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slider-row {
  align-items: center;
  display: flex;
  gap: 12px;
}

.slider-label {
  color: #606266;
  flex-shrink: 0;
  font-size: 14px;
  min-width: 5em;
}

/* 品质按钮样式 */
.quality-button:deep(.el-radio-button__inner) {
  border-color: var(--quality-color);
  border-width: 2px;
}

.quality-button:deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background-color: var(--quality-color);
  border-color: var(--quality-color);
  border-width: 2px;
  box-shadow: -2px 0 0 0 var(--quality-color);
  color: #000;
  font-weight: 600;
}

/* 使树节点可点击样式更明显 */
:deep(.el-tree-node__content) {
  cursor: pointer;
}

:deep(.el-tree-node__content:hover) {
  background-color: #f5f7fa;
}

:deep(.el-tree-node.is-current > .el-tree-node__content) {
  background-color: #e6f7ff;
  font-weight: 600;
}
</style>
