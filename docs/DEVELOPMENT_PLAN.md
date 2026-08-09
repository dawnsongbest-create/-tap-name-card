# 「碰一下名牌」MVP Development Plan

> **文档版本：FT-01 user approval sync v1.1**
> **日期：2026-08-09**
> **状态：面向 Codex 的正式开发执行计划**  
> **唯一产品事实来源：`docs/PRD.md`**  
> **适用阶段：RB-01—First MVP Launch / Post-launch**

---

## 0. 文档定位

本文件回答“如何开发”，`docs/PRD.md` 回答“开发什么”。

当两份文档冲突时：

1. 以 `docs/PRD.md` 的强制产品规则、P0 范围、状态机和验收标准为准；
2. 本文件只能拆解顺序、工程边界、验证方法和交付标准；
3. 开发 Agent 不得以工程方便为理由改变产品逻辑；
4. 任何需要改变 PRD 的事项必须停止编码，记录到 `docs/DECISIONS.md`，等待产品负责人确认。

---

# 1. 项目交付策略

## 1.1 总体方法

RB-01 后项目采用两个正式 Gate：

> ALPHA：Gallery → Preview → Select → Editor → Draft → Publish → Share → Anonymous View

> FIRST MVP LAUNCH：Alpha + Greeting → Return → Encounter → Contact Exchange +
> Safety / Moderation / Privacy / Production / Device / Release

Alpha 验证用户是否愿意创建、发布、分享名牌。每次只执行一个可独立验收的 Sprint；一个
Sprint 未通过验收，不得进入下一个 Sprint。

Launch Catalog 仅为 `T-SOCIAL-01` Apple Minimal 与 `T-SOCIAL-02` Magazine，两者均已
`DELIVERED`。Scrapbook、Anime Role、Professional、Project Portfolio 为
`POST_MVP_DEFERRED`。延期不删除六个稳定 template ID、六份 TemplateDefinition、六条
registry entry、六个 renderer binding/shell 或 architecture regression tests，也不得把
底层 registry 缩为两模板。

Fast-track 约束：

- Draft 采用 local autosave、明确 saved/saving/failed、登录 owner 云草稿、kill/relaunch
  恢复、basic revision protection 与幂等保存；复杂 merge/recovery UX 不阻塞 Alpha。
- Social Loop 优先 Greeting → Return → Encounter → Contact Exchange。Collection 保持
  静默、单向、私密且独立，可后置到 First MVP 后段或 Post-launch。
- 首发分享只要求微信原生分享 → deep link → Anonymous View；Mini Program Code 与
  1:1 / 3:4 / 9:16 visual export matrix 为 Post-launch。
- `CLOUDFUNCTION_ISOLATED_GATE = KNOWN_ENVIRONMENT_LIMITATION`，不阻塞 RB-01、FT-01
  或当前 MVP development；本轮不重新处理 Node 20。

## 1.2 开发原则

- 先完成可运行的最小闭环，再增强视觉和体验；
- 先建立权限、状态机、幂等和测试，再扩展功能；
- 客户端负责展示与交互，服务端负责身份、权限和业务状态；
- 所有关键写操作必须通过云函数；
- 所有页面必须覆盖正常、加载、空、失败、无权限和内容不可用状态；
- 所有平台能力必须以开发时最新的微信官方文档为依据；
- mock、占位实现和真实平台能力必须显式区分；
- 未真机验证的能力不能声明为已完成。

## 1.3 当前架构基线（M1.3 final）

### 客户端

- 微信原生小程序；
- TypeScript；
- WXML；
- WXSS；
- 原生组件；
- Canvas 2D；
- CloudBase 调用集中在 `CloudFunctionCaller`；
- 远端 envelope、requestId、错误码及 endpoint success DTO 的运行时校验；
- 未知远端字段不会进入客户端业务 DTO/state；
- 七种 canonical PageState 和显式 retry UI intent。

尚未建立统一产品状态管理、analytics、timeout/自动重试、operation state、登录引导、
骨架屏系统或 cloud-function middleware；这些能力按首次真实消费者 Sprint 决定。

### 服务端

- 微信云开发或 CloudBase；
- 云函数；
- 云数据库；
- 云存储；
- 环境变量；
- 日志；
- 必要的定时任务。

### 当前禁止引入

