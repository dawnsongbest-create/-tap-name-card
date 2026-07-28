# 「碰一下名牌」架构与产品决策记录（ADR）

> 版本：M1.2 final v1.0｜日期：2026-07-27｜状态：M1-02 `DONE`
>
> 状态含义：`ACCEPTED` 为 PRD 已确定；`PROPOSED` 为工程建议待 Tech Lead 确认；`NEEDS_VALIDATION` 为平台/产品细节待验证。

## ADR-001 使用微信原生小程序

- 状态：`ACCEPTED`。
- 背景：首发是微信小程序，需稳定使用微信页面、分享、Canvas 和云能力。
- 决策/原因：TypeScript + WXML + WXSS + 原生组件；路径直接、平台调试面最小。
- 替代：Taro、uni-app、React 转换框架。
- 后果：获得平台原生性，但不自动多端；页面层需明确复用边界。
- 风险/复审：基础库兼容；若正式立项多端且 P0 稳定再复审。

## ADR-002 使用微信云开发/CloudBase

- 状态：`ACCEPTED`。
- 背景：早期数百至数千用户，需要身份、函数、数据库、存储和日志。
- 决策/原因：采用云函数、云数据库、云存储和环境变量，缩短微信身份与平台能力链路。
- 替代：独立 BFF/自建云。
- 后果：运维轻、平台耦合增加；通过 repositories/adapters 隔离。
- 风险/复审：事务/唯一能力待 Spike；只有平台能力无法满足 P0 正确性时复审。

## ADR-003 不采用重型独立后端

- 状态：`ACCEPTED`。
- 背景：当前核心风险是一致性、隐私、审核和真机，不是规模。
- 决策/原因：不引入 NestJS/PostgreSQL/Redis/MQ/K8s/微服务/独立账号，避免额外边界与运维。
- 替代：完整服务端平台。
- 后果：开发快；必须认真设计 CloudBase 条件写/幂等。
- 风险/复审：实际负载、复杂查询或合规隔离出现证据后复审，不因假想规模复审。

## ADR-004 草稿、待审核与公开快照分离

- 状态：`ACCEPTED`。
- 背景：编辑已发布名牌时旧版必须继续公开。
- 决策/原因：`draftContent`、冻结的 `pendingReviewContent`、不可变 `card_snapshots` 分离。
- 替代：同一对象原地覆盖。
- 后果：版本/恢复更可靠，但审核切换需事务和兼容渲染。
- 风险/复审：存储增长与恢复期；上线前确定保留策略。

## ADR-005 关键写操作只走云函数

- 状态：`ACCEPTED`。
- 背景：前端隐藏按钮不能保证权限/状态。
- 决策/原因：身份、所有权、状态、拉黑、频率、幂等和字段过滤均由服务端执行。
- 替代：客户端直写数据库规则。
- 后果：安全边界统一；云函数调用与测试数量增加。
- 风险/复审：延迟/离线草稿；本地只缓存，服务端仍为事实来源。

## ADR-006 收藏与认识请求完全分离

- 状态：`ACCEPTED`。
- 背景：收藏是静默保存，认识是明确递出自己。
- 决策/原因：不同集合、接口、状态、页面、埋点和测试；收藏不通知、不请求、不相遇。
- 替代：收藏顺带发起社交。
- 后果：概念清晰，需两个独立入口。
- 风险/复审：不得以转化率为由合并；只有 PRD 正式变更才复审。

## ADR-007 “接受并回赠”为单一原子操作

- 状态：`ACCEPTED`。
- 背景：不存在先接受后回赠；半完成会破坏双方知情。
- 决策/原因：唯一接口 `greetingReturnCard`，原子完成快照、RETURNED、encounter、兴趣、事件和通知。
- 替代：`accept` 后再 `return`；最终一致的两个用户动作。
- 后果：业务语义正确；跨集合事务为高风险 Spike。
- 风险/复审：CloudBase 事务限制；可调整实现技术，不能改变产品原子语义。

## ADR-008 使用确定性 `pairKey`

- 状态：`ACCEPTED`。
- 背景：双方方向不同但相遇关系唯一。
- 决策/原因：排序双方内部 user ID 后生成 `pairKey`，唯一语义 upsert。
- 替代：按 greeting 创建多个 encounter 后去重。
- 后果：查询/幂等清晰；需处理无严格唯一索引。
- 风险/复审：使用占位键/条件写；并发 Spike 未通过则复审具体锁方案。

## ADR-009 私密联系方式独立存储

- 状态：`ACCEPTED`。
- 背景：公开名牌匿名可读，联系方式需要双方确认。
- 决策/原因：`user_contacts` 与 CardContent 分离；`contactGetShared` 仅按 ACCEPTED 选择实时投影。
- 替代：在卡对象中用隐藏字段。
- 后果：显著降低误泄露；读取需额外权限链。
- 风险/复审：缓存和文件访问；任何泄露为上线阻断。

