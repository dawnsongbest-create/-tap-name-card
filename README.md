# 碰一下名牌

「碰一下名牌」是一个微信原生小程序 MVP，帮助用户创建高度视觉化的个人名牌，并在真实社交场景中完成自我介绍与破冰。

当前状态：M0、M1.1—M1.4、M2.1-A Template Domain / Schema / Registry、M2.1-B1
Renderer Foundation、Apple Minimal、Magazine 与 FT-01 Gallery / Preview / Select 实现均已
完成。Original Social B2 为 `PARTIALLY_DELIVERED / REBASELINED`；Scrapbook、Anime Role 与
Original B3 Resume 为 `POST_MVP_DEFERRED`。FT-01 用户视觉 Review 已
`APPROVED_FOR_FIRST_MVP`，当前状态为 `READY_FOR_INDEPENDENT_REVIEW`；Independent Review、
Commit 与 Push 尚未完成，A-01 implementation 尚未授权。

M2.1-A 在 `miniprogram/templates/` 内建立本地模板领域：`TemplateDefinition v1`、
`TemplateRegistryEntry`、`RenderModel v1`、六个稳定模板定义、运行时领域校验，以及
generic registry / production catalog 分离的本地同步 registry。模板契约没有进入根
`shared/` 或生成镜像。M2.1-B1 在该领域上建立单一公共 `CardRenderer`、唯一 raw parsing
ingress、typed preparation/capability boundary、精确静态 renderer binding、renderer-neutral
`PreparedCardViewModel`、24 个确定性 fixtures、development-only Renderer Lab，以及六个
最小 child renderer shells。此后 Apple Minimal 与 Magazine 已分别完成正式视觉交付；
其余四个 shell 继续作为延期模板的架构 binding 保留。B1 CloudBase Impact 为 `NONE`。

FT-01 增加本地确定性的 Launch Catalog 与产品预览模型，并把 Gallery 设为冷启动首页。产品
UI 仅投影 Apple Minimal / Magazine，Gallery 只提供“查看完整预览”，Preview 使用现有
`CardRenderer` 并以固定底部操作区确认选择。选择交接严格为 `templateId/templateVersion`；
FT-01 不登录、不建号、不建 Card、不持久化，也不调用网络或 CloudBase。

## Fast-track MVP 基线

- Launch Catalog：`T-SOCIAL-01` Apple Minimal、`T-SOCIAL-02` Magazine。
- ALPHA：Gallery → Preview → Select → Editor → Draft → Publish → Share → Anonymous View。
- FIRST MVP LAUNCH：Alpha + Greeting → Return → Encounter → Contact Exchange，再完成
  safety、moderation、privacy、production CloudBase、iPhone/Android、release hygiene 与
  WeChat Review。
- 首发分享：微信原生分享 → deep link → 匿名公开名牌。Mini Program Code 与
  1:1 / 3:4 / 9:16 visual export matrix 为 Post-launch。
- Collection：继续 silent / one-way / private，并与 Greeting 独立；可排在 First MVP 后段或
  Post-launch。
- Draft：Alpha 采用 local autosave、明确 saving/saved/failed、登录 owner 云草稿、
  kill/relaunch recovery、basic revision protection 与 idempotent save；复杂多设备冲突 UX
  后置。
- 架构：六个稳定 template ID、六份 TemplateDefinition、六条 registry entry、六个 renderer
  binding/shell 与 architecture regression tests 全部保留，底层 registry 不缩为两模板。
- Node 20：`CLOUDFUNCTION_ISOLATED_GATE = KNOWN_ENVIRONMENT_LIMITATION`，不阻塞 FT-01、
  A-01 planning 或当前 MVP development；FT-01 未重新处理 Node 20。

M1.2 已完成 CloudBase development 身份基础：共享身份契约、服务端 HMAC 身份键、
CloudBase Repository、`wx-server-sdk.getWXContext()` 可信微信上下文适配、三个独立云函数、
客户端 `wx.cloud` 初始化/调用、本地自动测试和真实 development 验收均已通过。development
已部署 `authEnsureUser`、`accountGetMe`、`accountAcceptPolicies`，并创建客户端不可读写的
`users` 与 `identity_mappings`。

