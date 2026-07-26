# 「碰一下名牌」MVP 技术架构

> 版本：M1.2 final v1.0｜日期：2026-07-27｜状态：`DONE`
>
> 约束：M1.2 身份领域层、CloudBase 平台适配和真实 development 主链路已通过验收；
> RESTRICTED/DELETED 真实状态、双端双账号、精确平台冲突错误和 SDK 上线风险保留为后续验证。
>
> 关联：[范围](./MVP_SCOPE.md)｜[数据](./DATA_MODEL.md)｜[接口](./API_SPEC.md)｜[测试](./TEST_PLAN.md)｜[决策](./DECISIONS.md)

## 1. 架构目标与非目标

目标：

- 支撑数百至数千早期注册用户的 P0 闭环。
- 让客户端专注展示/交互，让服务端控制身份、权限、状态、幂等和隐私。
- 对草稿、审核中内容和公开快照严格隔离。
- 对平台能力使用适配层，失败可降级，未真机验证不宣称完成。
- 共享领域类型、运行时校验、错误码、日志与测试夹具，减少页面/云函数漂移。

非目标：

- 不为未来规模建设 NestJS、PostgreSQL、Redis、消息队列、Kubernetes、微服务或独立账号。
- 不实现多端框架、L3 编辑器、推荐系统、聊天、CRM。
- P0 不依赖 AI、NFC、订阅消息和相遇事件增强。

## 2. 系统上下文

```text
匿名/登录用户
    │
    ▼
微信原生小程序（WXML/WXSS/TypeScript/原生组件/Canvas 2D）
    │ 统一调用层：requestId、运行时校验、错误映射、重试/结果查询
    ▼
微信云开发 / CloudBase
    ├─ 云函数：身份、权限、状态机、事务、幂等、字段过滤
    ├─ 云数据库：业务集合、索引、逻辑删除
    ├─ 云存储：名牌图片、二维码图片（私密访问）
    ├─ 配置/环境变量：限额、冷却、开关、密钥
    └─ 日志/定时任务：审计、请求过期、可观测性
         │
         ├─ 内容审核适配层（P0，能力待验证）
         ├─ 小程序码适配层（P0，能力待验证）
         └─ AI 适配层（P1，关闭）
```

## 3. 客户端分层

| 层            | 职责                                                | 禁止                               |
| ------------- | --------------------------------------------------- | ---------------------------------- |
| `pages/`      | P01—P26 路由、页面状态、用户意图                    | 直接操作数据库、复制业务状态字符串 |
| `components/` | 页面状态、名牌渲染、表单、确认层、可访问交互        | 自行决定权限或业务状态迁移         |
| `domain/`     | 领域类型、状态派生、视图模型、纯函数                | 持有密钥、执行远程写               |
| `services/`   | 云函数调用、上传、分享、审核/码适配客户端、错误映射 | 将内部异常透传 UI                  |
| `state/`      | 会话、当前用户、草稿同步队列、页面缓存              | 作为业务事实唯一来源               |
| `templates/`  | 版本化模板注册、渲染描述、安全默认模板              | 用户上传 CSS/JS/字体               |
| `utils/`      | 时间、Token 展示、文本/图片辅助                     | 隐式业务规则                       |

页面状态统一为 `LOADING | READY | EMPTY | NETWORK_ERROR | FORBIDDEN | NOT_FOUND | REVIEWING | HIDDEN | UNAVAILABLE | RATE_LIMITED`；操作另有 `IDLE | SUBMITTING | SUCCEEDED | FAILED | UNKNOWN_AFTER_TIMEOUT`。超时后先查事实，再重试。

## 4. 云开发服务端分层

每个云函数保持薄入口：

1. 生成/接收 `requestId`，读取可信微信身份。
2. 对输入做运行时 Schema 校验。
3. 调用共享领域服务，校验账号、所有权、拉黑、状态、频率和幂等。
4. 在事务/补偿边界内读写集合。
5. 对响应做字段白名单投影。
6. 写结构化审计日志，返回统一结果。

共享模块建议：

- `auth-context`：OpenID 仅在服务端换算内部 `userId`。
- `validators`：函数输入和每个 `CardModule` 的具体校验器。
- `policies`：所有权、账号状态、拉黑、公开可见性、联系方式可见性。
- `state-machines`：card/greeting/contact/encounter 状态迁移。
- `idempotency`：业务键、请求幂等键、结果重放。
- `repositories`：集合读写与字段投影。
- `transactions`：回赠、设置当前名牌、发布切换、拉黑、注销。
- `errors/logging/config`：错误映射、脱敏日志、服务端配置。

