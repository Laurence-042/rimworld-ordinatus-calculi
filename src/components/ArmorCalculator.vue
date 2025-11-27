<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import { useTimeoutFn } from '@vueuse/core'
import {
  getClothingDataSources,
  type ClothingData,
  type ClothingDataSource,
} from '@/utils/clothingDataParser'
import {
  getMaterialDataSources,
  type MaterialData,
  type MaterialDataSource,
} from '@/utils/materialDataParser'
import { MaterialTag, parseAcceptedMaterials } from '@/types/material'
import { type ArmorSet, ApparelLayer, DamageType, getApparelLayerName } from '@/types/armor'
import { BodyPart, BodyPartNames, buildBodyPartTree } from '@/types/bodyPart'
import {
  buildCoverageMap,
  buildCoverageTree,
  getApparelLayerOptions,
  type CoverageTreeNode,
} from '@/utils/coverageUtils'
import { QualityCategory, getQualityOptions } from '@/types/quality'
import { getActualArmorValue } from '@/utils/armorCalculations'
import ArmorChart from './ArmorChart.vue'
import ArmorSurface3D from './ArmorSurface3D.vue'
import SliderInput from './SliderInput.vue'

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
const chartMode = ref<'2d' | '3d'>('3d')
const damageType = ref<DamageType>(DamageType.Sharp)
const fixedPenetration = ref(35) // 用于2D模式
const fixedDamage = ref(15) // 用于2D模式

// 选中的身体部位（用于计算该部位的护甲）
const selectedBodyPart = ref<BodyPart>(BodyPart.Torso)

// 材料数据源
const materialDataSources = ref<MaterialDataSource[]>([])
const selectedMaterialDataSourceId = ref<string>('vanilla')

// 衣物数据源
const clothingDataSources = ref<ClothingDataSource[]>([])
const selectedClothingDataSourceId = ref<string>('vanilla')

