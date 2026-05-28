# PRD: AI 德州扑克单机训练模拟器

## 1. Summary

本产品是一款面向个人练习的单机德州扑克模拟器。首版支持 3-8 人牌桌、三档以上机器人难度、传统德州扑克规则，以及美观的沉浸式牌桌 UI。

核心差异是机器人不使用固定规则脚本做决策，而是调用 DeepSeek API 生成行动。系统仍需要有确定性的规则引擎，负责发牌、下注轮、合法动作、奖池、牌力比较和结算，确保 AI 只能在规则允许的动作内选择。

## 2. Contacts

| Name | Role | Comment |
| --- | --- | --- |
| 用户 / 产品负责人 | Owner | 定义训练目标、玩法范围、体验标准 |
| Codex / 产品与工程协作 | Product & Engineering | 负责 PRD、架构建议、原型和实现 |
| DeepSeek API | AI Provider | 提供机器人玩家的决策能力 |

## 3. Background

德州扑克练习通常有两类工具：真人线上局和规则驱动的离线模拟器。真人线上局有时间、资金和心理压力；规则驱动模拟器容易形成固定套路，训练价值有限。

这个项目要做的是一个个人可随时打开的训练桌。用户可以调整人数和难度，快速进入牌局，反复练习翻前、翻牌、转牌、河牌阶段的判断。

AI 大模型让单机训练出现了新的可能。机器人可以根据位置、筹码、公共牌、下注历史、玩家形象和难度设定做出更自然的行动。这样比写死策略表更灵活，也更接近真实牌局中的不确定性。

首版重点不是做真钱游戏，也不是做多人联网，而是做一个稳定、好看、可练习、可扩展的本地单机产品。

## 4. Objective

### Objective

做出一款可本地运行的 AI 德州扑克训练模拟器，让用户能够在 3-8 人桌中快速开始练习，并感受到不同难度 AI 对手带来的策略差异。

### Why It Matters

- 用户可以低成本、高频率地练习决策。
- AI 对手比固定规则机器人更不容易被摸透。
- 单机模式降低启动成本，适合快速迭代核心体验。
- 先打磨规则、AI 决策和 UI，后续可以扩展为复盘、教学、赛事模式或多人模式。

### Key Results

| KR | Target |
| --- | --- |
| 可玩性 | 用户能在 30 秒内开始一局 3-8 人德州扑克 |
| 规则完整性 | 支持标准 Texas Hold'em 的发牌、盲注、下注轮、摊牌、边池和结算 |
| AI 决策 | 机器人每次行动都通过 DeepSeek API 请求生成，且返回动作必须被规则引擎校验 |
| 难度配置 | 至少支持新手、常规、高手三档难度 |
| UI 完整度 | 首屏包含牌桌、筹码、手牌、公共牌、玩家座位、下注区、操作按钮和局势提示 |
| 稳定性 | 连续完成 20 手牌局不出现规则中断或状态错乱 |

## 5. Market Segment(s)

### Primary Segment: 个人德州扑克练习者

用户想独自练习德州扑克，但不希望每次都进入真人牌局。他们需要一个随时可用、没有资金压力、对手行为较自然的训练环境。

### Jobs To Be Done

- 当我想练习德州扑克时，我想快速开一桌 AI 局，这样我可以马上进入决策状态。
- 当我想练习不同局面时，我想调整人数和难度，这样我可以模拟松桌、紧桌、短桌或满桌。
- 当我遇到复杂下注时，我想看到完整下注历史和当前行动选项，这样我可以判断跟注、加注、弃牌是否合理。
- 当我结束一手牌后，我想知道输赢、牌型和奖池分配，这样我可以复盘自己的判断。

### Constraints

- 首版为单机模式，不做真人联网对局。
- 不涉及真钱、充值、提现或赌博功能。
- AI 调用会有延迟和成本，需要做加载状态、超时处理和失败回退。
- DeepSeek API key 已配置在环境变量中，不能暴露到前端代码或客户端包中。
- 传统规则必须由程序保证，不能依赖 AI 自己解释规则。

## 6. Value Proposition(s)

### Core Value

用户可以在一个美观、稳定、可调整难度的单机德州扑克环境中练习真实决策。AI 机器人带来更多变化，规则引擎保证牌局公平和合法。

### Gains

- 快速开始训练，不需要等人。
- 可选择 3-8 人，覆盖短桌和接近满桌的场景。
- 三档难度让用户逐步提高。
- AI 对手有不同风格，不只是机械跟注或固定弃牌。
- UI 清晰呈现筹码、下注、位置、公共牌和行动轮次。

### Pains Avoided

