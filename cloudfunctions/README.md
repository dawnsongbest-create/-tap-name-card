# Cloud functions

M1.2-B local 为以下身份函数提供真实 TypeScript 入口和独立部署包：

- `authEnsureUser`
- `accountGetMe`
- `accountAcceptPolicies`

每个入口使用两套职责不重叠的官方服务端 SDK：

- `wx-server-sdk@4.0.2` 只负责初始化微信云函数运行时，并在每次调用中通过
  `getWXContext()` 读取可信 `OPENID/APPID`；不接受客户端身份字段。
- `@cloudbase/node-sdk@3.18.3` 只负责 `CloudBaseUserRepository` 的数据库和事务。
- `ws@8.21.1` 只用于锁定 CloudBase SDK 的 WebSocket 传递依赖版本；身份代码不调用它。
- 首次建号在同一事务创建 user 和 mapping。
- SDK 内部事务重试关闭，只对明确冲突做领域层最多三次退避。
- 从环境变量读取 HMAC 密钥、预期 APPID 和两项政策版本，没有默认密钥。

执行 `npm.cmd run cloudfunctions:build` 会在三个函数目录生成被 Git 忽略的 `index.js`。
执行 `npm.cmd run cloudfunctions:check` 会重新构建、加载 `main`，并阻止部署产物跨函数
目录引用。每个目录的 `package.json` 精确声明独立依赖，目标运行时为 Nodejs20.19。
执行 `npm.cmd run cloudfunctions:check:isolated` 会把每个包的 `index.js/package*.json`
复制到独立系统临时目录，执行 `npm ci --omit=dev`、完整生产依赖树检查和入口加载，
证明不依赖仓库根 `node_modules`；临时目录最终删除。

本地可构建不等于云端通过。当前没有创建集合、配置权限、注入真实密钥或部署函数。
真实可信身份、环境变量、事务冲突、权限和部署行为仍为 `NEEDS_VALIDATION`。

OpenID、AppSecret、HMAC 密钥和其他凭据不得提交 Git、进入日志或返回客户端。
当前官方 SDK 组合的函数锁文件执行 `npm audit` 后仍有 6 项传递依赖公告
（1 moderate、5 high、0 critical）；不得使用强制 override 或降级静默掩盖，真实部署前
必须复核上游版本并由产品负责人接受残余风险。
