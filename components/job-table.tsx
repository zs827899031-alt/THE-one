"use client";

import Link from "next/link";
import { useEffect } from "react";
import mediumZoom from "@/lib/vendor/medium-zoom";

import type { JobRecord, UiLanguage } from "@/lib/types";

function statusLabel(language: UiLanguage, status: string) {
  const labels = {
    zh: {
      queued: "排队中",
      processing: "生成中",
      completed: "已完成",
      partial: "部分完成",
      failed: "失败",
    },
    en: {
      queued: "Queued",
      processing: "Processing",
      completed: "Completed",
      partial: "Partial",
      failed: "Failed",
    },
  } as const;

  return labels[language][status as keyof (typeof labels)["zh"]] ?? status;
}

function metricLabel(language: UiLanguage, kind: "generated" | "succeeded" | "failed") {
  const labels = {
    zh: {
      generated: "总",
      succeeded: "成",
      failed: "失",
    },
    en: {
      generated: "All",
      succeeded: "OK",
      failed: "Fail",
    },
  } as const;

  return labels[language][kind];
}

function statusClassName(status: string) {
  const statusMap = {
    queued: "is-queued",
    processing: "is-processing",
    completed: "is-completed",
    partial: "is-partial",
    failed: "is-failed",
  } as const;

  return statusMap[status as keyof typeof statusMap] ?? "is-queued";
}

function formatDateTime(language: UiLanguage, value: string) {
  const date = new Date(value);
  const locale = language === "zh" ? "zh-CN" : "en-US";

  return {
    date: date.toLocaleDateString(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }),
    time: date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }),
  };
}

function assetPreviewUrl(assetId: string) {
  return `/api/assets/${assetId}`;
}

function modeLabel(language: UiLanguage, mode: JobRecord["creationMode"]) {
  if (mode === "reference-remix") {
    return language === "zh" ? "参考图复刻" : "Reference remix";
  }
  if (mode === "amazon-a-plus") {
    return language === "zh" ? "亚马逊A+图" : "Amazon A+";
  }
  if (mode === "suite") {
    return language === "zh" ? "套图模式" : "Image set mode";
  }
  if (mode === "prompt") {
    return language === "zh" ? "提示词模式" : "Prompt mode";
  }

  return language === "zh" ? "标准出图" : "Standard";
}

function previewZoomAriaLabel(language: UiLanguage, productName: string, index: number, total: number) {
  return language === "zh"
    ? `放大查看 ${productName} 的第 ${index} / ${total} 张预览图`
    : `Open preview ${index} of ${total} for ${productName}`;
}

export function JobTable({ jobs, language }: { jobs: JobRecord[]; language: UiLanguage }) {
  useEffect(() => {
    const zoom = mediumZoom("[data-history-preview-zoom]", {
      margin: 36,
      background: "rgba(2, 6, 23, 0.92)",
      scrollOffset: 40,
    });

    return () => {
      void zoom.close();
      zoom.detach();
    };
  }, [jobs]);

  return (
    <div className="table-wrap">
      <table className="history-table">
        <thead>
          <tr>
            <th>{language === "zh" ? "商品" : "Product"}</th>
            <th>{language === "zh" ? "预览" : "Preview"}</th>
            <th>{language === "zh" ? "平台" : "Platform"}</th>
            <th>{language === "zh" ? "市场" : "Market"}</th>
            <th>{language === "zh" ? "统计" : "Stats"}</th>
            <th>{language === "zh" ? "状态" : "Status"}</th>
            <th>{language === "zh" ? "时间" : "Created"}</th>
            <th>{language === "zh" ? "操作" : "Open"}</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            const createdAt = formatDateTime(language, job.createdAt);
            const overflowCount = Math.max(0, job.previewImageCount - 8);

            return (
              <tr key={job.id}>
                <td>
                  <div className="history-product-cell" title={job.productName}>
                    <strong className="history-product-name">{job.productName}</strong>
                    <span className="history-product-meta">
                      {language === "zh" ? "模式" : "Mode"} · {modeLabel(language, job.creationMode)}
                    </span>
                  </div>
                </td>
                <td>
                  {job.previewAssets.length ? (
                    <div className="history-preview-grid">
                      {job.previewAssets.slice(0, 8).map((asset, index) => (
                        <button
                          key={asset.id}
                          aria-label={previewZoomAriaLabel(
                            language,
                            job.productName,
                            index + 1,
                            job.previewImageCount || job.previewAssets.length,
                          )}
                          className="history-preview-thumb"
                          title={asset.originalName}
                          type="button"
                        >
                          <img
                            alt={asset.originalName}
                            className="history-preview-thumb-image"
                            data-history-preview-zoom=""
                            src={assetPreviewUrl(asset.id)}
                          />
                          {overflowCount > 0 && index === 7 ? (
                            <span className="history-preview-overflow">+{overflowCount}</span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="history-preview-empty">—</span>
                  )}
                </td>
                <td>{job.platform}</td>
                <td>
                  {job.country} / {job.language}
                </td>
                <td>
                  <div className="history-stat-pill-group">
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
                </td>
                <td>
                  <span className={`history-status-badge ${statusClassName(job.status)}`}>
                    {statusLabel(language, job.status)}
                  </span>
                </td>
                <td>
                  <div className="history-created-cell">
                    <strong>{createdAt.date}</strong>
                    <span>{createdAt.time}</span>
                  </div>
                </td>
                <td>
                  <Link className="history-open-link" href={`/jobs/${job.id}`}>
                    {language === "zh" ? "查看" : "Open"}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
