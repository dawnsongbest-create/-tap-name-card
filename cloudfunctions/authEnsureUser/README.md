# authEnsureUser（M1.2-B local）

`index.ts` 导出真实 `main`，只在用户明确操作后确保身份存在。它在每次调用中通过
`wx-server-sdk.getWXContext()` 取得可信微信身份，并用独立 CloudBase Node SDK
在同一事务创建 user 和 mapping。

运行 `npm.cmd run cloudfunctions:build` 后，本目录包含可部署的 `index.js`；本轮没有
上传或部署，真实并发冲突行为仍为 `NEEDS_VALIDATION`。
