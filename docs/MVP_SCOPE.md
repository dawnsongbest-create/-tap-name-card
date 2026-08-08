# 「碰一下名牌」MVP 范围基线

> 版本：RB-01 Fast-track Rebaseline v1.0
> 日期：2026-08-08
> 状态：`READY_FOR_REVIEW`
> 产品事实来源：`PRD.md`；执行规则来源：`DEVELOPMENT_PLAN.md`
> 关联文档：[架构](./ARCHITECTURE.md)｜[数据模型](./DATA_MODEL.md)｜[接口](./API_SPEC.md)｜[页面](./UI_SPEC.md)｜[测试](./TEST_PLAN.md)｜[任务](./TASKS.md)｜[决策](./DECISIONS.md)

## 1. 产品一句话

一款面向手机的可视化自我介绍与线下破冰微信小程序：用户创建代表自己的名牌，通过微信原生分享和 deep link 递给别人；对方可无压力匿名浏览，明确递出自己的名牌后，双方通过“接受并回赠”形成私密相遇，再各自选择是否交换联系方式。小程序码与视觉导出是 Post-launch enhancement。

## 2. Fast-track 交付基线

### 2.1 Launch Catalog

| Template ID | 名称 | 首发状态 |
|---|---|---|
| `T-SOCIAL-01` | Apple Minimal | `DELIVERED` |
| `T-SOCIAL-02` | Magazine | `DELIVERED` |

以下模板为 `POST_MVP_DEFERRED`：`T-SOCIAL-03` Scrapbook、`T-SOCIAL-04` Anime Role、
`T-RESUME-01` Professional、`T-RESUME-02` Project Portfolio。延期不等于删除；六个稳定
template ID、六份 TemplateDefinition、六条 registry entry、六个 renderer binding/shell
和 architecture regression tests 全部继续保留，底层 registry 不缩减为两模板。

### 2.2 两个 Gate

| Gate | 必须完成 | 验证目标 |
|---|---|---|
| ALPHA | Gallery → Preview → Select → Editor → Draft → Publish → Share → Anonymous View | 用户是否愿意创建、发布、分享名牌 |
| FIRST MVP LAUNCH | Alpha + Greeting → Return → Encounter → Contact Exchange；安全、审核、隐私、production CloudBase、双平台、发布卫生和微信审核 | 可安全完成真实社交闭环并上线 |

### 2.3 Fast-track 简化

- Draft：本地 autosave、明确 saved/saving/failed、登录 owner 云草稿、kill/relaunch 恢复、
  basic revision protection、幂等保存。多设备 merge UX、复杂 recovery copy、协作式冲突
  处理不阻塞 Alpha。
- Social：Greeting → Return → Encounter → Contact Exchange 优先。Collection 保持静默、
  单向、私密且独立，可排在 First MVP 后段或 Post-launch，不得与 Greeting 合并。
- Sharing：首发只要求微信原生分享 → deep link → 匿名公开名牌。小程序码和 1:1、3:4、
  9:16 视觉导出均为 Post-launch。
- `CLOUDFUNCTION_ISOLATED_GATE = KNOWN_ENVIRONMENT_LIMITATION`，不阻塞 RB-01、FT-01 或
  当前 MVP development；RB-01 不重新处理 Node 20。

## 3. MVP 验证假设

| ID | 假设 | P0 可观察证据 | 失败信号 |
|---|---|---|---|
| H1 | 表单 + 实时预览能让用户完成一张“像自己”的名牌 | 第一张名牌创建、预览、发布完成率；主观评分 | 大量草稿停留、用户认为模板无法表达自己 |
| H2 | 匿名完整浏览降低社交压力 | 匿名公开页可完整打开；互动前无登录 | 首屏登录流失、用户担心浏览被追踪 |
| H3 | 主动递牌比直接索要联系方式更自然 | “认识一下”发起率、接受并回赠率 | 用户不理解递出/回赠，误以为已加好友 |
| H4 | 只有回赠后形成相遇能建立双方知情 | `RETURNED` 与相遇创建一一对应 | 浏览、收藏或 `PENDING` 意外产生相遇 |
| H5 | 双方分别选择联系方式能带来安全感 | 联系申请通过率；只返回双方选定项 | 未确认信息泄露、用户误以为全部自动共享 |
| H6 | 微信原生分享与匿名公开入口能带来自传播 | 主动分享率、deep link 匿名打开成功率 | 真机打开失败、用户不愿分享 |
| H7 | 轻量架构足以支撑数百至数千早期用户 | 核心写操作一致、可观测、可恢复 | 并发造成重复请求/相遇或权限越界 |

