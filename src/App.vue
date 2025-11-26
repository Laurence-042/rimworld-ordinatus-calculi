<script setup lang="ts">
import { ref } from 'vue'
import DPSCalculator from './components/DPSCalculator.vue'
import ArmorCalculator from './components/ArmorCalculator.vue'

const calculationMode = ref<'weapon' | 'armor'>('weapon')
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <h1 class="app-title">RimWorld 计算仪典</h1>
      <el-radio-group v-model="calculationMode" size="default">
        <el-radio-button value="weapon">破甲者之歌（计算武器DPS）</el-radio-button>
        <el-radio-button value="armor">留命者之吟（计算护甲效果）</el-radio-button>
      </el-radio-group>
    </header>
    <main class="app-main">
      <DPSCalculator v-if="calculationMode === 'weapon'" />
      <ArmorCalculator v-else-if="calculationMode === 'armor'" />
      <div v-else class="placeholder">如果你看到了这个，那就说明这个应用出bug了...</div>
    </main>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.app-header {
  border-bottom: 1px solid var(--border-color);
  padding: 20px 30px;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.app-title {
  color: var(--el-text-color-primary);
  font-size: 1.5em;
  font-weight: 500;
  margin: 0;
}

.app-main {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color-page);
}

.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 1.5em;
  color: var(--el-text-color-secondary);
}

@media (max-width: 768px) {
  .app-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .app-title {
    font-size: 1.3em;
  }
}
</style>
<style>
body {
  margin: 0;
}
</style>
