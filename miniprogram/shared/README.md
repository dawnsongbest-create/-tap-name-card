# Generated shared runtime

本目录是根目录 `shared/` 的小程序运行时镜像，保证微信开发者工具只编译 `miniprogramRoot` 内的模块。

- 唯一源：仓库根目录 `shared/`
- 生成命令：`npm.cmd run shared:sync`
- 一致性检查：`npm.cmd run shared:check`
- 本目录中的 `.ts` 文件不得手工修改

M1.1 不在这里增加用户、名牌、社交、AI 或 NFC 业务定义。
