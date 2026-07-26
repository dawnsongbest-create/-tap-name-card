# 碰一下名牌

「碰一下名牌」是一个微信原生小程序 MVP，帮助用户创建高度视觉化的个人名牌，并在真实社交场景中完成自我介绍与破冰。

当前仓库已完成 **M1.2 云环境与身份**：共享身份契约、服务端 HMAC 身份键、
CloudBase Repository、`wx-server-sdk.getWXContext()` 可信微信上下文适配、三个独立云函数、
客户端 `wx.cloud` 初始化/调用、本地自动测试和真实 development 验收均已通过。development
已部署 `authEnsureUser`、`accountGetMe`、`accountAcceptPolicies`，并创建客户端不可读写的
`users` 与 `identity_mappings`。M1-02 状态为 `DONE`；M1.3 尚未开始，名牌、模板、收藏、
认识请求、相遇、联系方式、AI 和 NFC 均未实现。

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
5. 编译后应看到工程身份基础页。
6. 页面应展示 development 已配置提示、四种基础状态和手动身份探针。

`project.config.json`、原生 TypeScript、页面注册与两套根目录识别已在 M1.1/M1.2-A
微信开发者工具人工验收中通过。若开发者工具后续调整或移除字段，应重新验证并记录到
`docs/DECISIONS.md`，不得凭经验扩展配置。

## 本地验证

```powershell
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run cloudfunctions:check
npm.cmd run cloudfunctions:check:isolated
```

这些命令必须真实执行。命令存在不代表检查通过。
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

- `miniprogram/`：微信原生小程序代码和工程初始化页。
- `miniprogram/shared/`：供微信编译器使用的生成镜像，不是第二份源代码。
- `cloudfunctions/`：身份领域层、微信可信身份、CloudBase 事务适配和三个可独立构建的云函数入口。
- `shared/`：公共定义和工具的唯一源。
- `tools/`：共享契约同步、云函数构建与部署边界检查脚本。
- `tests/`：M1.1 单元测试及 M1.2 身份单元、本地集成和 development-only 验收工具测试。
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