- Taro；
- uni-app；
- React 小程序转换框架；
- NestJS；
- PostgreSQL；
- Redis；
- 消息队列；
- Kubernetes；
- 微服务；
- 独立账号系统。

---

# 2. 不可破坏的产品不变量

以下规则必须由数据模型、云函数和测试共同保证。

## 2.1 浏览

- 未登录用户可以浏览完整公开名牌；
- 打开名牌不会通知名牌主人；
- 不记录或展示匿名访客身份；
- 只有点击互动操作时才出现登录引导。

## 2.2 收藏

- 收藏是静默单向行为；
- 收藏不通知名牌主人；
- 收藏不发起认识请求；
- 收藏不创建相遇；
- 收藏不开放联系方式；
- 同一用户对同一名牌只保留一条有效收藏。

## 2.3 认识请求

- 发起者必须选择一张已发布名牌递出；
- 发起认识请求不自动收藏对方；
- 名牌主人只能“接受并回赠”；
- 不存在单独接受状态；
- 不提供站内文字、表情、语音或聊天回复；
- 请求只有 `PENDING`、`RETURNED`、`DECLINED`、`CANCELLED`、`EXPIRED`。

## 2.4 相遇

- 只有认识请求进入 `RETURNED` 才创建相遇；
- 同一对用户只存在一条相遇关系；
- 双方名牌快照必须保存；
- 名牌后续修改不得覆盖历史快照；
- 私人备注只对创建者可见。

## 2.5 联系方式

- 只有相遇状态为 `ACTIVE` 才可申请；
- 发起方只选择自己愿意提供的信息；
- 接收方同意时只选择自己愿意提供的信息；
- 不自动共享全部联系方式；
- 未经接收方确认不得展示私密联系方式；
- 撤销只能停止小程序内继续展示，无法收回对方已复制内容。

## 2.6 边界

不得加入：

- 附近的人；
- 陌生人推荐；
- 滑动匹配；
- 恋爱匹配；
- 站内聊天或私信；
- 关注、粉丝、点赞和公开评论；
- 动态广场和推荐信息流；
- 人气、排行榜和访客追踪；
- 企业 CRM；
- 自动添加微信好友。

---

# 3. 仓库目标结构

M0 完成后建议结构如下。可根据微信开发者工具实际初始化结果微调，但必须在 `ARCHITECTURE.md` 记录。

```text
tap-name-card/
├── AGENTS.md
├── README.md
├── project.config.json
├── project.private.config.json.example
├── package.json
├── tsconfig.json
├── eslint.config.*
├── prettier.config.*
├── miniprogram/
│   ├── app.ts
│   ├── app.json
│   ├── app.wxss
│   ├── pages/
│   ├── components/
│   ├── services/
│   ├── state/
│   ├── domain/
│   ├── templates/
│   ├── utils/
│   ├── constants/
│   └── assets/
├── cloudfunctions/
│   ├── shared/
│   ├── authEnsureUser/
│   └── ...
├── shared/
│   ├── types/
│   ├── schemas/
│   ├── errors/
│   └── constants/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── fixtures/
│   └── manual/
└── docs/
    ├── PRD.md
    ├── DEVELOPMENT_PLAN.md
    ├── MVP_SCOPE.md
    ├── ARCHITECTURE.md
    ├── DATA_MODEL.md
    ├── API_SPEC.md
    ├── UI_SPEC.md
    ├── TEST_PLAN.md
    ├── TASKS.md
    └── DECISIONS.md
```

---

# 4. 环境与配置

## 4.1 环境

至少区分：

- `local`
- `development`
- `staging`
- `production`

不同环境不得共用：

- 云数据库；
- 云存储；
- 微信配置；
- AI 密钥；
- 审核服务配置；
- 小程序码配置；
- 日志和测试数据。

## 4.2 密钥

- 不得提交真实 AppSecret、AI Key 或云环境私密配置；
- 仓库只提交 `.example` 文件；
- 密钥通过云端环境变量或受控配置提供；
- 客户端不得出现服务端密钥；
- 日志不得输出联系方式、OpenID 和完整敏感请求体。

## 4.3 功能开关

以下能力建议配置为服务端开关：

- 内容审核；
- 小程序码；
- AI 助手；
- 认识请求频率；
- 联系方式冷却天数；
- 每人最大名牌数；
- NFC 入口；
- 订阅消息。

---