- 避免真钱压力。
- 避免真人局等待时间。
- 避免传统 bot 行为过于死板。
- 避免只看文字日志、缺少沉浸感。

### Differentiation

| Dimension | Traditional Poker Simulator | This Product |
| --- | --- | --- |
| Bot behavior | Fixed rules or simple heuristics | DeepSeek API generated decisions |
| Mode | Often training drills or static bots | Full single-player table simulation |
| Difficulty | Often hidden or shallow | Explicit difficulty levels |
| Player count | Often fixed | Configurable 3-8 players |
| UI | Functional but plain | Visual table with generated assets |

## 7. Solution

### 7.1 UX / Prototypes

#### Primary User Flow

1. 用户打开模拟器。
2. 用户选择人数：3-8 人。
3. 用户选择难度：新手、常规、高手。
4. 用户选择初始筹码、大小盲和是否开启自动继续。
5. 用户点击开始牌局。
6. 系统生成座位、庄位、小盲、大盲和玩家形象。
7. 系统发两张手牌给用户和每个 AI 玩家。
8. 牌局按翻前、翻牌、转牌、河牌、摊牌推进。
9. 轮到用户行动时，显示可选动作：弃牌、过牌、跟注、下注、加注、全下。
10. 轮到 AI 行动时，系统调用 DeepSeek API，并显示思考状态。
11. 每手牌结束后，系统展示赢家、牌型、奖池分配和简短回顾。
12. 用户可继续下一手、调整设置或重开牌桌。

#### Main Screen Layout

- 中央：椭圆形德州扑克桌。
- 上方和两侧：AI 玩家座位，显示头像、昵称、筹码、当前下注、状态。
- 底部：用户座位，显示手牌、筹码、位置、当前下注。
- 桌面中央：公共牌区、主池、边池、当前底池金额。
- 右下：行动按钮和下注滑杆。
- 左侧或底部：手牌历史、最近行动、盲注信息。
- 顶部：局号、难度、人数、当前阶段、设置入口。

#### Visual Asset Direction

首版可以使用 image2 / image generation 生成以下组件，再由前端组合：

- 牌桌背景：深绿色或深蓝色毡布，带柔和灯光和细节纹理。
- 扑克牌：清晰的四花色牌面，背面统一设计。
- 筹码：不同颜色代表不同面值，带轻微 3D 质感。
- 玩家头像：8 个风格统一的虚拟玩家形象，区分性格但不夸张。
- 庄位按钮：Dealer 标识。
- 胜利高亮：赢家座位发光或筹码流动动画。

UI 风格应偏高级桌游和训练工具，而不是赌场诱导。避免真钱、充值、奖励提现等暗示。

### 7.2 Key Features

#### F1. Standard Texas Hold'em Rules Engine

系统必须支持传统无限注德州扑克的核心规则。

Scope:

- 52 张标准牌，无大小王。
- 每位玩家两张手牌。
- 最多五张公共牌。
- 阶段：翻前、翻牌、转牌、河牌、摊牌。
- 庄位、小盲、大盲按手牌轮换。
- 支持弃牌、过牌、跟注、下注、加注、全下。
- 支持主池和边池。
- 支持多人 all-in 后继续发牌。
- 支持摊牌时从 7 张牌中选最佳 5 张牌。
- 支持平分奖池。

Acceptance Criteria:

- 给定同一随机种子，牌局结果可复现。
- 任意行动前，系统能列出合法动作和金额范围。
- AI 或用户提交非法动作时，系统拒绝并要求重新选择。
- 多人 all-in 时，边池计算正确。

#### F2. AI Robot Decision System

机器人行动必须调用 DeepSeek API，不使用本地固定规则驱动最终决策。

Rules:

- 每个 AI 行动前，后端向 DeepSeek 发送当前局面摘要。
- Prompt 包含难度、玩家风格、位置、筹码、手牌、公共牌、底池、下注历史、合法动作列表。
- DeepSeek 返回结构化 JSON。
- 系统只接受合法动作。
- 如果返回非法动作，系统可进行一次纠正请求。
- 如果 API 超时或失败，系统进入安全回退：优先选择最保守的合法动作，例如 check；如果不能 check，则 fold。该回退只是故障保护，不作为正常 bot 策略。

Suggested AI Response Schema:

```json
{
  "action": "fold | check | call | bet | raise | all_in",
  "amount": 0,
  "confidence": 0.72,
  "reason": "Short private reasoning for UI or logs"
}
```

Important:

- 不向 AI 暴露其他玩家未公开的手牌。
- 每个 AI 只看到自己手牌、公共牌和公开下注历史。
- AI 的文字理由可用于开发日志，首版 UI 可以默认隐藏，避免影响用户练习。

