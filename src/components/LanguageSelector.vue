<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

const { locale } = useI18n()

const currentLocale = computed({
  get: () => locale.value,
  set: (value) => {
    locale.value = value
    localStorage.setItem('locale', value)
  },
})
</script>

<template>
  <el-select v-model="currentLocale" style="width: 120px">
    <el-option label="中文" value="zh-CN" />
    <el-option label="English" value="en-US" />
  </el-select>
</template>
