<script setup lang="ts">
/**
 * 滑块+输入框组合组件
 * 提供统一的数值输入体验，包含滑块和数字输入框
 */

interface Props {
  modelValue: number
  min?: number
  max?: number
  step?: number
  precision?: number
  unit?: string // 单位文字，如 "%"、"秒"、"格"
  formatTooltip?: (value: number) => string
}

withDefaults(defineProps<Props>(), {
  min: 0,
  max: 100,
  step: 1,
  precision: 0,
  unit: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
  change: [value: number]
}>()

const handleInput = (value: number) => {
  emit('update:modelValue', value)
}

const handleChange = (value: number) => {
  emit('change', value)
}
</script>

<template>
  <div class="slider-input-group">
    <el-slider
      :model-value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :format-tooltip="formatTooltip"
      @input="handleInput"
    />
    <el-input-number
      :model-value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :precision="precision"
      controls-position="right"
      class="input-number-fixed"
      @update:model-value="handleInput"
      @change="handleChange"
    />
    <span v-if="unit" class="unit">{{ unit }}</span>
    <span v-else class="unit-placeholder"></span>
  </div>
</template>

<style scoped>
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
