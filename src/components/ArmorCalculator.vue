<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import { calculateArmorDamageCurve, calculateMultiLayerDamage } from '@/utils/armorCalculations'
import {
  getMaterialDataSources,
  type MaterialData,
  type MaterialDataSource,
  type MaterialTag,
} from '@/utils/clothingDataParser'
import type { ArmorSet } from '@/types/armor'
import ArmorChart from './ArmorChart.vue'
import ArmorSurface3D from './ArmorSurface3D.vue'

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

// 状态
const chartMode = ref<'2d' | '3d'>('3d')
const damageType = ref<'blunt' | 'sharp' | 'heat'>('sharp')
const fixedPenetration = ref(35) // 用于2D模式
const fixedDamage = ref(15) // 用于2D模式

// 材料数据源
const materialDataSources = ref<MaterialDataSource[]>([])
const selectedMaterialDataSourceId = ref<string>('vanilla')

// 全局材料 - 使用 MaterialData 类型
const globalMaterials = ref<{
  metal: MaterialData
  wood: MaterialData
  leather: MaterialData
  fabric: MaterialData
}>({
  metal: { name: '钢铁', armorSharp: 1.0, armorBlunt: 0.36, armorHeat: 0.27, tags: ['metal'] },
  wood: { name: '木材', armorSharp: 0.54, armorBlunt: 0.18, armorHeat: 0.09, tags: ['wood'] },
  leather: {
    name: '普通皮革',
    armorSharp: 1.12,
    armorBlunt: 0.24,
    armorHeat: 0.35,
    tags: ['leather'],
  },
  fabric: {
    name: '合成纤维',
    armorSharp: 0.81,
    armorBlunt: 0.12,
    armorHeat: 0.18,
    tags: ['fabric'],
  },
})

// 材料折叠面板
const activeMaterialPanels = ref<MaterialTag[]>([])