# 5. 工程规范

## 5.1 类型和校验

- 客户端与云函数共享领域类型；
- 每个云函数输入都必须有运行时校验；
- 客户端不得仅依赖 TypeScript generic/cast 信任远端响应；envelope 和 endpoint success
  DTO 必须先通过运行时校验；
- 每个名牌模块必须有具体类型和校验器；
- 未验证的 `Record<string, unknown>` 不得直接写入数据库；
- 枚举值统一集中定义，禁止页面各自复制字符串。

## 5.2 云函数返回

统一返回：

```ts
interface CloudFunctionResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: ErrorCode;
    message: string;
    field?: string;
    details?: Record<string, unknown>;
  };
  requestId: string;
}
```

内部异常不得直接返回客户端。

客户端消费 `CloudFunctionResult<T>` 时必须验证 envelope、`success`、`requestId`、
成功 `data`、失败 `error.code` 和 `error.message`。通过 endpoint parser 白名单重建
success DTO；远端未知字段和远端 `message/details/stack` 不进入客户端安全结果或 UI。

## 5.3 幂等

以下操作必须有服务端幂等保护：

- 创建用户；
- 创建名牌；
- 保存草稿；
- 设置当前名牌；
- 收藏和取消收藏；
- 发起认识请求；
- 接受并回赠；
- 创建相遇；
- 发起和处理联系方式申请；
- 拉黑；
- 举报；
- 账号注销。

优先使用：

- 唯一业务键；
- 确定性 `pairKey`；
- 唯一索引；
- 事务；
- 请求幂等键。

## 5.4 日志

关键云函数日志至少包含：

- `requestId`
- 函数名
- 环境
- 当前用户内部 ID
- 业务资源 ID
- 状态变化
- 结果代码
- 耗时

不得记录：

- 完整联系方式；
- 微信二维码原图；
- AppSecret；
- AI Key；
- 完整 AI 私密输入；
- 数据库堆栈返回给客户端。

---

# 6. 测试策略

## 6.1 测试层级

### 单元测试

覆盖：校验器、状态机、业务键、共同兴趣标准化、模板兼容逻辑、错误映射、文本和数量限制。

### 云函数集成测试

覆盖：身份、所有权、拉黑、状态前置条件、幂等、重复提交、事务、私密字段过滤。

### 页面与组件测试

覆盖：正常、加载、空、网络失败、无权限、内容不存在、审核中、已隐藏。

### 双账号手工验收

使用 A、B 两个真实微信测试账号完成：

1. A 发布名牌；
2. B 匿名浏览；
3. B 登录并发布名牌；
4. B 发起认识请求；
5. A 接受并回赠；
6. 双方出现相遇；
7. B 申请联系方式；
8. A 同意并选择联系方式；
9. 双方只看到对方选定内容；
10. 撤销展示；
11. 拉黑后交互关闭。

### 真机

First MVP Launch 必须至少验证：一台 iPhone、一台 Android、微信开发者工具、staging 与
production candidate 环境、微信原生分享、deep-link routing、匿名名牌打开、公开 PageStates
以及 privacy / moderation / production readiness。

Mini Program Code 生成/扫码和 1:1、3:4、9:16 visual export / image save matrix 属于
Post-launch，不作为 First MVP Launch 真机完成条件。

---

# 7. Definition of Ready

一个 Sprint 开始前必须满足：

- 范围明确；
- 依赖已完成；
- 数据和状态规则明确；
- 页面和接口有验收条件；
- 平台能力已确认或有适配层方案；
- 明确本 Sprint 不做什么；
- 测试方式可执行；
- 无未解决的 P0 产品冲突。

若不满足，应停留在规划，不得边猜边写核心业务。

---

# 8. Definition of Done

一个 Sprint 完成必须同时满足：

- 功能按范围实现；
- 未实现范围外功能；
- 格式检查通过；
- 类型检查通过；
- 自动化测试通过；
- 新增核心逻辑有测试；
- 页面状态完整；
- 权限和重复提交已测试；
- 文档与代码一致；
- `TASKS.md` 已更新；
- 无阻断问题；
- 无未说明的 mock；
- 无未说明的真机验证缺口；
- 形成可审查的代码差异或 Commit。

---

# 9. 里程碑总览