## 5. 共享领域类型

- `shared/types`：API DTO、领域枚举、公共视图；公共 DTO 不得包含 `openId`、私密联系方式、他人备注和草稿。
- `shared/schemas`：输入与持久化边界的运行时验证；不允许未验证的 `Record<string, unknown>` 入库。
- `shared/errors`：PRD 32 章错误码和用户安全文案。
- `shared/constants`：状态、限制默认值的键名；实际频率/冷却/最大名牌数从服务端配置读取。

共享类型是编译期契约，运行时校验是安全边界，两者缺一不可。

## 6. 模板与渲染

- 六个 MVP 模板以仓库内版本化配置注册：四社交、两简历。
- `cardType` 与模板类型必须一致；配置失败回退 `T-SOCIAL-01` 或对应安全简历模板。
- 编辑器、完整预览、公开页和 Canvas 导出共享“内容规范化 + 模板布局描述”，各渲染端只负责适配。
- 模板切换保留全部内容；不支持模块记为 `visible=false` 的兼容展示状态，不删除数据。
- 老快照携带 `templateId + templateVersion`，旧渲染器需兼容；主动升级才迁移。
- 动画不承载必要信息，尊重减少动态效果；版权素材和字体需有授权记录。

## 7. 身份、访问与权限

- P11 公共读取使用随机不可枚举 `shareToken`，不调用 `authEnsureUser`，不创建账号。
- 只有用户主动执行收藏、认识等互动时 P25 才触发微信登录/协议确认。
- 客户端隐藏按钮只是体验；所有写操作及敏感读由云函数二次校验。
- 数据库规则默认拒绝客户端直接写核心集合；私密集合拒绝客户端直读。
- `openId` 只存在 `users` 服务端私有字段和受控日志关联，不进入公共 DTO。
- 被限制用户可读取/导出必要自有数据，但不能发布、认识或申请联系方式。
- `identityKey=HMAC-SHA256(environmentSpecificSecret,"wechat-openid:v1:"+openId)`；
  密钥只存在服务端环境变量，四环境不得复用。
- `identity_mappings/{identityKey}` 只保存 `userId/provider/createdAt`，不保存 OpenID。
- `CurrentUserView.status` 只可能是 `ACTIVE | RESTRICTED`；数据库 `DELETED` 统一返回
  `ACCOUNT_DELETED`，由客户端映射为本地 `DELETED/UNAVAILABLE`。
- `authEnsureUser`、`accountGetMe`、`accountAcceptPolicies` 不要求 `operationId`；
  `requestId` 只用于追踪。政策确认用“同版本已确认”保证幂等。

## 8. 草稿、审核与快照

```text
本地草稿 → cardUpdateDraft → cards.draftContent
                         └→ pendingReviewContent（提交时冻结）
内容审核通过 → 新建不可变 card_snapshots → 原子替换 publishedSnapshotId
内容审核失败 → 保留旧 publishedSnapshotId + 定位 reviewFailure
```

- 编辑已发布名牌不修改公开快照。
- 本地草稿记录 `baseRevision`、设备编辑时间与待同步操作；服务器记录单调 `draftRevision` 和旧版本恢复点。
- 冲突以当前设备最近一次明确编辑为主，但服务端旧版本保留供恢复；冲突规则必须通过 Spike 验证。
- 隐藏/删除使公开入口立即不可用，不删除历史收藏/请求/相遇快照。

## 9. 图片上传与导出

上传：本地预览 → 压缩 → 格式/尺寸校验 → 云存储临时对象 → 内容审核 → 绑定草稿 → 生成/使用不同尺寸。上传失败保留本地选择和重试状态；私密微信二维码与公开名牌图片使用不同存储前缀和访问策略。

导出：客户端 Canvas 2D 优先，生成 1080×1440、1080×1920、1080×1080；仅用户确认后申请保存相册。必须测试中文、英文、Emoji、长文本、六模板、低内存、临时文件与 iOS/Android 差异。小程序码失败时允许导出无码版本。若 Canvas 真机兼容不可接受，再通过 ADR 评估服务端渲染，不先行建设。

