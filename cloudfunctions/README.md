# Cloud functions

M1.1 只建立云函数目录边界，不部署或实现任何正式云函数。

- 不创建 `users` 集合。
- 不实现 `authEnsureUser` 或 `accountGetMe`。
- 不初始化真实 CloudBase 环境。
- AppSecret、云环境私密配置和其他密钥不得进入仓库。

正式云开发初始化与用户身份属于 M1.2，必须在 M1.1 人工验收后单独开始。