// 全局材料 - 使用 MaterialData 类型
const globalMaterials = ref<{
  [MaterialTag.Metal]: MaterialData
  [MaterialTag.Wood]: MaterialData
  [MaterialTag.Leather]: MaterialData
  [MaterialTag.Fabric]: MaterialData
}>({
  [MaterialTag.Metal]: {
    name: '钢铁',
    armorSharp: 100,
    armorBlunt: 36,
    armorHeat: 27,
    tags: [MaterialTag.Metal],
  },
  [MaterialTag.Wood]: {
    name: '木材',
    armorSharp: 54,
    armorBlunt: 18,
    armorHeat: 9,
    tags: [MaterialTag.Wood],
  },
  [MaterialTag.Leather]: {
    name: '普通皮革',
    armorSharp: 112,
    armorBlunt: 24,
    armorHeat: 35,
    tags: [MaterialTag.Leather],
  },
  [MaterialTag.Fabric]: {
    name: '合成纤维',
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

// 材料类型配置
const materialTypes = [
  { tag: MaterialTag.Metal, name: 'metal', label: '金属材料' },
  { tag: MaterialTag.Wood, name: 'wood', label: '木材材料' },
  { tag: MaterialTag.Leather, name: 'leather', label: '皮革材料' },
  { tag: MaterialTag.Fabric, name: 'fabric', label: '织物材料' },
] as const

// 身体部位树数据
const bodyPartTreeData = buildBodyPartTree()

// 服装层级选项
const apparelLayerOptions = getApparelLayerOptions()

let nextArmorSetId = 1
const armorSets = ref<ArmorSet[]>([
  {
    id: nextArmorSetId++,
    name: '双层防弹套',
    color: ARMOR_COLORS[0]!,
    layers: [
      {
        itemName: '防弹夹克',
        armorSharp: 55,
        armorBlunt: 8,
        armorHeat: 10,
        quality: QualityCategory.Masterwork,
        useMaterial: false,
        materialCoefficient: 1.0,
        selectedMaterial: MaterialTag.Fabric,
        supportedMaterials: [
          MaterialTag.Metal,
          MaterialTag.Wood,
          MaterialTag.Leather,
          MaterialTag.Fabric,
        ],
        apparelLayers: [ApparelLayer.Shell],
        bodyPartCoverage: [
          BodyPart.Torso,
          BodyPart.Neck,
          BodyPart.LeftShoulder,
          BodyPart.RightShoulder,
        ],
      },
      {
        itemName: '防弹背心',
        armorSharp: 100,
        armorBlunt: 36,
        armorHeat: 27,
        quality: QualityCategory.Masterwork,
        useMaterial: false,
        materialCoefficient: 1.0,
        selectedMaterial: MaterialTag.Fabric,
        supportedMaterials: [
          MaterialTag.Metal,
          MaterialTag.Wood,
          MaterialTag.Leather,
          MaterialTag.Fabric,
        ],
        apparelLayers: [ApparelLayer.Middle],
        bodyPartCoverage: [BodyPart.Torso, BodyPart.LeftShoulder, BodyPart.RightShoulder],
      },
    ],
  },
  {
    id: nextArmorSetId++,
    name: '单层海军甲',
    color: ARMOR_COLORS[1]!,
    layers: [
      {
        itemName: '海军装甲',
        armorSharp: 106,
        armorBlunt: 45,
        armorHeat: 54,
        quality: QualityCategory.Masterwork,
        useMaterial: false,
        materialCoefficient: 1.0,
        selectedMaterial: MaterialTag.Fabric,
        supportedMaterials: [
          MaterialTag.Metal,
          MaterialTag.Wood,
          MaterialTag.Leather,
          MaterialTag.Fabric,
        ],
        apparelLayers: [ApparelLayer.Shell, ApparelLayer.Middle],
        bodyPartCoverage: [
          BodyPart.Torso,
          BodyPart.Neck,
          BodyPart.LeftShoulder,
          BodyPart.RightShoulder,
          BodyPart.LeftArm,
          BodyPart.RightArm,
          BodyPart.LeftLeg,
          BodyPart.RightLeg,
        ],
      },
    ],
  },
])

// 方法
const addArmorSet = () => {
  const colorIndex = armorSets.value.length % ARMOR_COLORS.length
  const newArmorSet: ArmorSet = {
    id: nextArmorSetId++,
    name: `护甲套装 ${armorSets.value.length + 1}`,
    color: ARMOR_COLORS[colorIndex]!,
    layers: [
      {
        itemName: '新护甲',
        armorSharp: 50,
        armorBlunt: 20,
        armorHeat: 20,
        quality: QualityCategory.Masterwork,
        useMaterial: false,
        materialCoefficient: 1.0,
        selectedMaterial: MaterialTag.Fabric,
        supportedMaterials: [
          MaterialTag.Metal,
          MaterialTag.Wood,
          MaterialTag.Leather,
          MaterialTag.Fabric,
        ],
        apparelLayers: [ApparelLayer.Shell],
        bodyPartCoverage: [BodyPart.Torso],
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
    itemName: '新衣物',
    armorSharp: 50,
    armorBlunt: 20,
    armorHeat: 20,
    quality: QualityCategory.Masterwork,
    useMaterial: false,
    materialCoefficient: 1.0,
    selectedMaterial: MaterialTag.Fabric,
    supportedMaterials: [
      MaterialTag.Metal,
      MaterialTag.Wood,
      MaterialTag.Leather,
      MaterialTag.Fabric,
    ],
    apparelLayers: [ApparelLayer.Shell],
    bodyPartCoverage: [BodyPart.Torso],
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

// 当前数据源的材料
const currentMaterials = computed(() => {
  const source = materialDataSources.value.find((s) => s.id === selectedMaterialDataSourceId.value)
  return source?.materials || { metal: [], wood: [], leather: [], fabric: [] }
})

// 当前数据源的衣物
const currentClothing = computed(() => {
  const source = clothingDataSources.value.find((s) => s.id === selectedClothingDataSourceId.value)
  return source?.clothing || []
})

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
    globalMaterials.value[materialType].name = '自定义'
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
const loadClothingPreset = (layer: ArmorSet['layers'][number], clothing: ClothingData) => {
  startLoadingPreset()
  layer.itemName = clothing.name

  // 解析层级信息
  if (clothing.apparelLayers && clothing.apparelLayers.length > 0) {
    layer.apparelLayers = clothing.apparelLayers
  } else {
    layer.apparelLayers = [ApparelLayer.Shell] // 默认外套层
  }

  // 解析覆盖部位信息
  if (clothing.bodyPartCoverage && clothing.bodyPartCoverage.length > 0) {
    layer.bodyPartCoverage = clothing.bodyPartCoverage
  } else {
    layer.bodyPartCoverage = [BodyPart.Torso] // 默认覆盖躯干
  }

  // 设置默认品质为大师级
  layer.quality = QualityCategory.Masterwork

  if (clothing.materialCoefficient !== undefined && clothing.materialCoefficient > 0) {
    // 使用材料计算
    layer.useMaterial = true
    layer.materialCoefficient = clothing.materialCoefficient
    layer.supportedMaterials = parseAcceptedMaterials(clothing.acceptedMaterials)
    // 选择第一个支持的材料
    layer.selectedMaterial = layer.supportedMaterials[0]
  } else {
    // 直接输入护甲值
    layer.useMaterial = false
    layer.armorSharp = (clothing.armorSharp || 0) * 100
    layer.armorBlunt = (clothing.armorBlunt || 0) * 100
    layer.armorHeat = (clothing.armorHeat || 0) * 100
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
          message: `与第 ${layerConflicts.map((i) => i + 1).join('、')} 层存在覆盖冲突`,
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

// 生命周期
onMounted(async () => {
  // 加载材料数据
  materialDataSources.value = await getMaterialDataSources()

  // 加载衣物数据
  clothingDataSources.value = await getClothingDataSources()

  // 设置默认材料（从预设中加载）
  const vanillaSource = materialDataSources.value.find((s) => s.id === 'vanilla')
  if (vanillaSource) {
    // 钢铁
    if (vanillaSource.materials.metal.length > 0) {
      const steel = vanillaSource.materials.metal.find((m) => m.name === '钢铁')
      if (steel) {
        globalMaterials.value.metal = { ...steel }
      }
    }
    // 合成纤维
    if (vanillaSource.materials.fabric.length > 0) {
      const synthread = vanillaSource.materials.fabric.find((m) => m.name === '合成纤维')
      if (synthread) {
        globalMaterials.value.fabric = { ...synthread }
      }
    }
    // 普通皮革
    if (vanillaSource.materials.leather.length > 0) {
      const plainLeather = vanillaSource.materials.leather.find((m) => m.name === '普通皮革')
      if (plainLeather) {
        globalMaterials.value.leather = { ...plainLeather }
      }
    }
    // 木材
    if (vanillaSource.materials.wood.length > 0) {
      const wood = vanillaSource.materials.wood[0]
      if (wood) {
        globalMaterials.value.wood = { ...wood }
      }
    }
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
            <h3>全局参数</h3>
          </template>
          <el-form label-width="10em">
            <el-divider content-position="left">伤害类型</el-divider>

            <el-form-item>
              <el-radio-group v-model="damageType">
                <el-radio-button :value="DamageType.Sharp">利器</el-radio-button>
                <el-radio-button :value="DamageType.Blunt">钝器</el-radio-button>
                <el-radio-button :value="DamageType.Heat">热能</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <template v-if="chartMode === '2d'">
              <el-divider content-position="left">固定攻击参数</el-divider>

              <el-form-item label="固定穿甲">
                <SliderInput v-model="fixedPenetration" :min="0" :max="100" :step="1" unit="%" />
              </el-form-item>

              <el-form-item label="固定单发伤害">
                <SliderInput v-model="fixedDamage" :min="1" :max="100" :step="1" />
              </el-form-item>
            </template>

            <el-divider content-position="left">全局材料预设</el-divider>

            <el-collapse v-model="activeMaterialPanels" accordion>
              <el-collapse-item
                v-for="materialType in materialTypes"
                :key="materialType.tag"
                :title="materialType.label"
                :name="materialType.name"
              >
                <el-form-item label="加载预设">
                  <el-select
                    :model-value="globalMaterials[materialType.tag].name"
                    :placeholder="`选择${materialType.label}预设`"
                    style="width: 100%"
                    filterable
                    @change="
                      (value: any) => {
                        if (value) {
                          loadMaterialPreset(materialType.tag, value)
                        }
                      }
                    "
                  >
                    <el-option
                      v-for="material in currentMaterials[materialType.name]"
                      :key="material.name"
                      :label="`${material.name} (利器${Math.round(material.armorSharp * 100)}% 钝器${Math.round(material.armorBlunt * 100)}% 热能${Math.round(material.armorHeat * 100)}%)`"
                      :value="material"
                    />
                  </el-select>
                </el-form-item>

                <el-form-item label="利器护甲">
                  <SliderInput
                    v-model="globalMaterials[materialType.tag].armorSharp"
                    :min="0"
                    :max="200"
                    :step="1"
                    :format-tooltip="(val: number) => `${val}%`"
                    unit="%"
                    @change="() => onMaterialValueChange(materialType.tag)"
                  />
                </el-form-item>

                <el-form-item label="钝器护甲">
                  <SliderInput
                    v-model="globalMaterials[materialType.tag].armorBlunt"
                    :min="0"
                    :max="200"
                    :step="1"
                    :format-tooltip="(val: number) => `${val}%`"
                    unit="%"
                    @change="() => onMaterialValueChange(materialType.tag)"
                  />
                </el-form-item>

                <el-form-item label="热能护甲">
                  <SliderInput
                    v-model="globalMaterials[materialType.tag].armorHeat"
                    :min="0"
                    :max="300"
                    :step="1"
                    :format-tooltip="(val: number) => `${val}%`"
                    unit="%"
                    @change="() => onMaterialValueChange(materialType.tag)"
                  />
                </el-form-item>
              </el-collapse-item>
            </el-collapse>
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
                placeholder="护甲套装名称"
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
                <span style="font-size: 0.9em"
                  >伤害计算顺序：自动按从外层到内层排序（眼饰→头饰→配件→外套→夹层→贴身→皮肤）</span
                >
              </template>
            </el-alert>

            <div
              v-for="(layer, layerIndex) in armorSet.layers"
              :key="layerIndex"
              class="layer-item"
            >
              <div class="layer-header">
                <span class="layer-title">第 {{ layerIndex + 1 }} 层 </span>
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
                <el-form-item label="衣物名称">
                  <el-select
                    :model-value="layer.itemName"
                    placeholder="选择衣物预设"
                    style="width: 100%"
                    filterable
                    @change="
                      (value: any) => {
                        if (value) {
                          loadClothingPreset(layer, value)
                        }
                      }
                    "
                  >
                    <el-option
                      v-for="clothing in currentClothing"
                      :key="clothing.name"
                      :label="clothing.name"
                      :value="clothing"
                    />
                  </el-select>
                </el-form-item>

                <el-form-item label="服装层级">
                  <el-checkbox-group v-model="layer.apparelLayers">
                    <el-checkbox-button
                      v-for="option in apparelLayerOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </el-checkbox-button>
                  </el-checkbox-group>
                </el-form-item>

                <el-form-item label="覆盖部位">
                  <el-tree-select
                    v-model="layer.bodyPartCoverage"
                    :data="bodyPartTreeData"
                    multiple
                    clearable
                    collapse-tags
                    collapse-tags-tooltip
                    :max-collapse-tags="10"
                    check-strictly
                    placeholder="选择覆盖的身体部位"
                    style="width: 100%"
                    :props="{ label: 'label', value: 'value' }"
                    node-key="value"
                  />
                </el-form-item>

                <el-form-item label="品质">
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

                <el-form-item label="护甲来源">
                  <el-radio-group v-model="layer.useMaterial">
                    <el-radio-button :value="false">固定数值</el-radio-button>
                    <el-radio-button :value="true">依赖材料</el-radio-button>
                  </el-radio-group>
                </el-form-item>

                <template v-if="!layer.useMaterial">
                  <el-form-item label="利器护甲">
                    <SliderInput
                      v-model="layer.armorSharp"
                      :min="0"
                      :max="200"
                      :step="1"
                      :format-tooltip="(val: number) => `${val}%`"
                      unit="%"
                    />
                  </el-form-item>

                  <el-form-item label="钝器护甲">
                    <SliderInput
                      v-model="layer.armorBlunt"
                      :min="0"
                      :max="200"
                      :step="1"
                      :format-tooltip="(val: number) => `${val}%`"
                      unit="%"
                    />
                  </el-form-item>

                  <el-form-item label="热能护甲">
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
                  <el-form-item label="材料系数">
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

                  <el-form-item label="使用的材料">
                    <el-radio-group v-model="layer.selectedMaterial">
                      <el-radio-button
                        value="metal"
                        :disabled="
                          layer.supportedMaterials &&
                          !layer.supportedMaterials.includes(MaterialTag.Metal)
                        "
                      >
                        金属
                      </el-radio-button>
                      <el-radio-button
                        value="wood"
                        :disabled="
                          layer.supportedMaterials &&
                          !layer.supportedMaterials.includes(MaterialTag.Wood)
                        "
                      >
                        木材
                      </el-radio-button>
                      <el-radio-button
                        value="leather"
                        :disabled="
                          layer.supportedMaterials &&
                          !layer.supportedMaterials.includes(MaterialTag.Leather)
                        "
                      >
                        皮革
                      </el-radio-button>
                      <el-radio-button
                        value="fabric"
                        :disabled="
                          layer.supportedMaterials &&
                          !layer.supportedMaterials.includes(MaterialTag.Fabric)
                        "
                      >
                        织物
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
                      计算护甲 =
                      {{
                        (() => {
                          const armor = getLayerActualArmor(layer)
                          return `利器${(armor.armorSharp * 100).toFixed(0)}% 钝器${(armor.armorBlunt * 100).toFixed(0)}% 热能${(armor.armorHeat * 100).toFixed(0)}%`
                        })()
                      }}
                    </template>
                  </el-alert>
                </template>
              </el-form>

              <el-divider v-if="layerIndex < armorSet.layers.length - 1" />
            </div>

            <el-button type="primary" text @click="addLayer(armorSet)" style="width: 100%">
              + 添加护甲层
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
          + 添加护甲套装进行对比
        </el-button>
        <el-alert
          v-else
          type="info"
          :closable="false"
          style="margin-top: 20px"
          title="已达到最大套装数量（2个）"
          description="3D曲面模式最多支持2个护甲套装对比并显示交线。如需对比其他套装，请先删除现有套装。"
        />
      </el-splitter-panel>
      <!-- 中间：覆盖范围可视化 -->
      <el-splitter-panel size="30%" min="20%" collapsible class="middle-panel">
        <el-card>
          <template #header>
            <h3>覆盖范围</h3>
            <p class="coverage-hint">点击身体部位查看该部位的护甲计算结果</p>
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
              <el-radio-button value="2d">2D曲线 - {{ selectedBodyPartName }}</el-radio-button>
              <el-radio-button value="3d">3D曲面 - {{ selectedBodyPartName }}</el-radio-button>
            </el-radio-group>
          </div>
          <p class="chart-hint">
            <template v-if="chartMode === '2d'">
              对比不同护甲套装在固定攻击条件下的受伤期望
            </template>
            <template v-else> 交互式3D曲面：护甲穿透 × 单发伤害 → 受伤期望 </template>
          </p>
        </div>

        <div class="chart-container">
          <ArmorChart
            v-if="chartMode === '2d'"
            :armor-sets="armorSets"
            :damage-type="damageType"
            :fixed-penetration="fixedPenetration"
            :fixed-damage="fixedDamage"
            :selected-body-part="selectedBodyPart"
            :get-layer-actual-armor="getLayerActualArmor"
          />
          <ArmorSurface3D
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

/* 品质按钮样式 */
.quality-button:deep(.el-radio-button__inner) {
  border-color: var(--quality-color);
}

.quality-button:deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background-color: var(--quality-color);
  border-color: var(--quality-color);
  box-shadow: -1px 0 0 0 var(--quality-color);
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