## 10. 平台适配层

| 适配层   |   P | 接口语义                                  | 降级                                          |
| -------- | --: | ----------------------------------------- | --------------------------------------------- |
| 内容审核 |  P0 | 文本、图片、链接/二维码的提交与结果归一化 | 发布保持 `REVIEWING` 或明确失败；旧版继续公开 |
| 小程序码 |  P0 | 输入已授权页面/场景参数，返回受控文件引用 | 提示重试；分享链接仍可用；允许无码导出        |
| 微信分享 |  P0 | 固定名牌与当前名牌入口参数                | 复制/展示小程序码等明确兜底，具体能力待验证   |
| 相册保存 |  P0 | 保存授权、拒绝、重试                      | 展示授权说明或仅预览                          |
| AI       |  P1 | 最小上下文、结构化候选、安全状态          | 保留原文，人工编辑；P0 关闭                   |
| NFC      |  P2 | 随机动态入口解析                          | QR 兜底；P0 不实现                            |

不得在验证前写死任何微信/CloudBase API 名称或返回结构。

## 11. 事务与幂等

| 操作         | 边界/业务键                                                                                                 | 结果                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 建用户       | HMAC `identityKey` 确定性映射；user 与 mapping 同一事务；冲突后最多三次退避                                 | 重复/并发调用返回同一用户；耗尽返回 `SERVICE_UNAVAILABLE`                                      |
| 存草稿       | `cardId + ownerId + clientMutationId`、`baseRevision`                                                       | 重放同一修订结果                                                                               |
| 设置当前名牌 | owner 范围事务/锁                                                                                           | 先清旧后设新，始终至多一张                                                                     |
| 收藏         | `collectionKey=ownerId:cardId`                                                                              | upsert/恢复，不重复                                                                            |
| 发认识请求   | `requestKey` 保证单次操作幂等；排序双方 ID 的 `pendingPairKey` 占位                                         | 同一对用户无论方向至多一条有效 `PENDING`                                                       |
| 接受并回赠   | `greetingId + operationId`；请求、快照、相遇、通知一个原子边界                                              | 仅一次 `RETURNED`、一个 `pairKey`、一组通知                                                    |
| 联系申请     | `encounterId + requester + active-cycle`                                                                    | 至多一个有效 `PENDING`                                                                         |
| 接受联系方式 | `contactRequestId + operationId`                                                                            | 只保存双方选定 ID，结果可重放                                                                  |
| 拉黑/解除    | `blockKey=blocker:blocked`；关闭待处理请求、释放 greeting 的 pendingPairKey，并撤销已接受的站内联系方式展示 | 重复安全；不通知被拉黑者；解除后仅在双方均无 block 时恢复 encounter ACTIVE，不复活旧请求或共享 |
| 注销         | M4 再确定幂等/恢复键                                                                                        | 公开入口和私密读取先失效，后台清理可恢复执行                                                   |

若 CloudBase 当前能力不能提供所需跨集合事务/严格唯一索引，使用“确定性业务键文档 + 锁/占位文档 + 条件更新 + 事务内复查 + 冲突后读取胜者”的替代方案；能力与限制必须在 M1/M4 Spike 用官方文档和并发测试确认。

## 12. 缓存

- 可缓存：模板配置、公共快照只读 DTO、列表首屏、低清图片；键包含 `snapshotId/templateVersion`。
- 不缓存或短时受控缓存：联系方式、他人备注、账号/拉黑状态、待处理请求。
- 公开快照以不可变 ID 便于长期缓存；`shareToken → snapshotId` 映射在隐藏/删除/注销时必须立即失效。
- 返回页面可先展示本地缓存再刷新；任何写操作以服务端结果为准。

## 13. 错误、重试与降级

- 云函数只返回 `CloudFunctionResult<T>`；内部异常映射为安全错误码。
- 自动重试仅用于可安全重放的读操作或带幂等键的写操作，使用有限退避。
- 写超时标为“结果未知”，先用查询接口确认，不盲目二次提交。
- 上传失败保留本地文件；审核失败定位字段/图片类别；AI 不阻塞；小程序码失败允许无码；缓存失败回源。
- 页面必须覆盖加载、空、网络失败、无权限、不存在、审核中、隐藏、频率限制和内容不可用。

## 14. 日志与埋点

