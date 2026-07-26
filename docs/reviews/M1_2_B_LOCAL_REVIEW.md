# M1.2-B 本地代码独立审查

> 历史快照说明：本文的 `NOT_VALIDATED/IN_REVIEW` 是 2026-07-25 本地代码审查时的状态。
> 真实 development 验收和最终关门已完成，当前结论见
> [`M1_2_FINAL_CLOSEOUT.md`](./M1_2_FINAL_CLOSEOUT.md)：M1-02 `DONE`。

- 审查日期：2026-07-25
- 仓库：`tap-name-card`
- 分支：`main`
- 基线 HEAD：`3fbdf746233d1685b1e05e0fb4cff7b7935f9779`
- 审查对象：上述基线之上的未提交 M1.2-B 本地代码

## 1. 最终结论

1. **M1.2-B 本地代码审查结论：`PASS`**
2. **真实 CloudBase 能力状态：`NOT_VALIDATED`**
3. **整体 M1-02 状态：继续 `IN_REVIEW`**

三个函数锁定的最新官方 SDK 依赖树经
`npm audit --omit=dev` 检出 6 项生产依赖公告（1 moderate、5 high），主要来自
`axios`、`lodash.set` 和 `lodash.unset` 的官方 SDK 传递依赖。当前 npm 建议的完整修复会把
`@cloudbase/node-sdk` 强制降级到 `3.0.0`，属于不安全的破坏性变更，本轮未执行。

产品负责人已在 ADR-031 中正式接受该剩余风险，接受范围严格限定为 M1.2-B 的隔离
development 环境验收，并同时要求：

- 仅使用独立 development CloudBase 环境和测试数据；
- 不向正式用户开放，不用于 staging 或 production；
- 不开放 HTTP 或其他公网调用入口；
- 数据库客户端禁止直接读写；
- 云函数只允许关联的小程序调用并使用最小权限；
- 上线前重新执行 `npm audit`，升级到已修复的官方 SDK 版本或重新完成安全评估。

因此，本报告的 `PASS` **只代表 M1.2-B 本地实现和 development 部署候选通过**。它不代表
可信 OpenID、AppID 关联、事务冲突错误形状、数据库权限或部署行为已经在真实 CloudBase 验证；
真实 CloudBase 能力继续为 `NOT_VALIDATED`，M1-02 继续为 `IN_REVIEW`，不得标记 `DONE`。

## 2. 范围与 Git 状态

- 当前分支为 `main`，本地 HEAD 与 `origin/main` 均为
  `3fbdf746233d1685b1e05e0fb4cff7b7935f9779`。
- 创建本报告前共有 44 个已修改或未跟踪路径。逐项核对后均属于 M1.2-B 的客户端环境接入、
  微信可信身份、CloudBase Repository、三个函数包、测试、构建工具或直接相关文档。
- `project.config.json` 中 AppID 为已确认的 `wxc061682046272324`，该文件相对基线没有本轮差异。
- development EnvId 为 `cloud1-d1gh2crj26320f882`；local 仍为 `cloudEnabled=false`。
- `docs/TASKS.md` 中 M1-02 继续为 `IN_REVIEW`，未进入 M1.3。
- `project.private.config.json`、`node_modules` 和 `cloudfunctions/*/index.js` 均被忽略且未被跟踪。
- 未发现 AppSecret、真实 HMAC 密钥、真实 OpenID、identityKey 值或其他凭据。测试中的
  `synthetic-*`、`TEST_SECRET` 仅为明确标注且不可用于真实环境的合成值。

本轮未创建集合、未修改数据库权限、未生成或读取真实密钥、未上传或部署函数、未调用 CloudBase
管理接口，也未 Commit 或 Push。

## 3. 高优先级 SDK 与运行时核对

### 3.1 官方结论

- CloudBase 官方运行时文档当前列出 Node.js 20 为可选运行时；三个函数包声明
  `engines.node="20"`。