M1.3 已建立客户端远端响应运行时安全边界和最小 PageState 基础：运行时响应校验、
三个身份 endpoint 的 success DTO parser、canonical `ErrorCode` 运行时边界、安全
`CloudFunctionResult` normalization、七种 canonical PageState，以及只表达用户意图的
retry 事件。M1.3 closeout 基线为 23 个测试文件、161 项测试。M1.3 没有新增 CloudBase
部署、集合或服务端函数；在 M1.3 closeout 时，名牌、模板、收藏、认识请求、相遇、
联系方式、AI 和 NFC 尚未实现。

M1.4 作为 M2 Entry Readiness / Foundation Acceptance Sprint 完成了当前 `main` HEAD
回归、development CloudBase 只读漂移检查、微信开发者工具聚焦回归、M1 Foundation
Acceptance 和 M2 Entry Gate 关闭。本 Sprint 没有产品代码修改或 CloudBase mutation。
staging 不是未来 M2.1 implementation approval 的前置条件，但必须在 external testing
前建立并通过独立安全门禁。

## 环境要求

- Windows 10/11
- Node.js 24.x（本仓库 `.nvmrc` 固定为 24.14.0）
- npm 11.x
- 微信开发者工具（用于导入与编译验证）
- Git

在 PowerShell 执行策略阻止 `npm.ps1` 时，请使用下文的 `npm.cmd` 命令，不需要修改系统执行策略。

## 安装依赖

```powershell
npm.cmd ci
```

锁文件必须保留在仓库中。不要删除锁文件后声称使用了相同的依赖基线。

## 本地配置

1. 复制 `project.private.config.json.example` 为 `project.private.config.json`。
2. 使用微信开发者工具打开仓库根目录。
3. 确认项目 AppID 为 `wxc061682046272324`。
4. 不要提交生成的 `project.private.config.json`。

仓库提供 `local`、`development`、`staging`、`production` 四环境。当前开发构建选择
`development`，显式配置 EnvId `cloud1-d1gh2crj26320f882`；`local`、`staging` 和
`production` 继续关闭云能力。AppID 和 EnvId 是客户端可见的环境标识，不是授权凭证。
OpenID、AppSecret、身份 HMAC 密钥和其他凭据不得进入仓库或小程序包。配置见：

- `miniprogram/config/env.ts`
- `miniprogram/config/env.example.ts`

App 启动只执行 `wx.cloud.init`，身份状态保持 `ANONYMOUS`，不会调用三个身份云函数。
只有点击 foundation 页的手动身份探针才发起身份请求。初始化或调用失败会返回安全失败，
不会白屏或伪装成真实云能力。

development 三个现有函数实际运行 `Nodejs16.13`，这是 ADR-032 限定的 development
平台偏差；不得复制到 staging/production。新建 staging/production 函数必须显式选择
`Nodejs20.19` 或届时经项目批准的更新 LTS Runtime。development 当前政策版本为
`TERMS_VERSION=v1`、`PRIVACY_VERSION=v1`。

## 微信开发者工具导入

1. 打开微信开发者工具并选择“导入项目”。
2. 项目目录选择本仓库根目录。
3. 确认小程序目录识别为 `miniprogram/`。
4. 确认开发者工具已关联 development 环境。
5. 编译后应看到“选择你的名牌”Gallery。
6. Gallery 应只展示 Apple Minimal / Magazine，并且每张卡只有“查看完整预览”产品操作；
   Foundation 工程页仍可通过 `pages/foundation/index` 直接打开。

M2.1-B1 已在 WeChat DevTools Stable `v2.01.2510290`、基础库 `3.17.0` 完成真实本地
compile、`CardRenderer` mount、六 shell dispatch、24 fixture/scenario matrix、
ready/failure 双向切换、stale-state cleanup 和 Lab 本地切换验证。该验证不包含 Preview、
Upload、正式六模板视觉或产品路由。

FT-01 已在 WeChat DevTools `v2.02.2607171`、基础库 `3.17.0` 完成冷启动、Gallery、
Apple/Magazine Preview / Select、非法/延期/版本路由、滚动、safe-area 与 Foundation 直达
回归验证；用户已接受当前 First MVP 视觉。精确 iPhone / Android device matrix 继续属于
Launch Hardening，不再阻塞 FT-01 Independent Review。