#### F3. Difficulty Levels

首版至少支持三档。

| Difficulty | Behavior Goal | Prompt Style |
| --- | --- | --- |
| 新手 | 容易犯错，跟注偏多，下注尺度不稳定 | 简化思考，允许保守或情绪化决策 |
| 常规 | 基本理解位置、牌力、底池赔率和下注压力 | 平衡价值下注、诈唬和弃牌 |
| 高手 | 更重视范围、位置、筹码深度、对手倾向 | 更系统地分析局面，行动更有压迫感 |

Optional Future Levels:

- 娱乐型：松、爱跟注。
- 紧凶型：少入池，高压下注。
- 松凶型：频繁施压，更多诈唬。
- 锦标赛型：考虑盲注上涨和 ICM。

Acceptance Criteria:

- 用户可以在开局前选择难度。
- 难度会进入每个 AI 请求的 prompt。
- 同一局面下，不同难度的 action 分布应有明显差异。

#### F4. Player Count Configuration

用户可选择 3-8 人参与牌局，包含用户自己。

Acceptance Criteria:

- 设置面板支持选择 3、4、5、6、7、8 人。
- 座位布局随人数自适应。
- 庄位和盲注按实际人数正确轮转。
- 玩家被淘汰或筹码为 0 时，系统可提示重买或自动重开，首版默认自动补满初始筹码进入下一手。

#### F5. Betting and Action UI

用户行动要清晰、低误触。

Controls:

- 弃牌按钮。
- 过牌 / 跟注按钮，按当前局面自动切换。
- 下注 / 加注按钮。
- 全下按钮。
- 下注金额滑杆。
- 常用快捷金额：1/2 pot、2/3 pot、pot、min raise。

Acceptance Criteria:

- 非法按钮置灰。
- 金额输入不能低于最小加注或高于用户筹码。
- 轮到 AI 行动时，用户按钮不可点击。
- 当前行动玩家座位有清晰高亮。

#### F6. Hand Result and Review

每手结束后展示清楚的结果。

Content:

- 赢家。
- 最终牌型。
- 使用的五张最佳牌。
- 主池和边池分配。
- 每位玩家本手净输赢。
- 本手行动摘要。

Acceptance Criteria:

- 用户不需要读日志也能理解谁赢了、为什么赢。
- 若平分奖池，明确展示平分对象和金额。

#### F7. Settings

首版设置项：

- 玩家人数：3-8。
- 难度：新手、常规、高手。
- 初始筹码。
- 小盲 / 大盲。
- AI 思考速度：真实、快速、极速。
- 音效开关。
- 自动下一手开关。

Future:

- 自定义 AI 风格。
- 自定义头像和昵称。
- 导入训练场景。
- 保存牌局历史。

#### F8. Visual and Interaction Polish

UI 要美观且易读。

Requirements:

- 桌面、牌、筹码、玩家头像有统一视觉风格。
- 所有数字清晰可读，尤其是筹码和下注金额。
- 公共牌、手牌和当前行动不被装饰遮挡。
- 移动端可作为未来适配，首版优先桌面浏览器。
- 动画要服务信息表达，例如发牌、推筹码、赢家高亮。

Acceptance Criteria:

- 1366x768 和 1440x900 桌面尺寸下无关键元素重叠。
- 3 人和 8 人布局都清楚。
- 用户可在 3 秒内看懂轮到谁行动。

### 7.3 Technology

#### Recommended Architecture

- Frontend: React 或 Next.js。
- Backend: Node.js API route / Express / Next.js server actions。
- Game Engine: TypeScript 纯逻辑模块。
- AI Provider: DeepSeek API。
- State: 前端使用轻量状态管理；核心牌局状态由规则引擎生成。
- Persistence: 首版可用 localStorage 保存设置，后续再加数据库。

#### Key Modules

| Module | Responsibility |
| --- | --- |
| Deck | 洗牌、发牌、随机种子 |
| Hand Evaluator | 计算最佳五张牌和牌型排名 |
| Betting Engine | 管理下注轮、最小加注、all-in、边池 |
| Table State | 管理玩家、庄位、阶段、底池、行动顺序 |
| AI Client | 调用 DeepSeek，解析 JSON，处理超时 |
| Prompt Builder | 把当前局面转为 AI 可理解且不泄露隐藏信息的 prompt |
| UI Components | 牌桌、座位、牌、筹码、按钮、设置面板 |

#### DeepSeek API Requirements

