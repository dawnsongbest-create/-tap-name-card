# M1.1 工程初始化验收报告

> 任务：`M1-01-REVIEW`
>
> 日期：2026-07-25
>
> 结论：`CONDITIONAL_PASS`

## 1. 审查范围

本次仅审查并修正 M1.1 微信原生小程序工程初始化，包括工程结构、项目配置、Node.js 工具链、环境占位、基础页面状态、共享类型、安全错误、日志、测试和工程文档。

未进入 M1.2，未实现用户身份、登录、数据库集合、名牌、模板、收藏、认识请求、相遇、联系方式、AI、NFC 或其他产品业务。

## 2. 已读取和检查的文件

完整复核了：

- `C:\Users\26374\Downloads\CODEX_M1_1_PROMPT.md`
- `C:\Users\26374\Downloads\CODEX_M1_1_REVIEW_PROMPT.md`
- `AGENTS.md`
- `docs/PRD.md`
- `docs/DEVELOPMENT_PLAN.md`
- `docs/ARCHITECTURE.md`
- `docs/TASKS.md`
- `docs/DECISIONS.md`
- 当前全部已跟踪修改和未跟踪 M1.1 文件

逐文件检查了以下实现范围：

- 根目录：`.editorconfig`、`.gitattributes`、`.gitignore`、`.nvmrc`、`.prettierignore`、`README.md`
- 工具链：`package.json`、`package-lock.json`、`tsconfig.json`、`eslint.config.mjs`、`prettier.config.mjs`、`vitest.config.ts`
- 微信配置：`project.config.json`、`project.private.config.json.example`
- 小程序：`miniprogram/**`
- 云函数边界：`cloudfunctions/README.md`
- 共享基础：`shared/**`
- 自动测试：`tests/**`
- 工程文档：`docs/ARCHITECTURE.md`、`docs/TASKS.md`、`docs/DECISIONS.md`

`package-lock.json` 通过 `npm ci` 和 `npm ls --depth=0` 验证依赖闭包，没有逐行人工解释机器生成内容。

## 3. 命令与真实结果

PowerShell 的 `npm.ps1` 受本机执行策略限制，因此使用同一 npm 可执行程序的 `npm.cmd` 形式，没有修改系统执行策略。

| 命令                       | 最终退出码 | 结果                                                       |
| -------------------------- | ---------: | ---------------------------------------------------------- |
| `npm.cmd ci`               |          0 | 按锁文件安装 133 个包；审计 134 个包；0 个漏洞             |
| `npm.cmd run format:check` |          0 | 所有纳入范围的文件符合 Prettier                            |
| `npm.cmd run lint`         |          0 | ESLint 无错误、无警告                                      |
| `npm.cmd run typecheck`    |          0 | `tsc --noEmit` 通过                                        |
| `npm.cmd test`             |          0 | 7 个测试文件、21 个测试全部通过                            |
| `npm.cmd run shared:check` |          0 | 根 `shared/` 与 17 个小程序运行时镜像文件完全一致          |
| `npm.cmd ls --depth=0`     |          0 | 顶层依赖完整，无缺失或无效依赖                             |
| `git diff --check`         |          0 | 最终无空白错误或换行警告                                   |
| 密钥关键词扫描             |          0 | 命中均为公开 `touristappid`、占位名称、禁止说明和测试假值  |
| 范围外实现扫描             |          0 | 仅 `cloudfunctions/README.md` 的禁止说明命中；没有业务实现 |

首次在受限沙箱内运行 `npm.cmd ci` 时，由于无法读取 `C:\Users\26374\AppData\Local\npm-cache`，以 `EPERM` 和退出码 1 结束。获得允许访问本机 npm 缓存后，使用相同命令重新执行并成功；这不是依赖或锁文件错误。

首次审查修正前的基线检查同样通过，当时为 6 个测试文件、17 个测试。首次修正后为 19 个测试；开发者工具反馈修正后增加 2 个编译边界和页面注册回归用例，最终为 7 个测试文件、21 个测试，结果以上表为准。