## ADR-010 模板配置保存在仓库

- 状态：`ACCEPTED`。
- 背景：MVP 只有六模板，不需要后台/用户代码。
- 决策/原因：版本化配置、具体 Schema、安全回退；禁止用户 CSS/JS/字体。
- 替代：模板管理后台/远程代码。
- 后果：审查、测试和回滚简单；模板更新随版本发布。
- 风险/复审：模板数量/运营频率显著增加后复审。

## ADR-011 视觉图片客户端 Canvas 2D 优先

- 状态：`PROPOSED`。
- 背景：需三比例、六模板并可保存相册。
- 决策/原因：复用内容/模板布局，客户端 Canvas 优先，避免先建图片服务。
- 替代：服务端图片渲染或页面截图。
- 后果：成本低、离线部分可用；机型/字体/Emoji 差异需矩阵测试。
- 风险/复审：若 iOS/Android 兼容达不到放行门槛，依据 Spike ADR 评估服务端渲染。

## ADR-012 P0 不依赖 AI

- 状态：`ACCEPTED`。
- 背景：AI 是可选表达助手，失败不得阻塞名牌。
- 决策/原因：P08/接口/集合为 P1，P0 入口关闭；用户手工可完成全部创建/发布。
- 替代：AI onboarding 或自动生成。
- 后果：P0 更可控；P1 可独立测量采用率。
- 风险/复审：不得在 P0 偷渡模型调用；P0 稳定后复审。

## ADR-013 P0 不依赖 NFC

- 状态：`ACCEPTED`。
- 背景：NFC 是未来载体，平台唤起和硬件未验证。
- 决策/原因：P26/nfc* 为 P2，P0 用分享、码和视觉图片。
- 替代：硬件先行。
- 后果：MVP 可独立验证；数据模型保留设备概念但不建库。
- 风险/复审：P2 依据官方文档、供应商和真机重新评审。

## ADR-014 匿名浏览不创建账号

- 状态：`ACCEPTED`。
- 背景：浏览无压力是核心原则。
- 决策/原因：P11 只按 Token 获取公共快照；收藏/认识/举报提交时才 P25 和 `authEnsureUser`。
- 替代：启动即登录或静默建号。
- 后果：匿名漏斗与互动身份分离；路由需避免登录闪现。
- 风险/复审：微信启动行为真机验证；不可因埋点需求改变。

## ADR-015 外部平台能力统一适配

- 状态：`NEEDS_VALIDATION`。
- 背景：审核、小程序码、分享、相册、AI/NFC 能力可能变化。
- 决策/原因：用语义适配器和安全 DTO，具体官方 API 在对应 Sprint 查证；失败均有兜底。
- 替代：页面/函数直接散落调用。
- 后果：可测试和替换；增加少量抽象。
- 风险/复审：M1/M2/M3 官方文档与真机 Spike 后更新为 ACCEPTED 或修改。

## ADR-016 CloudBase 无严格唯一约束时使用占位键

- 状态：`NEEDS_VALIDATION`。
- 背景：用户、当前卡、requestKey、pairKey、collectionKey 必须唯一。
- 决策/原因：优先确定性 `_id`/unique-key 占位文档 + 事务/条件写 + 冲突读胜者，禁止单纯先查后写。
- 替代：数据库唯一索引（若官方支持且验证可靠）、外部锁服务。
- 后果：无需重型后端但实现更显式。
- 风险/复审：M1/M4 并发和故障测试；若不能满足原子正确性则重新选平台实现。

## ADR-017 举报登录歧义的临时交互

- 状态：`PROPOSED`。
- 背景：PRD 8.1 写匿名用户可举报，页面清单 P24 又标“是”登录。
- 决策/原因：P11 匿名可见举报入口；到提交动作再 P25 登录并返回表单，兼顾入口可用和页面定义。
- 替代：匿名直接提交；未登录完全不显示入口。
- 后果：能继续 M1 规划，但真实匿名举报能力未最终确定。
- 风险/复审：产品负责人在 M1 前确认；若要求匿名提交，需反滥用与匿名身份方案。

## ADR-018 联系方式撤销采用双向停止展示

- 状态：`PROPOSED`。
- 背景：PRD 写“任意一方撤销小程序内展示”，未明确只对撤销者还是双方。
- 决策/原因：任一方触发 `REVOKED` 后双方均无法再从小程序取对方明文，采用隐私更保守解释。
- 替代：只隐藏撤销者看到的对方信息；分别记录两方 revoke。
- 后果：规则简单、安全；可能比产品预期更严格。
- 风险/复审：产品负责人在 M4 前确认；无论选择，已复制信息不可收回提示保留。

## ADR-019 `users.currentCardId` 作为当前卡权威

