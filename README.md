# RimWorld 计算仪典：破甲者之歌・留命者之吟

> RimWorld Ordinatus Calculi：Song of the Breaker ・ Chant of the Keeper

一个基于 Vue 3 + TypeScript 的 RimWorld 战斗机制计算器，用于计算给定武器在不同的距离/护甲情况下的DPS，以及给定护甲组合在不同单发伤害/穿甲情况下的受伤期望。

![Vue 3](https://img.shields.io/badge/Vue-3.5-brightgreen) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue) ![Element Plus](https://img.shields.io/badge/Element%20Plus-2.11-409EFF)

## 功能特性

### 武器 DPS 计算器（Weapon-Centric）

- **多武器对比**：同时评估多个武器在不同护甲率（0-200%）下的 DPS 表现
- **精确命中率**：基于距离分段（贴近/近/中/远）的线性插值算法
- **连发机制**：完整模拟预热、连发间隔、冷却时序
- **2D/3D 可视化**：
  - 2D 曲线图：DPS vs 护甲率（指定距离）
  - 3D 曲面图：DPS vs 护甲率 vs 距离

### 护甲效能计算器（Armor-Centric）

- **多层护甲系统**：支持最多 3 层护甲叠加（贴身层/中层/外壳层）
- **身体部位覆盖**：基于游戏内覆盖率数据的精确计算
- **伤害类型模拟**：利器/钝器/热能伤害的不同穿透机制
- **概率分布**：显示完全偏转/部分穿透/完全穿透的概率分布
- **实战场景**：
  - 2D 曲线图：各部位受到伤害 vs 武器伤害（固定穿透）
  - 3D 曲面图：特定部位受到伤害 vs 武器伤害 vs 穿透力

### 核心计算特性

- **利器→钝器转换**：伤害减少 50% 后自动转换为钝器伤害
- **护甲穿透不衰减**：穿透力应用于所有护甲层
- **RNG 模拟**：每层护甲的偏转/减伤/穿透概率计算
- **去重逻辑**：多层穿着同一装备时仅计算一次

## 快速开始

### 环境要求

- Node.js `^20.19.0` 或 `>=22.12.0`
- 推荐使用 `pnpm` 或 `npm`

### 安装依赖

```powershell
npm install
```

### 启动开发服务器

```powershell
npm run dev
```

访问 `http://localhost:5173`

### 构建生产版本

```powershell
npm run build
```

### 类型检查

```powershell
npm run type-check
```

### 代码格式化

```powershell
npm run lint      # ESLint 检查并自动修复
npm run format    # Prettier 格式化
```

## 核心计算公式

### 武器 DPS

```typescript
// 完整射击周期（ticks）
cycleDuration = warmUp × 60 + (burstCount - 1) × burstTicks + cooldown × 60

// 实际 DPS（考虑命中率）
DPS = (burstCount × damage × hitChance × 60) / cycleDuration
```

### 命中率插值

根据距离在 4 个精度区间（贴近 0-3, 近 3-12, 中 12-25, 远 25-40）之间线性插值：

```typescript
hitChance = interpolate(distance, accuracyBrackets)
```

### 多层护甲伤害

1. **外层到内层依次处理**
2. **每层 RNG 判定**：
   - `< armor/2`：完全偏转（0% 伤害）
   - `>= armor/2 && < armor`：部分穿透（50% 伤害）
   - `>= armor`：完全穿透（100% 伤害）
3. **利器伤害转换**：若减伤 ≥50%，剩余伤害转为钝器
4. **穿透力不衰减**：对所有层使用原始 AP 值

## 项目结构

```
src/
├── components/
│   ├── DPSCalculator.vue      # 武器 DPS 计算器主界面
│   ├── ArmorCalculator.vue    # 护甲计算器主界面
│   ├── DPSChart.vue           # 2D DPS 曲线图
│   ├── DPSSurface3D.vue       # 3D DPS 曲面图
│   ├── ArmorChart.vue         # 2D 护甲效能图
│   ├── ArmorSurface3D.vue     # 3D 护甲曲面图
│   └── SliderInput.vue        # 通用滑块输入组件
├── types/
│   ├── weapon.ts              # 武器参数接口
│   ├── armor.ts               # 护甲与装备接口
│   ├── material.ts            # 材料系统
│   └── bodyPart.ts            # 身体部位定义
├── utils/
│   ├── weaponCalculations.ts  # 武器 DPS 计算
│   ├── armorCalculations.ts   # 多层护甲计算
│   ├── weaponDataParser.ts    # 武器数据解析（CSV）
│   ├── clothingDataParser.ts  # 衣物数据解析（CSV）
│   ├── materialDataParser.ts  # 材料数据解析（CSV）
│   ├── coverageUtils.ts       # 覆盖率计算工具
│   ├── plotlyUtils.ts         # Plotly 3D 图表工具
│   ├── weapon_data/           # 武器 CSV 数据
│   ├── clothing_data/         # 衣物 CSV 数据
│   └── material_data/         # 材料 CSV 数据
└── App.vue                    # 根组件（Tab 切换）
```

## 技术栈

- **前端框架**：Vue 3 (Composition API + `<script setup>`)
- **类型系统**：TypeScript 5.9（严格模式）
- **UI 组件库**：Element Plus 2.11
- **图表库**：
  - Chart.js 4.5 + vue-chartjs 5.3（2D 曲线）
  - Plotly.js 3.3（3D 曲面）
- **数据解析**：papaparse 5.5（CSV 处理）
- **构建工具**：Vite 7.1
- **代码规范**：ESLint + Prettier

## 如果哪天我咕了，而有人想要扩展，大概会用到这些

### 添加 Mod 数据

在对应目录下添加新的 CSV 文件即可：

```
src/utils/weapon_data/MyMod.csv
src/utils/clothing_data/MyMod.csv
src/utils/material_data/MyMod.csv
```

数据解析器会自动加载所有 CSV 文件。

### 修改计算逻辑

核心计算函数位于 `src/utils/*Calculations.ts`，包含详细的 JSDoc 注释和游戏机制说明。

### 常见的坑

**Plotly Surface 的坐标系统**：

- `z` 数据的第一维对应 Y 轴，第二维对应 X 轴：`z[i][j]` 对应 `(x[j], y[i])`
- `text` 数据的第一维对应 X 轴，第二维对应 Y 轴：`text[i][j]` 对应 `(x[i], y[j])`
- 所以画 3D 图时，`z` 需要转置但 `text` 不用
- 详见 `src/utils/plotlyUtils.ts` 里的 `transposeMatrix()` 注释

## 使用示例

这还要啥示例啊，在右上角选一个模式，然后左边调数据右边看结果就完事了

## 许可证

### TL;DR

关于数据起源的圣典誓约

此计算仪典中一切数值皆溯源于 Tynan 所赐之官方 XML 典藏。  
SMW 查询乃导航之仪，不为启示之源；  
未触凡俗文献（CC-BY-SA），故不受其羁绊。  
以 MIT 之契约，赐诸信徒自由修习。

### 真正的许可证

本项目使用的所有武器、护甲与材料数值均来自 RimWorld 官方游戏的 Defs/XML 文件（包括英文原始 Defs 与官方中文本地化 XML）。
这些数值属于 事实性游戏数据（factual data），不受著作权保护。

为便于数据整理，本项目曾使用 [RimWorld 灰机 Wiki](https://rimworld.huijiwiki.com) 的 Semantic MediaWiki (SMW) 查询接口 生成用于对照的数据表。

但：

- SMW 导出的内容 本质上仍然对应官方游戏 XML 中的事实性数值
- 本项目 未使用、复制或派生 HuijiWiki 撰写的文本内容（说明、解析、介绍等）
- 本项目 不包含 HuijiWiki 的 CC BY-SA 内容
- 因此 不受 CC BY-SA 协议约束

本项目以 MIT 协议开源。

> 注： [RimWorld 灰机 Wiki](https://rimworld.huijiwiki.com) 是国内优秀的 RimWorld 社区，其 SMW 查询接口极大方便了数据对照与验证。在本项目中仅用于辅助定位游戏原始数据，对此表示感谢。

若您希望自行复现本项目的数据，可直接解析 RimWorld 的游戏 XML（RimWorld/Data/Defs/）。
项目中的数据结构也允许以 CSV 的方式扩展或添加 Mod 数据。

## 数据速查（用于对照官方游戏数据）

> 下列链接仅用于对照与验证，数据来源始终为 RimWorld 官方 Defs/XML。

- **武器数据**：[远程武器查询](<https://rimworld.huijiwiki.com/wiki/%E7%89%B9%E6%AE%8A:%E8%AF%A2%E9%97%AE/mainlabel%3D%E5%90%8D%E7%A7%B0/format%3Dtable/link%3D-20subject/sort%3D/order%3Dasc/offset%3D0/limit%3D100/-5B-5B%E5%88%86%E7%B1%BB:%E8%BF%9C%E7%A8%8B%E6%AD%A6%E5%99%A8-5D-5D/-3F%E5%BC%B9%E8%8D%AF%E4%BC%A4%E5%AE%B3/-3F%E6%8A%A4%E7%94%B2%E7%A9%BF%E9%80%8F/-3F%E6%8A%91%E6%AD%A2%E8%83%BD%E5%8A%9B/-3F%E7%9E%84%E5%87%86%E6%97%B6%E9%97%B4/-3F%E8%BF%9C%E7%A8%8B%E5%86%B7%E5%8D%B4%E6%97%B6%E9%97%B4%3D%E5%86%B7%E5%8D%B4%E6%97%B6%E9%97%B4/-3F%E5%B0%84%E7%A8%8B%3D%E5%B0%84%E7%A8%8B(tiles)/-3F%E8%BF%9E%E5%8F%91%E6%95%B0%E9%87%8F/-3F%E8%BF%9E%E5%8F%91%E9%97%B4%E9%9A%94tick%E6%95%B0%3D%E8%BF%9E%E5%8F%91%E9%97%B4%E9%9A%94(ticks)/-3F%E7%B2%BE%E5%BA%A6%EF%BC%88%E8%B4%B4%E8%BF%91%EF%BC%89/-3F%E7%B2%BE%E5%BA%A6%EF%BC%88%E8%BF%91%EF%BC%89/-3F%E7%B2%BE%E5%BA%A6%EF%BC%88%E4%B8%AD%EF%BC%89/-3F%E7%B2%BE%E5%BA%A6%EF%BC%88%E8%BF%9C%EF%BC%89/-3F%E4%BB%B7%E5%80%BC%3D%E5%B8%82%E5%9C%BA%E4%BB%B7%E5%80%BC>)
- **衣物数据**：[衣物查询](https://rimworld.huijiwiki.com/wiki/%E7%89%B9%E6%AE%8A:%E8%AF%A2%E9%97%AE/mainlabel%3D%E5%90%8D%E7%A7%B0/format%3Dtable/link%3D-20subject/sort%3D/order%3Dasc/offset%3D0/limit%3D500/-5B-5B%E5%88%86%E7%B1%BB:%E8%A1%A3%E7%89%A9-5D-5D/-3F%E5%88%86%E7%B1%BB/-3F%E6%8F%8F%E8%BF%B0/-3F%E6%9D%90%E8%B4%A8/-3F%E6%8A%A4%E7%94%B2-20-2D-20%E6%9D%90%E6%96%99%E7%B3%BB%E6%95%B0/-3F%E6%8A%A4%E7%94%B2-20-2D-20%E5%88%A9%E5%99%A8/-3F%E6%8A%A4%E7%94%B2-20-2D-20%E9%92%9D%E5%99%A8/-3F%E6%8A%A4%E7%94%B2-20-2D-20%E7%83%AD%E8%83%BD/-3F%E8%A6%86%E7%9B%96/-3F%E5%B1%82/-3F%E4%BB%B7%E5%80%BC%3D%E5%B8%82%E5%9C%BA%E4%BB%B7%E5%80%BC)
- **材料数据**：[材料查询](https://rimworld.huijiwiki.com/wiki/%E7%89%B9%E6%AE%8A:%E8%AF%A2%E9%97%AE/mainlabel=%E5%90%8D%E7%A7%B0/format=table/link=-20subject/sort=/order=asc/offset=0/limit=500/-5B-5B%E5%88%86%E7%B1%BB:%E9%87%91%E5%B1%9E-7C-7C%E6%9C%A8%E6%9D%90-7C-7C%E7%BB%87%E7%89%A9-5D-5D/-3F%E5%88%86%E7%B1%BB/-3F%E6%8F%8F%E8%BF%B0/-3F%E6%8A%A4%E7%94%B2-20-2D-20%E5%88%A9%E5%99%A8/-3F%E6%8A%A4%E7%94%B2-20-2D-20%E9%92%9D%E5%99%A8/-3F%E6%8A%A4%E7%94%B2-20-2D-20%E7%83%AD%E8%83%BD/-3F%E9%9A%94%E6%B8%A9-20-2D-20%E5%AF%92%E5%86%B7/-3F%E9%9A%94%E6%B8%A9-20-2D-20%E7%82%8E%E7%83%AD/-3F%E4%BB%B7%E5%80%BC=%E5%B8%82%E5%9C%BA%E4%BB%B7%E5%80%BC)

---

**致破甲者**：愿你的子弹找到缝隙  
**致留命者**：愿你的护甲承载希望

# TODO

- [ ] 看看能不能米利拉帝国的数据导进来
- [x] 用更灵活的splitter而非固定宽度布局
- [x] 减小input，增大slider
- [ ] 加俩截图
- [ ] i18n