## 4. 发现并修复的问题

### 高：项目配置没有显式启用 TypeScript 编译插件

- 风险：源码全部为 `.ts`，缺少明确编译插件配置可能导致微信开发者工具无法按预期编译。
- 修复：在 `project.config.json` 中加入原生 `typescript` 编译插件设置，并同步 `ARCHITECTURE.md` 与 `DECISIONS.md`。
- 验证：JSON 格式、Lint、TypeScript 和测试通过；开发者工具识别仍需人工验证。

### 中：日志脱敏未覆盖常见密钥和 CloudBase 环境字段

- 风险：`privateKey`、`apiKey` 或 `cloudEnvId` 作为日志上下文字段时可能原样进入日志。
- 修复：增加 `apikey`、`privatekey`、`cloudenv` 敏感字段片段；增加测试确认密钥、环境 ID 和异常详情不会被序列化输出。
- 验证：新增回归测试通过。

### 中：页面状态组件对非法状态没有安全回退

- 风险：调用方传入未知 `kind` 时，组件可能得到空视图模型。
- 修复：增加状态类型守卫，未知状态统一回退到安全的 Error 模型，移除不安全类型断言。
- 验证：新增非法状态回归测试通过。

### 低：README 安装方式没有优先使用锁文件

- 风险：另一台电脑执行 `npm install` 时，依赖解析可能与验收使用方式不完全一致。
- 修复：安装和换机步骤统一为 `npm.cmd ci`。
- 验证：已真实执行并成功。

### 低：Git 换行策略与 `.editorconfig` 不一致

- 风险：Windows 的 `core.autocrlf` 会产生 CRLF/LF 警告和无意义差异。
- 修复：新增 `.gitattributes`，统一文本文件为 LF，并规范当前修改文档的换行。
- 验证：最终 `git diff --check` 退出码 0 且无警告。

## 5. 微信开发者工具首次人工验收反馈与修复

### 高：小程序代码跨越 `miniprogramRoot` 导入根 `shared/`

- 人工现象：开发者工具报告无法找到 `../shared/validation/environment`。
- 根因：`miniprogram/config/env.ts`、`services/cloud.ts` 和 `utils/logger.ts` 直接依赖仓库根 `shared/`；Node/TypeScript 可以解析，但微信小程序编译器的源码边界是 `miniprogram/`。
- 修复：根 `shared/` 保持唯一源；新增生成的 `miniprogram/shared/` 运行时镜像；微信侧导入全部改为根内路径；增加 `shared:sync`、`shared:check` 和 ADR-025。
- 回归保护：质量命令会拒绝过期镜像；新增测试逐个检查 `miniprogram/**/*.ts` 的相对导入不得越过 `miniprogramRoot`，并确认导入目标存在。

### 高：`pages/foundation/index` 未注册

- 人工现象：开发者工具报告 `Page "pages/foundation/index" has not been registered yet`。
- 检查：`app.json` 正确声明 `pages/foundation/index`；页面 `.ts/.json/.wxml/.wxss` 四件套存在；`index.ts` 使用微信原生顶层 `Page({...})` 注册。
- 根因判断：页面模块的传递依赖先因跨根导入编译失败，导致页面代码未能执行注册；未发现独立的页面路径或注册语法错误。
- 修复：消除全部跨根运行时导入；新增自动测试验证每个 `app.json` 页面四件套存在且 TypeScript 源含原生 `Page()` 调用。

### 中：开发者工具把真实 AppID 写入公共项目配置

- 风险：`project.config.json` 会进入版本控制，不得保留个人或真实 AppID。
- 修复：恢复公开 `touristappid`；人工生成的 `project.private.config.json` 保持忽略且未读取、未提交。

## 6. 安全检查