- 状态：`PROPOSED`。
- 背景：`cards.isCurrent` 与用户当前卡可能在无跨集合事务时漂移。
- 决策/原因：`users.currentCardId` 为权威，`cards.isCurrent` 是查询镜像；通用入口只读权威。
- 替代：只用 cards 条件查询；独立 current_cards 集合。
- 后果：能定义修复路径；设置当前仍需事务/占位锁。
- 风险/复审：CloudBase 事务 Spike 后确认最终存储。

## ADR-020 用 `pendingPairKey` 阻止双向并发认识请求

- 状态：`ACCEPTED`。
- 背景：PRD 的发起条件要求“同一对用户没有有效的重复待处理请求”，高于数据模型中仅按 sender/receiver 描述的局部约束。
- 决策/原因：`requestKey` 保留请求方向与历史代次；另用排序双方 ID 的 `pendingPairKey` 作为有效 PENDING 占位，同向和反向请求都不能并存。
- 替代：只限制同方向 PENDING；自动把反向请求视为匹配。
- 后果：避免双方同时递牌造成两个待处理流程，同时不创建匹配或相遇。
- 风险/复审：离开 PENDING 时必须原子释放占位；M4 并发测试未通过时复审占位实现，不改变产品约束。

## ADR-021 拉黑撤销站内共享，解除只恢复相遇能力

- 状态：`PROPOSED`。
- 背景：PRD 明确拉黑后关闭互动和联系方式，但未详述解除后的状态恢复。
- 决策/原因：拉黑关闭 PENDING 请求、将 ACCEPTED 联系交换迁移为 REVOKED、使 encounter BLOCKED；解除后仅在双方均无 block 时恢复 encounter ACTIVE，旧请求和共享不复活。
- 替代：解除后一并恢复联系方式；永久保持 encounter BLOCKED。
- 后果：解除拉黑后可以重新建立互动，但不会意外恢复旧敏感信息展示。
- 风险/复审：产品负责人应在 M4 前确认；无论结果，拉黑期间任何敏感读取必须拒绝。

## ADR-022 M1.1 使用 Node、ESLint、Prettier、TypeScript 与 Vitest

- 状态：`ACCEPTED`。
- 背景：M1.1 需要可重复安装、可格式化、可静态检查、可类型检查和可自动测试的轻量工具链。
- 决策/原因：固定 Node 24.14.0/npm 11.x；使用 TypeScript 6.0.3、ESLint 10 Flat Config、typescript-eslint 8.65.0、Prettier 3.9.6、Vitest 4.1.10 和 `miniprogram-api-typings` 5.2.1；依赖由 `package-lock.json` 锁定。
- 替代：Jest、旧版 ESLint 配置、无锁文件或虚假占位脚本。
- 后果：四项质量命令可在 Windows 用 `npm.cmd` 真实执行；WXML/WXSS 暂由代码约定与开发者工具验证，不引入额外格式化插件。
- 风险/复审：Node/依赖主版本升级必须单独验证，不随日常安装漂移；以锁文件为可复现基线。

## ADR-023 M1.1 原生小程序目录与项目配置

- 状态：`ACCEPTED`。
- 背景：需要微信开发者工具可导入的原生 TypeScript 工程；最初实现时自动化环境无法代替
  开发者工具编译验证。
- 决策/原因：采用仓库根目录项目配置、`miniprogram/` 源目录、原生 `typescript` 编译插件、`pages/foundation` 工程初始化页、`components/page-state` 最小组件和 `touristappid` 公共导入基线；不创建正式首页。
- 替代：使用真实 AppID、引入 Taro/uni-app、提前创建产品页面。
- 验证：M1.1 人工复验已确认仓库根目录导入、`miniprogram/` 与 `cloudfunctions/` 识别、
  TypeScript/WXML/WXSS 编译、foundation 页面注册和四种基础状态；M1.2-A 人工验证再次通过，
  Console 无红色代码错误。
- 后果：当前工程配置基线已通过实际开发者工具验证；基础库提示不视为代码错误。
- 风险/复审：开发者工具或基础库版本变化后需重新验证；若要求不同字段，只调整工程配置并
  更新本 ADR，不改变 PRD 或进入后续业务范围。

## ADR-024 M1.1 CloudBase 配置边界

- 状态：`ACCEPTED`。
- 背景：M1.1 需要环境承载结构，但云开发初始化、用户身份和集合属于 M1.2。
- 决策/原因：集中定义 `local/development/staging/production`，默认全部 `cloudEnabled=false` 且无环境 ID；只提供返回安全失败结果的云函数调用类型外壳，不调用 `wx.cloud`。
- 替代：提交真实环境 ID、创建测试集合、实现空壳 `authEnsureUser`。
- 后果：未配置云环境时工程初始化页明确提示且不崩溃；仓库无真实 CloudBase 配置、集合或正式云函数。
- 风险/复审：M1.2 必须依据最新官方文档确认初始化接口、环境注入和本地配置方式，并单独完成匿名/登录边界设计。

