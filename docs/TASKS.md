# 「碰一下名牌」M0—M5 可执行任务树

> 版本：M1.3 final v1.0｜日期：2026-07-28｜状态：M1-03 `DONE`
>
> 合法任务状态：`NOT_STARTED | READY | IN_PROGRESS | BLOCKED | IN_REVIEW | DONE`
>
> 当前规则：M0 已人工通过；M1-01、M1-02、M1-03 为 `DONE`；M1-04 及以后未开始。
> 关联：[范围](./MVP_SCOPE.md)｜[架构](./ARCHITECTURE.md)｜[测试](./TEST_PLAN.md)

## 1. 通用 DoR / DoD

DoR：范围、依赖、数据/状态、页面/API 验收、平台验证或适配层、明确不做、测试方式、P0 冲突均明确。DoD：实现范围内功能；格式/类型/测试实际通过；权限、幂等、页面状态和文档同步；无未说明 mock/真机缺口；形成可审查差异。任何 Sprint 未通过不得进入下一 Sprint。

每条任务字段顺序固定为：ID/名称/里程碑/Sprint/优先级/依赖/范围/不做/目录/集合/云函数/页面/验收/自动测试/手工测试/真机/风险/状态。

## 2. M0 规划与文档

### M0-01 需求映射与范围收敛

- 元数据：M0｜M0.1｜P0｜依赖 PRD、DEVELOPMENT_PLAN、CODEX_M0_PROMPT。
- 范围：P0/P1/P2、边界、页面—接口—数据—测试映射、歧义；不做工程/业务代码。
- 目录/集合/函数/页面：`outputs/tap-name-card-m0/*.md`；不建集合/函数/页面。
- 验收：所有 P0 入任务；AI=P1、NFC=P2；收藏/请求分离；回赠原子。
- 测试：自动做文档关键字/文件清单检查；人工对照 PRD 6/7/31/37/40；真机不适用。
- 风险：遗漏或范围漂移。状态：`DONE`。

### M0-02 架构与数据设计

- 元数据：M0｜M0.2｜P0｜依赖 M0-01。
- 范围：轻量架构、环境/密钥、集合、索引/唯一语义、状态机、事务、注销；不做建库。
- 目录：`ARCHITECTURE.md`、`DATA_MODEL.md`、`DECISIONS.md`；集合仅规划 15 个；函数/页面不实现。
- 验收：私密联系方式分离；pairKey/当前卡唯一；draft/pending/snapshot 隔离；CloudBase 替代方案明确。
- 测试：自动状态/集合/键覆盖；人工权限/事务复核；真机不适用。
- 风险：平台事务/唯一能力待验证。状态：`DONE`。

### M0-03 API、UI、测试与任务规格

- 元数据：M0｜M0.3｜P0｜依赖 M0-02。
- 范围：PRD 31 全函数、P01—P26、测试矩阵、A/B 脚本、任务树、审核摘要；不做实现/mock。
- 目录：`API_SPEC.md/UI_SPEC.md/TEST_PLAN.md/TASKS.md/M0_REVIEW_SUMMARY.md`；集合/函数/页面仅引用。
- 验收：重点接口详细；P0 页面完整状态；P08/P26 隐藏；所有 P0 有测试。
- 测试：自动文件/函数/页面/状态一致性；人工源文档逐项核对；真机不适用。
- 风险：跨文档术语漂移。状态：`DONE`。

## 3. M1 工程基础与身份

### M1-01 原生工程初始化

- 元数据：M1｜M1.1｜P0｜依赖 M0 人工通过。
- 范围：原生 TS 小程序、目录、包管理、格式/类型/测试、example 配置、README；不做业务/AI/NFC/真实审核。
- 目录：根配置、`miniprogram/`、根 `shared/` 唯一源、`miniprogram/shared/` 运行时镜像、`tools/`、`cloudfunctions/README.md`、`tests/`；集合/函数/页面：无业务实现，只有工程初始化页。
- 验收：本地格式、Lint、类型与 21 个单元测试通过；锁文件存在；无密钥；跨根依赖和页面未注册问题已修正；微信开发者工具复验通过。
- 测试：`shared:check`、小程序导入边界、页面注册文件、`format:check`、`lint`、`typecheck`、`vitest run` 已通过；开发者工具成功编译并显示 foundation 页面，四种基础状态和 Retry 交互正常。
- 风险：未配置真实 CloudBase，属于 M1.2 独立接入范围，不影响 M1.1 工程初始化验收。状态：`DONE`。