## 4. 范围矩阵

### 4.1 完整需求库存与 Gate 覆盖

下表保留完整功能库存。是否阻塞 Alpha / First MVP Launch，以第 2 节为准；表内历史 `P0`
不得解释为所有能力必须同时首发。

| 能力域 | 完整 P0 清单 | 核心验收 |
|---|---|---|
| 账号与安全 | 微信身份识别、协议/隐私确认、账号状态、注销、拉黑、举报、基础内容审核、关键写操作云函数鉴权 | 匿名浏览不建账号；受限账号不能发布/互动；注销后公开 Token 失效 |
| 名牌创建 | Launch Catalog 社交名牌、先选模板、表单实时预览、模块组合、简化草稿、完整预览、发布与公开快照 | Apple / Magazine 可用；草稿不静默丢失；发布前服务端校验；公开只读审核通过快照 |
| 模板架构 | 2 个首发正式视觉 + 4 个延期模板的稳定定义、registry、binding/shell；L1/L2；模板版本 | 首发只展示 Apple / Magazine；六模板架构不退化；无未授权字体或角色素材 |
| 浏览与分享 | 匿名完整浏览、微信原生分享、deep link、举报入口；码/视觉导出 Post-launch | 不登录即可完整浏览；不通知主人；公共响应无 OpenID/草稿/私密联系方式 |
| 认识请求 | 选择已发布名牌递出、收到/发出列表、详情、取消、拒绝、30 天过期、通知 | 不自动收藏；不创建相遇；无聊天/已读；同一对用户无论方向至多一个有效 `PENDING` |
| 回赠与相遇 | “接受并回赠”单一原子动作、相遇册、双方不可变快照、标准标签共同兴趣、私人备注、对自己隐藏 | 只有 `RETURNED` 创建相遇；`pairKey` 唯一；重复点击无重复记录/通知 |
| 联系方式 | 联系方式管理；相遇后申请；请求方、接收方各自选择；接受/拒绝/撤回/撤销；7 天默认冷却（服务端配置） | `ACTIVE` 相遇前不可申请；未选项不返回；撤销后小程序内停止展示 |
| 通知 | 小程序内：认识请求、回赠、联系方式申请/通过/未通过、审核结果 | 不通知浏览和收藏；不显示已读给请求对方；点击到明确业务页 |
| 质量 | 权限、幂等、事务、错误映射、完整页面状态、弱网、真机、production、上线材料 | First MVP Launch 前 iPhone、Android、开发者工具和 production 候选闭环通过 |

### 4.2 Post-launch enhancement

- AI 表达助手（三种模式、最多三个候选、用户确认后写入、最小上下文）。
- 更丰富且可解释的共同兴趣映射。
- 相遇事件时间线增强与用户新增事件。
- 单次相遇视觉图片分享。
- 微信订阅消息（小程序内通知仍是 P0）。
- 更完整无障碍、模板轻动画、轻量审核工具、更多导出主题。
- 小程序码与 1:1、3:4、9:16 视觉导出矩阵。
- Collection（若 launch validation 不要求）。

### 4.3 Post-MVP：不阻塞首次上线

- NFC 贴片实际绑定、当前名牌/固定名牌模式、电子吧唧/工卡/卡套。
- Scrapbook、Anime Role、Professional、Project Portfolio、Resume Editor。
- 其他更多模板、L3 自由创作、活动模板、用户共创模板。
- H5 公开名牌、简历 PDF 链接、多端产品。

### 4.4 第一版明确不做

