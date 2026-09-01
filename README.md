# AI Daily

一个使用 **Astro + Vue 3** 构建的双语个人博客主题。视觉与信息架构参考 Hexo Next 的克制、留白与侧栏布局，同时保留 Astro 的静态生成能力，并将主题切换、移动端导航、文章目录、阅读进度和返回顶部等交互实现为 Vue islands。

## 功能

- 中文与英文双语页面，路径分别以 `/zh/` 和 `/en/` 开头
- 首页、文章详情、归档、分类、标签和关于页面
- 语言切换时尽量保留当前页面及文章 slug
- 浅色、深色与系统主题偏好，选择结果保存在浏览器本地
- 桌面端文章目录与移动端内嵌目录
- 阅读进度、返回顶部、响应式导航
- 键盘焦点、跳转到正文、减少动画等无障碍支持
- Astro 静态生成，Vue 3 Composition API 负责交互组件

## 环境要求

- Node.js `>= 22.12.0`
- pnpm

## 常用命令

在项目根目录运行：

| 命令 | 说明 |
| --- | --- |
| `pnpm install` | 安装依赖 |
| `pnpm run dev -- --background` | 在后台启动 Astro 开发服务器 |
| `pnpm run astro -- dev status` | 查看后台开发服务器状态 |
| `pnpm run astro -- dev logs` | 查看后台开发服务器日志 |
| `pnpm run astro -- dev stop` | 停止后台开发服务器 |
| `pnpm build` | 构建生产版本到 `dist/` |
| `pnpm preview` | 本地预览生产构建 |

Astro 会在默认端口被占用时自动选择其他端口，请以终端输出或 `dev status` 的结果为准。

## 项目结构

```text
src/
├── components/
│   ├── blog/                 # 文章卡片、正文、列表和目录
│   ├── home/                 # 首页内容
│   ├── layout/               # 页头与侧栏 Vue 组件
│   └── ui/                   # 主题、进度和返回顶部 Vue 组件
├── data/
│   └── posts.ts              # 双语文章数据与类型
├── layouts/
│   └── BlogLayout.astro      # 全站 HTML、布局、SEO 基础信息
├── pages/
│   ├── index.astro           # 根路径入口
│   └── [lang]/               # 中英文动态路由
├── styles/
│   └── global.css            # 主题变量、排版和响应式样式
└── utils/
    └── blog.ts               # 路由、本地化、文章和目录工具
```

## 添加或编辑文章

文章集中维护在 `src/data/posts.ts`。每篇文章都包含稳定的 `slug`、发布日期、阅读时长，以及中英文标题、摘要、分类、标签和正文。

```ts
{
  slug: 'my-new-post',
  date: '2026-09-01',
  readingTime: 5,
  category: { zh: '开发', en: 'Development' },
  tags: { zh: ['Astro', 'Vue'], en: ['Astro', 'Vue'] },
  title: { zh: '中文标题', en: 'English title' },
  excerpt: { zh: '中文摘要', en: 'English excerpt' },
  content: {
    zh: [
      { type: 'paragraph', text: { zh: '中文正文。', en: '' } },
      { type: 'heading', text: { zh: '章节标题', en: '' } },
    ],
    en: [
      { type: 'paragraph', text: { zh: '', en: 'English content.' } },
      { type: 'heading', text: { zh: '', en: 'Section heading' } },
    ],
  },
}
```

正文块支持以下类型：

- `heading`：章节标题，会自动进入文章目录
- `paragraph`：普通段落
- `quote`：引用块
- `code`：代码块，使用 `language` 和 `code` 字段

新增文章后，Astro 会根据同一个 slug 生成两条详情路由：

```text
/zh/posts/my-new-post/
/en/posts/my-new-post/
```

当前内容采用类型安全的结构化 TypeScript 数据，而不是 Markdown 文件。修改字段时应同时维护 `Post` 和 `PostBlock` 类型。

## 中英文规则

支持的语言类型定义为：

```ts
type Locale = 'zh' | 'en'
```

页面路由位于 `src/pages/[lang]/`。新增双语页面时：

1. 在该目录下创建 Astro 页面。
2. 校验 `Astro.params.lang`，仅接受 `zh` 和 `en`。
3. 将 `locale` 传给 `BlogLayout.astro` 及需要本地化的组件。
4. 页面内链接使用当前语言前缀，例如 `/${locale}/archives/`。
5. 如果页面在两种语言下具有相同结构，优先共享组件，只传入本地化文案和数据。

语言切换路径由 `src/utils/blog.ts` 中的 `getLocalizedPath()` 生成，因此文章页切换语言后会保留相同 slug。

## 自定义主题

全局视觉变量集中在 `src/styles/global.css` 顶部。

浅色主题定义在 `:root`，深色主题定义在 `:root[data-theme='dark']`。常用变量包括：

- `--color-accent`：链接、按钮和当前状态的强调色
- `--color-page`：页面背景色
- `--color-surface`：卡片背景色
- `--color-ink`、`--color-body`：标题与正文颜色
- `--color-line`：边框和分隔线
- `--shadow-card`：卡片阴影
- `--radius-lg`、`--radius-md`：圆角
- `--content-width`：主体最大宽度
- `--font-sans`、`--font-serif`：无衬线与衬线字体栈

修改颜色时应同时调整浅色与深色变量，并检查文字对比度、焦点样式和 `meta[name="theme-color"]`。主题选择使用本地存储键 `ai-daily-theme`。

主要布局断点也位于 `src/styles/global.css`：

- `1080px`：隐藏桌面右侧栏，显示文章内嵌目录
- `760px`：切换为单栏移动布局
- `520px`：收紧文章标题、分类网格和代码块布局

## Vue 交互组件

项目使用 Vue 3 `<script setup lang="ts">` 与 Composition API：

- `src/components/layout/BlogHeader.vue`：桌面导航、移动菜单和语言切换
- `src/components/ui/ThemeToggle.vue`：浅色/深色主题
- `src/components/blog/TableOfContents.vue`：文章目录与当前章节状态
- `src/components/ui/ReadingProgress.vue`：文章阅读进度
- `src/components/ui/BackToTop.vue`：返回页面顶部

静态内容优先使用 Astro 组件；只有需要浏览器状态或事件的功能才使用带 `client:*` 指令的 Vue island，以减少客户端 JavaScript。

## 路由一览

```text
/
/zh/                         /en/
/zh/archives/                /en/archives/
/zh/categories/              /en/categories/
/zh/tags/                    /en/tags/
/zh/about/                   /en/about/
/zh/posts/<slug>/            /en/posts/<slug>/
```

## 构建与发布前检查

建议在提交或部署前运行：

```sh
pnpm build
git diff --check
```

构建成功后，`dist/` 中会包含所有中文、英文和文章静态页面，可部署到任意静态站点托管服务。

生产构建还会生成：

- `/sitemap.xml`：包含中文、英文页面和所有文章详情页。
- `/robots.txt`：允许搜索引擎抓取，并声明站点地图地址。
- 页面级 Canonical、Open Graph 和 Twitter Card 元数据，正式域名为 [https://www.weekly-day.top/](https://www.weekly-day.top/)。

## 自动发布

Hacker News 抓取、星期天AI双语文章生成、GitHub Actions 定时任务和 Cloudflare Pages 部署方案见：

- `docs/automated-publishing.md`
