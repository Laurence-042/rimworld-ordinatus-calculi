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
  <div>
    <span>Language: </span>

    <el-select v-model="currentLocale" style="width: 120px">
      <el-option label="zh-CN" value="zh-CN" />
      <el-option label="en-US" value="en-US" />
    </el-select>
  </div>
</template>