`project.config.json`、原生 TypeScript、页面注册与两套根目录识别已在 M1.1/M1.2-A
微信开发者工具人工验收中通过。若开发者工具后续调整或移除字段，应重新验证并记录到
`docs/DECISIONS.md`，不得凭经验扩展配置。

## 本地验证

```powershell
npm.cmd run shared:check
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run cloudfunctions:check
npm.cmd run cloudfunctions:check:isolated
```

这些命令必须真实执行。命令存在不代表检查通过。当前 FT-01 Review 基线为 36 个测试文件、
294 项测试。
`cloudfunctions:check:isolated` 会在系统临时目录按各函数锁文件安装生产依赖、检查完整
依赖树并加载入口；它不连接或部署 CloudBase。

## 共享代码与微信编译边界

仓库根目录 `shared/` 是共享 TypeScript 契约和工具的唯一源。微信开发者工具不能编译
`miniprogramRoot` 之外的相对导入，因此小程序运行时使用生成的
`miniprogram/shared/` 镜像；云函数本地代码使用生成的
`cloudfunctions/shared/contracts/` 镜像。服务端身份、HMAC 和仓储实现不进入根共享源。

修改根目录 `shared/` 后执行：

```powershell
npm.cmd run shared:sync
```

`format:check`、`lint` 和 `typecheck` 会先执行 `shared:check`。镜像缺失或过期时检查会
失败，不得直接编辑两个生成镜像中的 `.ts` 文件。

## 目录说明

- `miniprogram/`：微信原生小程序代码、工程初始化页、本地模板领域/registry，以及
  M2.1-B1 CardRenderer Foundation。
- `miniprogram/shared/`：供微信编译器使用的生成镜像，不是第二份源代码。
- `cloudfunctions/`：身份领域层、微信可信身份、CloudBase 事务适配和三个可独立构建的云函数入口。
- `shared/`：公共定义和工具的唯一源。
- `tools/`：共享契约同步、云函数构建与部署边界检查脚本。
- `tests/`：M1 工程/身份/运行时边界测试，以及 M2.1-A/B1 模板领域、renderer preparation、
  capability、binding、fixture/Lab 和架构 invariant 测试。
- `docs/`：产品、架构、测试和任务基线。

## 换一台 Windows 电脑继续

1. 安装 Git、Node.js 24.x、npm 11.x 和微信开发者工具。
2. 克隆私有仓库并进入项目根目录。
3. 执行 `npm.cmd ci`。
4. 复制 `project.private.config.json.example`。
5. 运行全部四项质量命令。
6. 用微信开发者工具导入仓库根目录并编译工程初始化页。
7. 确认 Git 状态中没有 `project.private.config.json`、OpenID、AppSecret、HMAC 密钥或其他凭据。

## 常见问题

### 为什么手动身份探针仍可能返回 UNAVAILABLE？

真实 development 身份主链路已经通过验收。`local` 环境会按设计保持云能力关闭；在
development 中，环境未关联、函数配置缺失、调用权限、网络或平台失败仍会安全映射为
不可用，不会把失败伪装成已认证。按运行手册核对环境和三个函数，不要在客户端加入
OpenID、Secret 或绕过权限的兜底。

### 为什么页面不是正式首页？

它仅用于证明原生小程序骨架、组件和配置可以工作。正式产品页面属于后续 Sprint。

### 为什么 WXML/WXSS 没有由 Prettier 格式化？

当前 Prettier 基线只检查其原生支持的文件。WXML/WXSS 由工程约定和微信开发者工具编译验证，未引入额外格式化插件。

### 可以在配置文件中加入真实 AppSecret 吗？

不可以。AppSecret、AI Key 和其他服务端密钥只能放在受控云端环境变量中，绝不能进入客户端或 Git。

完整人工部署顺序见
[`docs/runbooks/CLOUDBASE_DEVELOPMENT.md`](docs/runbooks/CLOUDBASE_DEVELOPMENT.md)。