## ADR-025 根共享源与小程序运行时镜像

- 状态：`ACCEPTED`。
- 背景：M1.1 人工验收确认微信开发者工具不会解析越过 `miniprogramRoot` 的相对 TypeScript 导入；原实现从 `miniprogram/config`、`services`、`utils` 直接引用根 `shared/`，导致编译失败，并连带出现 foundation 页面未注册。
- 决策/原因：根目录 `shared/` 保持公共定义和工具的唯一源；生成并提交 `miniprogram/shared/` 作为微信运行时镜像，小程序代码只导入该镜像。`tools/sync-miniprogram-shared.mjs` 提供 `shared:sync` 和只读 `shared:check`，格式、Lint、类型检查均先验证镜像一致性。
- 替代：扩大 `miniprogramRoot` 到仓库根目录；让微信代码继续跨根引用；手工维护两份共享代码；引入 Taro/uni-app 或额外打包框架。
- 后果：微信编译器只看到 `miniprogram/` 内依赖，Node/Vitest 仍可直接测试根 `shared/`；镜像是生成物，不是第二个业务事实来源。
- 风险/复审：任何根 `shared/` 修改必须运行 `npm.cmd run shared:sync`；遗漏会由质量命令失败阻止。M1.2 设计云函数共享方式时需要复用“唯一源 + 明确生成边界”原则，不得让运行时目录互相跨根引用。

## ADR-026 M1.2 身份使用环境隔离 HMAC 映射

- 状态：`ACCEPTED`。
- 背景：客户端不得提供可信身份，OpenID 不得返回客户端；同一 OpenID 并发首次建号必须唯一，
  又不能把原始 OpenID 放进确定性映射文档。
- 决策/原因：服务端从可信微信上下文取得 OpenID，以各环境独立密钥计算
  `HMAC-SHA256(secret,"wechat-openid:v1:"+openId)`。使用
  `identity_mappings/{identityKey}`，文档只保存 `userId/provider/createdAt`；user 与 mapping
  必须在同一服务端事务创建。捕获写冲突后最多三次退避并读取事务胜者，耗尽返回
  `SERVICE_UNAVAILABLE`，不得退化为普通先查后写。
- 替代：客户端传 OpenID；无密钥哈希；只查 users 再写；新增操作重放集合。
- 后果：同环境有确定性幂等键，跨环境不可关联；密钥轮换会影响映射解析，需要在云端接入时
  单独设计运维流程，M1.2-A 不实现轮换。
- 风险/复审：development 已验证可信上下文、HMAC 轮换、跨集合唯一结果和客户端权限；
  干净集合首次 ensure ×20 最终只产生一个 user/mapping。精确平台冲突错误对象仍作为
  后续观察项，不阻塞 M1-02。

## ADR-027 身份接口与政策确认契约

- 状态：`ACCEPTED`。
- 背景：建号、本人读取和政策确认的幂等来源不同；DELETED 不应作为可用用户视图返回。
- 决策/原因：`authEnsureUser`、`accountGetMe`、`accountAcceptPolicies` 均不使用
  `operationId`，`requestId` 只追踪。三者分别依靠 identityKey、只读语义和同版本状态幂等。
  terms/privacy 必须一次同时确认，独立接口原子写两个版本和两个时间；RESTRICTED 可确认但
  不解除限制。`CurrentUserView.status` 仅 `ACTIVE|RESTRICTED`，DELETED 返回
  `ACCOUNT_DELETED`；客户端映射成本地终止/不可用状态。过期政策阻止后续关键业务写，
  但允许 getMe、阅读和重新确认。
- 替代：建号时捆绑协议；每个接口建设 operation replay 集合；返回 DELETED 视图。
- 后果：接口更小、语义独立；未来关键写操作必须统一执行政策版本守卫。
- 风险/复审：development 已通过服务端 `v1/v1` 配置、同时确认和重复确认幂等；
  版本仍由服务端环境变量控制，不在客户端身份契约中作为授权事实。

## ADR-028 M1.2 分为本地实现与 development 云端验收

- 状态：`ACCEPTED`。
- 背景：当前没有真实 CloudBase development 配置，不能把内存行为冒充平台能力。
- 决策/原因：M1.2-A 实现共享契约、领域服务、HMAC、内存事务、处理器、客户端状态和自动
  测试；不提供可部署入口、不建集合。根 `shared/` 继续作为契约唯一源，并生成
  `miniprogram/shared/` 与 `cloudfunctions/shared/contracts/` 两个运行时镜像。M1.2-A
  完成后 M1-02 保持 `IN_REVIEW`；只有 M1.2-B 在 development 验证可信身份、环境变量、
  真实事务/规则、部署与双平台冒烟后才可 `DONE`。