- `project.private.config.json` 已被 `.gitignore` 命中，当前不存在且未被 Git 跟踪。
- 仓库中的 AppID 为公开导入基线 `touristappid`，没有真实 AppID。
- 没有 AppSecret、AI Key、私钥、真实 CloudBase 环境 ID、OpenID 或真实联系方式。
- 搜索命中的手机号、Token、OpenID、密钥和环境 ID 均为自动测试假值，用于验证脱敏行为。
- 环境配置集中定义 `local`、`development`、`staging`、`production`，全部默认 `cloudEnabled=false`，没有真实环境 ID。
- 安全错误映射不会返回内部异常消息或堆栈。
- 日志测试覆盖 OpenID、电话、邮箱、Token、API Key、私钥、CloudBase 环境 ID 和异常详情。

## 7. 范围外功能检查

- `cloudfunctions/` 只有边界说明，没有正式云函数目录。
- 没有 `users` 集合、`authEnsureUser`、`accountGetMe`、`wx.login` 或 `wx.cloud` 调用。
- 没有登录、用户身份、名牌、模板、收藏、greeting、encounter、contact request、AI 或 NFC 业务代码。
- 没有 Taro、uni-app、React、Vue、UI 组件库、状态管理库、独立后端、Redis、PostgreSQL 或微服务依赖。
- `pages/foundation` 明确是工程初始化验证页，没有冒充正式首页。

## 8. 文档一致性

- README 的四项验证命令与 `package.json` 一致。
- README 的目录、安装、配置、导入和未实现范围与当前仓库一致。
- `ARCHITECTURE.md` 已记录实际目录、工具版本和 TypeScript 编译配置。
- `DECISIONS.md` 已记录 ESLint、Prettier、Vitest、原生工程结构和 CloudBase 边界。
- `TASKS.md` 保持 M1-01 为 `IN_REVIEW`，M1-02 及以后为 `NOT_STARTED`，没有虚报业务完成。
- 微信项目配置仍以 `NEEDS_VALIDATION` 记录。

## 9. 未解决问题与人工验证

首次人工验收已经证明项目可被开发者工具打开，但编译因跨根依赖失败；该问题已在代码中修正。当前执行环境没有微信开发者工具，微信官方文档页面也无法打开，因此没有声称修正后已成功编译。以下项目仍需人工复验：

1. 在安装了当前微信开发者工具的 Windows 电脑上克隆仓库。
2. 使用 Node.js 24.14.0 和 npm 11.x 执行 `npm.cmd ci`。
3. 复制 `project.private.config.json.example` 为 `project.private.config.json`。
4. 以仓库根目录导入项目；无正式 AppID 时先使用公开 `touristappid` 做基础导入，需要真实平台能力时在开发者工具中选择自己的 AppID。
5. 确认 `miniprogramRoot` 为 `miniprogram/`、`cloudfunctionRoot` 为 `cloudfunctions/`，并确认 `typescript` 编译插件被识别。
6. 清除开发者工具缓存并重新编译，确认不再出现跨目录模块解析错误。
7. 确认 `pages/foundation/index` 已注册，“工程初始化页”无编译错误，Loading、Empty、Error、Retry 均可显示，Retry 计数可增加。
8. 检查开发者工具控制台没有敏感信息或未处理异常。
9. 执行四项质量命令，并确认 `project.private.config.json` 未出现在 Git 状态中。

上述人工导入和编译是进入 M1.2 前的剩余条件。目前没有已知代码级阻断，但在人工条件完成前不建议进入 M1.2。

## 10. 结论

M1.1 的工程结构、依赖安装、格式、Lint、类型、自动测试、安全边界、范围边界和文档一致性均通过；首次人工验收发现的跨根依赖与连带页面未注册问题已修正，但微信开发者工具中的修正后编译尚未复验。

最终结论：`CONDITIONAL_PASS`。

进入 M1.2 建议：暂不进入。待人工完成微信开发者工具导入、TypeScript 编译和工程初始化页验证并明确确认后，再单独开始 M1.2。

> 本轮仅审查并修正 M1.1，未实现 M1.2 或任何名牌、社交、AI、NFC 业务。
