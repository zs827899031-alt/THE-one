import Link from "next/link";

import { StatCard } from "@/components/stat-card";
import { getDashboardStats, listRecentJobs } from "@/lib/db";
import type { JobRecord, UiLanguage } from "@/lib/types";
import { t } from "@/lib/i18n";
import { getUiLanguage } from "@/lib/ui-language";

function statusLabel(language: UiLanguage, status: JobRecord["status"]) {
  const labels = {
    zh: { queued: "排队中", processing: "生成中", completed: "已完成", partial: "部分完成", failed: "失败" },
    en: { queued: "Queued", processing: "Processing", completed: "Completed", partial: "Partial", failed: "Failed" },
  } as const;

  return labels[language][status];
}

function statusClassName(status: JobRecord["status"]) {
  const map = {
    queued: "is-queued",
    processing: "is-processing",
    completed: "is-completed",
    partial: "is-partial",
    failed: "is-failed",
  } as const;

  return map[status];
}

function metricLabel(language: UiLanguage, kind: "generated" | "succeeded" | "failed") {
  const labels = {
    zh: { generated: "总", succeeded: "成", failed: "失" },
    en: { generated: "All", succeeded: "OK", failed: "Fail" },
  } as const;

  return labels[language][kind];
}

function formatOverviewTime(language: UiLanguage, value: string) {
  return new Date(value).toLocaleString(language === "zh" ? "zh-CN" : "en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default async function HomePage() {
  const language = await getUiLanguage();
  const stats = getDashboardStats();
  const recentJobs = listRecentJobs(2);
  const copy =
    language === "zh"
      ? {
          featureTitle: "团队创作面板",
          featureCards: [
            { title: "批量出图", description: "一次上传多张图片，按类型、尺寸和数量自动拆分任务。" },
            { title: "多市场适配", description: "按国家、语言和平台自动命中文案与视觉模板。" },
            { title: "模板驱动", description: "默认模板和自定义模板都能参与实时命中与生成。" },
            { title: "快速复用", description: "从历史任务继续生成，持续迭代图片视觉资产。" },
          ],
          quickActionsTitle: "快捷入口",
          quickActions: [
            { href: "/create", title: "新建任务", description: "开始新一轮批量生成" },
            { href: "/history", title: "查看历史", description: "筛选、复用和下载结果" },
            { href: "/templates", title: "管理模板", description: "维护平台与市场模板" },
            { href: "/settings", title: "系统设置", description: "配置 API、中转站和默认参数" },
          ],
          workflowTitle: "推荐工作流",
          workflowSteps: [
            "先确认 API Key、Base URL 和默认模型。",
            "在创作台上传图片并确认模板命中。",
            "回到历史页筛选、审核和下载结果。",
          ],
          helperTitle: "当前站点能力",
          helperBody: "支持局域网多人协作、批量出图、模板匹配预览与中转站接入。",
          recentTitle: "最近任务",
        }
      : {
          featureTitle: "Team workspace",
          featureCards: [
            { title: "Batch generation", description: "Upload multiple products and expand into types, sizes, and quantities automatically." },
            { title: "Market-aware output", description: "Match templates automatically by country, language, and platform." },
            { title: "Template-driven", description: "Default and custom templates participate in live matching and generation." },
            { title: "Fast reuse", description: "Resume from history and keep iterating product visuals quickly." },
          ],
          quickActionsTitle: "Quick access",
          quickActions: [
            { href: "/create", title: "New job", description: "Start a fresh batch" },
            { href: "/history", title: "Open history", description: "Filter, reuse, and download results" },
            { href: "/templates", title: "Manage templates", description: "Maintain market and platform templates" },
            { href: "/settings", title: "System settings", description: "Configure API, relay, and defaults" },
          ],
          workflowTitle: "Suggested workflow",
          workflowSteps: [
            "Confirm the API key, base URL, and default models first.",
            "Upload product images in the studio and verify live template matches.",
            "Use History to filter, review, and download final assets.",
          ],
          helperTitle: "Current capabilities",
          helperBody: "Built for LAN teams with batch generation, template match preview, and relay-compatible Gemini access.",
          recentTitle: "Recent jobs",
        };

  return (
    <div className="stack gap-24 overview-page">
      <section className="hero panel page-hero overview-hero overview-hero-compact">
        <div className="page-hero-copy overview-hero-main overview-hero-main-compact">
          <p className="eyebrow">AI Commerce Studio</p>
          <h2>{t(language, "heroTitle")}</h2>
          <p>{t(language, "heroSubtitle")}</p>
          <div className="button-row">
            <Link className="primary-button" href="/create">
              {t(language, "quickStart")}
            </Link>
            <Link className="ghost-button" href="/history">
              {t(language, "viewAll")}
            </Link>
          </div>
          <ol className="overview-workflow-strip">
            {copy.workflowSteps.map((step) => (
              <li className="overview-workflow-chip" key={step}>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div className="page-hero-meta overview-hero-side overview-hero-side-compact">
          <div className="split-header compact">
            <div>
              <p className="eyebrow">{copy.featureTitle}</p>
              <h3>{copy.helperTitle}</h3>
            </div>
          </div>
          <p className="helper">{copy.helperBody}</p>

          <div className="stats-grid overview-compact-stats">
            <StatCard label={t(language, "statsJobs")} value={stats.jobs.toString()} accent="#69b9ff" />
            <StatCard label={t(language, "statsAssets")} value={stats.assets.toString()} accent="#ff6d84" />
            <StatCard label={t(language, "statsTemplates")} value={stats.templates.toString()} accent="#63dad2" />
            <StatCard label={t(language, "statsMarkets")} value={stats.markets.toString()} accent="#56d7a7" />
          </div>

          <div className="quick-link-grid overview-compact-actions">
            {copy.quickActions.map((action) => (
              <Link className="quick-link-card" href={action.href} key={action.href}>
                <strong>{action.title}</strong>
                <p>{action.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="overview-grid overview-grid-compact">
        <div className="panel overview-main-panel">
          <div className="split-header compact">
            <div>
              <p className="eyebrow">{copy.recentTitle}</p>
              <h3>{copy.recentTitle}</h3>
            </div>
            <Link href="/history">{t(language, "viewAll")}</Link>
          </div>

          {recentJobs.length ? (
            <div className="overview-recent-list">
              {recentJobs.map((job) => (
                <article className="overview-recent-card" key={job.id}>
                  <div className="overview-recent-main">
                    <div className="overview-recent-heading">
                      <strong className="overview-recent-title" title={job.productName}>
                        {job.productName}
                      </strong>
                      <span className={`history-status-badge ${statusClassName(job.status)}`}>
                        {statusLabel(language, job.status)}
                      </span>
                    </div>

                    <div className="overview-recent-meta">
                      <span>{job.platform}</span>
                      <span>
                        {job.country} / {job.language}
                      </span>
                      <span>{formatOverviewTime(language, job.createdAt)}</span>
                    </div>

                    <div className="history-stat-pill-group overview-recent-stats">
                      <span className="history-stat-pill">
                        {metricLabel(language, "generated")} {job.generatedCount}
                      </span>
                      <span className="history-stat-pill is-success">
                        {metricLabel(language, "succeeded")} {job.succeededCount}
                      </span>
                      <span className="history-stat-pill is-failure">
                        {metricLabel(language, "failed")} {job.failedCount}
                      </span>
                    </div>
                  </div>

                  <Link className="history-open-link" href={`/jobs/${job.id}`}>
                    {language === "zh" ? "查看" : "Open"}
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <p>{t(language, "emptyJobs")}</p>
          )}
        </div>

        <aside className="panel overview-side-panel">
          <div className="split-header compact">
            <div>
              <p className="eyebrow">{copy.featureTitle}</p>
              <h3>{copy.featureTitle}</h3>
            </div>
          </div>
          <div className="hero-feature-grid overview-feature-grid-compact">
            {copy.featureCards.map((item) => (
              <article className="hero-feature-card" key={item.title}>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
