# 基于 Gemini 的电商生图工作台 / Commerce Image Studio

> 面向电商运营、设计与商品团队的本地化 AI 出图工作台。  
> A local-network friendly AI image generation workstation for ecommerce operators, designers, and merchandising teams.

**版本 / Version:** `v0.2.0`  
**最新 Windows 安装器 / Latest Windows installer:** `IMAGE-STUDIO-WINDOWS-0.2.0.exe`  
**发布页 / Releases:** [GitHub Releases](https://github.com/zs827899031-alt/gemini-commerce-image-workbench/releases)  
**中文操作说明 / Chinese guide:** [使用说明-简体中文.md](./使用说明-简体中文.md)

## 核心能力 / What It Does

- 支持标准出图、提示词模式、参考图复刻三种创作方式。  
  Supports three creation modes: standard generation, prompt mode, and reference remix.
- 一次任务可组合多种图片类型、比例、分辨率和数量，适合批量出图。  
  A single job can combine multiple image types, aspect ratios, resolutions, and quantities for batch production.
- 生成结果同时覆盖纯图片、营销文案和文案排版图。  
  Outputs include pure images, marketing copy, and copy-layout creatives.
- 内置模板中心与品牌库，帮助统一不同市场、平台和品牌的视觉规则。  
  Built-in templates and brand profiles help standardize output across markets, platforms, and brands.
- 支持飞书多维表格自动同步，把生成结果落到团队协作表里。  
  Supports automatic Feishu Bitable sync so generated assets can land directly in a team workspace.
- 本地使用 SQLite 与文件存储，适合内网、单机和小团队协作场景。  
  Uses SQLite plus local file storage, which fits LAN, single-PC, and small-team workflows.

## v0.2.0 新功能 / What’s New in v0.2.0

### 创作模式升级 / Creation Modes Upgraded

- 标准出图继续保留结构化商品信息输入，适合批量生成平台图。  
  Standard mode keeps the structured product-input workflow for bulk marketplace output.
- 新增提示词模式，可直接按自定义 prompt 出图，源商品图可选。  
  Prompt mode lets users generate directly from a custom prompt, with source images optional.
- 新增参考图复刻模式，可上传参考图并保留整体构图、层级和海报氛围。  
  Reference remix mode accepts reference images and preserves overall composition, hierarchy, and poster feel.

### 飞书多维表格同步 / Feishu Bitable Sync

- 设置页新增飞书 App ID、App Secret、Bitable App Token、Table ID、字段映射等配置。  
  The Settings page now includes Feishu app credentials, Bitable identifiers, and field-mapping configuration.
- 支持飞书连接测试，保存设置前即可验证权限和映射是否正确。  
  A dedicated connection test validates permissions and mapping before saving configuration.
- 已支持大图同步，4K 图片也可以自动上传并创建多维表格记录。  
  Large-image sync is now supported, including automatic upload and record creation for 4K assets.

### 模板中心与品牌库 / Template Center and Brand Library

- 模板中心支持默认模板、自定义模板、复制模板和模板匹配。  
  The template center supports default templates, custom templates, duplication, and live matching.
- 品牌库支持品牌档案、色彩和提示词约束，帮助维持品牌一致性。  
  The brand library stores brand profiles, color direction, and prompt guidance for consistent output.

### 结果审核与导出 / Review and Export

- 结果页支持入选、通过、淘汰等审核状态。  
  Job results now support shortlist, approve, and reject review states.
- 已通过结果可单独打包下载，方便交付和二次筛选。  
  Approved results can be exported separately for delivery and downstream selection.

### 安全发布能力 / Safe Release Packaging

- 新版本安装器按版本号输出，例如 `IMAGE-STUDIO-WINDOWS-0.2.0.exe`。  
  Installers are now emitted with versioned filenames such as `IMAGE-STUDIO-WINDOWS-0.2.0.exe`.
- 安全发布会清理默认 API Key、自定义请求头、飞书 App Secret、本地任务记录和素材目录。  
  Safe packaging removes default API keys, custom headers, Feishu secrets, local job records, and asset history.

## 功能导览 / Product Tour

### 总览 / Overview

- 首页用于快速查看工作台状态，包括累计任务、生成素材、可用模板和支持市场。  
  The overview page acts as the workspace dashboard with totals for jobs, generated assets, templates, and supported markets.
- 最近任务表帮助运营或设计快速回到正在审核、失败或需要复查的批次。  
  The recent-jobs table helps operators jump back into batches that need review or troubleshooting.

![Overview](docs/screenshots/overview.png)

### 创作台 / Studio

- 创作台是主工作流入口，负责组织商品信息、市场信息、图片规格和批量参数。  
  The studio is the main production surface for product metadata, market setup, image specs, and batch parameters.
- 同一页面支持标准模式、提示词模式和参考图复刻，并支持多类型、多比例、多分辨率组合生成。  
  It supports standard mode, prompt mode, and reference remix, plus mixed generation across types, ratios, and resolutions.

![Studio](docs/screenshots/studio.png)

### 历史记录 / History

- 历史记录页用于按商品名、SKU、平台、国家、语言、分辨率和日期回查任务。  
  The history page filters past jobs by product name, SKU, platform, country, language, resolution, and date.
- 对于失败任务和部分成功任务，这里是定位问题与回看批次的主要入口。  
  It is also the primary place to revisit failed or partially completed batches.

![History](docs/screenshots/history.png)

### 模板中心 / Templates

- 模板中心用于维护不同平台、市场和图片类型的创意模板。  
  The template center manages creative templates by platform, market, and image type.
- 默认模板可作为基础，自定义模板可复制、编辑并参与实时匹配。  
  Default templates act as baselines, while custom variants can be duplicated, edited, and matched live.

![Templates](docs/screenshots/templates.png)

### 任务详情 / Job Details

- 任务详情页集中查看 prompt、文案、纯图、排版图、警告和失败原因。  
  The job-details page centralizes prompts, copy, pure images, layout creatives, warnings, and failure reasons.
- 这里也是审核结果、筛选素材、重新生成和导出已通过结果的主要工作区。  
  It also serves as the main workspace for review actions, selective export, and reruns.

![Job Details](docs/screenshots/job-details.png)

### 设置 / Settings

- 设置页支持 Google Gemini 官方接口、Gemini 兼容 relay，以及飞书多维表格同步配置。  
  The settings page supports official Google Gemini, Gemini-compatible relay providers, and Feishu Bitable sync.
- 这里可以测试提供商连接、测试飞书连接，并配置字段映射与素材存储目录。  
  Users can test provider connectivity, test Feishu connectivity, and configure field mapping and storage paths here.

![Settings](docs/screenshots/settings.png)

## 典型使用流程 / Typical Workflow

1. 在设置页填写 Gemini 官方接口或 relay 配置，并按需启用飞书同步。  
   Configure official Gemini or a relay provider in Settings, and enable Feishu sync if needed.
2. 在创作台选择创作模式，上传商品图或参考图，填写商品和市场信息。  
   Choose a creation mode in Studio, upload product or reference images, and fill in product and market details.
3. 选择图片类型、比例、分辨率与数量，提交批量任务。  
   Select image types, aspect ratios, resolutions, and quantity, then submit the batch job.
4. 等待系统生成图片、文案与排版图，并在任务详情页查看结果。  
   Let the system generate images, copy, and layout creatives, then review them in Job Details.
5. 对结果执行入选、通过、淘汰，必要时重新生成或导出通过项。  
   Review the outputs, approve or reject them, rerun when needed, and export approved items.
6. 如果启用了飞书同步，生成成功的图片会自动写入多维表格记录。  
   If Feishu sync is enabled, successful results are automatically written into Bitable records.

## 运行与安装 / Installation and Running

### Windows 安装器 / Windows Installer

- 推荐从 [GitHub Releases](https://github.com/zs827899031-alt/gemini-commerce-image-workbench/releases) 下载单文件安装器。  
  Download the single-file installer from [GitHub Releases](https://github.com/zs827899031-alt/gemini-commerce-image-workbench/releases).
- 当前版本安装器命名为 `IMAGE-STUDIO-WINDOWS-0.2.0.exe`。  
  The current installer is named `IMAGE-STUDIO-WINDOWS-0.2.0.exe`.
- 安装器内置运行时，目标机器不需要手动安装 Node.js。  
  The installer bundles its own runtime, so the target machine does not need a separate Node.js installation.

### 从源码运行 / Run from Source

如果你直接拉取源码仓库，可以使用以下方式启动。  
If you are running from the source repository, use one of the following options.

**方式一：双击启动 / Option 1: launcher**

- 双击 `启动正式版.bat`  
  Double-click `启动正式版.bat`

**方式二：开发模式 / Option 2: development mode**

```bash
npm install
npm run dev -- --hostname 127.0.0.1 --port 3000
```

**常用地址 / Common URLs**

- 本机 / Local: `http://127.0.0.1:3000`
- 局域网 / LAN: `http://<your-local-ip>:3000`

## 发布方式 / Release Artifacts

当前仓库以源码为主，安装器和安全发布包通过脚本生成。  
This repository focuses on source code; installers and safe release packages are produced by scripts.

常用发布命令 / Common release commands:

```bash
npm run package:release:safe
npm run package:release:safe:zip
npm run package:installer:exe:safe
```

安全发布包含以下约束 / Safe packaging guarantees:

- 清理默认 API Key  
  Clears the default API key
- 清理自定义请求头  
  Clears custom request headers
- 清理飞书 App Secret  
  Clears the Feishu app secret
- 清理本地任务记录  
  Removes local job history from the bundled database
- 清空本地素材目录  
  Ships an empty local asset directory instead of your historical generated files

这意味着发布包适合分发给其他电脑使用，但接收方需要自行填写自己的 API 和飞书配置。  
This means the package is safe to distribute to other machines, but recipients must enter their own API and Feishu settings.

## FAQ / 常见问题

### 支持哪些模型和接口？ / Which providers are supported?

支持 Google Gemini 官方接口，以及兼容 Gemini 请求格式的 relay 或中转服务。  
The app supports the official Google Gemini API and relay providers that expose Gemini-compatible endpoints.

### 提示词模式一定要上传商品图吗？ / Does prompt mode require a source image?

不一定。提示词模式可以直接根据自定义 prompt 出图，商品图是可选输入。  
No. Prompt mode can generate directly from a custom prompt, with source images treated as optional context.

### 参考图复刻适合什么场景？ / When should I use reference remix?

当你希望尽量保留参考海报的构图、层级、氛围和视觉方向，只替换成自己的商品时，适合使用参考图复刻。  
Use reference remix when you want to preserve the composition, hierarchy, mood, and layout of a reference poster while swapping in your own product.

### 飞书同步现在支持到什么程度？ / How complete is Feishu sync now?

当前版本支持设置页测试连接、字段映射校验、自动建记录，以及小图到 4K 图片的自动同步。  
The current version supports connection testing, field-mapping validation, automatic record creation, and automatic sync from smaller outputs up to 4K images.

如果同步失败，优先检查以下内容：  
If sync fails, check the following first:

- 飞书应用权限 / Feishu app permissions
- 多维表格字段映射 JSON / Bitable field-mapping JSON
- `parent_type` 是否符合你的应用要求 / Whether `parent_type` matches your app setup
- 目标表字段类型是否正确 / Whether the target field types are correct

### 安全发布会清掉哪些内容？ / What does safe packaging remove?

安全发布会移除敏感配置和本机运行痕迹，包括默认密钥、自定义请求头、飞书 Secret、本地任务记录和本地素材。  
Safe packaging removes sensitive configuration and local runtime traces, including default keys, custom headers, Feishu secrets, local jobs, and local assets.

### 这个仓库里为什么看不到安装器？ / Why aren’t installer files stored in the repository?

仓库主要保存源码；发布产物通过打包脚本生成，并放到 GitHub Releases 分发。  
The repository stores source code; release artifacts are generated by packaging scripts and distributed through GitHub Releases.

## 仓库说明 / Repository Notes

- 当前主 README 是本文件，面向 GitHub 访客和潜在使用者。  
  This file is the main public-facing README for GitHub visitors and potential users.
- 更详细的中文操作说明位于 [使用说明-简体中文.md](./使用说明-简体中文.md)。  
  A more detailed Chinese operator guide lives in [使用说明-简体中文.md](./使用说明-简体中文.md).
- `release`、`data`、本地数据库、构建输出和临时文件不会提交到源码仓库。  
  `release`, `data`, local databases, build output, and temporary files are excluded from source control.

## License

如需公开发布，请补充你希望使用的许可证。  
Add your preferred license before publishing beyond private or internal use.