- 替代：等待云环境后一次实现；本地伪造 CloudBase SDK/配置并标完成。
- 后果：本地算法可审查且平台缺口可见；云端适配仍是明确门禁。
- 风险/复审：真实 SDK 入口和事务限制必须基于届时官方文档实现，不能照搬内存适配器细节。

复审结论：2026-07-27 已完成 M1.2-B development 云端验收和最终关门检查，满足本 ADR
设定的两阶段完成条件；M1-02 更新为 `DONE`。延后验证项目记录在最终 Closeout，不阻塞
本里程碑。

## ADR-029 M1.2-B 初始单 CloudBase Node SDK 方案

- 状态：`SUPERSEDED_BY_ADR_030`。
- 背景：M1.2-B 需要从每次云函数调用的可信 context 取得微信身份，并执行跨集合事务。
  每个函数必须独立部署，不能依赖函数目录之外的 shared 源；AppID/EnvId 已由产品负责人
  确认允许提交，但所有凭据必须留在云端。
- 决策/原因：
  - development 固定 AppID `wxc061682046272324`、EnvId
    `cloud1-d1gh2crj26320f882`；两者是环境标识，不是授权凭证。
  - App 启动只执行 `wx.cloud.init({env})`，身份保持 `ANONYMOUS`；三个身份函数只能由
    用户明确操作触发。
  - 服务端只直接依赖 `@cloudbase/node-sdk@3.18.3`，不同时直接引入第二套数据库 SDK。
    入口对每次调用执行 `parseContext(context)`，只从本次 context 投影
    `WX_OPENID/WX_APPID`，不读取或缓存进程级动态身份；数据库和 `runTransaction`
    使用同一 SDK。
  - `runTransaction` 的 SDK 内部重试参数固定为 `0`；Repository 只识别精确
    `DATABASE_TRANSACTION_CONFLICT`，领域服务总尝试最多三次，非冲突不重试。
  - `esbuild@0.28.1` 将业务/shared TypeScript 打进每个函数的根 `index.js`；
    `@cloudbase/node-sdk@3.18.3` 与 `ws@8.21.1` 作为精确外部依赖写入每个独立
    `package.json`，运行时目标为 Nodejs20.19。
- 替代：
  - `wx-server-sdk@3.0.1`：官方小程序示例使用该版本，但 2026-07-25 的本地
    `npm audit` 显示其固定旧 Node SDK 链路包含 12 项公告风险，其中 2 项 critical，
    因此不采用为部署基线。
  - 同时直接引入 `wx-server-sdk` 和 `@cloudbase/node-sdk`：职责重叠且增加身份/事务
    语义混用风险。
  - 手工复制 shared 或让部署入口跨目录引用：容易漂移或上传缺文件。
- 后果：三个函数包可以独立构建和加载，客户端身份字段不能成为授权依据；真实 HMAC
  密钥仍只通过函数环境变量注入。当前 Node SDK 基线的 `npm audit` 仍有 5 项传递依赖
  公告（1 moderate、4 high、0 critical），均来自 CloudBase SDK 链路；本阶段不使用
  任意外部 URL、代理、JWT 或客户端直传数据库表达式，但在真实部署评审和生产前必须
  复核上游修复版本，不能静默执行 `npm audit fix --force`。
- 官方依据：
  - CloudBase Node 云函数资源：
    <https://docs.cloudbase.net/cloud-function/resource-integration/cloudbase>
  - CloudBase 事务：
    <https://docs.cloudbase.net/en/database/transaction>
  - 云函数实例 context 安全：
    <https://docs.cloudbase.net/cloud-function/instance>
  - Nodejs20.19 运行时：
    <https://docs.cloudbase.net/en/cloud-function/runtime-support>
- 风险/复审：真实 context 字段、文档不存在返回、冲突错误码、事务隔离、在线安装依赖和
  Nodejs20.19 加载行为必须在 development 验收；任何 SDK 升级都要重新运行合约测试、
  构建加载检查和 `npm audit`。

复审结论：官方“小程序 `wx.cloud.callFunction` → 微信云函数”链路只明确保证
`wx-server-sdk.getWXContext()` 提供可信 `OPENID/APPID`，没有依据证明
`@cloudbase/node-sdk.parseContext(context)` 单独提供同等能力；该方案在 M1.2-B
独立审查中被判定为阻断并废弃。

## ADR-030 M1.2-B 分离微信可信身份与 CloudBase 数据库 SDK

- 状态：`ACCEPTED_DEVELOPMENT_VALIDATED`；生产依赖公告继续受 ADR-031 约束。
- 背景：M1.2-B 独立审查必须证明真实微信可信身份来源、Node 20 兼容和独立部署包。
  mock `context` 能解析并不能证明微信调用链真实可用；同时 Node SDK 的
  `DocumentReference.set/update` 参数形状必须与实际包一致。