服务端日志字段：`requestId`、函数、环境、内部用户 ID（脱敏/受控）、资源 ID、幂等键摘要、前后状态、结果码、耗时；不得记录完整 OpenID、联系方式、二维码原图、密钥、完整 AI 输入或响应堆栈。

客户端埋点使用 PRD 第 36 章事件；匿名 `public_card_opened` 仅做汇总来源，不建立可供主人查询的访客身份记录。安全审计和产品分析分开存储与授权。

## 15. 环境与密钥

| 环境          | 用途                         | 数据                      |
| ------------- | ---------------------------- | ------------------------- |
| `local`       | 纯函数/组件/模拟适配器测试   | 合成数据，不连接生产      |
| `development` | 开发者联调                   | 独立云数据库/存储/配置    |
| `staging`     | 双账号、审核、分享、真机验收 | 可重置测试数据            |
| `production`  | 小范围正式发布               | 最小权限、审计、备份/恢复 |

四套环境不得共用数据库、存储、微信配置、AI 密钥、审核/小程序码配置、日志或测试数据。
AppID 和 EnvId 是环境标识，允许提交；AppSecret、HMAC/AI Key 仅在云端受控环境变量，
客户端包内无服务端密钥。当前 development 使用 AppID `wxc061682046272324` 和 EnvId
`cloud1-d1gh2crj26320f882`，其余环境仍关闭。

服务端配置键至少包括：内容审核开关、小程序码开关、AI/P1、NFC/P2、订阅消息/P1、每用户名牌上限、认识频率、请求有效期、联系方式冷却、上传限制。

## 16. 当前仓库树（M1.2 final）

```text
tap-name-card/
├─ AGENTS.md
├─ README.md
├─ package-lock.json
├─ project.config.json
├─ project.private.config.json.example
├─ package.json
├─ tsconfig.json
├─ eslint.config.mjs
├─ prettier.config.mjs
├─ vitest.config.ts
├─ tools/
│  └─ sync-miniprogram-shared.mjs
├─ miniprogram/
│  ├─ app.ts / app.json / app.wxss
│  ├─ sitemap.json
│  ├─ pages/foundation/
│  ├─ components/page-state/
│  ├─ shared/（由根 shared/ 生成的运行时镜像）
│  ├─ config/ services/ state/
│  ├─ domain/ templates/ utils/ constants/ assets/
├─ cloudfunctions/
│  ├─ authEnsureUser/ accountGetMe/ accountAcceptPolicies/
│  └─ shared/
│     ├─ auth/ db/
│     └─ contracts/（由根 shared/ 生成）
├─ shared/
│  ├─ types/ errors/ constants/ validation/ logging/
├─ tests/
│  ├─ unit/
│  └─ integration/
└─ docs/
   ├─ PRD.md DEVELOPMENT_PLAN.md MVP_SCOPE.md ARCHITECTURE.md
   ├─ DATA_MODEL.md API_SPEC.md UI_SPEC.md TEST_PLAN.md
   ├─ TASKS.md DECISIONS.md
```

M1.2-B 在 M1.2-A 身份领域层上增加平台适配，并已完成真实 development 验收：

- `pages/foundation` 明确标记为工程初始化页，不是正式 P02 首页或产品原型。
- `components/page-state` 只演示 Loading、Empty、Error 和 Retry 最小接口；完整页面状态体系仍属于后续 Sprint。
- `cloudfunctions/` 有 CloudBase Repository、可信上下文适配和三个 `exports.main` 构建入口；
  `esbuild` 将内部 shared 源打进每个 `index.js`，部署包不跨函数目录引用。
- development 显式启用真实 EnvId；local/staging/production 关闭。App 启动只初始化
  `wx.cloud`，不调用身份函数。
- 微信开发者工具配置采用 `miniprogramRoot`、`cloudfunctionRoot`、原生 `typescript`
  编译插件和真实 AppID；目录识别、TypeScript/WXML/WXSS 编译及页面注册已通过
  M1.1、M1.2-A 和 M1.2-B 人工验收。
- 微信侧和云函数侧都不跨运行时根目录导入：根 `shared/` 是契约唯一源，
  `miniprogram/shared/` 与 `cloudfunctions/shared/contracts/` 是生成镜像；
  `shared:sync` 负责同步，静态质量命令通过 `shared:check` 阻止漂移。