| 阶段 | 状态 | 目标/主要产物 |
|---|---|---|
| M0 | `DONE` | 规划与技术决策 |
| M1.1—M1.4 | `DONE` | 工程、身份、基础设施、M2 Entry Readiness |
| M2.1-A / B1 | `DONE` | 六模板 domain/registry 与 renderer foundation；历史 closeout 保留 |
| Original Social B2 | `PARTIALLY_DELIVERED / REBASELINED` | Apple Minimal、Magazine 已交付；Scrapbook、Anime Role 延期 |
| Original B3 Resume | `POST_MVP_DEFERRED` | Professional、Project Portfolio 与 Resume Editor 延期 |
| RB-01 | `DONE` | Documentation Rebaseline；commit `167528a` |
| FT-01 M2.1-C Fast Track | `IN_REVIEW / READY_FOR_INDEPENDENT_REVIEW` | 实现完成；用户视觉 `APPROVED_FOR_FIRST_MVP`；Independent Review 待完成 |
| A-01 | `NOT_STARTED` | Card / Draft |
| A-02 | `NOT_STARTED` | Editor / Upload / Live Preview |
| A-03 | `NOT_STARTED` | Publish / Moderation / Snapshot |
| A-04 | `NOT_STARTED` | WeChat native Share / deep link / Anonymous View |
| Alpha Validation | `NOT_STARTED` | 验证创建 → 发布 → 分享意愿 |
| First MVP Launch | `NOT_STARTED` | Social Loop、安全、生产、双平台、发布与微信审核 |
| Post-launch | `DEFERRED` | Collection（如未首发）、四延期模板、Resume、码、导出、AI、NFC |

---

# 10. M0：规划与文档

## 目标

将 PRD 转化为可执行、彼此一致的工程文档，不编写正式业务代码。

## Sprint M0.1：需求映射和范围收敛

### 工作

- 通读 `PRD.md`；
- 建立 P0、P1、P2 范围矩阵；
- 建立页面—接口—数据—测试映射；
- 标记微信平台能力验证点；
- 标记产品非阻塞待定项；
- 识别内部歧义，但不得自行修改产品规则。

### 产物

- `MVP_SCOPE.md`
- `TASKS.md` 初版
- `DECISIONS.md` 初版

### 验收

- 所有 P0 都能映射到一个任务；
- 所有 P0 都有验收条件；
- 所有 P1、P2 不会混入首轮 P0；
- NFC 不阻塞 MVP；
- AI 明确为 P1；
- 收藏和认识请求分开；
- 回赠与接受是同一原子业务动作。

## Sprint M0.2：架构和数据设计

### 工作

- 输出客户端、云函数、共享类型和测试目录；
- 明确环境隔离和密钥管理；
- 完善数据库集合、索引、唯一键和权限；
- 明确草稿、审核中内容与公开快照；
- 明确所有状态机；
- 明确事务边界。

### 产物

- `ARCHITECTURE.md`
- `DATA_MODEL.md`
- `DECISIONS.md` 更新

### 验收

- 不引入重型独立后端；
- 私密联系方式与公开名牌分离；
- 相遇 `pairKey` 唯一；
- 请求和收藏有独立集合；
- 所有关键状态变化由服务端控制；
- 账号注销和逻辑删除规则明确。

## Sprint M0.3：接口、页面和测试规格

### 工作

- 为每个 P0 云函数定义契约；
- 为每个页面定义所有状态；
- 建立错误码映射；
- 建立自动化和手工测试计划；
- 建立双账号验收脚本；
- 建立真机和上线阻断检查表。

### 产物

- `API_SPEC.md`
- `UI_SPEC.md`
- `TEST_PLAN.md`
- `TASKS.md` 完整版

### 验收

- 每个接口有输入、输出、权限、状态、幂等、错误码和测试；
- 每个 P0 页面有正常、加载、空、失败和无权限状态；
- 测试能覆盖收藏、请求、回赠、相遇和联系方式；
- 所有文档用词和状态一致。

## M0 停止条件

完成文档后必须停止，不得初始化小程序工程，不得开始 M1。

---

# 11. M1：工程基础与用户身份

## Sprint M1.1：工程初始化

范围：微信原生小程序 TypeScript 工程、基础目录、包管理、ESLint、Prettier、TypeScript、测试框架、示例环境配置、README。

不做：名牌业务、社交业务、AI、NFC、真实内容审核。