### M1-02 云环境与身份

- 元数据：M1｜M1.2｜P0｜依赖 M1-01。
- 范围：四环境映射、可信身份、协议、账号状态、匿名/登录分离；不做名牌业务。
- 目录：`miniprogram/services/auth.ts`、`miniprogram/state/auth.ts`、三个身份处理器、
  `cloudfunctions/shared/auth|db`、根 shared 契约及两个运行时镜像；development 集合
  `users/identity_mappings`。完整 `accountDelete` 与 P23 注销在 M4-05 实现。
- M1.2-A 已完成：HMAC identityKey、CurrentUserView 白名单、内存原子事务、最多三次
  冲突退避、独立政策确认、客户端状态/手动探针；应用启动和匿名浏览不建号。
- M1.2-B local 已完成：development AppID/EnvId 配置、`wx.cloud` 初始化和 caller、
  按调用 `wx-server-sdk.getWXContext()` 解析可信微信身份、CloudBase Repository、
  四项环境变量门禁、三个 `main` 入口、自包含 Nodejs20 目标构建包及隔离生产依赖加载测试。
- 本地验收：首次幂等、50 路并发仅一条 user/mapping、OpenID/密钥不返回、
  ACTIVE/RESTRICTED/DELETED 映射、政策原子/幂等、客户端调用边界、SDK adapter、
  fake CloudBase 事务和部署包自动测试。
- M1.2-B development 已完成：三个函数部署和收紧后的调用权限、可信微信身份、
  HMAC Secret 轮换、`v1/v1` 政策、CurrentUserView、客户端集合权限拒绝、脱敏日志和
  干净集合首次 ensure ×20。真实数据库最终只有一个相互一致的 user/mapping，
  mapping 不含原始 OpenID。
- Runtime：三个现有 development 函数运行 `Nodejs16.13`，由 ADR-032 作为
  development-only 偏差接受；staging/production 新建函数必须使用 `Nodejs20.19`
  或届时批准的更新 LTS Runtime。
- 延后验证：RESTRICTED/DELETED 真实状态、iPhone/Android 双账号 smoke、精确
  `DATABASE_TRANSACTION_CONFLICT` 平台行为、SDK advisory staging/production
  前升级或复审；均不阻塞 M1-02。状态：`DONE`。

### M1-03 共享基础设施

- 元数据：M1｜M1.3｜P0｜依赖 M1-02。
- 范围：客户端 runtime response safety boundary 和最小七状态 PageState；不做领域流程、
  analytics、timeout/自动重试、operation state、skeleton、P25 login prompt 或 middleware。
- 目录：根 `shared/errors|types|validation` 唯一源及两个生成镜像、
  `miniprogram/services/cloud.ts|auth.ts`、`components/page-state`、Foundation 验收入口和测试；
  集合/云函数无新增，三个身份云函数服务端 contract/逻辑不变。
- 验收：远端 envelope/requestId/error/success data 均运行时验证；三个身份 endpoint 使用
  白名单 DTO parser；远端私有/错误字段不进入 state/UI；七种 PageState、正确 retry
  可见性和 unknown 无 action fallback；匿名启动不自动建号。
- 自动测试：runtime primitives、malformed envelope matrix、canonical ErrorCode、安全错误、
  三个 endpoint parser、恶意额外字段、requestId、七状态、retry intent、Foundation、
  M1.2 工具保留和匿名启动；最终 23 个文件、161 项测试，完整门禁通过。
- 手工测试：真实 development 身份 response compatibility `PASS`；微信开发者工具
  page-state/retry/invalid fallback/匿名启动与 M1.2 工具保留 `PASS`。
- 风险：shared 镜像漂移由 `shared:check` 阻止；NaN 独立 case 为 Final Review
  LOW/non-blocking。状态：`DONE`。