- 决策/原因：
  - `wx-server-sdk@4.0.2` 只负责 `DYNAMIC_CURRENT_ENV` 初始化与每次调用
    `getWXContext()`；只投影 `OPENID/APPID`。`event`、普通第二参数 `context` 和客户端
    传入的身份字段均不参与授权，身份不做模块全局缓存。
  - 选择 4.0.2 是因为它是 2026-07-25 npm 官方 `latest`，仍提供
    `getWXContext()`，并把内部 CloudBase Node SDK 从 2.10.0 升到 3.17.2；
    CloudBase 教程中的 3.0.1 锁文件有 12 项公告（含 2 critical），不再采用。
  - `@cloudbase/node-sdk@3.18.3` 只负责数据库与 `runTransaction`；其 npm
    `engines` 为 Node >=12，适用于 Nodejs20.19。虽然 `wx-server-sdk` 内部也依赖
    Node SDK，但业务代码不从它取得数据库，避免两个数据库客户端混用。
  - `ws@8.21.1` 作为直接依赖只用于锁定 CloudBase SDK 的传递版本，不承担身份或业务。
  - Repository 遵循 Node SDK 的 `set(data)/update(data)` 扁平参数；禁止使用小程序
    数据库 API 风格的 `{data}` 包装。fake database 同步采用此形状，以免测试掩盖嵌套写入。
  - `runTransaction(..., 0)` 关闭 SDK 内部冲突重试；只把官方错误码
    `DATABASE_TRANSACTION_CONFLICT` 映射为领域冲突，总尝试最多三次。干净 development
    集合首次 ensure ×20 已验证唯一 user/mapping 结果；精确错误对象属性仍为后续观察项。
  - `cloudfunctions:check:isolated` 只复制 `index.js/package.json/package-lock.json`
    到系统临时目录，执行 `npm ci --omit=dev`、生产依赖树检查和入口加载后清理。
    三个包已在本机默认 Node 24 和临时 Node 20.19.6 下分别通过。
- 替代：
  - 继续 `parseContext(context)`：可信微信身份缺乏官方依据，拒绝。
  - 只用 `wx-server-sdk` 做身份和数据库：可减少直接 SDK，但会把 Repository 固定到
    其内部 3.17.2；本阶段保留最新独立 Node SDK 事务适配，职责明确。
  - 固定 `wx-server-sdk@3.0.1`：存在旧 CloudBase 依赖与 2 项 critical 公告，拒绝。
  - 使用 npm overrides 强行升级传递依赖：可能破坏官方 SDK 兼容，未经真实环境验证不采用。
- 后果：
  - 可信身份调用方式与官方微信云函数链一致；两个直接 SDK 的职责可审计。
  - 每个函数生产锁文件当前 `npm audit` 为 6 项公告：1 moderate、5 high、0 critical。
    代码不把客户端值用于 SDK URL、代理、JWT、数据库表达式或 WebSocket，但这不能消除
    上游公告；deployment 前必须复核新版或由产品负责人书面接受残余风险。
  - development 已验证真实可信微信身份、三个函数部署/调用、唯一 user/mapping 结果、
    客户端权限拒绝、政策幂等和脱敏日志；这些结果不自动外推到 staging/production。
- 官方依据：
  - 微信小程序调用云函数与 `getWXContext()`：
    <https://docs.cloudbase.net/recipes/add-cloud-function-wechat-miniprogram>
  - `wx-server-sdk` 官方 npm 包：
    <https://www.npmjs.com/package/wx-server-sdk>
  - CloudBase Node SDK 云函数资源：
    <https://docs.cloudbase.net/cloud-function/resource-integration/cloudbase>
  - CloudBase Node SDK 更新日志：
    <https://docs.cloudbase.net/en/api-reference/server/node-sdk/changelog>
  - Node SDK 数据更新参数：
    <https://docs.cloudbase.net/en/api-reference/webv2/database/update>
  - 事务与冲突：
    <https://docs.cloudbase.net/en/database/transaction>
  - 事务冲突错误码：
    <https://docs.cloudbase.net/en/error-code/DATABASE_TRANSACTION_CONFLICT>
  - Nodejs20.19 运行时：
    <https://docs.cloudbase.net/cloud-function/runtime-support>
- 风险/复审：真实 `getWXContext()`、AppID 关联、权限执行身份和 Node SDK 在线安装已在
  development 通过。精确事务冲突错误对象与 SDK 公告转为 staging/production 门禁；
  任一 SDK 升级必须重跑 adapter、Repository、构建、目标 Runtime 隔离加载和
  `npm audit`。

## ADR-031 限定接受 M1.2-B development 验收的 SDK 传递依赖风险

- 状态：`ACCEPTED_FOR_DEVELOPMENT_VALIDATION_ONLY`
- 日期：2026-07-25
- 决策人：产品负责人
- 背景：M1.2-B 本地审查确认，三个云函数的当前生产锁文件经
  `npm audit --omit=dev` 检出 6 项官方 SDK 传递依赖公告：1 moderate、5 high、
  0 critical。现有自动修复建议会破坏性降级 CloudBase SDK，未经真实环境验证不能采用。