let nextArmorSetId = 1
const armorSets = ref<ArmorSet[]>([
  {
    id: nextArmorSetId++,
    name: '护甲套装 1',
    color: ARMOR_COLORS[0]!,
    layers: [
      {
        layerName: '外套',
        itemName: '防弹夹克',
        armorSharp: 0.55,
        armorBlunt: 0.08,
        armorHeat: 0.1,
      },
      {
        layerName: '夹层',
        itemName: '防弹背心',
        armorSharp: 1.0,
        armorBlunt: 0.36,
        armorHeat: 0.27,
      },
    ],
  },
  {
    id: nextArmorSetId++,
    name: '护甲套装 2',
    color: ARMOR_COLORS[1]!,
    layers: [
      {
        layerName: '外套+夹层',
        itemName: '海军装甲',
        armorSharp: 1.06,
        armorBlunt: 0.45,
        armorHeat: 0.54,
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
        layerName: '外套',
        itemName: '新护甲',
        armorSharp: 0.5,
        armorBlunt: 0.2,
        armorHeat: 0.2,
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
    layerName: '新层',
    itemName: '新衣物',
    armorSharp: 0.5,
    armorBlunt: 0.2,
    armorHeat: 0.2,
    useMaterial: false,
    materialCoefficient: 1.0,
    acceptedMaterialTags: ['fabric'],
  })
}

const removeLayer = (armorSet: ArmorSet, index: number) => {
  if (armorSet.layers.length > 1) {
    armorSet.layers.splice(index, 1)
  }
}

// 计算层的实际护甲值（考虑材料依赖）
const getLayerActualArmor = (layer: ArmorSet['layers'][number]) => {
  if (!layer.useMaterial || !layer.materialCoefficient) {
    return {
      armorSharp: layer.armorSharp,
      armorBlunt: layer.armorBlunt,
      armorHeat: layer.armorHeat,
    }
  }

  // 找到第一个匹配的材料
  const acceptedTags = layer.acceptedMaterialTags || []
  for (const tag of acceptedTags) {
    const material = globalMaterials.value[tag as MaterialTag]
    if (material) {
      // 材料系数 × 材料护甲值
      return {
        armorSharp: layer.materialCoefficient * material.armorSharp,
        armorBlunt: layer.materialCoefficient * material.armorBlunt,
        armorHeat: layer.materialCoefficient * material.armorHeat,
      }
    }
  }

  // 如果没有材料，返回0
  return { armorSharp: 0, armorBlunt: 0, armorHeat: 0 }
}

// 计算属性
const allArmorSetsData = computed(() => {
  return armorSets.value.map((armorSet) => {
    // 计算实际护甲值的层
    const actualLayers = armorSet.layers.map((layer) => ({
      ...layer,
      ...getLayerActualArmor(layer),
    }))

    const damageCurve = calculateArmorDamageCurve(actualLayers, damageType.value)

    // 计算在固定条件下的伤害分布（用于2D模式）
    const fixedDamageResult = calculateMultiLayerDamage(actualLayers, {
      armorPenetration: fixedPenetration.value / 100,
      damagePerShot: fixedDamage.value,
      damageType: damageType.value,
    })

    return {
      armorSet,
      damageCurve,
      fixedDamageResult,
    }
  })
})

// 当前数据源的材料
const currentMaterials = computed(() => {
  const source = materialDataSources.value.find((s) => s.id === selectedMaterialDataSourceId.value)
  return source?.materials || { metal: [], wood: [], leather: [], fabric: [] }
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

  // 设置默认材料（从预设中加载）
  const vanillaSource = materialDataSources.value.find((s) => s.id === 'vanilla')
  if (vanillaSource) {
    // 钢铁
    if (vanillaSource.materials.metal.length > 0) {
      const steel = vanillaSource.materials.metal.find((m) => m.name === '钢铁')
      if (steel) {
        globalMaterials.value.metal = steel
      }
    }
    // 合成纤维
    if (vanillaSource.materials.fabric.length > 0) {
      const synthread = vanillaSource.materials.fabric.find((m) => m.name === '合成纤维')
      if (synthread) {
        globalMaterials.value.fabric = synthread
      }
    }
    // 普通皮革
    if (vanillaSource.materials.leather.length > 0) {
      const plainLeather = vanillaSource.materials.leather.find((m) => m.name === '普通皮革')
      if (plainLeather) {
        globalMaterials.value.leather = plainLeather
      }
    }
    // 木材
    if (vanillaSource.materials.wood.length > 0) {
      const wood = vanillaSource.materials.wood[0]
      if (wood) {
        globalMaterials.value.wood = wood
      }
    }
  }
})
</script>

<template>
  <div class="calculator">
    <div class="main-layout">
      <!-- 左侧：参数输入 -->
      <div class="left-panel">
        <!-- 全局参数 -->
        <el-card class="global-section">
          <template #header>
            <h3>全局参数</h3>
          </template>
          <el-form label-width="10em">
            <el-divider content-position="left">伤害类型</el-divider>

            <el-form-item>
              <el-radio-group v-model="damageType">
                <el-radio-button value="sharp">利器</el-radio-button>
                <el-radio-button value="blunt">钝器</el-radio-button>
                <el-radio-button value="heat">热能</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <template v-if="chartMode === '2d'">
              <el-divider content-position="left">固定攻击参数</el-divider>

              <el-form-item label="固定穿甲">
                <div class="slider-input-group">
                  <el-slider v-model="fixedPenetration" :min="0" :max="100" :step="1" />
                  <el-input-number
                    v-model="fixedPenetration"
                    :min="0"
                    :max="100"
                    :step="1"
                    controls-position="right"
                    class="input-number-fixed"
                  />
                  <span class="unit">%</span>
                </div>
              </el-form-item>

              <el-form-item label="固定单发伤害">
                <div class="slider-input-group">
                  <el-slider v-model="fixedDamage" :min="1" :max="50" :step="1" />
                  <el-input-number
                    v-model="fixedDamage"
                    :min="1"
                    :max="100"
                    :step="1"
                    controls-position="right"
                    class="input-number-fixed"
                  />
                  <span class="unit-placeholder"></span>
                </div>
              </el-form-item>
            </template>

            <el-divider content-position="left">全局材料预设</el-divider>

            <el-collapse v-model="activeMaterialPanels" accordion>
              <!-- 金属 -->
              <el-collapse-item title="金属材料" name="metal">
                <el-form-item label="加载预设">
                  <el-select
                    :model-value="globalMaterials.metal.name"
                    placeholder="选择金属材料预设"
                    style="width: 100%"
                    @change="
                      (value: any) => {
                        if (value) {
                          globalMaterials.metal = value
                        }
                      }
                    "
                  >
                    <el-option
                      v-for="material in currentMaterials.metal"
                      :key="material.name"
                      :label="`${material.name} (利器${(material.armorSharp * 100).toFixed(0)}% 钝器${(material.armorBlunt * 100).toFixed(0)}% 热能${(material.armorHeat * 100).toFixed(0)}%)`"
                      :value="material"
                    />
                  </el-select>
                </el-form-item>

                <el-form-item label="利器护甲">
                  <div class="slider-input-group">
                    <el-slider
                      v-model="globalMaterials.metal.armorSharp"
                      :min="0"
                      :max="2"
                      :step="0.01"
                      :format-tooltip="(val: number) => `${(val * 100).toFixed(0)}%`"
                    />
                    <el-input-number
                      v-model="globalMaterials.metal.armorSharp"
                      :min="0"
                      :max="2"
                      :step="0.01"
                      :precision="2"
                      controls-position="right"
                      class="input-number-fixed"
                    />
                    <span class="unit-placeholder"></span>
                  </div>
                </el-form-item>

                <el-form-item label="钝器护甲">
                  <div class="slider-input-group">
                    <el-slider
                      v-model="globalMaterials.metal.armorBlunt"
                      :min="0"
                      :max="2"
                      :step="0.01"
                      :format-tooltip="(val: number) => `${(val * 100).toFixed(0)}%`"
                    />
                    <el-input-number
                      v-model="globalMaterials.metal.armorBlunt"
                      :min="0"
                      :max="2"
                      :step="0.01"
                      :precision="2"
                      controls-position="right"
                      class="input-number-fixed"
                    />
                    <span class="unit-placeholder"></span>
                  </div>
                </el-form-item>

                <el-form-item label="热能护甲">
                  <div class="slider-input-group">
                    <el-slider
                      v-model="globalMaterials.metal.armorHeat"
                      :min="0"
                      :max="3"
                      :step="0.01"
                      :format-tooltip="(val: number) => `${(val * 100).toFixed(0)}%`"
                    />
                    <el-input-number
                      v-model="globalMaterials.metal.armorHeat"
                      :min="0"
                      :max="3"
                      :step="0.01"
                      :precision="2"
                      controls-position="right"
                      class="input-number-fixed"
                    />
                    <span class="unit-placeholder"></span>
                  </div>
                </el-form-item>
              </el-collapse-item>

              <!-- 木材 -->
              <el-collapse-item title="木材材料" name="wood">
                <el-form-item label="加载预设">
                  <el-select
                    :model-value="globalMaterials.wood.name"
                    placeholder="选择木材材料预设"
                    style="width: 100%"
                    @change="
                      (value: any) => {
                        if (value) {
                          globalMaterials.wood = value
                        }
                      }
                    "
                  >
                    <el-option
                      v-for="material in currentMaterials.wood"
                      :key="material.name"
                      :label="`${material.name} (利器${(material.armorSharp * 100).toFixed(0)}% 钝器${(material.armorBlunt * 100).toFixed(0)}% 热能${(material.armorHeat * 100).toFixed(0)}%)`"
                      :value="material"
                    />
                  </el-select>
                </el-form-item>

                <el-form-item label="利器护甲">
                  <div class="slider-input-group">
                    <el-slider
                      v-model="globalMaterials.wood.armorSharp"
                      :min="0"
                      :max="2"
                      :step="0.01"
                      :format-tooltip="(val: number) => `${(val * 100).toFixed(0)}%`"
                    />
                    <el-input-number
                      v-model="globalMaterials.wood.armorSharp"
                      :min="0"
                      :max="2"
                      :step="0.01"
                      :precision="2"
                      controls-position="right"
                      class="input-number-fixed"
                    />
                    <span class="unit-placeholder"></span>
                  </div>
                </el-form-item>

                <el-form-item label="钝器护甲">
                  <div class="slider-input-group">
                    <el-slider
                      v-model="globalMaterials.wood.armorBlunt"
                      :min="0"
                      :max="2"
                      :step="0.01"
                      :format-tooltip="(val: number) => `${(val * 100).toFixed(0)}%`"
                    />
                    <el-input-number
                      v-model="globalMaterials.wood.armorBlunt"
                      :min="0"
                      :max="2"
                      :step="0.01"
                      :precision="2"
                      controls-position="right"
                      class="input-number-fixed"
                    />
                    <span class="unit-placeholder"></span>
                  </div>
                </el-form-item>

                <el-form-item label="热能护甲">
                  <div class="slider-input-group">
                    <el-slider
                      v-model="globalMaterials.wood.armorHeat"
                      :min="0"
                      :max="3"
                      :step="0.01"
                      :format-tooltip="(val: number) => `${(val * 100).toFixed(0)}%`"
                    />
                    <el-input-number
                      v-model="globalMaterials.wood.armorHeat"
                      :min="0"
                      :max="3"
                      :step="0.01"
                      :precision="2"
                      controls-position="right"
                      class="input-number-fixed"
                    />
                    <span class="unit-placeholder"></span>
                  </div>
                </el-form-item>
              </el-collapse-item>

              <!-- 皮革 -->
              <el-collapse-item title="皮革材料" name="leather">
                <el-form-item label="加载预设">
                  <el-select
                    :model-value="globalMaterials.leather.name"
                    placeholder="选择皮革材料预设"
                    style="width: 100%"
                    @change="
                      (value: any) => {
                        if (value) {
                          globalMaterials.leather = value
                        }
                      }
                    "
                  >
                    <el-option
                      v-for="material in currentMaterials.leather"
                      :key="material.name"
                      :label="`${material.name} (利器${(material.armorSharp * 100).toFixed(0)}% 钝器${(material.armorBlunt * 100).toFixed(0)}% 热能${(material.armorHeat * 100).toFixed(0)}%)`"
                      :value="material"
                    />
                  </el-select>
                </el-form-item>

                <el-form-item label="利器护甲">
                  <div class="slider-input-group">
                    <el-slider
                      v-model="globalMaterials.leather.armorSharp"
                      :min="0"
                      :max="2"
                      :step="0.01"
                      :format-tooltip="(val: number) => `${(val * 100).toFixed(0)}%`"
                    />
                    <el-input-number
                      v-model="globalMaterials.leather.armorSharp"
                      :min="0"
                      :max="2"
                      :step="0.01"
                      :precision="2"
                      controls-position="right"
                      class="input-number-fixed"
                    />
                    <span class="unit-placeholder"></span>
                  </div>
                </el-form-item>

                <el-form-item label="钝器护甲">
                  <div class="slider-input-group">
                    <el-slider
                      v-model="globalMaterials.leather.armorBlunt"
                      :min="0"
                      :max="2"
                      :step="0.01"
                      :format-tooltip="(val: number) => `${(val * 100).toFixed(0)}%`"
                    />
                    <el-input-number
                      v-model="globalMaterials.leather.armorBlunt"
                      :min="0"
                      :max="2"
                      :step="0.01"
                      :precision="2"
                      controls-position="right"
                      class="input-number-fixed"
                    />
                    <span class="unit-placeholder"></span>
                  </div>
                </el-form-item>

                <el-form-item label="热能护甲">
                  <div class="slider-input-group">
                    <el-slider
                      v-model="globalMaterials.leather.armorHeat"
                      :min="0"
                      :max="3"
                      :step="0.01"
                      :format-tooltip="(val: number) => `${(val * 100).toFixed(0)}%`"
                    />
                    <el-input-number
                      v-model="globalMaterials.leather.armorHeat"
                      :min="0"
                      :max="3"
                      :step="0.01"
                      :precision="2"
                      controls-position="right"
                      class="input-number-fixed"
                    />
                    <span class="unit-placeholder"></span>
                  </div>
                </el-form-item>
              </el-collapse-item>

              <!-- 织物 -->
              <el-collapse-item title="织物材料" name="fabric">
                <el-form-item label="加载预设">
                  <el-select
                    :model-value="globalMaterials.fabric.name"
                    placeholder="选择织物材料预设"
                    style="width: 100%"
                    @change="
                      (value: any) => {
                        if (value) {
                          globalMaterials.fabric = value
                        }
                      }
                    "
                  >
                    <el-option
                      v-for="material in currentMaterials.fabric"
                      :key="material.name"
                      :label="`${material.name} (利器${(material.armorSharp * 100).toFixed(0)}% 钝器${(material.armorBlunt * 100).toFixed(0)}% 热能${(material.armorHeat * 100).toFixed(0)}%)`"
                      :value="material"
                    />
                  </el-select>
                </el-form-item>

                <el-form-item label="利器护甲">
                  <div class="slider-input-group">
                    <el-slider
                      v-model="globalMaterials.fabric.armorSharp"
                      :min="0"
                      :max="2"
                      :step="0.01"
                      :format-tooltip="(val: number) => `${(val * 100).toFixed(0)}%`"
                    />
                    <el-input-number
                      v-model="globalMaterials.fabric.armorSharp"
                      :min="0"
                      :max="2"
                      :step="0.01"
                      :precision="2"
                      controls-position="right"
                      class="input-number-fixed"
                    />
                    <span class="unit-placeholder"></span>
                  </div>
                </el-form-item>

                <el-form-item label="钝器护甲">
                  <div class="slider-input-group">
                    <el-slider
                      v-model="globalMaterials.fabric.armorBlunt"
                      :min="0"
                      :max="2"
                      :step="0.01"
                      :format-tooltip="(val: number) => `${(val * 100).toFixed(0)}%`"
                    />
                    <el-input-number
                      v-model="globalMaterials.fabric.armorBlunt"
                      :min="0"
                      :max="2"
                      :step="0.01"
                      :precision="2"
                      controls-position="right"
                      class="input-number-fixed"
                    />
                    <span class="unit-placeholder"></span>
                  </div>
                </el-form-item>

                <el-form-item label="热能护甲">
                  <div class="slider-input-group">
                    <el-slider
                      v-model="globalMaterials.fabric.armorHeat"
                      :min="0"
                      :max="3"
                      :step="0.01"
                      :format-tooltip="(val: number) => `${(val * 100).toFixed(0)}%`"
                    />
                    <el-input-number
                      v-model="globalMaterials.fabric.armorHeat"
                      :min="0"
                      :max="3"
                      :step="0.01"
                      :precision="2"
                      controls-position="right"
                      class="input-number-fixed"
                    />
                    <span class="unit-placeholder"></span>
                  </div>
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
            <div
              v-for="(layer, layerIndex) in armorSet.layers"
              :key="layerIndex"
              class="layer-item"
            >
              <div class="layer-header">
                <span class="layer-title">第 {{ layerIndex + 1 }} 层</span>
                <el-button
                  v-if="armorSet.layers.length > 1"
                  type="danger"
                  size="small"
                  text
                  @click="removeLayer(armorSet, layerIndex)"
                >
                  删除
                </el-button>
              </div>

              <el-form label-width="10em" size="small">
                <el-form-item label="层名称">
                  <el-input v-model="layer.layerName" placeholder="如：外套、夹层" />
                </el-form-item>

                <el-form-item label="衣物名称">
                  <el-input v-model="layer.itemName" placeholder="如：防弹夹克" />
                </el-form-item>

                <el-form-item label="护甲来源">
                  <el-radio-group v-model="layer.useMaterial">
                    <el-radio-button :value="false">直接输入</el-radio-button>
                    <el-radio-button :value="true">依赖材料</el-radio-button>
                  </el-radio-group>
                </el-form-item>

                <template v-if="!layer.useMaterial">
                  <el-form-item label="利器护甲">
                    <div class="slider-input-group">
                      <el-slider
                        v-model="layer.armorSharp"
                        :min="0"
                        :max="2"
                        :step="0.01"
                        :format-tooltip="(val: number) => `${(val * 100).toFixed(0)}%`"
                      />
                      <el-input-number
                        v-model="layer.armorSharp"
                        :min="0"
                        :max="2"
                        :step="0.01"
                        :precision="2"
                        controls-position="right"
                        class="input-number-fixed"
                      />
                      <span class="unit-placeholder"></span>
                    </div>
                  </el-form-item>

                  <el-form-item label="钝器护甲">
                    <div class="slider-input-group">
                      <el-slider
                        v-model="layer.armorBlunt"
                        :min="0"
                        :max="2"
                        :step="0.01"
                        :format-tooltip="(val: number) => `${(val * 100).toFixed(0)}%`"
                      />
                      <el-input-number
                        v-model="layer.armorBlunt"
                        :min="0"
                        :max="2"
                        :step="0.01"
                        :precision="2"
                        controls-position="right"
                        class="input-number-fixed"
                      />
                      <span class="unit-placeholder"></span>
                    </div>
                  </el-form-item>

                  <el-form-item label="热能护甲">
                    <div class="slider-input-group">
                      <el-slider
                        v-model="layer.armorHeat"
                        :min="0"
                        :max="3"
                        :step="0.01"
                        :format-tooltip="(val: number) => `${(val * 100).toFixed(0)}%`"
                      />
                      <el-input-number
                        v-model="layer.armorHeat"
                        :min="0"
                        :max="3"
                        :step="0.01"
                        :precision="2"
                        controls-position="right"
                        class="input-number-fixed"
                      />
                      <span class="unit-placeholder"></span>
                    </div>
                  </el-form-item>
                </template>

                <template v-else>
                  <el-form-item label="材料系数">
                    <div class="slider-input-group">
                      <el-slider
                        v-model="layer.materialCoefficient"
                        :min="0"
                        :max="2"
                        :step="0.01"
                        :format-tooltip="(val: number) => `${(val * 100).toFixed(0)}%`"
                      />
                      <el-input-number
                        v-model="layer.materialCoefficient"
                        :min="0"
                        :max="2"
                        :step="0.01"
                        :precision="2"
                        controls-position="right"
                        class="input-number-fixed"
                      />
                      <span class="unit">x</span>
                    </div>
                  </el-form-item>

                  <el-form-item label="支持的材料">
                    <el-checkbox-group v-model="layer.acceptedMaterialTags">
                      <el-checkbox value="metal">金属</el-checkbox>
                      <el-checkbox value="wood">木材</el-checkbox>
                      <el-checkbox value="leather">皮革</el-checkbox>
                      <el-checkbox value="fabric">织物</el-checkbox>
                    </el-checkbox-group>
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

        <!-- 添加护甲套装按钮 -->
        <el-button type="primary" @click="addArmorSet" style="width: 100%; margin-top: 20px">
          + 添加护甲套装进行对比
        </el-button>
      </div>

      <!-- 右侧：结果显示 -->
      <div class="right-panel">
        <div class="chart-controls">
          <el-radio-group v-model="chartMode" size="default">
            <el-radio-button value="2d">2D曲线</el-radio-button>
            <el-radio-button value="3d">3D曲面</el-radio-button>
          </el-radio-group>
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
            :armor-sets-data="allArmorSetsData"
            :damage-type="damageType"
          />
          <ArmorSurface3D v-else :armor-sets-data="allArmorSetsData" :damage-type="damageType" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calculator {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.main-layout {
  display: flex;
  gap: 20px;
  height: 100%;
  overflow: hidden;
  width: 100%;
}

.left-panel {
  flex: 0 0 500px;
  min-width: 500px;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 20px 10px 20px 20px;
}

.right-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 600px;
  overflow: hidden;
  padding: 20px 20px 20px 10px;
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

.chart-controls {
  align-items: center;
  display: flex;
  flex-shrink: 0;
  justify-content: space-between;
  margin-bottom: 15px;
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

.slider-input-group {
  align-items: center;
  display: flex;
  gap: 15px;
  width: 100%;
}

.slider-input-group :deep(.el-slider) {
  flex: 1;
}

.input-number-fixed {
  width: 150px;
}

.unit {
  color: #909399;
  width: 20px;
}

.unit-placeholder {
  width: 20px;
}
</style>