- foundation 页面只提供手动身份探针；应用启动不调用三个身份函数，保证匿名浏览边界。
- `wx-server-sdk@4.0.2` 只负责微信云函数初始化和按每次调用执行
  `getWXContext()`，投影可信 `OPENID/APPID`；不从 `event` 或普通函数 `context` 推断身份，
  不缓存进程级动态身份。
- `@cloudbase/node-sdk@3.18.3` 只负责数据库与事务；Repository 使用 Node SDK 的
  `set(data)/update(data)` 扁平数据参数，不混用小程序端 `{data}` 包装。
- 两个直接 SDK 和 `ws@8.21.1` 均锁定精确版本。三个现有 development 函数实际运行
  `Nodejs16.13`，由 ADR-032 限定接受；staging/production 新建函数必须显式使用
  `Nodejs20.19` 或届时批准的更新 LTS Runtime。
- SDK `runTransaction` 的内部重试被设为 `0`，领域层只对精确
  `DATABASE_TRANSACTION_CONFLICT` 做最多三次退避。干净集合上的真实首次 ensure ×20
  只创建一个 user/mapping，证明当前 development 唯一结果；精确平台冲突错误对象仍为
  后续观察项。
- 本地 fake database 证明适配契约、写入参数形状、回滚和故障路径；真实 development
  已验证可信身份、三个函数调用、跨集合唯一结果、权限拒绝和政策幂等。隔离构建门禁仍会
  在系统临时目录安装各包生产依赖并加载入口。

## 16.1 M1.1 工具链

| 工具                    | 已安装版本 | 用途                          |
| ----------------------- | ---------: | ----------------------------- |
| Node.js                 |    24.14.0 | 本地工具运行时                |
| npm                     |     11.9.0 | 包管理与锁文件                |
| TypeScript              |      6.0.3 | 严格类型检查，不输出构建产物  |
| ESLint                  |     10.7.0 | Flat Config 静态检查          |
| typescript-eslint       |     8.65.0 | TypeScript ESLint 规则        |
| Prettier                |      3.9.6 | TS/JSON/Markdown 工程文件格式 |
| Vitest                  |     4.1.10 | M1.1 纯 TypeScript 单元测试   |
| miniprogram-api-typings |      5.2.1 | 微信小程序全局类型            |

WXML/WXSS 未引入额外格式化插件，由代码约定和微信开发者工具编译验证。PowerShell 环境使用 `npm.cmd`，避免修改本机脚本执行策略。

## 17. 不采用重型后端的原因

- 当前规模和业务域可由云函数/数据库满足，重型栈会增加部署、鉴权、运维和一致性边界。
- 微信身份、云存储、审核/码等平台能力与云开发路径更短。
- 核心风险是状态一致性、隐私和真机兼容，不是吞吐规模。
- 用适配层和仓储边界保留未来迁移可能，但不提前支付复杂度。

## 18. 技术风险与 Spike

| Spike                                  | 时点             | 验证                                             | 阻断                     |
| -------------------------------------- | ---------------- | ------------------------------------------------ | ------------------------ |
| S-PLAT-01 云函数事务/条件更新/唯一语义 | M1 前            | 官方文档、并发写测试、失败注入                   | 回赠与唯一键方案无法成立 |
| S-PLAT-02 匿名路由与登录               | M1/M3            | 未登录真机打开、互动才登录                       | 匿名被强制建号           |
| S-PLAT-03 内容安全                     | M2               | 文本/图片/链接范围、异步结果、错误定位           | 未审核内容可能公开       |
| S-PLAT-04 分享与小程序码               | M3               | 参数长度、固定/当前入口、码有效性                | 无法打开正确名牌         |
| S-IMG-01 Canvas                        | M2 提前、M3 完成 | 六模板、字体、Emoji、长文、iOS/Android、相册权限 | 严重错位或无法保存       |
| S-DRAFT-01 草稿冲突                    | M2               | 后台、断网、多设备、上传失败、恢复               | 静默丢内容               |
| S-SOCIAL-01 原子回赠                   | M4               | 并发、超时、重复、通知失败注入                   | 半完成或重复相遇         |
| S-PRIV-01 联系方式投影                 | M4               | 越权、未选项、撤销、拉黑、注销                   | 私密数据泄露             |
| S-NFC-01 NFC 唤起                      | P2               | 官方文档与真机                                   | 不影响 P0/MVP            |
