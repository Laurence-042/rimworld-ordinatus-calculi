# 《边缘世界·计算仪典》扩展数据集

> RimWorld Ordinatus Calculi — Extra Data

> Extended Datasets for RimWorld Ordinatus Calculi  
> 破甲者之歌之外，还有更多值得编制成秩序的数据。

本仓库收录 **从 RimWorld 原版与若干模组（Mods）中提取得到的整理后 CSV 数据集**。  
这些数据会以 github raw 的形式提供给主项目  
**RimWorld Ordinatus Calculi：破甲者之歌・留命者之吟** 作为扩展数据源。

这意味着可以在部署后的主项目中获得更全面的武器、衣物、材料数值，  
以更好地适应包含众多流行Mod的游戏环境。

---

## 数据内容 / What's Inside

本仓库 **不包含任何原始 XML 或游戏资源文件**。  
所有内容均为提取与二次加工后的结构化 CSV：

- `apparel/*.csv` — 各模组的衣物与护甲数据
- `material/*.csv` — 材料属性、护甲系数、隔温性能等
- `weapon/*.csv` — 来自不同模组的武器参数

---

## 使用方式 / How to Use

若你使用 **RimWorld Ordinatus Calculi**：

- 主项目的 build 脚本里可以配置扩展数据源，会在构建时自动下载并合并

如果你正在开发自己的工具链：

- 都是普通 csv 文件，可直接使用 `papaparse`、`pandas` 或任意工具加载

---

## License & Attribution Notice

## 许可与来源声明

This repository contains **derived factual data** generated from RimWorld and several RimWorld mods.  
No original XML, textures, sounds, or other copyrighted assets are included.

本仓库包含基于 RimWorld 与多个模组生成的 **结构化事实性数据**。  
本仓库 **不包含原始 XML、贴图、音频或任何受版权保护的资源文件**。

---

### About Mods with CC or Multiple Maintainers

### 关于使用 CC 协议或由多人维护的模组

Some data in this repository originates from mods that are:

- released under **Creative Commons licenses** (e.g. CC-BY / CC-BY-SA / CC-BY-NC),
- temporarily maintained or updated by community contributors,
- based on earlier versions created by original authors.

本仓库的数据可能来自：

- 以 **Creative Commons** 协议发布的模组（如 CC-BY / CC-BY-SA / CC-BY-NC），
- 由社区贡献者临时维护或更新的版本，
- 基于原作者旧版本的延续或衍生版本。

In all such cases:

- **All copyrights and licenses remain with the original mod authors and the respective maintainers.**
- **This repository does not claim ownership of any names or textual content extracted from those mods.**
- **Any CC-licensed content continues to be governed by its original license terms.**

对于上述所有情况：

- **原作者及相关维护者保留其所有版权及许可权。**
- **本仓库不主张对从这些模组提取的任何名称或文本内容拥有版权。**
- **所有 CC 授权内容仍适用其原有协议条款。**

---

### 📘 MIT License (for derived structure only)

### 本仓库 MIT 授权的范围

The following are released under the **MIT License**:

- CSV formatting
- data structure
- aggregation methods
- normalization rules

以下内容使用 **MIT License** 发布：

- CSV 格式
- 衍生数据结构
- 汇总整理方法
- 规范化规则

This **does not** include original mod names or text, which remain under their original licenses.

MIT 授权 **不包括**来自模组的原始名称或文本，这些内容仍受其原有授权条款约束。