验收：微信开发者工具可导入，工程可编译，格式、类型和测试命令可执行，无真实密钥进入仓库。

## Sprint M1.2：云开发和用户身份

范围：云开发初始化、`authEnsureUser`、`accountGetMe`、`users` 集合、协议版本、账号状态、客户端身份服务、匿名浏览与登录态分离。

验收：首次登录幂等创建用户，重复调用不创建多个用户，OpenID 不返回公共页面，匿名用户不会自动建账号，受限账号状态可识别。

## Sprint M1.3：共享基础设施

最终范围仅包含：

1. 客户端 runtime response safety boundary：验证 `CloudFunctionResult` envelope、canonical
   `ErrorCode`、requestId 和 endpoint success data；三个现有身份 endpoint 使用白名单
   DTO parser，远端内部字段和错误内容不进入业务 state/UI。
2. 最小 PageState 基础：`ready/loading/empty/network-error/forbidden/not-found/unavailable`；
   只有 `network-error` 和 canonical `unavailable` 显示 Retry，组件只发出 UI intent；
   unknown/invalid 使用 `kind=unavailable`、`showRetry=false` 的无 action 安全 fallback。

明确延后：analytics、timeout、automatic retry、exponential backoff、
`UNKNOWN_AFTER_TIMEOUT`、operation state、skeleton、P25 login prompt 和
cloud-function middleware abstraction。按 YAGNI 原则推迟到首次真实消费者 Sprint。

验收：客户端不信任远端 TypeScript cast；malformed response fail closed；DTO 只包含白名单
字段；远端错误不透传；匿名启动不自动建号；七种 PageState、retry 可见性和非法状态
fallback 在微信开发者工具通过人工验证。状态：`DONE`。

## Sprint M1.4：M2 Entry Readiness / Foundation Acceptance

范围：当前 HEAD 回归验证、development CloudBase 只读漂移检查、微信开发者工具聚焦
回归、M1 Foundation Acceptance、M2 Entry Gate 关闭和 Closeout 文档。

实际完成：

- current HEAD regression validation；
- development CloudBase read-only drift check；
- WeChat DevTools focused regression；
- M1 Foundation Acceptance；
- M2 Entry Gate closure。

本 Sprint `NO PRODUCT CODE CHANGE`，没有 CloudBase mutation，也没有创建 staging。
M2 Entry Gate `CLOSED` 只允许 M2.1 进入独立 Preflight + Planning，不构成
Implementation 批准。staging `NOT REQUIRED BEFORE M2.1 CODING`，但
`MUST BEFORE EXTERNAL TESTING`；届时必须使用独立 CloudBase、App/获批微信配置、数据和
HMAC Secret，并重新验证目标 Runtime、SDK advisory、函数调用权限和数据库安全。

停止条件：任一自动门禁、只读环境核验或聚焦人工回归失败时不得关闭 M2 Entry Gate。
最终结果：`DONE`。

---

# 12. M2：模板、编辑器与发布

## Sprint M2.1：模板注册和渲染框架

总状态：`IN_PROGRESS`。M2.1-A `DONE`；M2.1-B1 `DONE`；Original Social B2
`PARTIALLY_DELIVERED / REBASELINED`；Original B3 Resume `POST_MVP_DEFERRED`；
M2.1-C 已重排为 FT-01 M2.1-C Fast Track，implementation `DONE`，当前 Gate 为
`IN_REVIEW / READY_FOR_INDEPENDENT_REVIEW`；用户视觉 Review 已
`APPROVED_FOR_FIRST_MVP`，Independent Review 与 Commit / Push 尚未完成。

M2.1-A 已完成 Template Domain / Schema / Registry：

- 契约仅位于 `miniprogram/templates/`，没有修改根 `shared/` 或生成镜像；
- `TemplateDefinition v1`、`TemplateRegistryEntry`、`RenderModel v1` 和六模板所需最小
  module contract；
- 4 个 SOCIAL + 2 个 RESUME 稳定模板定义；
- runtime domain validation、精确 v1 版本语义和 category-safe fallback；
- generic `createTemplateRegistry` 与 current-product
  `createProductionTemplateRegistry` 分离；
- app-bundled local synchronous registry 是当前模板事实来源；
- 27 个测试文件、217 项测试和完整自动门禁通过；
- Independent Re-Review：`PASS / NO BLOCKING FINDINGS`；
- CloudBase Impact：`NONE`，`templateList`/`templateGet` Cloud Functions 延后。