- 决策：产品负责人书面接受上述剩余风险，但只用于完成 M1.2-B 的隔离 development
  CloudBase 环境验收。该接受使 M1.2-B 本地实现和 development 部署候选可以标记
  `PASS`，并仅解除 ADR-030 中“依赖公告阻止 development 部署候选通过”的条件；
  该风险接受本身不解除任何真实云端验证门禁，也不能单独把 M1-02 标记为 `DONE`。
- 强制边界：
  - 仅可使用独立 development CloudBase 环境和测试数据；
  - 不向正式用户开放，不得用于 staging 或 production；
  - 不开放 HTTP 或其他公网调用入口；
  - 数据库客户端禁止直接读写；
  - 云函数只允许关联的小程序调用，并使用最小权限；
  - 不因本风险接受放宽 OpenID、HMAC 密钥、AppSecret、日志或数据权限约束。
- 到期与复审：
  - 本风险接受只在 M1.2-B development 验收期间有效；
  - 上线前必须重新执行 `npm audit`；
  - 上线前必须升级到已修复的官方 SDK 版本，或重新完成安全评估并形成新的正式决策；
  - staging、production 或面向真实用户的任何使用都必须重新审批，不能继承本记录。
- 后果：
  - M1.2-B 本地代码审查结论可由 `CONDITIONAL_PASS` 更新为 `PASS`；
  - 2026-07-27 真实 development 验收及其他 blocker 已独立完成，M1-02 因完整
    Closeout 而更新为 `DONE`，不是因为风险接受本身；
  - staging、production 或正式用户场景仍不得继承本风险接受。

## ADR-032 接受 M1.2 development 的 Nodejs16.13 Runtime 平台偏差

- 状态：`ACCEPTED_DEVELOPMENT_DEVIATION`
- 日期：2026-07-27
- 决策人：产品负责人
- 背景：
  - M1.2-B 原计划以 `Nodejs20.19` 作为三个身份云函数的目标 Runtime，三个独立部署包
    的 `engines.node` 和构建目标继续表达该 staging/production 目标。
  - development 中已经创建并完成主链路验证的 `authEnsureUser`、`accountGetMe`、
    `accountAcceptPolicies` 实际 Runtime 均为 `Nodejs16.13`；CloudBase 控制台只展示
    Runtime，没有修改入口。
  - 使用 CloudBase CLI 对 `authEnsureUser` 进行了两次真实 canary：一次直接指定
    `runtime=Nodejs20.19`，一次使用仓库外、只声明函数名和 Runtime 的最小
    `cloudbaserc.json`。两次 CLI 均报告成功，但云端安全回读仍为 `Nodejs16.13`，
    且未观察到其他函数配置变化。
  - 腾讯云 SCF `UpdateFunctionConfiguration` 官方 API 将 `Runtime` 说明为创建时指定、
    目前不支持修改。继续尝试更新 existing function Runtime 不具备可靠的官方底层能力。
- 兼容性审计：
  - 三个当前 `index.js` 构建产物均通过 ES2021 语法解析；业务/shared 代码使用的 Node
    核心 API 仅包括 `node:crypto` 的 `createHmac` 和 `randomUUID`，两者均早于
    Node 16.13 可用。
  - 三个生产锁文件各包含 103 个依赖包；其中 49 个声明 Node engines，Node 16.13
    对全部声明范围均满足，没有生产依赖明确要求 Node >=18 或 >=20。
  - `@cloudbase/node-sdk@3.18.3` 声明 Node >=12；
    `wx-server-sdk@4.0.2` 未声明更高 Node engines，其内嵌
    `@cloudbase/node-sdk@3.17.2` 声明 Node >=12；`ws@8.21.1` 声明 Node >=10。
  - 三个函数已经在真实 development `Nodejs16.13` Runtime 上通过
    `authEnsureUser`、`accountGetMe`、`accountAcceptPolicies`、重复/并发 ensure、
    CurrentUserView、政策幂等和数据库权限负向验收。静态检查与真实执行未发现
    Node 16.13 兼容性阻断。
  - 三个函数自身的 `engines.node = "20"` 保留为新环境部署目标；本 ADR 是既有
    development 平台实例的显式例外，不把 Node 16 声明为项目通用支持版本。
- 决策：
  - 为避免删除并重建已经完成可信身份、数据库权限和事务主链路验证的 development
    身份基础设施，接受三个现有 development 函数继续使用 `Nodejs16.13`。
  - 原 M1.2 Final Review 中“development 必须为 Nodejs20.19”的 Runtime blocker
    降级为 `ACCEPTED_DEVELOPMENT_DEVIATION`，不再单独阻塞 M1-02。
  - 停止继续尝试修改 existing function Runtime；不因本决策删除或重建现有函数。
  - 不允许把 development 的 `Nodejs16.13` 配置直接复制到 staging 或 production。
  - staging/production 新建函数时必须显式选择 `Nodejs20.19`，或届时经项目批准的
    更新 LTS Runtime；若平台、SDK 或 Node 生命周期状态已经变化，优先选择通过复审的
    更新 LTS，而不是机械沿用旧目标。
