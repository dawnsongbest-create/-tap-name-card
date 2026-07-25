# Cloud functions

M1.2-A 只实现可由 Node/Vitest 验证的身份领域层和处理器工厂：

- `authEnsureUser`
- `accountGetMe`
- `accountAcceptPolicies`
- 服务端 HMAC-SHA256 身份键
- `users` 与 `identity_mappings` 的内存原子事务替身
- 最多三次事务冲突退避

这些目录没有真实 CloudBase `main` 入口、SDK 仓储或部署配置，不可部署。本阶段没有创建
任何集合，也没有连接 development 环境。

真实适配必须在 M1.2-B 完成并人工验收：

- 从微信云函数可信上下文取得 OpenID，不接受客户端身份字段。
- 从受控服务端环境变量读取各环境不同的身份 HMAC 密钥。
- 在同一 CloudBase 事务中创建 user 与确定性 `identity_mappings/{identityKey}`。
- 验证事务冲突识别、最多三次退避、数据库权限规则和日志脱敏。
- 在 development 环境部署三个云函数并完成双账号/双平台冒烟。

OpenID、环境 ID、AppSecret、HMAC 密钥和真实政策配置均不得提交 Git 或返回客户端。