M2.1-B1 Renderer Foundation 已完成：

- 单一公共 `CardRenderer` 和唯一 raw runtime parsing ingress；
- `parseCardRendererInput → parseRenderModel → typed RenderModel →
prepareCardRender` trust chain；
- M2.1-A domain validity 与 renderer capability incompatibility 严格分离；
- exact template/category/version/binding resolution，不做 Apple、同 category、旧版本或
  generic visual fallback；
- renderer-neutral `PreparedCardViewModel`、static controlled WXML binding、ready/failure
  projection 和 stale renderer state cleanup；
- 六个最小 child renderer shells；它们只验证 dispatch，不是正式视觉；
- 6 templates × 4 scenarios = 24 个 official fixtures，全部 parser PASS + capability PASS；
- Foundation development-only Renderer Lab，纯本地切换且零 route/product state/
  persistence/identity/network/CloudBase side effect；
- 31 个测试文件、244 项测试，architecture invariant tests、完整自动门禁、Independent
  Architecture Review、真实 DevTools Manual Gate 和 Post-DevTools Re-Review 全部通过；
- native package included size 139,796 bytes（约 136.52 KiB，DevTools 显示 137 KB），
  full miniprogram raw 140,333 bytes（约 137.04 KiB），binary media 为 0；
- CloudBase/identity impact 为 `NONE`，CloudBase manual validation 为 `N/A`。

Original Social B2 已交付 Apple Minimal 与 Magazine 正式视觉；Scrapbook、Anime Role
改为 `POST_MVP_DEFERRED`。Original B3 的 Professional、Project Portfolio 正式视觉与
Resume Editor 同样延期。六模板 renderer shell/binding 与架构回归不得删除。

FT-01 已完成以下交付：

- 冷启动 Gallery 只投影 Apple Minimal / Magazine，并用真实 `CardRenderer` 展示本地确定性
  预览；Gallery 不直接 Select；
- Preview 只接受精确 `templateId/templateVersion`，完整渲染后由固定底部 CTA 确认选择；
- selection handoff 严格只有 `templateId/templateVersion`，category 由 registry 解析，产品
  projection 不暴露 `editorLevel`；
- 任意 ID、延期模板和版本不匹配使用安全 not-found；模型缺失使用本地 render failure；
- 全流程匿名且无 storage、network、CloudBase、account 或 Card mutation；
- 六模板 domain/registry/binding/shell 与 Foundation 路由保持不变；
- 36 个测试文件、294 项测试及全部自动门禁通过；DevTools `v2.02.2607171` / 基础库
  `3.17.0` 已完成 Gallery、Apple/Magazine Preview / Select、异常路由、滚动、safe-area 与
  Foundation 回归；用户视觉已 `APPROVED_FOR_FIRST_MVP`。精确 iPhone / Android device matrix
  继续属于 Launch Hardening，不阻塞 FT-01 Independent Review。

## A-01：Card / Draft

范围：Launch Catalog cards、CRUD 云函数、本地 autosave、明确 saving/saved/failed、登录
owner 云端草稿、kill/relaunch 恢复、basic revision protection、幂等保存。

验收：不能修改他人名牌，断网保留内容，kill/relaunch 可恢复，重复保存幂等，基础 revision
冲突不静默覆盖，Token 不可枚举。

不做：multi-device merge UX、sophisticated recovery-copy workflow、collaboration-style
conflict resolution。

## A-02：Editor / Upload / Live Preview

范围：社交必填、视觉主体、标签、自由模块、模块操作、图片上传、表单和实时预览、完整预览。

验收：无真人头像可发布，模块和图片上限正确，服务端重复校验，预览与公开渲染复用核心组件，隐藏不删除数据。

## Post-MVP：Resume Editor

范围：职业身份、能力、目的、经历、项目、作品、链接、私密联系方式入口、项目子页面。

验收：至少一个技能或项目，数量限制正确，私密联系方式不进入公开内容，社交和简历结构互不污染。

## A-03：Publish / Moderation / Snapshot

范围：发布校验、内容审核适配、审核状态、审核失败定位、公开快照、新版本审核、当前名牌、发布成功页。

验收：未审核内容不公开，审核中新版本不替换旧版，新版通过后原子切换，快照不可改，同一用户仅一张当前名牌。

