# 第三方依赖、素材与许可

项目原创内容使用 [MIT 许可证](LICENSE)。依赖保留其自身许可，项目的 MIT 许可不替代第三方许可。

## 公开构建依赖

| 依赖 | 用途 | 版本与许可 |
| --- | --- | --- |
| esbuild | 将页面 JavaScript 与内嵌 CSS 打包为单文件 IIFE | 0.25.12，[上游源码](https://github.com/evanw/esbuild/tree/v0.25.12)，[MIT 许可](https://github.com/evanw/esbuild/blob/v0.25.12/LICENSE.md) |

esbuild 通过 `package.json`、`pnpm-lock.yaml` 安装，当前平台二进制作为其可选依赖提供。`node_modules/` 与二进制依赖不提交到仓库；安装包中保留上游许可。生产 `BroadcastListScript.js` 打包输入仅来自 `src/`，不包含 esbuild 本身或运行时包管理器。

## PotPlayer 图标版权与标识声明

本项目是独立开发的第三方工具，与 PotPlayer 或 Kakao 无隶属关系，未获得其官方认可或背书。

PotPlayer 软件著作权归 Kakao 公司所有。本项目所用 PotPlayer 图标及相关名称、标识的权利归其各自权利人；本项目不主张这些图标的版权或相关商标权。菜单使用图标是为了标识 PotPlayer 播放及播放列表功能。

菜单仅使用 `src/common/assets/potplayer/` 内两张 16×16 图标，由构建内嵌，不请求安装目录或外部图片：

| 图标 | 本机原始来源 |
| --- | --- |
| `potplayer-app-16.png` | 本机 PotPlayer 安装中的 `PotPlayer64.exe`，group icon 100 / RT_ICON 2，黄色圆形播放图标 |
| `playlist-dpl-16.png` | 同安装目录 `PotIcons64.dll`，icon index 0（group 196），本机 `.dpl` 播放列表关联图标 |

PNG 由 Windows `System.Drawing.Icon.ToBitmap` 解码对应原始 16px 图标帧，未重绘或缩放。项目不包含其余尺寸、ICO、M3U/PLS 图标或皮肤资源。

**本项目的 MIT 许可证仅适用于项目原创内容，不涵盖上述图标、名称或标识。** 本项目不为这些第三方素材授予复制、修改、再分发或商业使用的许可。注明来源不代表已取得权利人对图标独立分发或商业使用的授权；相关使用条件应以权利人提供的条款及授权为准。本机 PotPlayer 安装目录中的 `License.txt` 保留其软件原始条款。

## Bilibili 图标版权与标识声明

本项目是独立开发的第三方工具，与 Bilibili（哔哩哔哩）无隶属关系。使用其名称或图标不表示 Bilibili 官方参与、认可或背书。

本项目使用的 Bilibili 图标及相关名称、标识的版权、商标权及其他相关权利归各自权利人所有，本项目不主张这些第三方素材的权利。

| 素材 | 项目内路径 | 来源与用途 |
| --- | --- | --- |
| Bilibili 图标 | `src/common/assets/bilibili/bilibili.ico` | 用户提供；用于右键菜单中「在当前标签页打开该页面」的功能标识 |
| 稍后再看 SVG | `src/common/media-menu.js` 中的 `icons.watchlater` | 取自 [Bilibili 官方视频页](https://www.bilibili.com/video/BV1konw6eEkG/) 的 `.video-watchlater-icon`（2026-10-30）；保留原始 viewBox 和路径，用于「添加到稍后再看」功能标识 |

该图标通过构建内嵌到 `BroadcastListScript.js`，运行时不请求外部图片。

**本项目的 MIT 许可证仅适用于项目原创内容，不涵盖 Bilibili 图标、名称或标识。** 本项目不为这些第三方素材授予复制、修改、再分发或商业使用的许可。注明来源和权利归属不代表已取得权利人的授权；相关使用条件应以权利人提供的条款及授权为准。

## Lucide Link 图标来源、版权与许可

右键菜单「复制链接地址」使用 [Lucide Link 图标](https://lucide.dev/icons/link)，SVG 内嵌于 `src/common/media-menu.js` 的 `icons.link`，构建后随 `BroadcastListScript.js` 分发，运行时不请求外部资源。保留原始 viewBox 和路径，以 `currentColor` 适配明暗主题，在菜单中显示为 16×16。

来源：[Lucide 官方许可](https://lucide.dev/license)（查阅日期：2026-10-30）。Lucide 使用 ISC 许可；官方将 `link` 列为源自 [Feather](https://github.com/feathericons/feather) 的图标，因此同时保留 Feather 的 MIT 许可和版权声明。下列许可适用于该第三方图标，项目自身的 MIT 许可不替代这些许可。

### Lucide — ISC License

```text
ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

### Feather — MIT License（适用于源自 Feather 的 Link 图标）

```text
The MIT License (MIT)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 交付范围

公开仓库提供源码、构建配置、公开文档及正式生成文件。本地浏览器测试、测试 fixture、测试依赖和历史记录不属于公开交付内容，也不进入生产 bundle。构建完整性检查在本地运行。

如果后续引入或公开第三方代码、素材或测试 fixture，应补充对应来源、版本、许可与版权声明。配套插件、PotPlayer、WebView2 和 Bilibili 站点资源分别适用其自身条款，本仓库不为它们提供授权。