- 微信小程序调用云函数的官方示例通过 `wx-server-sdk.getWXContext()` 获取可信
  `OPENID/APPID`。没有官方依据证明普通入口第二参数或
  `@cloudbase/node-sdk.parseContext(context)` 单独提供同等的微信可信身份。
- CloudBase Node SDK 官方数据库 API 的文档引用写法是 `set(data)` 和 `update(data)`，
  不是客户端风格的 `set({data})` 或 `update({data})`。
- 官方事务错误码包含 `DATABASE_TRANSACTION_CONFLICT`。本地只识别该精确顶层 `code`；
  development 中的真实错误对象形状仍为 `NEEDS_VALIDATION`。

核对来源：

- [CloudBase 云函数运行时](https://docs.cloudbase.net/cloud-function/runtime-support)
- [微信小程序调用云函数与 getWXContext](https://docs.cloudbase.net/recipes/add-cloud-function-wechat-miniprogram)
- [CloudBase Node SDK 云函数资源集成](https://docs.cloudbase.net/cloud-function/resource-integration/cloudbase)
- [CloudBase 数据库事务](https://docs.cloudbase.net/en/database/transaction)
- [DATABASE_TRANSACTION_CONFLICT](https://docs.cloudbase.net/en/error-code/DATABASE_TRANSACTION_CONFLICT)
- [CloudBase Document update](https://docs.cloudbase.net/en/api-reference/webv2/database/update)
- [wx-server-sdk 4.0.2](https://www.npmjs.com/package/wx-server-sdk)

### 3.2 最终 SDK 边界

| 依赖                  | 精确版本 | 唯一职责                                                    |
| --------------------- | -------- | ----------------------------------------------------------- |
| `wx-server-sdk`       | `4.0.2`  | `DYNAMIC_CURRENT_ENV` 初始化；每次调用执行 `getWXContext()` |
| `@cloudbase/node-sdk` | `3.18.3` | 获取数据库实例；执行 `users/identity_mappings` 事务         |
| `ws`                  | `8.21.1` | 显式锁定 Node SDK 运行时 WebSocket 生产依赖版本             |

`wx-server-sdk@4.0.2` 内部仍传递依赖 `@cloudbase/node-sdk@3.17.2`。该重复版本是当前官方包的
内部实现；业务代码不通过它访问数据库。直接使用 `3.18.3` 的原因是把数据库职责锁定在当前
CloudBase Node SDK，而 `wx-server-sdk` 仅承担微信平台身份桥接。该边界已记录在 ADR-030。

`@cloudbase/node-sdk@3.18.3` 声明 Node `>=12`，并已在本地 Node 20.19.6 隔离环境完成入口加载；
因此本地未发现 Node 20 兼容性阻断。真实 CloudBase Node 20 镜像安装和执行仍未验证。

## 4. 审查发现与修正

### 4.1 阻断问题：可信微信身份来源错误

原实现尝试从 `@cloudbase/node-sdk.parseContext(context)` 推断 `WX_OPENID/WX_APPID`。官方
微信小程序云函数路径要求使用 `wx-server-sdk.getWXContext()`，因此原实现不能证明真实调用可获得
可信身份，属于阻断问题。

修正后：

- 增加并精确锁定 `wx-server-sdk@4.0.2`；
- 三个函数通过 `DYNAMIC_CURRENT_ENV` 初始化；
- 每次函数调用重新执行 `getWXContext()`，只投影 `OPENID/APPID`；
- 普通第二参数 `context`、event 和客户端伪造的 openId/userId/APPID/identityKey 均不参与授权；
- 不在模块全局缓存调用身份；
- 缺少 OpenID 返回 `AUTH_REQUIRED`，AppID 缺失或不匹配安全映射为
  `SERVICE_UNAVAILABLE`，不返回平台上下文。

### 4.2 阻断问题：Node SDK 文档写入形状错误

原 CloudBase Repository 使用 `.set({ data: record })` 和 `.update({ data: patch })`。这会让
Node SDK 把 `data` 当作普通字段，无法生成文档声明的数据模型；原 fake 也复制了该错误形状，导致测试
假通过。

修正后：

- 使用 `.set(record)` 和 `.update(patch)`；
- fake 改为模拟 Node SDK 的直接数据对象；
- 增加 mapping 指向缺失 user、userId 冲突、mapping 写失败回滚、扁平文档结构测试；
- mapping 仍只包含 `userId/provider/createdAt`，文档 ID 为服务端 HMAC identityKey，不保存
  OpenID。

### 4.3 部署包隔离不足

新增 `cloudfunctions:check:isolated`：

- 每个函数先生成自包含 `index.js`；
- 只复制 `index.js`、`package.json`、`package-lock.json` 到独立系统临时目录；
- 在该目录执行 `npm ci --ignore-scripts --omit=dev` 和 `npm ls --omit=dev --all`；
- 在子进程加载 `exports.main`；
- 扫描跨目录引用、源码地图、本机绝对路径、测试、私有配置和合成秘密；
- 验证完毕删除临时目录。

三个包已分别在当前 Node 和 Node 20.19.6 下通过，不依赖仓库根 `node_modules`。生成的
`cloudfunctions/*/index.js` 继续由 `.gitignore` 排除，不提交 Git。

### 4.4 其他边界强化

- 四个服务端变量均为必填；HMAC 密钥另外要求至少 32 个 UTF-8 字节，无默认值。
- requestId 只接受 1–128 位字母、数字、下划线或连字符；非法值被替换，不能用于身份或日志注入。
- 事务内部读取 mapping、检查 userId、创建 user、创建 mapping；SDK 内部自动重试被设为 0，
  只由业务层对精确冲突码最多尝试三次，退避为 10ms、20ms。
- mapping 指向缺失 user 时返回安全服务错误，不静默修复或另建用户。

## 5. 逐组审查结果

| 检查组                               | 结果                                                            |
| ------------------------------------ | --------------------------------------------------------------- |
| 范围、Git、AppID、EnvId、M1-02 状态  | 通过；M1-02 保持 `IN_REVIEW`                                    |
| SDK、Node 20、可信微信上下文         | 原阻断已修复；本地兼容性通过；真实上下文 `NOT_VALIDATED`        |
| local/development 与 `wx.cloud.init` | 通过；显式 EnvId；失败安全降级                                  |
| 启动匿名与显式建号                   | 通过；启动不调用三个身份函数，保持 `ANONYMOUS`                  |
| caller 输入边界                      | 通过；仅函数名、允许的业务 input、requestId                     |
| 服务端配置、AppID 校验、伪造身份     | 通过本地测试；真实注入 `NOT_VALIDATED`                          |
| Repository 抽象与双文档事务          | 通过 fake 合同测试；真实事务 `NOT_VALIDATED`                    |
| 精确冲突、三次重试、有限退避         | 通过本地测试；真实错误形状 `NOT_VALIDATED`                      |
| `authEnsureUser`                     | 通过：显式创建、幂等、RESTRICTED 保持、DELETED 拒绝             |
| `accountGetMe`                       | 通过：只读、不建号、缺失返回 `USER_NOT_FOUND`                   |
| `accountAcceptPolicies`              | 通过：双版本同时确认、同一时间、重复幂等、RESTRICTED 不解除     |
| `CurrentUserView` 白名单             | 通过；不含 OpenID、identityKey、deletedAt、接受时间或平台上下文 |
| 日志、错误、快照和缓存               | 通过静态扫描；未记录完整请求、响应、SDK 错误或身份              |
| 三个独立部署包                       | 当前 Node 与 Node 20.19.6 均通过隔离安装和入口加载              |
| 生产依赖完整性                       | `npm ci`、`npm ls` 通过；npm audit 剩余 1 moderate、5 high      |
| 文档一致性                           | 已同步 README、架构、数据模型、API、测试、任务、ADR 和运行手册  |

## 6. 测试和命令记录

最终结果：

| 命令/检查                                   | 结果                                                         |
| ------------------------------------------- | ------------------------------------------------------------ |
| `npm.cmd run shared:check`                  | PASS；两侧各 21 个 shared 镜像一致                           |
| `npm.cmd run format:check`                  | PASS；首次发现 2 个格式问题，修正后复跑通过                  |
| `npm.cmd run lint`                          | PASS                                                         |
| `npm.cmd run typecheck`                     | PASS                                                         |
| `npm.cmd test`                              | PASS；17 个文件、81 项测试                                   |
| `npm.cmd run cloudfunctions:check`          | PASS；三个函数构建并验证                                     |
| `npm.cmd run cloudfunctions:check:isolated` | PASS；三个包独立安装和加载                                   |
| Node 20.19.6 隔离入口加载                   | PASS；三个包全部加载                                         |
| 跨函数目录依赖扫描                          | PASS；无 `../shared` 或其他仓库外运行时引用                  |
| 构建产物扫描                                | PASS；无 sourcemap、本地绝对路径、测试、私有配置或合成秘密   |
| 受跟踪文件扫描                              | PASS；无私有配置、node_modules、缓存或生成 bundle            |
| SDK 生产依赖完整性                          | PASS；每包 `npm ci` 与 `npm ls --omit=dev --all`             |
| `npm.cmd audit --omit=dev`                  | 1 moderate、5 high；仅限 development 的风险已由 ADR-031 接受 |
| `git diff --check`                          | PASS；只有既有 CRLF→LF 提示，无空白错误                      |
| `git status --short`                        | PASS；仅保留未提交的 M1.2-B 实现与本审查报告                 |

新增或强化的测试覆盖：

- development/local 配置和显式 EnvId；
- `wx.cloud.init` 只初始化、不建号，失败安全降级；
- caller 函数名、输入与安全 requestId；
- SDK `getWXContext()` 每次读取、不缓存、缺少身份、AppID 不匹配；
- event/第二参数中的伪造身份无效；
- 四项配置缺失、HMAC 过短；
- Node SDK 直接文档写入形状、事务提交与回滚；
- mapping 缺 user、userId 冲突、mapping 写失败；
- 精确冲突三次重试、非冲突不重试、耗尽返回 `SERVICE_UNAVAILABLE`；
- getMe 不建号、DELETED 不重建、政策双版本和重复确认幂等；
- 返回体不含服务端私有字段；
- 三个部署包构建、依赖锁定、隔离安装和入口加载。

81 项测试证明的是本地业务和 adapter 边界，其中 fake 事务不能替代真实 CloudBase 事务验收。

## 7. 真实 CloudBase 的 `NOT_VALIDATED` 清单

以下能力只有产品负责人完成 development 环境配置和部署后才能验证：

- 微信开发者工具调用函数时 `getWXContext()` 的真实 `OPENID/APPID` 和 AppID 关联失败行为；
- Node 20 CloudBase 镜像对 `wx-server-sdk@4.0.2`、
  `@cloudbase/node-sdk@3.18.3` 和部署 lockfile 的安装行为；
- 四个环境变量的控制台注入、缺失时安全失败和日志脱敏；
- `users`、`identity_mappings` 集合及服务端权限；
- 两文档事务的原子提交、真实并发首次创建和 `DATABASE_TRANSACTION_CONFLICT` 错误对象；
- mapping/user 不一致时的真实 SDK 读取形状；
- 三个函数上传、冷启动、超时、网络错误和回滚行为；
- iPhone/Android 双账号、重复确认、RESTRICTED/DELETED 测试数据验收。

在上述验收完成前，不得把函数描述为已上线，不得把 fake 事务结果描述为真实 CloudBase 验证。

## 8. 本轮未做

- 未创建 `users` 或 `identity_mappings`；
- 未修改数据库权限或索引；
- 未生成、读取或注入真实 HMAC 密钥；
- 未上传或部署云函数；
- 未操作任何 CloudBase 云端资源；
- 未实现 M1.3、名牌、模板、收藏、认识请求、相遇、联系方式、AI 或 NFC；
- 未 Commit、未 Push。