---

# 13. A-04 与 Post-launch 分享范围

## A-04：WeChat native Share / deep link / Anonymous View

范围：公开 Token 接口、对外浏览页、首屏人格卡、完整模块、不可用状态、匿名浏览、互动登录
引导、举报入口，以及微信原生分享打开正确 deep link。

验收：未登录完整浏览，不自动建账号，不通知主人，公共返回不含联系方式、OpenID 和草稿；
真实微信分享打开正确 Launch Catalog 名牌。

## Post-launch：Mini Program Code

范围：小程序码适配层、失败兜底、来源参数；不阻塞 Alpha 或 First MVP Launch。

验收：分享打开正确名牌，Token 不可枚举，小程序码失败有提示，不虚构平台接口，真机验证前标记待验证。

## Post-launch：Visual Export Matrix

范围：3:4、9:16、1:1、内容选择、主题变体、Canvas 2D、小程序码可选、保存相册、权限处理。

验收：中英文、Emoji、长文本不裁切，六模板可导出，iOS/Android 可保存，无码版本可导出，不自动保存。

## First MVP 后段或 Post-launch：Collection

范围：`collections`、收藏接口、快照、列表、不可用状态。

验收：收藏不通知、不创建请求、不创建相遇，重复收藏不重复写入，取消正确，删除后保留不可打开快照；不得与 Greeting 合并。

---

# 14. M4：社交闭环

## Sprint M4.1：认识请求

范围：请求集合、发起条件、名牌确认、发送、收到和发出列表、详情、取消、拒绝、过期、通知。

验收：无名牌不能发送，同一对用户无重复 PENDING，不向自己发送，拉黑阻止发送，不自动收藏，不创建相遇，不显示已读，不聊天。

## Sprint M4.2：接受并回赠的原子事务

范围：校验请求和回赠名牌、保存回赠快照、状态变为 `RETURNED`、创建或更新相遇、保存双方快照、计算共同兴趣、通知。

验收：原子操作，失败无半完成状态，重复点击不重复相遇，不存在独立 `ACCEPTED`，只有 `RETURNED` 产生相遇，回赠不改变当前名牌。

## Sprint M4.3：相遇和共同兴趣

范围：相遇、事件、备注、列表、详情、快照、共同兴趣、私人备注、隐藏。

验收：`pairKey` 唯一，历史快照不覆盖，备注只返回 owner，共同兴趣只用允许字段，匹配可解释且不依赖实时大模型。

## Sprint M4.4：联系方式交换

范围：联系方式、申请、接受、拒绝、撤回、撤销、冷却、共享内容读取。

验收：相遇前不能申请，双方各自选择，不共享未选信息，私密数据仅云函数返回，冷却服务端配置，撤销后不再返回，拉黑后关闭。

## Sprint M4.5：通知、拉黑、举报与注销

范围：通知、已读、拉黑、解除、举报、举报快照、注销、公开入口失效、安全审计。

验收：拉黑不通知，关闭待处理请求，举报保存快照，注销后 Token 失效，历史相遇仅保留注销快照，联系方式不可访问。

---

# 15. First MVP Launch Quality 与 Post-launch AI

## Post-launch：AI 表达助手

范围：AI 适配层、三种模式、最多三个候选、用户确认写入、最小上下文、安全审核、使用计数、失败降级。

验收：不强制、不自动覆盖、不自动发布、不编造经历、不推断心理疾病、不发送私密数据，失败不阻塞编辑。

## Sprint M5.2：安全、性能与可访问性

范围：权限矩阵、私密数据、频率限制、图片性能、分页、键盘、安全区域、文字放大、减少动态、链接安全。

验收：不可越权，公开接口白名单，关键接口防刷，首屏可接受，文字按钮可用，动画可关闭。

## 原 Sprint M5.3：真机和回归（REBASELINED）

First MVP Launch 范围：iPhone、Android、微信原生分享、deep-link routing、匿名名牌打开、
公开 PageStates、双账号闭环、弱网、审核失败、隐私、审核、production readiness、注销、拉黑、
重复提交。

原范围中的 Mini Program Code 生成/扫码和 visual export / image save matrix 已重排为
`REBASELINED / POST_LAUNCH`，未来测试要求保留，但不阻塞 First MVP Launch。