### M1-04 M1 验收与 staging 接入

- 元数据：M1｜M1.4｜P0｜依赖 M1-03。
- 范围：CI/等价检查、staging 说明、M1 记录；不做 M2。
- 目录：测试/文档/配置；无新集合/函数/页面。
- 验收：格式/类型/测试全绿、四环境隔离、无密钥、文档一致。
- 测试：全量命令；开发者工具和 staging 冒烟；iPhone/Android 登录。
- 风险：未说明 mock/平台缺口。状态：`NOT_STARTED`。

## 4. M2 模板、编辑器与发布

### M2-01 模板注册与渲染

- 元数据：M2｜M2.1｜P0｜依赖 M1-04。
- 范围：Schema、六模板、共享渲染、安全回退、版本/兼容；不做 L3/商城/AI。
- 目录：`templates/components/domain`；集合无；函数 templateList/templateGet；页面 P03—P05、P09 基础。
- 验收：4 社交+2 简历；类型拒绝；切换不删内容；旧版本可渲染。
- 测试：Schema/视觉夹具；六模板手工；iPhone/Android 渲染。
- 风险：版权、字体、跨端布局。状态：`NOT_STARTED`。

### M2-02 名牌 CRUD 与草稿

- 元数据：M2｜M2.2｜P0｜依赖 M2-01。
- 范围：cards/snapshots、CRUD、local/remote draft、冲突恢复；不做发布审核。
- 目录：card domain/service/cloudfunctions；集合 cards/card_snapshots；函数 cardList/Create/GetMine/UpdateDraft/Duplicate/Hide/Delete；页面 P02/P06/P07/P19。
- 验收：owner、上限、断网、幂等、逻辑删除、Token 随机。
- 测试：校验/修订/并发；杀进程恢复；双平台弱网。
- 风险：多设备冲突、上传临时引用。状态：`NOT_STARTED`。

### M2-03 社交编辑器

- 元数据：M2｜M2.3｜P0｜依赖 M2-02。
- 范围：必填、视觉主体、标签、模块、排序、上传、实时/完整预览；不做 AI/L3。
- 目录：P06/components/validators/uploads；集合 cards；函数 UpdateDraft；页面 P06/P09。
- 验收：无真人头像可发；模块/图片/字符限制；长按及上下移；隐藏不删除。
- 测试：所有模块边界/上传失败；编辑手工；双平台键盘/图片。
- 风险：长页性能、图片内存。状态：`NOT_STARTED`。

### M2-04 简历编辑器与联系人入口

- 元数据：M2｜M2.4｜P0｜依赖 M2-02。
- 范围：职业结构、项目子页、链接、私密联系人管理；不做 PDF/社交字段混用。
- 目录：P07/P22/components；集合 cards/user_contacts；函数 contactListMine/SaveMine/DeleteMine；页面 P07/P22/P09。
- 验收：技能或项目至少一项；私密联系人不进公开对象。
- 测试：项目/链接/联系人校验与越权；手工长表单；双平台二维码上传。
- 风险：公开链接与私密值边界。状态：`NOT_STARTED`。

### M2-05 发布、审核、版本与当前名牌

- 元数据：M2｜M2.5｜P0｜依赖 M2-03、M2-04。
- 范围：提交、审核适配、失败定位、不可变快照、旧版继续、当前卡；不做虚构平台 API。
- 目录：review adapter/functions/P09/P10；集合 cards/card_snapshots/notifications/users；函数 cardSubmitReview/cardSetCurrent；页面 P09/P10/P19/P21。
- 验收：未审核不公开；新版通过原子切换；一张当前卡。
- 测试：状态机/事务/失败注入；审核手工；staging 官方能力与双平台。
- 风险：审核异步语义、唯一事务。状态：`NOT_STARTED`。

## 5. M3 公开浏览、分享与收藏

### M3-01 匿名公开名牌

- 元数据：M3｜M3.1｜P0｜依赖 M2-05。
- 范围：Token、P11、完整状态、登录引导、举报入口；不做访客追踪。
- 目录：P01/P11/P25/public renderer；集合 cards/snapshots/blocks；函数 cardGetPublicByToken；页面 P01/P11/P25。
- 验收：匿名完整、不建号、不通知、字段白名单。
- 测试：公共 DTO/防枚举；匿名深链；iPhone/Android 分享打开。
- 风险：微信启动登录行为。状态：`NOT_STARTED`。

