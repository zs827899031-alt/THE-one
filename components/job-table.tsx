"use client";

import Link from "next/link";
import { useState } from "react";

import { ImageLightbox, type ImageLightboxItem } from "@/components/image-lightbox";
import { buildAssetUrl } from "@/lib/asset-url";
import type { JobRecord, UiLanguage } from "@/lib/types";

type HistoryLightboxItem = ImageLightboxItem & {
  jobItemId: string;
};

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

function formatJobDuration(language: UiLanguage, createdAt: string, completedAt: string | null) {
  if (!completedAt) {
    return null;
  }

  const start = new Date(createdAt).getTime();
  const end = new Date(completedAt).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }

  const totalSeconds = Math.max(1, Math.round((end - start) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (language === "zh") {
    if (hours > 0) {
      return `耗时 ${hours}小时${minutes}分${seconds}秒`;
    }
    if (minutes > 0) {
      return `耗时 ${minutes}分${seconds}秒`;
    }
    return `耗时 ${seconds}秒`;
  }

  if (hours > 0) {
    return `Time ${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `Time ${minutes}m ${seconds}s`;
  }
  return `Time ${seconds}s`;
}

function assetPreviewUrl(assetId: string) {
  return buildAssetUrl(assetId, { width: 160, quality: 70 });
}

function assetOriginalUrl(assetId: string) {
  return buildAssetUrl(assetId);
}

function modeLabel(language: UiLanguage, mode: JobRecord["creationMode"]) {
  if (mode === "reference-remix") {
    return language === "zh" ? "参考图复刻" : "Reference remix";
  }
  if (mode === "amazon-a-plus") {
    return language === "zh" ? "亚马逊 A+" : "Amazon A+";
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

function lightboxActionHref(jobId: string, jobItemId: string) {
  return `/jobs/${jobId}?itemId=${encodeURIComponent(jobItemId)}`;
}

export function JobTable({ jobs, language }: { jobs: JobRecord[]; language: UiLanguage }) {
  const [lightboxState, setLightboxState] = useState<{
    currentIndex: number;
    items: HistoryLightboxItem[];
    jobId: string;
  } | null>(null);

  return (
    <>
      <div className="table-wrap">
        <table className="history-table">
          <colgroup>
            <col className="history-col-product" />
            <col className="history-col-preview" />
            <col className="history-col-mode" />
            <col className="history-col-language" />
            <col className="history-col-stats" />
            <col className="history-col-status" />
            <col className="history-col-created" />
            <col className="history-col-action" />
          </colgroup>
          <thead>
            <tr>
              <th>{language === "zh" ? "图片" : "Image"}</th>
              <th>{language === "zh" ? "预览" : "Preview"}</th>
              <th>{language === "zh" ? "生图模式" : "Mode"}</th>
              <th>{language === "zh" ? "语言" : "Language"}</th>
              <th>{language === "zh" ? "统计" : "Stats"}</th>
              <th>{language === "zh" ? "状态" : "Status"}</th>
              <th>{language === "zh" ? "时间" : "Created"}</th>
              <th>{language === "zh" ? "操作" : "Open"}</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => {
              const createdAt = formatDateTime(language, job.createdAt);
              const previewItems: HistoryLightboxItem[] = job.previewAssets.map((asset, index) => ({
                alt: asset.originalName,
                jobItemId: asset.jobItemId,
                label: previewZoomAriaLabel(language, job.productName, index + 1, job.previewAssets.length),
                src: assetOriginalUrl(asset.id),
              }));
              const visiblePreviewAssets = job.previewAssets.slice(0, 4);
              const overflowCount = Math.max(0, job.previewImageCount - visiblePreviewAssets.length);
              const durationLabel =
                job.status === "completed" ? formatJobDuration(language, job.createdAt, job.completedAt) : null;

              return (
                <tr key={job.id}>
                  <td className="history-product-column">
                    <div className="history-product-cell" title={job.productName}>
                      <strong className="history-product-name">{job.productName}</strong>
                      <span className="history-product-meta">
                        {language === "zh" ? "模式" : "Mode"} · {modeLabel(language, job.creationMode)}
                      </span>
                    </div>
                  </td>
                  <td className="history-preview-cell">
                    {visiblePreviewAssets.length ? (
                      <div className="history-preview-grid">
                        {visiblePreviewAssets.map((asset, index) => {
                          const lightboxLabel = previewZoomAriaLabel(
                            language,
                            job.productName,
                            index + 1,
                            previewItems.length,
                          );

                          return (
                            <button
                              key={asset.id}
                              aria-label={lightboxLabel}
                              className="history-preview-thumb"
                              onClick={() =>
                                setLightboxState({
                                  currentIndex: index,
                                  items: previewItems,
                                  jobId: job.id,
                                })
                              }
                              title={asset.originalName}
                              type="button"
                            >
                              <img
                                alt={asset.originalName}
                                className="history-preview-thumb-image"
                                decoding="async"
                                loading="lazy"
                                src={assetPreviewUrl(asset.id)}
                              />
                              {overflowCount > 0 && index === visiblePreviewAssets.length - 1 ? (
                                <span className="history-preview-overflow">+{overflowCount}</span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="history-preview-empty">—</span>
                    )}
                  </td>
                  <td className="history-mode-cell">{modeLabel(language, job.creationMode)}</td>
                  <td className="history-language-cell">{job.language}</td>
                  <td className="history-stats-column">
                    <div className="history-stats-cell">
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
                      {durationLabel ? <div className="history-duration-note">{durationLabel}</div> : null}
                    </div>
                  </td>
                  <td className="history-status-cell">
                    <span className={`history-status-badge ${statusClassName(job.status)}`}>
                      {statusLabel(language, job.status)}
                    </span>
                  </td>
                  <td className="history-created-column">
                    <div className="history-created-cell">
                      <strong>{createdAt.date}</strong>
                      <span>{createdAt.time}</span>
                    </div>
                  </td>
                  <td className="history-action-cell">
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

      <ImageLightbox
        actionHref={
          lightboxState
            ? lightboxActionHref(
                lightboxState.jobId,
                lightboxState.items[lightboxState.currentIndex]?.jobItemId ?? "",
              )
            : null
        }
        actionLabel={language === "zh" ? "查看" : "Open"}
        canNext={Boolean(lightboxState && lightboxState.currentIndex < lightboxState.items.length - 1)}
        canPrev={Boolean(lightboxState && lightboxState.currentIndex > 0)}
        closeLabel={language === "zh" ? "关闭预览" : "Close preview"}
        currentIndex={lightboxState?.currentIndex ?? -1}
        items={lightboxState?.items ?? []}
        nextLabel={language === "zh" ? "下一张图" : "Next image"}
        onClose={() => setLightboxState(null)}
        onNext={() =>
          setLightboxState((current) =>
            current && current.currentIndex < current.items.length - 1
              ? { ...current, currentIndex: current.currentIndex + 1 }
              : current,
          )
        }
        onPrev={() =>
          setLightboxState((current) =>
            current && current.currentIndex > 0 ? { ...current, currentIndex: current.currentIndex - 1 } : current,
          )
        }
        previousLabel={language === "zh" ? "上一张图" : "Previous image"}
      />
    </>
  );
}