- 陌生人推荐、附近的人、滑动/恋爱匹配。
- 站内聊天、私信、文字/表情/语音回复。
- 动态广场、推荐信息流、点赞、公开评论。
- 关注、粉丝、公开社交关系、浏览量、访客身份追踪、人气与排行榜。
- 企业员工管理、销售 CRM、广告、会员、模板商城。
- 自动添加微信好友、读取好友/通讯录、实时位置和精确地图定位。
- 用户上传字体、视频背景、背景音乐、完整自由画布、大规模推荐算法/数据仓库。
- 未经独立 Gate 批准的范围扩张。

## 5. Gate 交付边界

### 5.1 页面

Alpha 覆盖 Launch Catalog 的 Gallery / Preview / Select、社交编辑、Draft、Publish、Share、
Anonymous View。First MVP Launch 增加 P12—P17 的 Social Loop 与安全/发布页面。P07
Resume Editor、P18 视觉导出、P20 Collection（若不参与 launch validation）、P08 AI 和
P26 NFC 均不阻塞前述 Gate。详见 [UI_SPEC.md](./UI_SPEC.md)。

### 5.2 云函数

Alpha 只实现 Card / Draft / Publish / Anonymous View 所需服务端边界；微信原生分享不新增
小程序码云函数。First MVP Launch 再加入 Greeting / Return / Encounter / Contact / Safety。
`collection*` 可后置，`shareGenerateMiniCode`、AI、视觉导出和 NFC 均为 Post-launch。
详见 [API_SPEC.md](./API_SPEC.md)。

### 5.3 数据集合

按 Gate 按需建集合：Alpha 使用身份、cards 与 snapshots；First MVP Launch 增加 greetings、
encounters、contacts、notifications、blocks、reports 等核心集合。`collections` 仅在 Collection
进入交付 Gate 时创建；`ai_usage`、`nfc_devices` 继续只规划。详见 [DATA_MODEL.md](./DATA_MODEL.md)。

## 6. 页面—接口—数据—测试主映射

| Gate 能力 | 页面 | 关键接口 | 集合 | 核心测试 |
|---|---|---|---|---|
| 身份/账号 | P01、P02、P23、P25 | `authEnsureUser`、`accountGetMe`、`accountDelete` | users、cards、blocks | 匿名不建号、重复建号幂等、注销 Token 失效 |
| 模板/创建 | P03—P07、P09、P10、P19 | `template*`、`cardCreate`、`cardUpdateDraft`、`cardSubmitReview`、`cardSetCurrent` | cards、card_snapshots、notifications | 字段上限、切换不丢内容、审核版本隔离 |
| 公开浏览 | P01、P11、P25 | `cardGetPublicByToken` | cards、card_snapshots | 匿名完整浏览、响应字段白名单、不可用状态；拉黑只关闭互动，不把公开浏览变成私密页 |
| Alpha 分享 | P02、P10、P11 | 微信原生分享 + `cardGetPublicByToken` | cards、card_snapshots | deep link、匿名打开、无登录/通知 |
| Post-launch 码/图片 | P18 | `shareGenerateMiniCode` | cards、card_snapshots | 三比例、六模板、真机保存、无码降级 |
| 可后置 Collection | P11、P20 | `collectionList/Add/Remove` | collections、card_snapshots | 静默、独立、重复提交、失效快照 |
| 认识请求 | P11—P14、P21 | `greeting*` | greetings、notifications、card_snapshots、blocks | 不自发、不重复、不收藏、不提前相遇、过期 |
| 相遇 | P15、P16 | `encounter*` | encounters、encounter_events、encounter_notes | `RETURNED` 唯一路径、`pairKey`、备注隔离 |
| 联系方式 | P16、P17、P22、P21 | `contact*`、`contactRequest*` | user_contacts、contact_requests、notifications | `ACTIVE` 前置、双方选择、越权、撤销、冷却 |
| 安全 | P11、P13、P16、P23、P24 | `safetyBlock/Unblock/Report` | blocks、reports、greetings、encounters | 拉黑关闭互动、举报证据快照、无对方通知 |

## 7. First MVP Launch 完成定义

