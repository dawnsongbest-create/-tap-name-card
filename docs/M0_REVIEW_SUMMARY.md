# 「碰一下名牌」M0 人工审核摘要

> 版本：M0 v1.1（第二轮严格 Review）｜日期：2026-07-24｜状态：`IN_REVIEW`  
> 审核目标：确认规划可进入 M1；本文件不授权自动开始 M1。

## 1. 产品理解

产品不是电子名片 CRM、陌生人匹配或站内社交网络，而是一件帮助现实社交表达和破冰的“社交玩具”。首要价值是让用户提前整理并漂亮地呈现自己，在合适场景主动递出。浏览者无压力地完整阅读，再决定是否明确递出自己的名牌。

设计不变量：

- 匿名浏览完整公开名牌，不登录、不建号、不通知主人、不追踪身份。
- 收藏是静默单向保存，和认识请求完全独立。
- 认识请求明确递出一张已发布名牌，但不自动收藏、不产生相遇。
- 名牌主人唯一接受方式是服务端原子“接受并回赠”。
- 只有请求进入 `RETURNED` 才产生双方私密相遇。
- 相遇后才可申请联系方式，双方分别选择，接收方明确确认。
- 不建设聊天、推荐、匹配、关注、粉丝、信息流、排行、访客追踪和 CRM。

## 2. MVP 核心闭环

```text
创建两类名牌 → 草稿/预览/审核/不可变公开快照
→ 微信分享/小程序码/视觉图片
→ 对方匿名完整浏览
→ [可选] 静默收藏
→ 登录并选择自己的已发布名牌“递出”
→ PENDING（无收藏、无相遇）
→ 名牌主人选择一张已发布名牌“接受并回赠”
→ RETURNED + pairKey 唯一 ACTIVE 相遇 + 双方历史快照
→ 请求方选择自己愿给的联系方式
→ 接收方选择自己愿给的联系方式并确认
→ ACCEPTED，只返回双方各自选定项
→ 可撤销小程序内展示；拉黑/注销立即关闭互动与敏感读取
```

## 3. 文档清单

| 文件 | 主要内容 | 审核焦点 |
|---|---|---|
| `MVP_SCOPE.md` | P0/P1/P2、边界、完成定义、阻断项、主映射 | 范围是否准确 |
| `ARCHITECTURE.md` | 原生小程序/CloudBase 分层、适配、事务、环境、风险 Spike | 轻量方案和验证点 |
| `DATA_MODEL.md` | 15 集合、字段/权限/索引/状态/留存/唯一替代 | 隐私与一致性 |
| `API_SPEC.md` | PRD 31 全部函数、重点接口、失败行为 | 原子回赠与字段投影 |
| `UI_SPEC.md` | P01—P26 逐页规格和完整状态 | 匿名流程、P1/P2 隐藏 |
| `TEST_PLAN.md` | 自动/集成/页面/真机/A-B 脚本/阻断 | 是否可实际验收 |
| `TASKS.md` | M0—M5 可执行任务，依赖/范围/验收/测试/风险 | 顺序与状态真实 |
| `DECISIONS.md` | 19 条 ADR | Proposed/待验证项 |
| `M0_REVIEW_SUMMARY.md` | 审核入口 | 是否批准进入 M1 |

## 4. P0 汇总

- 账号：微信身份、协议/隐私、账号状态、注销、拉黑/举报、云函数鉴权。
- 创建：SOCIAL/RESUME、六模板、草稿恢复、模块/图片、实时和完整预览、多卡、当前卡。
- 发布：内容审核适配、首发/新版状态、审核失败定位、不可变快照、旧版继续公开。
- 浏览/分享：匿名 P11、固定/当前分享、小程序码、三比例 Canvas、收藏。
- 社交：认识请求发/收/拒绝/取消/过期；原子回赠；相遇、共同点、备注。
- 联系：本人联系人、申请/接受/拒绝/撤回/撤销/冷却、严格共享读取。
- 通知/安全：小程序内通知、拉黑、举报证据、注销后历史快照。
- 质量：权限、幂等、事务失败、弱网、页面状态、开发者工具、staging、iPhone、Android。

