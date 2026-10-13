# 构建依赖与许可

项目原创内容使用 [MIT 许可证](LICENSE)。依赖保留其自身许可，项目的 MIT 许可不替代第三方许可。

## 公开构建依赖

| 依赖 | 用途 | 版本与许可 |
| --- | --- | --- |
| esbuild | 将页面 JavaScript 与内嵌 CSS 打包为单文件 IIFE | 0.25.12，[上游源码](https://github.com/evanw/esbuild/tree/v0.25.12)，[MIT 许可](https://github.com/evanw/esbuild/blob/v0.25.12/LICENSE.md) |

esbuild 通过 `package.json`、`pnpm-lock.yaml` 安装，当前平台二进制作为其可选依赖提供。`node_modules/` 与二进制依赖不提交到仓库；安装包中保留上游许可。生产 `BroadcastListScript.js` 打包输入仅来自 `src/`，不包含 esbuild 本身或运行时包管理器。

## 交付范围

公开仓库提供源码、构建配置、公开文档及正式生成文件。本地浏览器测试、测试 fixture、测试依赖和历史记录不属于公开交付内容，也不进入生产 bundle。公开 CI 仅运行构建完整性检查。

如果后续引入或公开第三方代码、素材或测试 fixture，应补充对应来源、版本、许可与版权声明。配套插件、PotPlayer、WebView2 和 Bilibili 站点资源分别适用其自身条款，本仓库不为它们提供授权。
