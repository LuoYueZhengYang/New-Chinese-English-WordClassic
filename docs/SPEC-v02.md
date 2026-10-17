# WordClassic 的简单表达思路

发起人：王正阳（笔名）。本轮试行版本为 0.2.0-trial。

## 单词原样使用

我们希望学习者先会表达，不必先记一套复杂的语法名称。基础单位保留原英语词形与读音；需要新意思时，用意思清楚的单位组合。

**A long time ago, I live in sky.**

意思是“很久以前，我生活在天上”。时间已经由 A long time ago 交代，live 保持原样。

| 想说什么 | WordClassic |
| --- | --- |
| 昨天我喝水。 | Yesterday, I drink water. |
| 现在我喝水。 | Now, I drink water. |
| 明天我喝水。 | Tomorrow, I drink water. |
| 我有两本书。 | I have two book. |
| 我不想喝茶。 | I no want drink tea. |
| 我是老师。 | I teacher. |
| 你想喝茶吗？ | You want drink tea? |

## 把话说清楚

- 先说时间，再说谁做什么，是简单句的常用顺序；时间已经清楚时可以省略。
- 动作使用登记的原词，不为过去、将来或不同人物另加词尾。
- 数量说在前面，后面的事物名保持原样。
- 否定用 no；问句先用问号和语调表达。
- 一句话太长，就拆成几句；人物、数量、时间、原因和传闻出处仍要保留。
- 同一个单位尽量坚持已登记的意思，出现歧义就换清楚的说法。

这些是 WordClassic 的试行表达，不当作标准英语写作规则，也不把试译当作学习效果已获验证。

## 熟悉单位组成新词

| 中文 | 组成 | 表达 |
| --- | --- | --- |
| 公猪 | male + pig | malepig |
| 母猪 | female + pig | femalepig |
| 小体型的猪 | small + pig | smallpig |
| 幼猪 | young + pig | youngpig |
| 牛肉 | cattle + meat | cattlemeat |
| 牛奶 | cattle + milk | cattlemilk |
| 葡萄酒 | grape + wine | grapewine |
| 葡萄干 | dried + grape | driedgrape |

组合按单位顺序读，每个单位保留原读音。teacher、student、grape、coffee 等基础单位继续整体使用，不机械按汉字拆开。

数字沿用十进组合：十一 tenone，十二 tentwo，二十 twoten，三十二 threetentwo。拼接单位与改变单位词形是两件事；0—99 生成器保持原样。

## 词库与版本

`data/lexicon-v02.json` 登记 308 个基础单位、14 个组合，其中新增 236 个基础单位、12 个组合。发起人已同意用于试行；5000 仍是长期目标，不是已完成数量或阅读覆盖率。

新版 milk 表示通用动物奶，牛奶用 cattlemilk；旧版 milk 的牛奶义及旧 60 句保留在 0.1 数据中。wine 在本批取水果发酵酒饮类别，grapewine 指葡萄来源。dried、tired、clothes 是原本就存在的完整词形，不从它们推出通用词尾变形。

公开检验材料采用项目原创的 60 句与词族例子。第三方小说仅保留为不公开的本地测试材料，原文和试译均不在发布范围；见 [素材范围](../samples/README.md)。

0.1 的原 72 词、2 组合、60 句和数字数据继续保留。新公开仓库采用干净历史，不包含早期小说试译。详细数据与测试用于维护者核对，读者可以从上面的短句开始。
