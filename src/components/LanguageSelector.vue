<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import { clearWeaponDataSourcesCache } from '@/utils/weaponCalculations'

const { locale } = useI18n()

const currentLocale = computed({
  get: () => locale.value,
  set: (value) => {
    locale.value = value
    localStorage.setItem('locale', value)
    // 清除武器数据缓存，以便重新加载对应语言的数据
    clearWeaponDataSourcesCache()
    // 刷新页面以重新加载数据
    window.location.reload()
  },
})
</script>

<template>
  <div>
    <span>Language: </span>

    <el-select v-model="currentLocale" style="width: 120px">
      <el-option label="zh-CN" value="zh-CN" />
      <el-option label="en-US" value="en-US" />
    </el-select>
  </div>
</template>