### M3-02 分享与小程序码

- 元数据：M3｜M3.2｜P0｜依赖 M3-01。
- 范围：固定/当前分享、码适配、失败兜底、来源；不做 NFC。
- 目录：share adapter/P02/P10/P11；集合 cards/snapshots；函数 shareGenerateMiniCode；页面 P02/P10/P11。
- 验收：正确名牌、不可枚举、失败有兜底。
- 测试：参数/权限；好友群扫码；双平台 staging 真链路。
- 风险：平台参数与码限制。状态：`NOT_STARTED`。

### M3-03 视觉名牌图片

- 元数据：M3｜M3.3｜P0｜依赖 M2-01、M3-02。
- 范围：三比例、内容/主题、Canvas 2D、可选码、相册权限；不做页面截图/服务端渲染除非 ADR。
- 目录：P18/export renderer；集合无新增；函数码服务；页面 P18。
- 验收：六模板、中英/Emoji/长文、iOS/Android 保存、无码降级。
- 测试：导出矩阵；人工像素对比；双平台真机。
- 风险：Canvas/字体/内存。状态：`NOT_STARTED`。

### M3-04 收藏

- 元数据：M3｜M3.4｜P0｜依赖 M3-01。
- 范围：静默收藏、列表、快照、失效状态；不做通知/请求/相遇。
- 目录：collection functions/P11/P20；集合 collections/snapshots；函数 collectionList/Add/Remove；页面 P11/P20。
- 验收：唯一、取消/恢复、删除卡保留快照、零社交副作用。
- 测试：并发/集合计数；双账号静默验证；双平台。
- 风险：产品概念误合并。状态：`NOT_STARTED`。

## 6. M4 社交闭环

### M4-01 认识请求

- 元数据：M4｜M4.1｜P0｜依赖 M3-04。
- 范围：发/收/详情/取消/拒绝/过期/通知；不做聊天/已读/自动收藏。
- 目录：greeting functions/P12/P13/P21；集合 greetings/snapshots/notifications/blocks；函数 greetingSend/ListIncoming/ListSent/GetDetail/Decline/Cancel；页面 P12/P13/P21。
- 验收：条件、30 天、同一用户对无论方向唯一 PENDING、无提前相遇。
- 测试：状态/同向与反向并发/过期/拉黑；A/B 发起；双平台通知内页。
- 风险：方向性重复、过期任务。状态：`NOT_STARTED`。

### M4-02 原子接受并回赠

- 元数据：M4｜M4.2｜P0｜依赖 M4-01、平台事务 Spike。
- 范围：单一 greetingReturnCard、RETURNED、pairKey encounter、首次事件、兴趣、通知；不做单独接受。
- 目录：transaction/domain/P14；集合 greetings/encounters/events/snapshots/notifications；函数 greetingReturnCard；页面 P14/P16。
- 验收：失败无半状态；重复一个相遇/通知；已有 encounter 不覆盖首次快照；不改当前卡。
- 测试：逐步故障注入/并发；A/B 回赠；双平台结果确认。
- 风险：跨集合原子性（高）。状态：`NOT_STARTED`。

### M4-03 相遇、共同兴趣与备注

- 元数据：M4｜M4.3｜P0｜依赖 M4-02。
- 范围：列表/详情、历史快照、可解释共同点、私人备注、对自己隐藏、首次事件；不做 P1 新增事件/分享。
- 目录：encounter functions/P15/P16；集合 encounters/events/notes/snapshots；函数 encounterList/GetDetail/UpdateNote/HideForMe；页面 P15/P16。
- 验收：pairKey 唯一；备注隔离；兴趣只用允许字段。
- 测试：权限/标准化/快照；A/B/C；双平台列表/详情。
- 风险：双方视图与隐私投影。状态：`NOT_STARTED`。

### M4-04 联系方式交换

