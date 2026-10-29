# BilibiliBroadcastListScript

为 **PotPlayer 的 Bilibili 网页广播列表**提供窄窗口布局、统一导航栏和链接打开菜单。

本项目是 [BilibiliPotPlayer](https://github.com/frostnotfall/BilibiliPotPlayer) 的配套子项目，通过 esbuild 打包为单文件脚本，无需额外加载 CSS 或 JavaScript。

本项目通过鞭策 Codex 实现。

## 功能

- 窄窗口适配卡片、列表、顶栏和弹层，宽窗口恢复站点布局。
- 统一导航栏提供后退、前进、首页、地址编辑和刷新；横向列表支持鼠标滚轮。
- 支持视频播放、新进程播放、播放列表追加、外部浏览器打开、复制链接，以及登录后添加视频到稍后再看。
- 已适配页面在当前标签页打开，未适配页面询问是否使用外置浏览器。

实际媒体解析、登录和播放由配套插件及 PotPlayer 宿主完成。

## 在PotPlayer中测试效果

使用配套插件时，由宿主加载根目录的 [BroadcastListScript.js](BroadcastListScript.js)。更新脚本后刷新或重新打开页面。

手动测试修改后的代码：

1. 按下方构建说明生成代码。单页测试使用 `debug/<PageID>.js`，完整测试使用根目录 `BroadcastListScript.js`。
2. 打开 PotPlayer：**设置 → 扩展功能 → 工具栏 → 直播列表 → 直播列表中使用的脚本 → 用户自定义**。
3. 将待测试文件的完整内容填入自定义脚本，确认并应用设置。
4. 在网页广播列表中打开对应页面，刷新或重新打开后检查效果。单页包只在该模块支持的页面生效。

修改后检查窄窗口与宽窗口布局、链接及右键菜单操作，并切换到其他页面确认行为正常。测试单页包时用它替换当前自定义脚本；完整验收时改用 `BroadcastListScript.js`。

<img src="SCREENSHOT/Potplayer-BroadcastListScript.png" width="600" />

## 适配页面

| 类别 | 页面 |
| --- | --- |
| 主站 | 首页与频道、动态、历史记录、稍后再看、个人空间、搜索、热门与排行榜 |
| 直播 | 直播首页、直播分区、关注列表 |
| 内容 | 番剧、国创、影视、音乐、专栏与图文 |
| 活动 | 公益、超高清、播客 |

共 17 个页面模块，具体支持的 URL 以 [src/page-scopes.json](src/page-scopes.json) 为准。

## 构建工具与项目结构

本项目使用 **esbuild** 将 JavaScript 模块、CSS 和图标打包为可直接注入 PotPlayer 网页的单文件脚本。源码可以使用 `import` / `export`；生成文件无需浏览器模块加载器，也无需另外部署样式或图标文件。构建配置位于 [build.cjs](build.cjs)。

```text
BroadcastListScript/
├─ src/
│  ├─ entry.js                  # 最终文件入口，导入并注册所有页面
│  ├─ pages.json                # 可独立构建的页面 ID
│  ├─ page-scopes.json          # 各页面支持的域名与路径
│  ├─ WebPage/<PageID>/         # 页面入口 module.js、样式及交互代码
│  └─ common/
│     ├─ index.js               # 公共能力导出
│     ├─ lifecycle.js           # 页面分派、安装与卸载
│     ├─ urls.js                # 链接能力判断
│     ├─ opening.js             # 点击导航与播放器交接
│     ├─ media-menu.*           # 右键菜单和确认框
│     ├─ main-site/             # 主站公共布局与交互
│     └─ live/                  # 直播公共布局与交互
├─ build.cjs                    # esbuild 构建与完整性检查
├─ package.json                 # 构建命令与依赖
├─ pnpm-lock.yaml               # 锁定依赖版本
├─ BroadcastListScript.js       # 最终生成文件，随源码提交
└─ debug/<PageID>.js            # 本地单页调试包，不提交
```

页面代码按需导入 `src/common/`，公共模块不反向依赖页面实现。主站和直播各自复用所属的公共布局与交互。

## 修改现有页面

以修改主页 `HomePage` 为例：

1. 在 [src/page-scopes.json](src/page-scopes.json) 中找到目标 URL 对应的页面 ID，进入 `src/WebPage/<PageID>/`。全部 ID 见 [src/pages.json](src/pages.json)。
2. 从 `module.js` 查看该页面导入的文件：布局改对应 CSS 或 `style.js`，交互改页面 JavaScript。顶栏、打开方式等多个页面共用的功能在 `src/common/` 中修改，并检查受影响页面。
3. 页面模块的 `early()` 处理早期链接交接，`mount()` 在 DOM 就绪后安装界面；返回的实例通过 `destroy()` 清理资源。新增监听器、观察器、计时器和样式时，同时补全清理逻辑。
4. 构建 `debug/HomePage.js` 并在 PotPlayer 中测试；确认后重建最终 `BroadcastListScript.js`，运行构建检查。

不要直接修改 `debug/` 或 `BroadcastListScript.js` 中的生成代码，否则下次构建会覆盖修改。具体页面布局及内部实现细节保留在本地维护记录中。

## 添加新页面

以新增 `ExamplePage` 为例，域名与路径需要替换成实际支持的页面。

1. 创建 `src/WebPage/ExamplePage/`，添加 `module.js` 和必要的样式文件。下面是最小入口示例，`content.css` 写本页面的布局样式：

   ```javascript
   import {createPageOpening} from '../../common/index.js';
   import css from './content.css';

   export const early = () => createPageOpening();

   export function mount() {
     const events = new AbortController();
     const style = document.createElement('style');
     style.textContent = css;
     document.head.append(style);
     // 本页面的事件使用 {signal: events.signal} 注册。
     return {
       destroy() {
         events.abort();
         style.remove();
       },
     };
   }
   ```

2. 在 `src/page-scopes.json` 添加支持范围；优先使用精确路径，正则需要保留路径边界，hash 路由可使用 `hashPattern`：

   ```json
   {"id": "ExamplePage", "host": "www.bilibili.com", "paths": ["/example"]}
   ```

3. 在 `src/pages.json` 添加 `"ExamplePage"`，位置与 `page-scopes.json` 中的 ID 顺序一致。
4. 在 `src/entry.js` 添加 `import * as ExamplePage from './WebPage/ExamplePage/module.js';`，并将 `ExamplePage` 加入现有 `startDispatcher({...})` 的注册对象。
5. 需要公共顶栏等功能时，参考同类页面复用 `main-site/` 或 `live/`。样式应限定在目标页面；`destroy()` 要可重复调用，并清理页面创建的所有资源。
6. 执行 `pnpm run build:page ExamplePage` 测试单页，再执行 `pnpm run build` 和 `pnpm run check`。在 PotPlayer 中检查目标页面、相邻的不支持路径、页面切换和重复加载，并更新适配页面概览。

## 构建单页与最终文件

需要 Node.js **22.13+** 和 pnpm **11.25.0**。

在项目根目录安装依赖：

```powershell
pnpm install --frozen-lockfile --ignore-scripts
```

然后按需构建，`HomePage` 可替换为 `src/pages.json` 中的其他页面 ID：

```powershell
pnpm run build:page HomePage   # 单页面 → debug/HomePage.js
pnpm run build:debug           # 所有单页面 → debug/<PageID>.js
pnpm run build                 # 全部页面 → BroadcastListScript.js
pnpm run check                 # 检查源码、最终文件与所有单页构建
```

单页包包含指定页面及其公共依赖，适合单独修改和调试；最终文件包含全部已注册页面，由页面分派器根据当前 URL 选择模块。新增页面不需要在 `build.cjs` 中单独添加构建逻辑。

监听源码变化并自动重建：

```powershell
pnpm run watch                         # 最终文件
node build.cjs --page HomePage --watch  # 指定单页
```

日常构建使用北京时间作为版本；提交或发布前执行 `pnpm run build:release` 和 `pnpm run check:release`，使用 `package.json` 与 `CHANGELOG.md` 一致的数字版本。

构建检查验证源码与产物一致；页面行为与播放兼容性需在真实 PotPlayer 中验收。

## 贡献与许可

贡献约定见 [CONTRIBUTING.md](CONTRIBUTING.md)，版本变化见 [CHANGELOG.md](CHANGELOG.md)。

项目原创内容使用 [MIT 许可证](LICENSE)，第三方依赖与素材说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
