# RimWorld 计算仪典：破甲者之歌・留命者之吟

> RimWorld Ordinatus Calculi：Song of the Breaker ・ Chant of the Keeper

一个基于 Vue 3 + TypeScript 的 RimWorld 战斗机制计算器，用于计算给定武器在不同的距离/护甲情况下的DPS，以及给定护甲组合在不同单发伤害/穿甲情况下的受伤期望。

![Vue 3](https://img.shields.io/badge/Vue-3.5-brightgreen) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue) ![Element Plus](https://img.shields.io/badge/Element%20Plus-2.11-409EFF)

[TOC]

## 功能特性

### 武器 DPS 计算器（Weapon-Centric）

- **多武器对比**：同时评估多个武器在不同护甲率（0-200%）下的 DPS 表现
- **精确命中率**：基于距离分段（贴近/近/中/远）的线性插值算法
- **连发机制**：完整模拟预热、连发间隔、冷却时序
- **2D/3D 可视化**：
  - 2D 曲线图：特定距离下 DPS 随 护甲率 变化的曲线
  - 3D 曲面图：护甲率 随 距离 和 穿甲 变化的曲面，并标记两种武器曲面交线（什么情况下两种武器 DPS 期望一致）

### 护甲效能计算器（Armor-Centric）

- **多层护甲系统**：支持多层护甲计算
- **身体部位覆盖**：支持显示覆盖情况并根据覆盖的护甲计算防护效果
- **伤害类型模拟**：利器/钝器/热能伤害的不同穿透机制
- **概率分布**：显示完全偏转/部分穿透/完全穿透的概率分布
- **实战场景**：
  - 减伤概率分布：特定穿甲的减伤概率分布
  - 减伤期望曲线：不同穿甲的减伤期望曲线

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

访问 `http://localhost:5173/project/rimworld-ordinatus-calculi/demo/`

> 这个路径是我的项目部署页 https://laurence-042.github.io/project/rimworld-ordinatus-calculi/demo/index.html ，其就像普通 vite 项目一样在 `vite.config.ts` 里定义

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

### 预设数据生成

执行前请参照 `tools\xml_def_data_parser\config.ts` 中的注释修改配置，以对应实际 Mod 路径

其默认参数通常为开发者生成 [扩展数据集](https://github.com/Laurence-042/rimworld-ordinatus-calculi-extra-data) 的时候的配置

请注意，Mod 中提取出的数据仅应提交到上述 扩展数据集 仓库，这是因为 Mod 往往使用 CC 系类协议（或者未提及），将其包含在本仓库后本仓库的 License 声明将不再适用

```powershell
npm run parse-mod # 从 RimWorld 游戏本体和 Mod 的 XML 中提取数据
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
│   ├── ArmorReductionCurve.vue # 护甲减伤曲线
│   ├── LanguageSelector.vue   # 语言切换组件
│   └── SliderInput.vue        # 通用滑块输入组件
├── i18n/
│   ├── index.ts               # vue-i18n 配置
│   └── locales/
│       ├── zh-CN.json         # 简体中文
│       └── en-US.json         # English
├── types/
│   ├── weapon.ts              # 武器参数接口
│   ├── armor.ts               # 护甲与装备接口
│   ├── material.ts            # 材料系统
│   ├── bodyPart.ts            # 身体部位定义
│   └── quality.ts             # 品质等级定义
├── utils/
│   ├── weaponCalculations.ts  # 武器 DPS 计算
│   ├── armorCalculations.ts   # 多层护甲计算
│   ├── weaponDataParser.ts    # 武器数据解析
│   ├── apparelDataParser.ts   # 服装数据解析
│   ├── materialDataParser.ts  # 材料数据解析
│   ├── dataSourceConfig.ts    # 数据源配置（manifest加载）
│   ├── coverageUtils.ts       # 覆盖率计算工具
│   ├── bodyPartUtils.ts       # 身体部位工具
│   ├── armorUtils.ts          # 护甲工具函数
│   ├── csvParserUtils.ts      # CSV 解析工具
│   └── plotlyUtils.ts         # Plotly 3D 图表工具
├── App.vue                    # 根组件（Tab 切换）
└── main.ts                    # 入口文件

public/data/                   # 游戏数据（由 xml_def_data_parser 生成）
├── manifest.json              # 数据清单（MOD列表、语言、数据类型）
├── weapon/<ModName>/<locale>.csv
├── apparel/<ModName>/<locale>.csv
└── material/<ModName>/<locale>.csv

tools/xml_def_data_parser/     # RimWorld XML 数据提取工具
├── config.ts                  # MOD 路径配置
├── tool.ts                    # 主解析器
├── weaponParser.ts            # 武器解析
├── apparelParser.ts           # 服装解析
├── materialParser.ts          # 材料解析
├── baseParser.ts              # 基础解析与继承处理
├── projectileParser.ts        # 投射物解析
└── README.template.md         # 生成 README 的模板
```

## 技术栈

- **前端框架**：Vue 3 (Composition API + `<script setup>`)
- **类型系统**：TypeScript 5.9（严格模式）
- **UI 组件库**：Element Plus 2.11
- **国际化**：vue-i18n（支持中文/英文切换）
- **图表库**：
  - Chart.js 4.5 + vue-chartjs 5.3（2D 曲线）
  - Plotly.js 3.3（3D 曲面）
- **数据解析**：papaparse 5.5（CSV 处理）
- **构建工具**：Vite 7.1
- **代码规范**：ESLint + Prettier

## 如果哪天我咕了，而有人想要扩展，大概会用到这些

### 添加 Mod 数据

项目使用 `tools/xml_def_data_parser/` 工具从 RimWorld 的 XML 定义文件中提取数据：

1. 编辑 `tools/xml_def_data_parser/config.ts`，添加 MOD 配置：

   ```typescript
   {
     path: 'D:\\SteamLibrary\\steamapps\\workshop\\content\\294100\\<MOD_ID>',
     sourceUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=<MOD_ID>',
     enabled: true,
   }
   ```

2. 运行解析器：

   ```powershell
   npm run parse-mod
   ```

3. 工具会自动：
   - 解析 MOD 的 XML 定义文件
   - 处理继承关系（ParentName）
   - 提取多语言翻译
   - 生成 CSV 文件到 `public/data/`
   - 更新 `manifest.json`
   - 生成带有来源归属的 `README.md`

### 数据源系统

- **Manifest 驱动**：`public/data/manifest.json` 记录所有可用的 MOD、语言和数据类型
- **自动合并**：Core、Royalty、Ideology、Biotech、Anomaly、Odyssey 会被合并为 "Vanilla"
- **多语言支持**：每个 MOD 可以有多个语言版本的 CSV（如 `zh-CN.csv`、`en-US.csv`）

### 修改计算逻辑

核心计算函数位于 `src/utils/*Calculations.ts`，包含详细的 JSDoc 注释和游戏机制说明。

### 添加新语言

1. 在 `src/i18n/locales/` 下创建新的 JSON 文件（如 `ja-JP.json`）
2. 在 `src/i18n/index.ts` 中导入并注册
3. 更新 `LanguageSelector.vue`（如需要）

### 常见的坑

**Plotly Surface 的坐标系统**：

- `z` 数据的第一维对应 Y 轴，第二维对应 X 轴：`z[i][j]` 对应 `(x[j], y[i])`
- `text` 数据的第一维对应 X 轴，第二维对应 Y 轴：`text[i][j]` 对应 `(x[i], y[j])`
- 所以画 3D 图时，`z` 需要转置但 `text` 不用
- 详见 `src/utils/plotlyUtils.ts` 里的 `transposeMatrix()` 注释

## 使用示例

这还要啥示例啊，在右上角选一个模式，然后左边调数据右边看结果就完事了

## 许可证

### 法典绪言

此计算仪典以 MIT 之契约，赐诸信徒自由修习。
然其中一切数值皆溯源于 Tynan 所赐之官方 XML 典藏。  
圣典之契，仅约束吾所编之代码、算式之实现、与数据之架构。
至于兵戎衣铠之名与诸身躯部位之称，皆出自 Tynan 之典籍，不属敝人可予之许可，仍循其原有之法。

### 正经的许可证说明

本项目以 MIT 协议开源。

MIT 许可仅适用于本项目的源代码、计算逻辑的实现方式，以及生成的数据结构格式。
本项目中出现的武器、护甲、材料等名称均来自 RimWorld 原作，其著作权归 Ludeon Studios 所有，不在 MIT 授权范围内。

## RimWorld 原版数据速查

> 如果您怀疑预设数据存在问题，可以使用如下链接查询  
> [RimWorld 灰机 Wiki](https://rimworld.huijiwiki.com) 是国内优秀的 RimWorld 社区，在开发数据提取脚本的过程中，其 SMW 查询接口极大方便了数据对照与验证，使我得以快速检查脚本输出是否有缺失和冗余，对此表示感谢。

- **武器数据**：[远程武器查询](<https://rimworld.huijiwiki.com/wiki/%E7%89%B9%E6%AE%8A:%E8%AF%A2%E9%97%AE/mainlabel%3D%E5%90%8D%E7%A7%B0/format%3Dtable/link%3D-20subject/sort%3D/order%3Dasc/offset%3D0/limit%3D100/-5B-5B%E5%88%86%E7%B1%BB:%E8%BF%9C%E7%A8%8B%E6%AD%A6%E5%99%A8-5D-5D/-3F%E5%BC%B9%E8%8D%AF%E4%BC%A4%E5%AE%B3/-3F%E6%8A%A4%E7%94%B2%E7%A9%BF%E9%80%8F/-3F%E6%8A%91%E6%AD%A2%E8%83%BD%E5%8A%9B/-3F%E7%9E%84%E5%87%86%E6%97%B6%E9%97%B4/-3F%E8%BF%9C%E7%A8%8B%E5%86%B7%E5%8D%B4%E6%97%B6%E9%97%B4%3D%E5%86%B7%E5%8D%B4%E6%97%B6%E9%97%B4/-3F%E5%B0%84%E7%A8%8B%3D%E5%B0%84%E7%A8%8B(tiles)/-3F%E8%BF%9E%E5%8F%91%E6%95%B0%E9%87%8F/-3F%E8%BF%9E%E5%8F%91%E9%97%B4%E9%9A%94tick%E6%95%B0%3D%E8%BF%9E%E5%8F%91%E9%97%B4%E9%9A%94(ticks)/-3F%E7%B2%BE%E5%BA%A6%EF%BC%88%E8%B4%B4%E8%BF%91%EF%BC%89/-3F%E7%B2%BE%E5%BA%A6%EF%BC%88%E8%BF%91%EF%BC%89/-3F%E7%B2%BE%E5%BA%A6%EF%BC%88%E4%B8%AD%EF%BC%89/-3F%E7%B2%BE%E5%BA%A6%EF%BC%88%E8%BF%9C%EF%BC%89/-3F%E4%BB%B7%E5%80%BC%3D%E5%B8%82%E5%9C%BA%E4%BB%B7%E5%80%BC>)
- **衣物数据**：[衣物查询](https://rimworld.huijiwiki.com/wiki/%E7%89%B9%E6%AE%8A:%E8%AF%A2%E9%97%AE/mainlabel%3D%E5%90%8D%E7%A7%B0/format%3Dtable/link%3D-20subject/sort%3D/order%3Dasc/offset%3D0/limit%3D500/-5B-5B%E5%88%86%E7%B1%BB:%E8%A1%A3%E7%89%A9-5D-5D/-3F%E5%88%86%E7%B1%BB/-3F%E6%8F%8F%E8%BF%B0/-3F%E6%9D%90%E8%B4%A8/-3F%E6%8A%A4%E7%94%B2-20-2D-20%E6%9D%90%E6%96%99%E7%B3%BB%E6%95%B0/-3F%E6%8A%A4%E7%94%B2-20-2D-20%E5%88%A9%E5%99%A8/-3F%E6%8A%A4%E7%94%B2-20-2D-20%E9%92%9D%E5%99%A8/-3F%E6%8A%A4%E7%94%B2-20-2D-20%E7%83%AD%E8%83%BD/-3F%E8%A6%86%E7%9B%96/-3F%E5%B1%82/-3F%E4%BB%B7%E5%80%BC%3D%E5%B8%82%E5%9C%BA%E4%BB%B7%E5%80%BC)
- **材料数据**：[材料查询](https://rimworld.huijiwiki.com/wiki/%E7%89%B9%E6%AE%8A:%E8%AF%A2%E9%97%AE/mainlabel=%E5%90%8D%E7%A7%B0/format=table/link=-20subject/sort=/order=asc/offset=0/limit=500/-5B-5B%E5%88%86%E7%B1%BB:%E9%87%91%E5%B1%9E-7C-7C%E6%9C%A8%E6%9D%90-7C-7C%E7%BB%87%E7%89%A9-5D-5D/-3F%E5%88%86%E7%B1%BB/-3F%E6%8F%8F%E8%BF%B0/-3F%E6%8A%A4%E7%94%B2-20-2D-20%E5%88%A9%E5%99%A8/-3F%E6%8A%A4%E7%94%B2-20-2D-20%E9%92%9D%E5%99%A8/-3F%E6%8A%A4%E7%94%B2-20-2D-20%E7%83%AD%E8%83%BD/-3F%E9%9A%94%E6%B8%A9-20-2D-20%E5%AF%92%E5%86%B7/-3F%E9%9A%94%E6%B8%A9-20-2D-20%E7%82%8E%E7%83%AD/-3F%E4%BB%B7%E5%80%BC=%E5%B8%82%E5%9C%BA%E4%BB%B7%E5%80%BC)

---

**致破甲者**：愿你的子弹找到缝隙  
**致留命者**：愿你的护甲承载希望

## TODO

- [ ] 看看能不能把第三方MOD的数据导进来
  - [x] 武器数据加载
  - [x] 服装数据加载
  - [x] 材料数据加载
  - [x] XML 数据提取工具
  - [x] 开个CC协议的仓库存CC协议的mod数据
  - [ ] 让
- [x] 用更灵活的splitter而非固定宽度布局
- [x] 减小input，增大slider
- [x] 加俩截图
- [x] i18n

## 已知但不准备修复的问题（特性）

### 一个ThingDef要么被忽略，要么被视为武器、衣物、材料三者之一，不能同时为多种类型

这个问题在原版中只有一个影响，即原木（WoodLog）不会被作为武器加载。

这个没啥问题，反正这个计算器目前没打算支持近战武器，近战武器也都在生成数据表格阶段就被过滤掉了（毕竟近战武器的数值大多一眼就能看出好不好）

不过我没太多mod开发经验，不确定有没有可能做出能穿、能开火的材料，或者能拿手上开火的衣服……但我觉得这种设计太抽象了，就算可以做也不会有mod做，所以没有为此做兼容的计划。但如果真有mod整了这种抽象活，那这个特殊物品会依次匹配“材料”、“武器”、“衣物”，会被视为第一个匹配的类型。

比如原木（WoodLog）就匹配到了材料，能拿手上开火的衣服会被视为武器，能穿、能开火的材料会被视为材料

## 开发过程中发现的一些有趣的事实

### 防弹套可能比海军甲还好？

在面对原版的护甲杀手-电荷标枪（35%穿甲）和更低穿甲的武器时，普通品质的防弹夹克和防弹夹板组成的防弹套在对躯干的保护上优于普通品质的海军甲

> 但这不代表有海军甲不穿去穿防弹套。因为防弹套是不保护双臂的，脖颈也只有防弹夹克提供单层保护，所以不想飞头的话，有海军甲还是好好穿上——除非你的敌人是某些mod里那种就算减伤50%也能飞头的伤害数值怪

![](https://github.com/user-attachments/assets/2f1e7b20-1d88-4ae1-9a03-6fdc42ba3d55)

### 极差巨弓射穿大师级海军头？

不同于流行的“极差巨弓一箭射穿大师级海军头盔”meme，实际上即使是一般的巨弓（15%穿甲）也不可能打穿大师级海军头盔

> 但极佳的海军头盔有大概18%的概率无法完全免疫巨弓的射击，会在减伤后仍受到8、9点钝器伤害

![](https://github.com/user-attachments/assets/6a168cd6-3967-4d24-85d7-098a0a98b46a)

### 为什么速射机枪是神？

在同为大师级品质的情况下，链霰即使在面对高护甲下平均DPS也高于速射啊

> 不过链霰确实手太短了，而且一般也没啥能抗住一轮速射队的齐射，所以实际使用时速射的长后摇一般不会造成什么影响，也正因如此速射是神

![](https://github.com/user-attachments/assets/1b577f26-4855-433d-9ca9-5bf18394be53)

### 黑曜石是金属

不确定是不是我眼神不好，我此前真的完全没注意到黑曜石算一种金属

### 枪械的伤害是怎么算的

RimWorld 原版战斗虽然看似是个扔骰子的粗略模拟，但其数据结构却出乎意料地真实，即：

枪械的伤害和穿甲取决于其子弹的伤害和穿甲

但具体计算逻辑就有点复杂了，枪械的伤害和穿甲的定义流程大致可以理解为

- 枪械定义
  - 枪械动作
    - 类型：Verb_Shoot
    - 投射物：子弹定义
- 子弹定义
  - 伤害类型
  - 伤害（可选）
    - 若不存在这个字段，视为伤害类型的默认伤害值
  - 穿甲（可选）
    - 若不存在这个字段，视为伤害类型的默认穿甲值
      - 若伤害类型的默认穿甲值也不存在（默认值-1），视为 子弹伤害\*0.015

实际案例：栓动步枪的子弹伤害是18，其没有直接提供穿甲值，其伤害类型 Bullet 也没提供默认穿甲值， 那么栓动步枪的穿甲值就是 18\*0.015=0.27，即 27%）