以下条件必须同时满足：

1. 微信开发者工具、至少一台 iPhone、一台 Android 和 production 候选云环境可运行。
2. Apple Minimal 与 Magazine 均可创建、恢复草稿、预览、审核和发布。
3. 未登录用户可完整浏览，不自动建账号、不通知主人。
4. 微信原生分享通过 deep link 打开正确匿名公开名牌。
5. A、B 两个账号可完成递出、原子回赠、相遇、联系方式申请与确认。
6. Collection 若尚未交付，不影响 Social Loop；其既有定义仍与 Greeting 完全独立；只有 `RETURNED` 创建相遇。
7. 重试与并发不产生重复用户、待处理请求、相遇或联系方式状态迁移。
8. 草稿、待审核内容、公开快照相互隔离；旧公开版本在新版审核期继续可见。
9. 用户不能读取他人的私密联系方式或私人备注；拉黑和举报可用。
10. 注销后所有公开入口和联系方式立即不可用，必要安全留存遵循规则。
11. 所有进入 First MVP Launch Gate 的自动化与手工验收通过，文档与实现一致，无未说明的 mock 或真机缺口。

## 8. 上线阻断项

- 匿名公开浏览被强制登录或触发账号创建。
- 联系方式未经接收方确认、返回未选项，或撤销后仍可读取。
- 浏览/收藏产生通知、请求或相遇。
- 非 `RETURNED` 状态产生相遇；重复请求、相遇或通知。
- 草稿频繁丢失；审核中内容覆盖旧公开快照；未审核内容公开。
- 可读取/修改他人私密数据、备注、草稿或内部身份字段。
- 明显脚本注入、恶意链接、上传或内容审核风险。
- iOS 或 Android 不能完成核心闭环；微信原生分享/deep link 错误；Launch Catalog 公开渲染严重错位。
- 拉黑后仍可互动；注销后名牌或联系方式仍公开。

## 9. 非阻塞项

- 正式产品名、Logo/品牌视觉、产品水印最终形式。
- AI 助手名称、首次公开测试活动、长期免费策略。
- NFC 供应商和实体结构。
- 运营审核后台最终形式。
- P24 的匿名“可举报”与页面清单“需登录”的落地交互；M0 暂按“匿名可见举报入口，提交时登录”设计，待产品确认。
- 联系方式一方撤销后是否双方同时不可见；M0 采用更保守的“双向停止展示”，待产品确认。
- `CLOUDFUNCTION_ISOLATED_GATE` 的 Node 20 环境限制；状态为 `KNOWN_ENVIRONMENT_LIMITATION`。
- Collection、小程序码、视觉导出矩阵和四套延期模板的 Post-launch 排期。

上述事项不阻塞 RB-01、FT-01 或当前 MVP development；详见 [DECISIONS.md](./DECISIONS.md)。

## 10. 边界检查表

- [x] 匿名浏览完整公开名牌，不自动登录、不通知主人、不追踪访客身份。
- [x] 收藏静默单向，和认识请求使用不同接口、集合、状态与任务。
- [x] 认识请求必须递出一张已发布名牌，不自动收藏、不创建相遇。
- [x] 不存在单独接受接口/状态；`greetingReturnCard` 是服务端原子动作。
- [x] 只有 `RETURNED` 创建 `ACTIVE` 相遇，且 `pairKey` 唯一。
- [x] 联系方式只在 `ACTIVE` 相遇后申请，并由双方各自选择。
- [x] Launch Catalog 仅 Apple / Magazine，六模板底层 registry 与架构回归继续保留。
- [x] 微信原生分享/deep link/匿名公开页阻塞首发；码与视觉导出不阻塞。
- [x] Collection 不阻塞核心 Social Loop，且永远不与 Greeting 合并。
- [x] AI 与 NFC 为 Post-launch，不阻塞首次上线。
- [x] 无聊天、推荐、匹配、关注、粉丝、信息流、排行和访客追踪。
- [x] 仅采用微信原生小程序 + 微信云开发/CloudBase 轻量方案。
- [x] 未确认平台能力均标为官方文档与真机待验证。