- API key 从环境变量读取，建议变量名：`DEEPSEEK_API_KEY`。
- 前端不能直接读取或发送 API key。
- AI 请求必须经过后端代理。
- 请求需要设置超时时间。
- 响应必须做 JSON schema 校验。
- 请求和响应可在开发环境记录日志，但不能泄露用户敏感配置。

#### Determinism and Fairness

AI 负责决策，不负责规则。规则引擎必须保证：

- 牌不会重复。
- 发牌顺序正确。
- 金额不会为负。
- 玩家不能越过行动顺序。
- AI 看不到不该看的手牌。
- 摊牌结果由代码计算，不由 AI 判断。

### 7.4 Assumptions

- 用户首版主要在桌面浏览器使用。
- 用户接受 AI 行动存在 1-3 秒延迟。
- DeepSeek API 已可用，且环境变量已经配置。
- 首版不需要账号系统。
- 首版不需要保存长期牌谱。
- 用户更重视训练体验，而不是完全模拟线上扑克平台的所有细节。
- 使用生成图像做 UI 资产能显著提升沉浸感，但仍需要前端保证布局清晰。

## 8. Release

### MVP Scope

建议首版分成 4 个阶段。

#### Phase 1: Playable Core

Goal: 能完整跑通一手传统德州扑克。

Includes:

- 3-8 人桌设置。
- 洗牌、发牌、盲注、下注轮。
- 用户行动。
- 机器人占位行动接口。
- 摊牌、牌型比较、奖池结算。

Exit Criteria:

- 本地可完成完整牌局。
- 多人 all-in 和边池至少有测试覆盖。

#### Phase 2: DeepSeek AI Bots

Goal: 所有机器人行动都由 DeepSeek API 生成。

Includes:

- AI prompt builder。
- DeepSeek API client。
- JSON schema 校验。
- 三档难度。
- 非法动作纠正和失败回退。

Exit Criteria:

- 3、6、8 人桌均可连续完成 20 手牌局。
- AI 不会提交破坏规则状态的动作。

#### Phase 3: Polished Table UI

Goal: 形成美观、可练习的桌面体验。

Includes:

- image2 / image generation 生成牌桌、筹码、牌面、头像资产。
- 响应式座位布局。
- 行动按钮、下注滑杆、快捷下注。
- 发牌和推筹码动画。
- 赢家高亮和结算弹层。

Exit Criteria:

- 3 人和 8 人布局都清晰。
- 关键金额和状态可读。
- UI 不出现明显遮挡或错位。

#### Phase 4: Training Quality

Goal: 让产品更像训练工具，而不是只是一张能玩的牌桌。

Includes:

- 手牌摘要。
- 每手净输赢。
- 简短行动历史。
- 设置持久化。
- AI 思考速度选项。

Exit Criteria:

- 用户能通过结果面板理解本手牌发生了什么。
- 重新打开后保留上次设置。

### Out Of Scope For V1

- 真人联网对战。
- 真钱、充值、提现、排行榜。
- 锦标赛模式。
- 账号系统。
- 云端牌谱库。
- 移动端深度适配。
- AI 教练实时提示。
- 语音聊天或多人社交。

### Future Opportunities

- 牌谱保存和回放。
- AI 教练模式：结束后点评用户关键决策。
- 自定义 AI 玩家性格。
- 指定训练场景，例如短码全下、翻牌圈 c-bet、防守大盲。
- 锦标赛盲注结构。
- 本地统计面板：VPIP、PFR、3-bet、盈利曲线。
- 多模型对比：不同 AI provider 作为不同风格对手。

## Open Questions

- 首版要做成纯本地 Web、桌面 App，还是之后封装为 Electron？
- AI 是否需要展示“思考理由”，还是只展示行动？
- 用户是否希望设置 AI 的具体风格，例如松凶、紧凶、鱼、职业玩家？
- 初始筹码和盲注是否固定默认值，例如 100BB，即 1000 筹码 / 5-10 盲注？
- 是否需要保存牌局日志到本地文件，方便后续复盘？

## Recommended V1 Defaults

| Setting | Default |
| --- | --- |
| 玩家人数 | 6 |
| 难度 | 常规 |
| 初始筹码 | 1000 |
| 小盲 / 大盲 | 5 / 10 |
| AI 思考速度 | 快速 |
| 自动下一手 | 关闭 |
| API key env | `DEEPSEEK_API_KEY` |

## Success Definition

V1 成功的标准是：用户可以打开模拟器，选择 3-8 人和难度，在一个美观的牌桌上连续练习多手德州扑克；机器人每次决策都来自 DeepSeek；规则引擎稳定保证合法行动和正确结算。
