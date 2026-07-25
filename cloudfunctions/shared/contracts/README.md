# Generated shared contracts

本目录是仓库根 `shared/` 的服务端运行时契约镜像，由 `npm.cmd run shared:sync` 生成。

- 不得手工修改本目录中的 `.ts` 文件。
- HMAC、可信身份和数据库实现不得放入根 `shared/`，避免同步到小程序客户端。
- 单个云函数的最终上传打包边界仍需在真实 CloudBase development 环境验证。