- 元数据：M4｜M4.4｜P0｜依赖 M4-03、M2-04。
- 范围：申请/接受/拒绝/撤回/撤销/冷却/共享读取；不做自动全量共享。
- 目录：contact functions/P17/P22；集合 contacts/contact_requests/encounters/blocks/notifications；函数全部 contactRequest* 和 contactGetShared；页面 P16/P17/P22/P21。
- 验收：ACTIVE 前置、双方选择、未选项不返回、撤销/拉黑后关闭。
- 测试：权限矩阵/事务/敏感缓存；A/B/C；双平台。
- 风险：私密泄露（最高）。状态：`NOT_STARTED`。

### M4-05 安全、通知与注销闭环

- 元数据：M4｜M4.5｜P0｜依赖 M4-04。
- 范围：通知已读、拉黑/解除、举报证据、注销清理；不做运营大后台/订阅消息。
- 目录：notification/safety/account functions/P21/P23/P24；集合 notifications/blocks/reports及关联集合；函数 notification*/safety*/accountDelete；页面 P21/P23/P24。
- 验收：拉黑无通知且关闭交互、撤销已接受联系方式的站内展示；解除仅在双方无 block 时恢复 encounter ACTIVE，不复活旧请求/共享；举报快照；注销 Token/联系失效、历史仅快照。
- 测试：故障恢复/权限/留存；A/B/D；双平台注销与深链。
- 风险：清理一致性、合规期限。状态：`NOT_STARTED`。

## 7. M5 P1 与上线质量

### M5-01 AI 表达助手（P1）

- 元数据：M5｜M5.1｜P1｜依赖 P0 闭环稳定。
- 范围：适配层、三模式、三候选、确认写入、最小上下文、用量；不做强制/自动发布/人格诊断。
- 目录：AI adapter/P08；集合 ai_usage；函数 aiAssistCardField；页面 P08/P06/P07。
- 验收：失败不阻塞；不发送私密数据；用户确认才写。
- 测试：结构/安全/限额；人工语气；真机非阻断体验。
- 风险：隐私、幻觉、成本。状态：`NOT_STARTED`。

### M5-02 安全、性能与无障碍

- 元数据：M5｜M5.2｜P0 放行质量 + P1 增强｜依赖 M4-05。
- 范围：权限复核、防刷、分页、图片性能、键盘/安全区/放大/减少动态/链接安全；不加新产品域。
- 目录：全局；集合/函数/页面全 P0。
- 验收：无越权、首屏可接受、动画可关、关键操作可用。
- 测试：安全扫描/性能/无障碍矩阵；人工探索；双平台低端机。
- 风险：机型碎片。状态：`NOT_STARTED`。

### M5-03 真机全回归

- 元数据：M5｜M5.3｜P0 放行｜依赖 M5-02。
- 范围：PRD 37/40、A/B 脚本、弱网/重复/审核/安全；不接受仅工具通过。
- 目录：tests/manual/reports；全集合/函数/P0 页面。
- 验收：iPhone、Android、开发者工具、staging 全通过。
- 测试：全自动套件 + A/B/D 脚本；真机必需。
- 风险：平台/审核差异。状态：`NOT_STARTED`。

### M5-04 上线准备

- 元数据：M5｜M5.4｜P0 放行｜依赖 M5-03。
- 范围：协议/隐私、权限文案、审核材料、截图、版本、清理、production、回滚/限制；不做 P2 NFC。
- 目录：docs/config/release；生产关联；全核心页面冒烟。
- 验收：阻断清零、配置隔离、回滚演练、已知限制真实。
- 测试：production 前检查/冒烟；人工审核包；双平台发布候选。
- 风险：审核/合规/错误环境。状态：`NOT_STARTED`。

## 8. 覆盖索引

- P01—P25 P0 分布于 M1—M4；P08 在 M5-01，P26 P2 未排入 MVP 实现。
- PRD 31.2 所有 P0 函数均映射到 M1—M4；`encounterAddEvent` 与 AI 为 P1，`nfc*` 为 P2。
- P0 集合均映射；`ai_usage/nfc_devices` 不在 P0 建库。
- 每个 P0 域都有自动、手工和对应真机要求；详细用例见 TEST_PLAN。
