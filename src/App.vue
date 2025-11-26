<script setup lang="ts">
import { ref } from 'vue'
import DPSCalculator from './components/DPSCalculator.vue'
import ArmorCalculator from './components/ArmorCalculator.vue'

const calculationMode = ref<'weapon' | 'armor'>('weapon')
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <h1 class="app-title">RimWorld DPS 计算器</h1>
      <el-radio-group v-model="calculationMode" size="default">
        <el-radio-button value="weapon">矛式计算（以武器为核心）</el-radio-button>
        <el-radio-button value="armor">盾式计算（以护甲为核心）</el-radio-button>
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
  flex-shrink: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.app-title {
  color: white;
  font-size: 1.8em;
  font-weight: 600;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
}

.app-main {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 1.5em;
  color: #909399;
}

@media (max-width: 768px) {
  .app-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .app-title {
    font-size: 1.4em;
  }
}
</style>
<style>
body {
  margin: 0;
}
</style>
