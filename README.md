# 碰一下名牌

「碰一下名牌」是一个微信原生小程序 MVP，帮助用户创建高度视觉化的个人名牌，并在真实社交场景中完成自我介绍与破冰。

当前仓库已完成 **M1.2-A 身份本地实现**：包含共享身份契约、服务端 HMAC
身份键、内存事务仓储、三个身份处理器、客户端调用/状态映射及自动测试。当前没有真实
CloudBase 入口、数据库或已部署云函数；名牌、模板、收藏、认识请求、相遇、联系方式、
AI 和 NFC 均未实现。M1-02 在 development 云端验收前保持 `IN_REVIEW`。

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
3. 在开发者工具中选择或填写自己的 AppID；仓库内的 `touristappid` 仅用于无真实密钥的工程导入基线。
4. 不要提交生成的 `project.private.config.json`。

仓库提供 `local`、`development`、`staging`、`production` 四环境的类型和安全空配置。
M1.2-A 不初始化云开发。真实 CloudBase 环境 ID、OpenID 和身份 HMAC 密钥不进入仓库，
也不得进入小程序包。示例结构见：

- `miniprogram/config/env.ts`
- `miniprogram/config/env.example.ts`

未配置云环境时，基础页会显示明确提示；只有点击 M1.2-A 手动身份探针才调用安全失败
适配器，应用启动不会尝试云开发或静默建号。

## 微信开发者工具导入

1. 打开微信开发者工具并选择“导入项目”。
2. 项目目录选择本仓库根目录。
3. 确认小程序目录识别为 `miniprogram/`。
4. 无正式 AppID 时先使用仓库配置进行基础导入；需要真实平台能力时改用自己的 AppID。
5. 编译后应看到标题为“本地身份基础页”的页面。
6. 页面应展示当前环境、云开发未配置提示、四种基础状态和 M1.2-A 手动身份探针。

`project.config.json`、原生 TypeScript、页面注册与两套根目录识别已在 M1.1/M1.2-A
微信开发者工具人工验收中通过。若开发者工具后续调整或移除字段，应重新验证并记录到
`docs/DECISIONS.md`，不得凭经验扩展配置。

## 本地验证

```powershell
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
```

这些命令必须真实执行。命令存在不代表检查通过。

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
- `cloudfunctions/`：M1.2-A 本地处理器、服务端领域逻辑和内存仓储；没有可部署入口。
- `shared/`：公共定义和工具的唯一源。
- `tools/`：共享契约同步与一致性检查脚本。
- `tests/`：M1.1 单元测试及 M1.2-A 身份单元/本地集成测试。
- `docs/`：产品、架构、测试和任务基线。

## 换一台 Windows 电脑继续

1. 安装 Git、Node.js 24.x、npm 11.x 和微信开发者工具。
2. 克隆私有仓库并进入项目根目录。
3. 执行 `npm.cmd ci`。
4. 复制 `project.private.config.json.example`。
5. 运行全部四项质量命令。
6. 用微信开发者工具导入仓库根目录并编译工程初始化页。
7. 确认 Git 状态中没有 `project.private.config.json`、真实 AppID、环境 ID 或密钥。

## 常见问题

### 未配置 CloudBase 时为什么身份探针返回 UNAVAILABLE？

这是 M1.2-A 的预期行为。本地阶段不会伪造微信可信上下文，也没有创建 `users` 或
`identity_mappings` 集合。真实 development 环境适配、事务和部署属于 M1.2-B
`NEEDS_VALIDATION`。

### 为什么页面不是正式首页？

它仅用于证明原生小程序骨架、组件和配置可以工作。正式产品页面属于后续 Sprint。

### 为什么 WXML/WXSS 没有由 Prettier 格式化？

当前 Prettier 基线只检查其原生支持的文件。WXML/WXSS 由工程约定和微信开发者工具编译验证，未引入额外格式化插件。

### 可以在配置文件中加入真实 AppSecret 吗？

不可以。AppSecret、AI Key 和其他服务端密钥只能放在受控云端环境变量中，绝不能进入客户端或 Git。