明确不在 P0：AI、用户新增相遇事件/相遇分享、订阅消息、NFC、自由编辑器。

## 5. 页面 / 接口 / 数据映射

| 域 | 页面 | 接口 | 数据 |
|---|---|---|---|
| 身份 | P01/P23/P25 | authEnsureUser/accountGetMe/accountDelete | users |
| 创建发布 | P02—P07/P09/P10/P19/P22 | template*、card*、contact*Mine | cards/snapshots/contacts/notifications |
| 公开分享 | P01/P11/P18 | cardGetPublicByToken/shareGenerateMiniCode | cards/snapshots |
| 收藏 | P11/P20 | collection* | collections/snapshots |
| 请求/回赠 | P12—P14/P21 | greeting* | greetings/snapshots/notifications/blocks |
| 相遇 | P15/P16 | encounter*（不含 P1 addEvent） | encounters/events/notes/snapshots |
| 联系交换 | P16/P17/P22/P21 | contactRequest*/contactGetShared | contacts/contact_requests/encounters/blocks/notifications |
| 安全 | P11/P13/P16/P23/P24 | safety*、accountDelete | blocks/reports 及关联集合 |
| P1/P2 | P08/P26 | aiAssist* / nfc* | ai_usage / nfc_devices |

详细到函数和页面状态的映射分别见 API_SPEC、UI_SPEC、TEST_PLAN、TASKS。

## 6. PRD 歧义与处理

| 项 | 来源差异 | M0 临时处理 | 需要确认时点 |
|---|---|---|---|
| 举报登录 | 8.1 匿名可举报；7.2 P24 标需登录 | 匿名看入口，提交时 P25 登录后返回 | M1 前 |
| 联系方式撤销 | “任一方撤销展示”未说明单方/双方 | `REVOKED` 后双方停止小程序内读取 | M4 前 |
| 当前卡双存 | users.currentCardId 与 cards.isCurrent | users 字段权威，cards 为镜像 | M1 事务 Spike 后 |
| HIDDEN_FOR_USER | 附录像 encounter 状态，逻辑模型 status 无此值 | `hiddenForUserIds` 做每方视图，关系仍 ACTIVE | M4 前确认 |
| 注销/通知等保留期限 | 要求依法/平台规则处理，未给期限 | 不虚构期限；作为上线合规决策 | M5 上线前 |

这些歧义不改变已明确的核心规则，不阻塞 M0；相关 ADR 已记录。

第二轮 Review 已将“同一对用户反向 PENDING”从待定项收紧为确定规则：依据 PRD 18.2，同一用户对无论方向只能存在一个有效 `PENDING`，通过 `pendingPairKey` 实现，但绝不因此创建匹配或相遇。

## 7. 阻塞问题

当前没有阻塞 M0 文档完成的问题。

进入相关实现 Sprint 前的阻断验证：

1. CloudBase 当前事务、条件更新、唯一索引/唯一语义能力是否足以实现原子回赠和当前卡。
2. 匿名小程序路由是否能在真机避免自动登录/建号。
3. 内容审核能力、适用对象、异步结果和失败定位。
4. 固定/当前名牌分享参数与小程序码真实链路。
5. Canvas 2D 六模板跨 iOS/Android 的字体、Emoji、长文本和保存。

若上述 Spike 不能满足产品不变量，应停在对应 Sprint 更新 ADR，而不是绕过规则。

## 8. 非阻塞问题

- 正式产品名、Logo、品牌视觉、水印形式。
- AI 助手角色名、首次公开测试活动、长期免费策略。
- NFC 供应商/实体结构、运营审核后台最终形态。
- P1 的共同兴趣增强、相遇分享、订阅消息和轻动画细节。
- 上述第 6 节歧义（需在指定时点确认）。

## 9. 平台验证清单