验收：按 PRD 第 37、40 章全部完成，仅开发工具运行不算完成。

## Sprint M5.4：上线准备

范围：隐私政策、用户协议、权限文案、审核说明、截图、版本号、staging 清理、production 配置、回滚方案、已知限制。

上线阻断：匿名被强制登录/建号、微信原生分享目标或 deep link 错误、无效/未发布/隐藏/删除
名牌仍公开、联系方式泄露、重复数据、草稿频繁丢失、未审核公开、私密越权、重大真机/
runtime 失败、注销后仍公开。Mini Program Code 与 visual export 缺陷不属于本 Gate 阻断。

---

# 16. Codex 每个 Sprint 的执行协议

每次任务必须按以下格式开始：

1. 已阅读的文档；
2. 本次 Sprint 目标；
3. 包含范围；
4. 明确不做；
5. 依赖；
6. 计划修改文件；
7. 验证命令；
8. 平台能力待验证项；
9. 阻塞问题。

编码完成后必须报告：

1. 实际修改文件；
2. 实现内容；
3. 未实现内容；
4. 执行的命令；
5. 真实测试结果；
6. 无法验证内容；
7. 风险；
8. 手工验收步骤；
9. `TASKS.md` 更新；
10. 停止，不进入下一 Sprint。

---

# 17. Commit 与分支建议

```text
docs/m0-planning
feat/m1-foundation
feat/m2-card-creation
feat/m3-public-sharing
feat/m4-social-loop
feat/m5-ai-release
```

Commit 示例：

```text
docs: add MVP architecture and execution plan
chore: initialize WeChat mini program foundation
feat: add card draft and snapshot model
feat: add anonymous public card page
feat: add atomic greeting return flow
test: add two-account social loop coverage
```

禁止将多个里程碑压入一个无法审查的巨大 Commit。

---

# 18. 主要风险与前置验证

## 微信平台能力

First MVP Launch 必须查阅官方文档并真机验证：匿名打开和登录、微信原生分享参数、deep-link
routing、内容安全、云函数事务与唯一约束。Post-launch 再验证 Mini Program Code、保存图片
权限和视觉导出矩阵；NFC 唤起继续属于未来 Gate。

## 图片导出

Post-launch 风险：字体、Emoji、长文本、图片临时地址、机型 Canvas 差异。能力进入
Post-launch implementation Gate 时为六模板建立导出测试，并允许无小程序码兜底；不阻塞
Alpha 或 First MVP Launch。

## 草稿和版本

Alpha 风险：本地/云保存、审核中版本覆盖公开内容、上传失败。必须分离 draft、pending、
published snapshot，并提供 local autosave、kill/relaunch recovery、basic revision protection
和幂等保存。复杂多设备 merge 与 recovery-copy UX 后置。

## 社交状态一致性

风险：重复点击、并发处理、半完成回赠、重复相遇、联系方式越权。必须使用事务、唯一业务键、`pairKey`、服务端权限和集成测试。

---

# 19. 第一轮真实用户验证建议

P0 闭环后邀请 10—30 名真实用户参加一次兴趣活动测试，观察：创建耗时、第一屏是否像自己、是否愿意递出、是否愿意浏览、认识请求压力、回赠理解、共同兴趣价值、联系方式安全感、视觉图片分享意愿、邀请朋友创建意愿。

优先修复真实阻塞，不根据少量反馈加入信息流、聊天或推荐。

---

# 20. 当前下一步

M0、M1.1—M1.4、M2.1-A、M2.1-B1、Apple Minimal 和 Magazine 均已完成。Original
Social B2 为 `PARTIALLY_DELIVERED / REBASELINED`；Original B3 Resume、Scrapbook 和
Anime Role 为 `POST_MVP_DEFERRED`。

当前 Gate 是 `FT-01 M2.1-C FAST TRACK INDEPENDENT REVIEW`。implementation 已完成，自动
门禁与 DevTools runtime validation 已通过，用户视觉 Review 已
`APPROVED_FOR_FIRST_MVP`；Independent Review、Commit 与 Push 尚未完成。FT-01 closeout 后的
推荐下一 Gate 为 `A-01 CARD / DRAFT PLANNING`，但本文档不授权 A-01 implementation；
A-02—A-04、Alpha Validation、First MVP Launch 和 Post-launch 仍须各自获得明确授权。