- staging/production 门禁：
  - staging 创建前重新执行完整 Node Runtime compatibility review，包括业务 API、
    构建 target、三个生产锁文件 engines、隔离安装/入口加载、真实可信身份、事务和
    `npm audit --omit=dev`。
  - 必须在目标 Runtime 上重新运行三个函数的构建、隔离加载和真实 CloudBase 主链路
    验收；development 的 Node16 结果不能替代 staging/production 验收。
  - 任何 SDK 或锁文件变化都必须重新执行上述检查，不能继承本偏差决定。
- 风险与边界：
  - Node 16 已结束上游生命周期，不再接收官方安全修复；因此本偏差仅限隔离
    development 环境、测试数据和 M1.2 验收，不得面向正式用户。
  - 未声明 engines 的传递依赖不能仅凭静态元数据证明全部潜在路径兼容；当前接受依赖
    锁定版本、真实主链路成功和自动门禁的组合证据，并保留 staging 前复审门禁。
  - 本 ADR 只处理 Runtime blocker，不解除 ADR-031 的 SDK 公告边界，不处理其他
    M1.2 Final Review blocker。其他 blocker 于 2026-07-27 独立完成后，M1-02 才更新为
    `DONE`。
- 官方依据：
  - CloudBase Runtime 支持：
    <https://docs.cloudbase.net/cloud-function/runtime-support>
  - 腾讯云 SCF 更新函数配置：
    <https://cloud.tencent.com/document/product/583/18580>
  - Node.js Runtime 生命周期：
    <https://nodejs.org/en/about/eol>
  - Node.js `crypto.createHmac` 与 `crypto.randomUUID`：
    <https://nodejs.org/api/crypto.html>
  - CloudBase Node SDK：
    <https://www.npmjs.com/package/@cloudbase/node-sdk>

## ADR-033 M1.3 只建设 M2.1 必需的最小共享基础设施

- 状态：`ACCEPTED`
- 日期：2026-07-28
- 决策人：产品负责人、技术负责人
- 背景：原路线图把统一结果、校验、调用、日志、配置、analytics、页面状态、登录引导、
  skeleton、retry 和 operation state 都列入 M1.3。当前没有消费者能验证其中多数抽象；
  一次建设“完整通用基础设施平台”会扩大回归面，并可能提前固化错误的领域接口。
- 决策：
  - M1.3-A 只建立客户端 runtime response safety boundary：
    `CloudFunctionResult` envelope runtime validation、canonical `ErrorCode`、requestId、
    endpoint-specific success DTO parser 和 whitelist projection。
  - M1.3-B 只建立七种 canonical PageState 和人工 retry UI intent。unknown/invalid
    使用 unavailable-looking、`showRetry=false` 的无 action 安全 fallback。
  - 三个 M1.2 身份云函数 wire contract 与服务端实现保持不变；M1.3 不新增 CloudBase
    部署、集合、权限、环境变量、Secret 或 Runtime 变更。
  - 采用 YAGNI / first real consumer 原则：没有真实消费者的基础设施不提前泛化。
- 明确延后：
  - analytics：推迟到出现真实产品事件和同意/隐私边界的 Sprint；
  - timeout、automatic retry、exponential backoff、`UNKNOWN_AFTER_TIMEOUT` 和 operation
    state：推迟到出现真实读写操作、尤其是需要结果确认的写操作 Sprint；
  - skeleton system：推迟到真实页面布局和加载层级确定后；
  - P25 login prompt：推迟到首次匿名用户主动互动流程；
  - cloud-function middleware abstraction：推迟到出现多个真实领域函数并能证明共同
    middleware 边界后；
  - Template/Card/Greeting/Encounter/Contact schema：由各领域首次消费者 Sprint 建立；
  - staging integration：仍属于 M1.4。
- 替代：在 M1.3 一次完成 analytics、retry engine、timeout、operation state、middleware、
  skeleton 和登录引导；该方案因无真实消费者、回归面过大而拒绝。
- 后果：M1.3 消除了 M2.1 的共享安全边界 blocker；M2.1 仍必须等待 M1.4 等既有依赖完成
  并获得独立批准。每项 deferred 能力在首次真实需求出现时重新做 Scope/DoD；deferred
  是有意排期，不是 M1.3 blocker 或未偿还的实现承诺。
- 验证：M1.3-A、M1.3-B 均完成 Implementation、Independent Review、Fix/Re-Review、
  自动门禁和人工验收；最终基线为 23 个测试文件、161 项测试。