- [ ] 微信小程序匿名冷启动/热启动、互动时登录、协议确认。
- [ ] 云函数事务、跨集合写、条件更新、唯一索引/占位键并发行为。
- [ ] 云数据库/存储安全规则和私密文件临时访问。
- [ ] 内容安全：文本、图片、链接、二维码、异步审核、错误定位。
- [ ] 分享卡片：固定名牌/当前名牌参数、好友/群、失效入口。
- [ ] 小程序码：scene 参数、生成频率、文件生命周期、扫码真机。
- [ ] Canvas 2D、字体、Emoji、图片临时地址、低内存、三比例。
- [ ] iOS/Android 相册授权、拒绝、设置引导和保存结果。
- [ ] 后台/杀进程/断网的本地草稿持久化与同步。
- [ ] NFC 唤起仅 P2 验证，不阻塞 MVP。

验证只使用当时最新官方文档和真实设备，不在规划中虚构 API。

## 10. M1 推荐起点

人工批准 M0 后，从 TASKS 的 `M1-01 原生工程初始化` 开始，单独执行 M1.1：

1. 固定微信开发者工具、基础库、Node/TypeScript 与测试基线。
2. 初始化原生小程序目录和 shared/cloudfunctions/tests 空骨架。
3. 建立四环境 example 配置、密钥禁入和最小 README。
4. 运行真实格式、类型、测试和开发者工具导入验证。
5. 停止并人工验收 M1.1，不同时实现身份或名牌业务。

M1-02 前优先完成匿名路由与 CloudBase 唯一/事务 Spike。

## 11. 本轮未执行

- 未初始化微信小程序或任何工程骨架。
- 未创建数据库、云环境、云函数、页面、组件或 mock 产品。
- 未安装 npm 依赖，未写 TypeScript/WXML/WXSS/业务代码。
- 未调用微信、CloudBase、AI、NFC、审核、小程序码或分享能力。
- 未执行 M1—M5，未将任何后续任务虚报完成。
- 未进行开发者工具、staging、iPhone 或 Android 验证；这些属于后续里程碑。

## 12. 跨文档一致性结果

- 范围：AI 始终为 P1；NFC 始终为 P2；订阅消息和相遇事件增强未进 P0。
- 状态：Greeting 统一为 `PENDING/RETURNED/DECLINED/CANCELLED/EXPIRED`；无 ACCEPTED；只有 RETURNED 创建 encounter。
- 隐私：公开快照与草稿/联系人分离；匿名浏览不建号；备注仅 owner。
- 唯一：requestKey、pairKey、collectionKey、blockKey、当前卡均有唯一语义与 CloudBase 替代。
- 页面：P01—P26 已覆盖；P08/P26 P0 隐藏；P11 主按钮固定“认识一下”。
- API：PRD 31.2 全函数已列；重点 11 个接口有详细规则。
- 测试：所有 P0 域均有自动、手工和对应真机验收；A/B 脚本含预期集合状态。
- 任务：M0 三项为 DONE；M1-01 为 READY；其余 M1—M5 未虚报。

## 13. 第二轮 Review 修正记录

- 将认识请求防重从“同方向”修正为“同一对用户无论方向”，并同步架构、数据键、API、任务和测试。
- 删除 `cardGetPublicByToken` 的错误“非拉黑才可见”前置；公开名牌仍可匿名浏览，拉黑只关闭互动与敏感读取。
- 明确 `greetingDecline` 不创建 PRD 未列出的通知类型，发起方从已发列表查看中性结果。
- 明确已有 encounter 再次收到 RETURNED 时不覆盖首次历史快照；本轮快照保留在 greeting。
- 补全拉黑/解除闭环：拉黑撤销已接受联系方式的站内展示；解除仅在双方无 block 时恢复 encounter ACTIVE，不恢复旧请求/共享。
- 将完整 `accountDelete` 从 M1 身份任务移回 M4-05，避免在相关集合尚未实现时制造不完整注销。
- 再次确认 Greeting 无 `ACCEPTED`；文档中的 `ACCEPTED` 仅用于 ContactRequest。

结论：M0 规划文档已完整生成，现停止在人工审核门。未经人工批准，不开始 M1。
