<div align="center">

# 基于 Gemini 的电商生图工作台
## Commerce Image Studio

面向电商运营、设计与商品团队的本地化 AI 生图工作台。  
A local-network friendly AI image generation workstation for ecommerce operators, designers, and merchandising teams.

**Version:** `v0.4.0`  
**Latest Windows Installer:** `IMAGE-STUDIO-WINDOWS-0.4.0.exe`

[Releases](https://github.com/aEboli/gemini-commerce-image-workbench/releases) · [中文操作说明](./Readme/使用说明-电商AI出图工作台.md) · [PRD](./Readme/PRD-电商AI出图工作台.md) · [Source Code](https://github.com/aEboli/gemini-commerce-image-workbench)

</div>

---

## 快速了解 / At a Glance

Commerce Image Studio 是一个围绕“商品图批量生成、结果审核、团队协作同步”设计的桌面级工作台。它支持 Gemini 官方接口和 Gemini 兼容 relay，适合在本地、局域网和小团队环境中使用。  
Commerce Image Studio is a production-oriented workstation for batch product image generation, result review, and team collaboration sync. It supports both official Gemini APIs and Gemini-compatible relay providers, and works well in local, LAN, or small-team environments.

### 你可以用它做什么 / What Teams Use It For

| 中文 | English |
| --- | --- |
| 批量生成场景图、白底图、模特图、海报图、细节图和痛点图 | Batch-generate scene, white-background, model, poster, detail, and pain-point visuals |
| 按国家、语言、平台和品牌规则输出更贴近市场的素材 | Produce market-aware assets by country, language, platform, and brand profile |
| 直接用 prompt 出图，或参考已有海报进行复刻 | Generate directly from prompts or remix from an existing poster reference |
| 审核结果并只导出“通过”的素材 | Review outputs and export only approved assets |
| 自动把生成结果同步到飞书多维表格 | Automatically sync generated outputs into Feishu Bitable |

## 版本亮点 / What’s New in v0.4.0

| 新功能 | 说明 |
| --- | --- |
| 五种创作模式 | 覆盖标准出图、提示词模式、参考图复刻、套图模式与亚马逊 A+ 图 |
| 审核工作台升级 | 历史缩略图、灯箱切换、详情聚焦与通过项导出体验更完整 |
| 模板与品牌协作 | 模板中心、品牌库、市场规则和提示词链路更适合团队复用 |
| 飞书同步增强 | 字段映射、连通测试、写回链路与结果结构更稳定 |
| 创建与设置页重构 | 参数胶囊、说明卡、设置页概览和最近任务区统一为新主题样式 |
| 安全发布口径 | 版本化安装器命名，发布时可清理密钥、任务记录与素材目录 |

### v0.4.0 in English

- Five creation modes: standard, prompt, reference remake, image-set, and Amazon A+ workflows
- Stronger review workspace with history thumbnails, lightbox navigation, detail focus, and approved-only export
- Better template and brand collaboration for reusable market-aware production
- More stable Feishu sync with field mapping, connectivity checks, and structured write-back
- Refined studio and settings UI with aligned chips, cards, and overview panels
- Safe release packaging with versioned installers and optional secret sanitization

## 产品亮点 / Product Highlights

### 创作模式 / Creation Modes

- **标准出图 / Standard Mode**  
  适合结构化批量任务，围绕商品信息、平台、国家、语言和图片规格生成电商素材。  
  Best for structured batch workflows driven by product metadata, platform, country, language, and image specs.

- **提示词模式 / Prompt Mode**  
  可直接按自定义 prompt 出图，商品图可选，适合概念图、测试图和快速试错。  
  Generate directly from a custom prompt with optional source images for concept work and rapid iteration.

- **参考图复刻 / Reference Remix**  
  上传参考海报后，尽量保留构图、层级和氛围，只替换成你的商品。  
  Preserve the composition, hierarchy, and mood of a reference poster while swapping in your own product.

### 协作与复用 / Collaboration and Reuse

- **模板中心 / Template Center**  
  让不同平台、市场和图片类型有更稳定的创作基线。  
  Creates reusable creative baselines across platforms, markets, and image types.

- **品牌库 / Brand Library**  
  把品牌调性、颜色和提示词约束沉淀下来，减少每次重复输入。  
  Stores brand tone, colors, and prompt guidance so teams do not need to redefine them every time.

- **飞书同步 / Feishu Sync**  
  成功生成后自动写入飞书多维表格，方便团队跟踪和交付。  
  Automatically syncs successful results into Feishu Bitable for team tracking and delivery.

### 发布与交付 / Distribution

- **Windows 单文件安装器 / Windows Single-File Installer**  
  直接分发给其他电脑使用，无需额外安装 Node.js。  
  Distribute to other PCs without requiring a separate Node.js installation.

- **安全发布 / Safe Packaging**  
  发布包不会带上本机历史素材、任务记录和敏感配置。  
  Release packages do not carry local asset history, job history, or sensitive credentials.

## 界面预览 / Product Tour

### 总览页 / Overview

工作台首页聚合任务数量、素材数量、模板数量和支持市场，同时展示最近任务，适合做全局状态查看。  
The overview screen summarizes job counts, asset counts, templates, and supported markets while surfacing recent tasks for quick operational awareness.

![Overview](docs/screenshots/overview.png)

### 创作台 / Studio

创作台是主生产入口，用来组织商品信息、创作模式、图片类型、比例、分辨率、数量和临时 API 覆盖。  
The studio is the primary production surface for product metadata, creation mode, image type, aspect ratio, resolution, quantity, and temporary API overrides.

![Studio](docs/screenshots/studio.png)

### 历史记录 / History

历史记录页用于筛选和回看旧任务，适合定位失败批次、查找特定平台或语言素材，以及回看历史输出。  
The history page helps filter and revisit prior jobs, especially when locating failures, specific platforms or languages, and earlier output batches.

![History](docs/screenshots/history.png)

### 模板中心 / Templates

模板中心用于筛选、复制、编辑和扩展模板，让生成逻辑更可控、更适合团队协作。  
The template center supports filtering, duplicating, editing, and extending templates so creative logic becomes more controllable and reusable.

![Templates](docs/screenshots/templates.png)

### 任务详情 / Job Details

任务详情页集中显示 prompt、文案、纯图、错误、警告和审核状态，是结果筛选与导出的主界面。  
The job-details page centralizes prompts, copy, pure images, warnings, errors, and review states for final selection and export.

![Job Details](docs/screenshots/job-details.png)

### 设置页 / Settings

设置页统一管理 Gemini 官方接口、relay、飞书多维表格同步、字段映射和存储目录。  
The settings page centralizes Gemini official API config, relay config, Feishu Bitable sync, field mapping, and storage settings.

![Settings](docs/screenshots/settings.png)

## 使用流程 / Typical Workflow

1. 在设置页配置 Gemini 官方接口或 relay，并按需启用飞书同步。  
   Configure official Gemini or a relay provider in Settings, and enable Feishu sync if needed.
2. 在创作台选择模式，上传商品图或参考图。  
   Choose a creation mode and upload source or reference images in Studio.
3. 填写商品、市场、语言、平台和规格参数。  
   Fill in product, market, language, platform, and output parameters.
4. 提交批量任务，等待系统生成图片与文案。  
   Submit the batch job and let the system generate images and copy.
5. 在任务详情页审核结果，执行入选、通过或淘汰。  
   Review outputs in Job Details and mark them as shortlisted, approved, or rejected.
6. 导出通过项，或将成功结果自动同步到飞书多维表格。  
   Export approved assets or let successful results sync automatically into Feishu Bitable.

## 安装与运行 / Installation and Running

### Windows 安装器 / Windows Installer

- 推荐从 [GitHub Releases](https://github.com/aEboli/gemini-commerce-image-workbench/releases) 下载  
  Recommended download source: [GitHub Releases](https://github.com/aEboli/gemini-commerce-image-workbench/releases)
- 当前安装器命名为 `IMAGE-STUDIO-WINDOWS-0.4.0.exe`  
  The current installer is named `IMAGE-STUDIO-WINDOWS-0.4.0.exe`
- 安装器内置运行时，不需要额外安装 Node.js  
  The installer bundles its own runtime, so Node.js is not required on the target machine

### 首次启动 / First Launch

- 本机 / Local: `http://127.0.0.1:3000`
- 局域网 / LAN: `http://<your-local-ip>:3000`
- 首次启动后，请先进入“设置”页填写 Gemini 或中转配置  
  After first launch, go to Settings and enter your Gemini or relay configuration
- 如需团队协作，可继续配置飞书多维表格同步  
  If you plan to collaborate with a team, continue by setting up Feishu Bitable sync

### 交付说明 / Distribution Notes

当前安装包适合直接交付给其他电脑使用，交付时会保留应用功能，但不会带出本机敏感配置。  
The current installer is suitable for direct distribution to other PCs. It preserves product functionality without carrying over local sensitive configuration.

对外交付时会清理以下内容 / The distributed package is sanitized from:

- 默认 API Key / Default API key
- 自定义请求头 / Custom request headers
- 飞书 App Secret / Feishu app secret
- 本地任务记录 / Local job history
- 本地素材目录 / Local asset directory

## FAQ / 常见问题

### 支持哪些接口？ / Which providers are supported?

支持 Google Gemini 官方接口，以及 Gemini 兼容 relay。  
The app supports the official Google Gemini API and Gemini-compatible relay providers.

### 提示词模式一定要上传商品图吗？ / Does prompt mode require a source image?

不一定，提示词模式支持直接按 prompt 出图。  
No. Prompt mode can generate directly from a custom prompt.

### 参考图复刻适合什么场景？ / When should I use reference remix?

当你希望尽量保留参考海报的构图、层级与氛围，只替换成自己的商品时，参考图复刻是最合适的模式。  
Use reference remix when you want to preserve the composition, hierarchy, and mood of an existing poster while replacing the product.

### 飞书同步现在支持到什么程度？ / How complete is Feishu sync now?

当前版本支持设置页测试连接、字段映射校验、自动建记录，以及从小图到 4K 图片的自动同步。  
The current version supports connection testing, field-mapping validation, automatic record creation, and automatic sync from smaller images up to 4K.

如果同步失败，优先检查以下内容：  
If sync fails, check the following first:

- 飞书应用权限 / Feishu app permissions
- 字段映射 JSON / Field-mapping JSON
- `parent_type` 配置 / `parent_type` configuration
- 目标表字段类型 / Target field types

### 为什么仓库里没有安装器文件？ / Why aren’t installer binaries stored in the repository?

仓库主要保存源码；正式安装器和对外交付包通过 GitHub Releases 提供下载。  
The repository primarily stores source code, while official installers and delivery packages are distributed through GitHub Releases.

## 仓库说明 / Repository Notes

- 本文件是面向 GitHub 访客和潜在使用者的主 README  
  This file is the main public-facing README for GitHub visitors and potential users
- 更详细的中文交付文档见 [Readme/使用说明-电商AI出图工作台.md](./Readme/使用说明-电商AI出图工作台.md)  
  A more detailed Chinese operator guide is available in [Readme/使用说明-电商AI出图工作台.md](./Readme/使用说明-电商AI出图工作台.md)
- 项目 PRD 见 [Readme/PRD-电商AI出图工作台.md](./Readme/PRD-电商AI出图工作台.md)  
  The product requirement document is available at [Readme/PRD-电商AI出图工作台.md](./Readme/PRD-电商AI出图工作台.md)
- `release`、`data`、本地数据库、构建输出和临时文件不会提交到源码仓库  
  `release`, `data`, local databases, build output, and temporary files are excluded from source control

## License

如需公开发布，请补充你希望使用的许可证。  
Add your preferred license before publishing beyond private or internal use.
