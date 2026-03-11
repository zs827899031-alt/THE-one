"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ASPECT_RATIOS, IMAGE_TYPE_OPTIONS } from "@/lib/constants";
import { splitCompositeSourceDescription } from "@/lib/creative-fields";
import { formatRequestedSizeDisplay } from "@/lib/image-size-policy";
import type { JobDetails, JobItemReviewStatus, UiLanguage } from "@/lib/types";

const CREATE_JOB_PROMPT_PREFILL_KEY = "commerce-image-studio.create-prompt-prefill.v1";
type DetailTabId = "inputs" | "reference" | "variants";

function getDefaultDetailTab(details: JobDetails): DetailTabId {
  if (details.job.localizedInputs) {
    return "inputs";
  }

  if (
    details.job.creationMode === "reference-remix" &&
    (details.job.referenceLayoutAnalysis || details.job.referencePosterCopy)
  ) {
    return "reference";
  }

  return "variants";
}

function statusText(language: UiLanguage, status: string) {
  const map = {
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

  return map[language][status as keyof (typeof map)["zh"]] ?? status;
}

function reviewStatusText(language: UiLanguage, status: JobItemReviewStatus) {
  const map = {
    zh: {
      unreviewed: "待筛选",
      shortlisted: "已入选",
      approved: "已通过",
      rejected: "已淘汰",
    },
    en: {
      unreviewed: "Unreviewed",
      shortlisted: "Shortlisted",
      approved: "Approved",
      rejected: "Rejected",
    },
  } as const;

  return map[language][status];
}

function assetPreviewUrl(assetId: string) {
  return `/api/assets/${assetId}`;
}

function assetDownloadUrl(assetId: string) {
  return `/api/assets/${assetId}?download=1`;
}

function approvedDownloadUrl(jobId: string) {
  return `/api/jobs/${jobId}/approved-download`;
}

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function formatDimensions(width: number | null | undefined, height: number | null | undefined, emptyLabel: string) {
  if (!width || !height) {
    return emptyLabel;
  }

  return `${width}x${height}`;
}

function formatRatio(width: number | null | undefined, height: number | null | undefined, emptyLabel: string) {
  if (!width || !height) {
    return emptyLabel;
  }

  const knownRatios = ASPECT_RATIOS.map((option) => {
    const [left, right] = option.value.split(":").map(Number);
    return {
      label: option.value,
      value: left / right,
    };
  });

  const actual = width / height;
  const matched = knownRatios.find((ratio) => Math.abs(ratio.value - actual) <= 0.03);
  if (matched) {
    return matched.label;
  }

  const gcd = (left: number, right: number): number => (right === 0 ? left : gcd(right, left % right));
  const divisor = gcd(width, height);
  return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;
}

function formatSizeMb(sizeBytes: number | null | undefined, emptyLabel: string) {
  if (!sizeBytes || sizeBytes <= 0) {
    return emptyLabel;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
}

function imageTypeLabel(language: UiLanguage, imageType: string) {
  return IMAGE_TYPE_OPTIONS.find((option) => option.value === imageType)?.label[language] ?? imageType;
}

export function JobDetailsClient({
  initialDetails,
  language,
  initialActiveItemId,
}: {
  initialDetails: JobDetails;
  language: UiLanguage;
  initialActiveItemId?: string | null;
}) {
  const router = useRouter();
  const [details, setDetails] = useState(initialDetails);
  const [errorMessage, setErrorMessage] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [copiedFieldId, setCopiedFieldId] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTabId>(() => getDefaultDetailTab(initialDetails));
  const [activeItemId, setActiveItemId] = useState<string | null>(
    () =>
      initialActiveItemId && initialDetails.items.some((item) => item.id === initialActiveItemId)
        ? initialActiveItemId
        : initialDetails.items.find((item) => item.generatedAsset || item.layoutAsset)?.id ?? initialDetails.items[0]?.id ?? null,
  );
  const [isFeishuSyncing, setIsFeishuSyncing] = useState(false);

  useEffect(() => {
    if (!["queued", "processing"].includes(details.job.status)) {
      return;
    }

    const timer = setInterval(async () => {
      const response = await fetch(`/api/jobs/${details.job.id}`, { cache: "no-store" });
      if (!response.ok) {
        return;
      }
      const body = (await response.json()) as JobDetails;
      setDetails(body);
    }, 3500);

    return () => clearInterval(timer);
  }, [details.job.id, details.job.status]);

  useEffect(() => {
    if (!copiedFieldId) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCopiedFieldId(null);
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [copiedFieldId]);

  useEffect(() => {
    const fallbackActiveId =
      details.items.find((item) => item.generatedAsset || item.layoutAsset)?.id ?? details.items[0]?.id ?? null;

    if (!fallbackActiveId) {
      if (activeItemId) {
        setActiveItemId(null);
      }
      return;
    }

    if (!activeItemId || !details.items.some((item) => item.id === activeItemId)) {
      setActiveItemId(fallbackActiveId);
    }
  }, [activeItemId, details.items]);

  const text = useMemo(
    () =>
      language === "zh"
        ? {
            "heading": "\u4efb\u52a1\u8be6\u60c5",
            "jobOverview": "\u4efb\u52a1\u603b\u89c8",
            "createdAt": "\u521b\u5efa\u65f6\u95f4",
            "translatedInfo": "\u539f\u59cb\u8f93\u5165 vs \u81ea\u52a8\u7ffb\u8bd1\u540e\u8f93\u5165",
            "translatedHint": "\u5de6\u4fa7\u662f\u4f60\u586b\u5199\u7684\u539f\u59cb\u57fa\u7840\u4fe1\u606f\uff0c\u53f3\u4fa7\u662f\u7cfb\u7edf\u5728\u751f\u6210\u524d\u81ea\u52a8\u7ffb\u8bd1\u6210\u5f53\u524d\u8f93\u51fa\u8bed\u8a00\u540e\u7684\u7248\u672c\uff0c\u6a21\u578b\u5b9e\u9645\u4f7f\u7528\u7684\u662f\u53f3\u4fa7\u5185\u5bb9\u3002",
            "inputSnapshot": "\u8f93\u5165\u5feb\u7167",
            "inputSnapshotHint": "\u540c\u4e00\u4e2a\u5b57\u6bb5\u540c\u65f6\u5bf9\u7167\u539f\u59cb\u8f93\u5165\u548c\u7cfb\u7edf\u751f\u6210\u524d\u5b9e\u9645\u4f7f\u7528\u7684\u7ffb\u8bd1\u540e\u7248\u672c\u3002",
            "originalInfo": "\u539f\u59cb\u8f93\u5165",
            "localizedInfo": "\u81ea\u52a8\u7ffb\u8bd1\u540e\u8f93\u5165",
            "translatedProductName": "\u5546\u54c1\u540d",
            "translatedSellingPoints": "\u6838\u5fc3\u5356\u70b9",
            "translatedRestrictions": "\u9650\u5236\u8bcd / \u7981\u7528\u5185\u5bb9",
            "translatedSourceDescription": "\u8865\u5145\u8bf4\u660e",
            "translatedMaterialInfo": "\u6750\u8d28",
            "translatedSizeInfo": "\u5c3a\u5bf8 / \u91cd\u91cf",
            "copy": "\u590d\u5236",
            "copied": "\u5df2\u590d\u5236",
            "reusePrompt": "\u56de\u586b\u5230\u521b\u4f5c\u53f0\u9ad8\u7ea7\u63d0\u793a\u8bcd",
            "sourceImages": "\u5546\u54c1\u539f\u56fe",
            "referenceImages": "\u53c2\u8003\u56fe",
            "creationMode": "\u751f\u6210\u6a21\u5f0f",
            "standardMode": "\u6807\u51c6\u51fa\u56fe",
            "promptMode": "\u63d0\u793a\u8bcd\u6a21\u5f0f",
            "referenceMode": "\u53c2\u8003\u56fe\u590d\u523b",
            "referenceStrength": "\u590d\u523b\u5f3a\u5ea6",
            "strengthReference": "\u66f4\u50cf\u53c2\u8003\u56fe",
            "strengthBalanced": "\u5e73\u8861",
            "strengthProduct": "\u66f4\u50cf\u539f\u5546\u54c1\u573a\u666f",
            "sourceAndReference": "\u539f\u56fe / \u53c2\u8003\u56fe",
            "mediaBoardHint": "\u5de6\u4fa7\u4fdd\u7559\u539f\u59cb\u8f93\u5165\u7d20\u6750\uff0c\u53f3\u4fa7\u4e3b\u5de5\u4f5c\u533a\u805a\u7126\u751f\u6210\u7ed3\u679c\uff0c\u51cf\u5c11\u4e0a\u4e0b\u6765\u56de\u6eda\u52a8\u3002",
            "previewWorkspace": "\u7ed3\u679c\u5de5\u4f5c\u53f0",
            "previewWorkspaceHint": "\u9009\u4e2d\u4e00\u4e2a\u751f\u6210\u9879\u540e\uff0c\u53ef\u5728\u8fd9\u91cc\u540c\u65f6\u67e5\u770b\u751f\u6210\u56fe\u3001\u6587\u6848\u56fe\u3001\u4fe1\u606f\u548c\u5ba1\u6838\u64cd\u4f5c\u3002",
            "variantBrowser": "\u751f\u6210\u9879\u6d4f\u89c8",
            "variantBrowserHint": "\u5728\u8fd9\u91cc\u5148\u5207\u6362\u8981\u805a\u7126\u67e5\u770b\u7684\u751f\u6210\u7ed3\u679c\uff0c\u4e0b\u65b9\u5de5\u4f5c\u53f0\u4f1a\u540c\u6b65\u663e\u793a\u5b8c\u6574\u5185\u5bb9\u3002",
            "noGeneratedImage": "\u6682\u65e0\u751f\u6210\u7eaf\u56fe",
            "noLayoutImage": "\u6682\u65e0\u751f\u6210\u6587\u6848\u56fe",
            "noMedia": "\u6682\u65e0\u56fe\u7247",
            "noPreviewAvailable": "\u5f53\u524d\u751f\u6210\u9879\u8fd8\u6ca1\u6709\u53ef\u9884\u89c8\u7684\u7ed3\u679c\u3002",
            "referenceLayout": "\u53c2\u8003\u56fe\u5206\u6790\u6458\u8981",
            "referencePosterCopy": "\u6d77\u62a5\u69fd\u4f4d\u6587\u6848",
            "variants": "\u53d8\u4f53\u7ed3\u679c",
            "generated": "\u7eaf\u56fe\u7247",
            "layout": "\u6587\u6848\u56fe",
            "compare": "\u7ed3\u679c\u5bf9\u6bd4",
            "addCompare": "\u52a0\u5165\u5bf9\u6bd4",
            "removeCompare": "\u79fb\u51fa\u5bf9\u6bd4",
            "clearCompare": "\u6e05\u7a7a\u5bf9\u6bd4",
            "compareHint": "\u6700\u591a\u53ef\u540c\u65f6\u5bf9\u6bd4 4 \u4e2a\u7ed3\u679c\uff0c\u65b9\u4fbf\u66f4\u5feb\u9009\u51fa\u53ef\u7528\u56fe\u3002",
            "comparePickMore": "\u518d\u9009 1 \u5f20\u5373\u53ef\u8fdb\u5165\u5bf9\u6bd4\u89c6\u56fe\u3002",
            "shortlisted": "\u5165\u9009",
            "approved": "\u901a\u8fc7",
            "rejected": "\u6dd8\u6c70",
            "resetReview": "\u91cd\u7f6e",
            "prompt": "\u5b9e\u9645\u53d1\u9001\u7ed9\u6a21\u578b\u7684\u63d0\u793a\u8bcd",
            "directPrompt": "\u672c\u6b21\u5b9e\u9645\u53d1\u9001\u7ed9\u6a21\u578b\u7684\u76f4\u9a71\u590d\u523b prompt",
            "download": "\u4e0b\u8f7d",
            "downloadApproved": "\u6279\u91cf\u4e0b\u8f7d\u5df2\u901a\u8fc7\u56fe\u7247",
            "approvedSummary": "\u5df2\u901a\u8fc7 {count} \u7ec4\u7ed3\u679c\uff0c\u53ef\u4e00\u952e\u6253\u5305\u4e0b\u8f7d\u3002",
            "noApproved": "\u8fd8\u6ca1\u6709\u5df2\u901a\u8fc7\u7ed3\u679c\uff0c\u5148\u6311\u51fa\u4f60\u60f3\u4fdd\u7559\u7684\u56fe\u7247\u3002",
            "rerun": "\u518d\u6b21\u751f\u6210",
            "resyncFeishu": "\u91cd\u65b0\u540c\u6b65\u98de\u4e66",
            "resyncingFeishu": "\u540c\u6b65\u4e2d...",
            "resyncFeishuSuccess": "\u98de\u4e66\u5df2\u91cd\u65b0\u540c\u6b65\uff0c\u6210\u529f\u56de\u5199 {uploaded} \u5f20\u56fe\uff0c\u5931\u8d25 {failed} \u5f20\u3002",
            "resyncFeishuError": "\u98de\u4e66\u91cd\u540c\u6b65\u5931\u8d25",
            "retryError": "\u91cd\u8bd5\u5931\u8d25",
            "jobError": "\u4efb\u52a1\u5931\u8d25\u539f\u56e0",
            "summary": "\u6458\u8981",
            "palette": "\u914d\u8272",
            "backgroundType": "\u80cc\u666f\u7c7b\u578b",
            "primaryPlacement": "\u4e3b\u5546\u54c1\u4f4d\u7f6e",
            "packagingPlacement": "\u5305\u88c5\u4f4d\u7f6e",
            "packagingRelationship": "\u5546\u54c1\u4e0e\u5305\u88c5\u5173\u7cfb",
            "camera": "\u955c\u5934\u89d2\u5ea6",
            "lighting": "\u5149\u7ebf\u4e0e\u666f\u6df1",
            "props": "\u8f85\u52a9\u5143\u7d20",
            "topBanner": "\u9876\u90e8\u6a2a\u5e45",
            "headline": "\u4e3b\u6807\u9898",
            "subheadline": "\u526f\u6807\u9898",
            "bottomBanner": "\u5e95\u90e8\u6a2a\u5e45",
            "callouts": "\u89d2\u6807 / \u5356\u70b9\u77ed\u53e5",
            "empty": "\u65e0",
            "unknown": "\u672a\u77e5",
            "separator": " \u00b7 ",
            "variantSummary": "{total} \u4e2a\u751f\u6210\u9879\u4e2d {success} \u4e2a\u6210\u529f\uff0c{failed} \u4e2a\u5931\u8d25\u3002",
            "providerDownloadSummary": "{count} \u4e2a\u5931\u8d25\u9879\u53d1\u751f\u5728\u4e0b\u8f7d\u4e2d\u8f6c\u8fd4\u56de\u56fe\u7247\u65f6\u3002",
            "warningSummary": "{count} \u4e2a\u6210\u529f\u9879\u7684\u5b9e\u9645\u5c3a\u5bf8\u4e0e\u8bf7\u6c42\u4e0d\u4e00\u81f4\u3002",
            "requestSize": "\u8bf7\u6c42\u5c3a\u5bf8\u6863\u4f4d",
            "actualSize": "\u5b9e\u9645\u5c3a\u5bf8",
            "requestRatio": "\u8bf7\u6c42\u6bd4\u4f8b",
            "actualRatio": "\u5b9e\u9645\u6bd4\u4f8b",
            "actualFileSize": "\u5b9e\u9645\u8fd4\u56de\u5927\u5c0f",
            "warning": "\u5c3a\u5bf8\u8b66\u544a",
            "providerImageUrl": "\u4e2d\u8f6c\u8fd4\u56de\u56fe\u7247 URL",
            "openLink": "\u6253\u5f00\u94fe\u63a5",
            "rawProviderResponse": "\u4e2d\u8f6c\u539f\u59cb\u8fd4\u56de",
            "failureReason": "\u5931\u8d25\u8be6\u60c5"
}
        : {
            "heading": "Job details",
            "jobOverview": "Overview",
            "createdAt": "Created",
            "translatedInfo": "Original vs translated inputs",
            "translatedHint": "The left side shows your original base inputs. The right side shows the auto-translated version in the current output language that the model actually used.",
            "inputSnapshot": "Input snapshot",
            "inputSnapshotHint": "Each field shows both your original input and the translated version the system actually used during generation.",
            "originalInfo": "Original input",
            "localizedInfo": "Auto-translated input",
            "translatedProductName": "Product name",
            "translatedSellingPoints": "Selling points",
            "translatedRestrictions": "Restrictions / banned content",
            "translatedSourceDescription": "Additional notes",
            "translatedMaterialInfo": "Material",
            "translatedSizeInfo": "Size / weight",
            "copy": "Copy",
            "copied": "Copied",
            "reusePrompt": "Reuse in create page advanced prompt",
            "sourceImages": "Source images",
            "referenceImages": "Reference images",
            "creationMode": "Creation mode",
            "standardMode": "Standard",
            "promptMode": "Prompt mode",
            "referenceMode": "Reference remake",
            "referenceStrength": "Remake strength",
            "strengthReference": "Closer to reference",
            "strengthBalanced": "Balanced",
            "strengthProduct": "Closer to product scene",
            "sourceAndReference": "Source / reference media",
            "mediaBoardHint": "Keep source inputs on the side while the main workspace stays focused on generated results, so you can review without constant scrolling.",
            "previewWorkspace": "Review workspace",
            "previewWorkspaceHint": "Pick a variant and inspect the generated image, layout creative, metadata, and review actions in one place.",
            "variantBrowser": "Variant browser",
            "variantBrowserHint": "Pick the generated variant here first and keep the full workspace below in sync.",
            "noGeneratedImage": "No generated image yet",
            "noLayoutImage": "No layout creative yet",
            "noMedia": "No images",
            "noPreviewAvailable": "This variant does not have any previewable output yet.",
            "referenceLayout": "Reference layout analysis",
            "referencePosterCopy": "Poster copy slots",
            "variants": "Variants",
            "generated": "Pure image",
            "layout": "Layout creative",
            "compare": "Compare results",
            "addCompare": "Add to compare",
            "removeCompare": "Remove",
            "clearCompare": "Clear compare",
            "compareHint": "Compare up to 4 outputs at once and pick the best candidate faster.",
            "comparePickMore": "Pick one more result to enter compare view.",
            "shortlisted": "Shortlist",
            "approved": "Approve",
            "rejected": "Reject",
            "resetReview": "Reset",
            "prompt": "Prompt sent to the model",
            "directPrompt": "Direct remake prompt sent to the model",
            "download": "Download",
            "downloadApproved": "Download approved ZIP",
            "approvedSummary": "{count} approved variants are ready for batch download.",
            "noApproved": "No approved variants yet. Mark a few results first.",
            "rerun": "Run again",
            "resyncFeishu": "Resync Feishu",
            "resyncingFeishu": "Syncing...",
            "resyncFeishuSuccess": "Feishu resynced. Uploaded {uploaded} image(s), failed {failed}.",
            "resyncFeishuError": "Feishu resync failed",
            "retryError": "Retry failed",
            "jobError": "Job failure reason",
            "summary": "Summary",
            "palette": "Palette",
            "backgroundType": "Background type",
            "primaryPlacement": "Primary product placement",
            "packagingPlacement": "Packaging placement",
            "packagingRelationship": "Product / packaging relationship",
            "camera": "Camera angle",
            "lighting": "Lighting and depth",
            "props": "Supporting props",
            "topBanner": "Top banner",
            "headline": "Headline",
            "subheadline": "Subheadline",
            "bottomBanner": "Bottom banner",
            "callouts": "Callouts",
            "empty": "None",
            "unknown": "Unknown",
            "separator": " \u00b7 ",
            "variantSummary": "{total} variants requested: {success} succeeded, {failed} failed.",
            "providerDownloadSummary": "{count} failed while downloading provider-returned image URLs.",
            "warningSummary": "{count} successful variants returned a different size than requested.",
            "requestSize": "Requested size bucket",
            "actualSize": "Actual size",
            "requestRatio": "Requested ratio",
            "actualRatio": "Actual ratio",
            "actualFileSize": "Actual file size",
            "warning": "Size warning",
            "providerImageUrl": "Provider image URL",
            "openLink": "Open link",
            "rawProviderResponse": "Raw provider response",
            "failureReason": "Failure details"
},
    [language],
  );

  const originalCreativeFields = splitCompositeSourceDescription(details.job.sourceDescription);
  const localizedCreativeFields = {
    sourceDescription: details.job.localizedInputs?.sourceDescription ?? "",
    materialInfo: details.job.localizedInputs?.materialInfo ?? "",
    sizeInfo: details.job.localizedInputs?.sizeInfo ?? "",
  };

  const detailRows = details.job.localizedInputs
    ? [
        {
          key: "productName",
          label: text.translatedProductName,
          originalValue: details.job.productName,
          localizedValue: details.job.localizedInputs.productName,
        },
        {
          key: "sellingPoints",
          label: text.translatedSellingPoints,
          originalValue: details.job.sellingPoints,
          localizedValue: details.job.localizedInputs.sellingPoints,
        },
        {
          key: "restrictions",
          label: text.translatedRestrictions,
          originalValue: details.job.restrictions,
          localizedValue: details.job.localizedInputs.restrictions,
        },
        {
          key: "sourceDescription",
          label: text.translatedSourceDescription,
          originalValue: originalCreativeFields.sourceDescription,
          localizedValue: localizedCreativeFields.sourceDescription,
        },
        {
          key: "materialInfo",
          label: text.translatedMaterialInfo,
          originalValue: originalCreativeFields.materialInfo,
          localizedValue: localizedCreativeFields.materialInfo,
        },
        {
          key: "sizeInfo",
          label: text.translatedSizeInfo,
          originalValue: originalCreativeFields.sizeInfo,
          localizedValue: localizedCreativeFields.sizeInfo,
        },
      ].filter((row) => Boolean(row.originalValue.trim()) || Boolean(row.localizedValue.trim()))
    : [];
  const hasInputSnapshot = detailRows.length > 0;
  const hasReferenceInsights =
    details.job.creationMode === "reference-remix" &&
    Boolean(details.job.referenceLayoutAnalysis || details.job.referencePosterCopy);
  const detailTabs = [
    hasInputSnapshot
      ? { id: "inputs" as const, label: language === "zh" ? "输入快照" : "Inputs" }
      : null,
    hasReferenceInsights
      ? { id: "reference" as const, label: language === "zh" ? "参考分析" : "Reference" }
      : null,
    { id: "variants" as const, label: language === "zh" ? "变体归档" : "Variant archive" },
  ].filter(Boolean) as Array<{ id: DetailTabId; label: string }>;

  const referenceStrengthText =
    details.job.referenceStrength === "reference"
      ? text.strengthReference
      : details.job.referenceStrength === "product"
        ? text.strengthProduct
        : text.strengthBalanced;

  const comparableItems = details.items.filter((item) => item.generatedAsset);
  const comparedItems = comparableItems.filter((item) => compareIds.includes(item.id));
  const approvedItems = details.items.filter(
    (item) => item.reviewStatus === "approved" && (item.generatedAsset || item.layoutAsset),
  );
  const approvedSummaryText =
    approvedItems.length > 0
      ? text.approvedSummary.replace("{count}", String(approvedItems.length))
      : text.noApproved;
  const referenceLayoutJson = details.job.referenceLayoutAnalysis
    ? JSON.stringify(details.job.referenceLayoutAnalysis, null, 2)
    : "";
  const referencePosterCopyJson = details.job.referencePosterCopy
    ? JSON.stringify(details.job.referencePosterCopy, null, 2)
    : "";
  const actualPromptLabel = details.job.creationMode === "reference-remix" ? text.directPrompt : text.prompt;
  const creationModeLabel =
    details.job.creationMode === "reference-remix"
      ? text.referenceMode
      : details.job.creationMode === "amazon-a-plus"
        ? details.job.uiLanguage === "zh"
          ? "亚马逊A+图"
          : "Amazon A+"
      : details.job.creationMode === "suite"
        ? details.job.uiLanguage === "zh"
          ? "套图模式"
          : "Image set mode"
      : details.job.creationMode === "prompt"
        ? text.promptMode
        : text.standardMode;
  const getDimensionWarning = (item: (typeof details.items)[number]) => {
    if (item.warningMessage) {
      return item.warningMessage;
    }

    if (!item.generatedAsset?.width || !item.generatedAsset?.height) {
      return null;
    }

    if (item.generatedAsset.width === item.width && item.generatedAsset.height === item.height) {
      return null;
    }

    return `${text.requestSize}: ${formatDimensions(item.width, item.height, text.unknown)} / ${text.requestRatio}: ${
      item.ratio
    }. ${text.actualSize}: ${formatDimensions(item.generatedAsset.width, item.generatedAsset.height, text.unknown)} / ${
      text.actualRatio
    }: ${formatRatio(item.generatedAsset.width, item.generatedAsset.height, text.unknown)}.`;
  };
  const succeededCount = details.items.filter((item) => item.generatedAsset || item.layoutAsset).length;
  const failedItems = details.items.filter((item) => item.status === "failed");
  const providerDownloadFailures = failedItems.filter(
    (item) => item.providerDebug?.failureStage === "provider-image-download",
  ).length;
  const warningCount = details.items.filter((item) => Boolean(getDimensionWarning(item))).length;
  const variantSummaryText = text.variantSummary
    .replace("{total}", String(details.items.length))
    .replace("{success}", String(succeededCount))
    .replace("{failed}", String(failedItems.length));
  const providerDownloadSummaryText =
    providerDownloadFailures > 0
      ? text.providerDownloadSummary.replace("{count}", String(providerDownloadFailures))
      : "";
  const warningSummaryText =
    warningCount > 0 ? text.warningSummary.replace("{count}", String(warningCount)) : "";
  const createdAtLabel = new Date(details.job.createdAt).toLocaleString(language === "zh" ? "zh-CN" : "en-US");
  const activeItem = details.items.find((item) => item.id === activeItemId) ?? details.items[0] ?? null;
  const activePreviewAsset = activeItem?.generatedAsset ?? activeItem?.layoutAsset ?? null;
  const activeDimensionWarning = activeItem ? getDimensionWarning(activeItem) : null;

  useEffect(() => {
    if (detailTabs.some((tab) => tab.id === activeDetailTab)) {
      return;
    }

    setActiveDetailTab(detailTabs[0]?.id ?? "variants");
  }, [activeDetailTab, detailTabs]);

  async function handleCopy(fieldId: string, value: string) {
    try {
      await copyToClipboard(value || "-");
      setCopiedFieldId(fieldId);
    } catch {
      setErrorMessage(text.retryError);
    }
  }

  async function handleRetry() {
    setErrorMessage("");
    setNoticeMessage("");
    const response = await fetch(`/api/jobs/${details.job.id}/retry`, { method: "POST" });
    if (!response.ok) {
      setErrorMessage(text.retryError);
      return;
    }
    const body = (await response.json()) as { jobId: string };
    router.push(`/jobs/${body.jobId}`);
  }

  async function handleFeishuResync() {
    setErrorMessage("");
    setNoticeMessage("");
    setIsFeishuSyncing(true);

    try {
      const response = await fetch(`/api/jobs/${details.job.id}/feishu-sync`, { method: "POST" });
      const body = (await response.json().catch(() => null)) as
        | { error?: string; uploadedCount?: number; failedCount?: number; details?: JobDetails }
        | null;

      if (!response.ok) {
        setErrorMessage(body?.error || text.resyncFeishuError);
        return;
      }

      if (body?.details) {
        setDetails(body.details);
      } else {
        router.refresh();
      }

      setNoticeMessage(
        text.resyncFeishuSuccess
          .replace("{uploaded}", String(body?.uploadedCount ?? 0))
          .replace("{failed}", String(body?.failedCount ?? 0)),
      );
    } catch {
      setErrorMessage(text.resyncFeishuError);
    } finally {
      setIsFeishuSyncing(false);
    }
  }

  async function handleReviewUpdate(itemId: string, reviewStatus: JobItemReviewStatus) {
    const response = await fetch(`/api/job-items/${itemId}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewStatus }),
    });

    if (!response.ok) {
      return;
    }

    const updatedItem = (await response.json()) as { id: string; reviewStatus: JobItemReviewStatus };
    setDetails((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === updatedItem.id ? { ...item, reviewStatus: updatedItem.reviewStatus } : item,
      ),
    }));
  }

  function handleReusePrompt(item: (typeof details.items)[number]) {
    if (!item.promptText) {
      return;
    }

    window.localStorage.setItem(
      CREATE_JOB_PROMPT_PREFILL_KEY,
      JSON.stringify({
        promptText: item.promptText,
        productName: details.job.productName,
        brandName: details.job.brandName,
        category: details.job.category,
        country: details.job.country,
        language: details.job.language,
        platform: details.job.platform,
        ratio: item.ratio,
        resolution: item.resolutionLabel,
        creationMode: details.job.creationMode,
        customNegativePrompt: details.job.customNegativePrompt,
        referenceStrength: details.job.referenceStrength,
      }),
    );

    router.push("/create");
  }

  function toggleCompare(itemId: string) {
    setCompareIds((current) => {
      if (current.includes(itemId)) {
        return current.filter((id) => id !== itemId);
      }
      if (current.length >= 4) {
        return current;
      }
      return [...current, itemId];
    });
  }

  function joinOrEmpty(values: string[]) {
    return values.length ? values.join(" / ") : text.empty;
  }

  return (
    <div className="stack gap-24">
      <section className="panel split-header">
        <div>
          <p className="eyebrow">{text.heading}</p>
          <h2>{details.job.productName}</h2>
          <p className="helper">
            {details.job.platform}
            {text.separator}
            {details.job.language}
            {text.separator}
            {statusText(language, details.job.status)}
          </p>
          <p className="helper">
            {text.creationMode}
            {text.separator}
            {creationModeLabel}
          </p>
          {details.job.creationMode === "reference-remix" ? (
            <p className="helper">
              {text.referenceStrength}
              {text.separator}
              {referenceStrengthText}
            </p>
          ) : null}
          <p className="helper">{variantSummaryText}</p>
          {providerDownloadSummaryText ? <p className="helper">{providerDownloadSummaryText}</p> : null}
          {warningSummaryText ? <p className="helper warning-text">{warningSummaryText}</p> : null}
          <p className="helper">{approvedSummaryText}</p>
        </div>
        <div className="button-row header-actions">
          {approvedItems.length ? (
            <a className="ghost-button" href={approvedDownloadUrl(details.job.id)}>
              {text.downloadApproved}
            </a>
          ) : (
            <button className="ghost-button" disabled type="button">
              {text.downloadApproved}
            </button>
          )}
          <button className="ghost-button" disabled={isFeishuSyncing} onClick={handleFeishuResync} type="button">
            {isFeishuSyncing ? text.resyncingFeishu : text.resyncFeishu}
          </button>
          <button className="ghost-button" onClick={handleRetry} type="button">
            {text.rerun}
          </button>
        </div>
      </section>

      {details.job.errorMessage ? (
        <section className="panel">
          <h3>{text.jobError}</h3>
          <p className="error-text">{details.job.errorMessage}</p>
        </section>
      ) : null}

      {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
      {noticeMessage ? <p className="success-text">{noticeMessage}</p> : null}

      <div className="job-details-workspace">
        <aside className="job-details-sidebar">
          <section className="panel">
            <div className="split-header compact">
              <div>
                <h3>{text.sourceAndReference}</h3>
                <p className="helper">{text.mediaBoardHint}</p>
              </div>
            </div>
            <div className="sidebar-media-stack">
              <div className="sidebar-media-group">
                <div className="detail-compare-heading">
                  <h4>{text.sourceImages}</h4>
                  <span className="helper">{details.sourceAssets.length}</span>
                </div>
                {details.sourceAssets.length ? (
                  <div className="sidebar-asset-grid">
                    {details.sourceAssets.map((asset) => (
                      <a
                        className="sidebar-asset-card"
                        href={assetPreviewUrl(asset.id)}
                        key={asset.id}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <img alt={asset.originalName} src={assetPreviewUrl(asset.id)} />
                        <span>{asset.originalName}</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="helper">{text.noMedia}</p>
                )}
              </div>

              {details.referenceAssets.length ? (
                <div className="sidebar-media-group">
                  <div className="detail-compare-heading">
                    <h4>{text.referenceImages}</h4>
                    <span className="helper">{details.referenceAssets.length}</span>
                  </div>
                  <div className="sidebar-asset-grid">
                    {details.referenceAssets.map((asset) => (
                      <a
                        className="sidebar-asset-card"
                        href={assetPreviewUrl(asset.id)}
                        key={asset.id}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <img alt={asset.originalName} src={assetPreviewUrl(asset.id)} />
                        <span>{asset.originalName}</span>
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          {detailRows.length ? (
            <section className="panel">
              <div className="split-header compact">
                <div>
                  <h3>{text.inputSnapshot}</h3>
                  <p className="helper">{text.inputSnapshotHint}</p>
                </div>
              </div>
              <div className="input-snapshot-list">
                {detailRows.map((row) => {
                  const originalFieldId = `workspace-original-${row.key}`;
                  const localizedFieldId = `workspace-localized-${row.key}`;

                  return (
                    <article className="input-snapshot-card" key={row.key}>
                      <strong>{row.label}</strong>
                      <div className="input-snapshot-columns">
                        <div className="input-snapshot-column">
                          <div className="detail-kv-head">
                            <span className="helper">{text.originalInfo}</span>
                            <button
                              className={`copy-chip-button${copiedFieldId === originalFieldId ? " is-copied" : ""}`}
                              onClick={() => handleCopy(originalFieldId, row.originalValue)}
                              type="button"
                            >
                              {copiedFieldId === originalFieldId ? text.copied : text.copy}
                            </button>
                          </div>
                          <p>{row.originalValue || "-"}</p>
                        </div>
                        <div className="input-snapshot-column">
                          <div className="detail-kv-head">
                            <span className="helper">{text.localizedInfo}</span>
                            <button
                              className={`copy-chip-button${copiedFieldId === localizedFieldId ? " is-copied" : ""}`}
                              onClick={() => handleCopy(localizedFieldId, row.localizedValue)}
                              type="button"
                            >
                              {copiedFieldId === localizedFieldId ? text.copied : text.copy}
                            </button>
                          </div>
                          <p>{row.localizedValue || "-"}</p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}
        </aside>

        <div className="job-details-main">
          <section className="panel">
            <div className="split-header compact">
              <div>
                <h3>{text.variantBrowser}</h3>
                <p className="helper">{text.variantBrowserHint}</p>
              </div>
              {comparedItems.length ? (
                <button className="ghost-button mini-button" onClick={() => setCompareIds([])} type="button">
                  {text.clearCompare}
                </button>
              ) : null}
            </div>
            <div className="variant-browser-grid">
              {details.items.map((item) => {
                const previewAsset = item.generatedAsset ?? item.layoutAsset;

                return (
                  <button
                    className={item.id === activeItem?.id ? "variant-browser-card is-active" : "variant-browser-card"}
                    key={item.id}
                    onClick={() => setActiveItemId(item.id)}
                    type="button"
                  >
                    <div className="variant-browser-thumb">
                      {previewAsset ? (
                        <img alt={previewAsset.originalName} src={assetPreviewUrl(previewAsset.id)} />
                      ) : (
                        <div className="variant-browser-thumb-placeholder">{statusText(language, item.status)}</div>
                      )}
                    </div>
                    <div className="variant-browser-content">
                      <strong className="variant-browser-title">
                        {imageTypeLabel(language, item.imageType)}
                        {text.separator}
                        {item.ratio}
                        {text.separator}
                        {item.resolutionLabel}
                        {text.separator}#{item.variantIndex}
                      </strong>
                      <span className="helper">{statusText(language, item.status)}</span>
                      <div className="variant-browser-tags">
                        <span className={`review-status-chip is-${item.reviewStatus}`}>
                          {reviewStatusText(language, item.reviewStatus)}
                        </span>
                        {item.generatedAsset ? <span className="variant-browser-chip">{text.generated}</span> : null}
                        {item.layoutAsset ? <span className="variant-browser-chip">{text.layout}</span> : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="panel job-workbench-panel">
            <div className="split-header compact">
              <div>
                <h3>{text.previewWorkspace}</h3>
                <p className="helper">{text.previewWorkspaceHint}</p>
              </div>
              {activeItem?.generatedAsset ? (
                <button className="ghost-button mini-button" onClick={() => toggleCompare(activeItem.id)} type="button">
                  {compareIds.includes(activeItem.id) ? text.removeCompare : text.addCompare}
                </button>
              ) : null}
            </div>

            {activeItem ? (
              <div className="job-workbench-grid">
                <div className="job-preview-stage">
                  <div className="job-preview-media-grid">
                    <figure className="job-preview-media-card">
                      <figcaption>
                        <strong>{text.generated}</strong>
                        {activeItem.generatedAsset ? (
                          <a download href={assetDownloadUrl(activeItem.generatedAsset.id)}>
                            {text.download}
                          </a>
                        ) : null}
                      </figcaption>
                      {activeItem.generatedAsset ? (
                        <img alt={activeItem.generatedAsset.originalName} src={assetPreviewUrl(activeItem.generatedAsset.id)} />
                      ) : (
                        <div className="job-preview-placeholder">{text.noGeneratedImage}</div>
                      )}
                    </figure>

                    <figure className="job-preview-media-card">
                      <figcaption>
                        <strong>{text.layout}</strong>
                        {activeItem.layoutAsset ? (
                          <a download href={assetDownloadUrl(activeItem.layoutAsset.id)}>
                            {text.download}
                          </a>
                        ) : null}
                      </figcaption>
                      {activeItem.layoutAsset ? (
                        <img alt={activeItem.layoutAsset.originalName} src={assetPreviewUrl(activeItem.layoutAsset.id)} />
                      ) : (
                        <div className="job-preview-placeholder">{text.noLayoutImage}</div>
                      )}
                    </figure>
                  </div>
                </div>

                <aside className="job-preview-sidebar">
                  <div className="job-preview-header">
                    <div>
                      <strong>
                        {imageTypeLabel(language, activeItem.imageType)}
                        {text.separator}
                        {activeItem.ratio}
                        {text.separator}
                        {activeItem.resolutionLabel}
                        {text.separator}#{activeItem.variantIndex}
                      </strong>
                      <p className="helper">{statusText(language, activeItem.status)}</p>
                    </div>
                    <span className={`review-status-chip is-${activeItem.reviewStatus}`}>
                      {reviewStatusText(language, activeItem.reviewStatus)}
                    </span>
                  </div>

                  <div className="variant-metadata-grid compact-metadata-grid">
                    <div className="variant-metadata-card">
                      <span className="helper">{text.requestSize}</span>
                      <strong>
                        {formatRequestedSizeDisplay({
                          width: activeItem.width,
                          height: activeItem.height,
                          resolutionLabel: activeItem.resolutionLabel,
                          language,
                          emptyLabel: text.unknown,
                        })}
                      </strong>
                    </div>
                    <div className="variant-metadata-card">
                      <span className="helper">{text.actualSize}</span>
                      <strong>
                        {formatDimensions(
                          activeItem.generatedAsset?.width ?? null,
                          activeItem.generatedAsset?.height ?? null,
                          text.unknown,
                        )}
                      </strong>
                    </div>
                    <div className="variant-metadata-card">
                      <span className="helper">{text.requestRatio}</span>
                      <strong>{activeItem.ratio}</strong>
                    </div>
                    <div className="variant-metadata-card">
                      <span className="helper">{text.actualRatio}</span>
                      <strong>
                        {formatRatio(
                          activeItem.generatedAsset?.width ?? null,
                          activeItem.generatedAsset?.height ?? null,
                          text.unknown,
                        )}
                      </strong>
                    </div>
                    <div className="variant-metadata-card is-wide">
                      <span className="helper">{text.actualFileSize}</span>
                      <strong>{formatSizeMb(activeItem.generatedAsset?.sizeBytes ?? null, text.unknown)}</strong>
                    </div>
                  </div>

                  <div className="variant-actions">
                    <button className="ghost-button mini-button" onClick={() => handleReviewUpdate(activeItem.id, "shortlisted")} type="button">
                      {text.shortlisted}
                    </button>
                    <button className="ghost-button mini-button" onClick={() => handleReviewUpdate(activeItem.id, "approved")} type="button">
                      {text.approved}
                    </button>
                    <button className="ghost-button mini-button danger-button" onClick={() => handleReviewUpdate(activeItem.id, "rejected")} type="button">
                      {text.rejected}
                    </button>
                    <button className="ghost-button mini-button" onClick={() => handleReviewUpdate(activeItem.id, "unreviewed")} type="button">
                      {text.resetReview}
                    </button>
                  </div>

                  {activeDimensionWarning ? (
                    <div className="provider-debug-panel">
                      <div className="detail-kv-head">
                        <strong>{text.warning}</strong>
                      </div>
                      <p className="warning-text">{activeDimensionWarning}</p>
                    </div>
                  ) : null}

                  {activeItem.copy ? (
                    <div className="copy-panel">
                      <strong>{activeItem.copy.title || details.job.productName}</strong>
                      {activeItem.copy.subtitle ? <p>{activeItem.copy.subtitle}</p> : null}
                      {activeItem.copy.highlights.length ? (
                        <ul>
                          {activeItem.copy.highlights.map((highlight) => (
                            <li key={highlight}>{highlight}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}

                  {activeItem.errorMessage ? (
                    <>
                      <p className="error-text">{activeItem.errorMessage}</p>
                      {activeItem.providerDebug?.imageUrl ||
                      activeItem.providerDebug?.failureReason ||
                      activeItem.providerDebug?.rawText ? (
                        <div className="provider-debug-panel">
                          {activeItem.providerDebug?.imageUrl ? (
                            <div className="detail-kv-card provider-debug-card">
                              <div className="detail-kv-head">
                                <dt>{text.providerImageUrl}</dt>
                                <div className="button-row compact-row">
                                  <a className="ghost-button mini-button" href={activeItem.providerDebug.imageUrl} rel="noreferrer" target="_blank">
                                    {text.openLink}
                                  </a>
                                  <button
                                    className={`copy-chip-button${copiedFieldId === `provider-url-${activeItem.id}` ? " is-copied" : ""}`}
                                    onClick={() => handleCopy(`provider-url-${activeItem.id}`, activeItem.providerDebug?.imageUrl || "")}
                                    type="button"
                                  >
                                    {copiedFieldId === `provider-url-${activeItem.id}` ? text.copied : text.copy}
                                  </button>
                                </div>
                              </div>
                              <dd>{activeItem.providerDebug.imageUrl}</dd>
                            </div>
                          ) : null}
                          {activeItem.providerDebug?.failureReason ? (
                            <div className="detail-kv-card provider-debug-card">
                              <dt>{text.failureReason}</dt>
                              <dd>{activeItem.providerDebug.failureReason}</dd>
                            </div>
                          ) : null}
                          {activeItem.providerDebug?.rawText ? (
                            <details className="provider-debug-details">
                              <summary>{text.rawProviderResponse}</summary>
                              <pre className="json-block prompt-block">{activeItem.providerDebug.rawText}</pre>
                            </details>
                          ) : null}
                        </div>
                      ) : null}
                    </>
                  ) : null}

                  {activeItem.promptText ? (
                    <details className="details-drawer prompt-details-drawer" open={Boolean(activePreviewAsset)}>
                      <summary>{actualPromptLabel}</summary>
                      <div className="prompt-debug-panel">
                        <div className="detail-kv-head">
                          <strong>{actualPromptLabel}</strong>
                          <div className="button-row compact-row">
                            {details.job.creationMode === "reference-remix" ? (
                              <button className="ghost-button mini-button" onClick={() => handleReusePrompt(activeItem)} type="button">
                                {text.reusePrompt}
                              </button>
                            ) : null}
                            <button
                              className={`copy-chip-button${copiedFieldId === `prompt-${activeItem.id}` ? " is-copied" : ""}`}
                              onClick={() => handleCopy(`prompt-${activeItem.id}`, activeItem.promptText || "")}
                              type="button"
                            >
                              {copiedFieldId === `prompt-${activeItem.id}` ? text.copied : text.copy}
                            </button>
                          </div>
                        </div>
                        <pre className="json-block prompt-block">{activeItem.promptText}</pre>
                      </div>
                    </details>
                  ) : null}
                </aside>
              </div>
            ) : (
              <p className="helper">{text.noPreviewAvailable}</p>
            )}
          </section>

          {comparedItems.length ? (
            <section className="panel">
              <div className="split-header compact">
                <div>
                  <h3>{text.compare}</h3>
                  <p className="helper">{text.compareHint}</p>
                </div>
              </div>
              {comparedItems.length < 2 ? <p className="helper">{text.comparePickMore}</p> : null}
              <div className="compare-grid">
                {comparedItems.map((item) => (
                  <article className="compare-card" key={item.id}>
                    <img alt={item.generatedAsset?.originalName || item.id} src={assetPreviewUrl(item.generatedAsset!.id)} />
                    <div className="compare-card-meta">
                      <strong>
                        {imageTypeLabel(language, item.imageType)}
                        {text.separator}
                        {item.ratio}
                        {text.separator}
                        {item.resolutionLabel}
                        {text.separator}#{item.variantIndex}
                      </strong>
                      <span className={`review-status-chip is-${item.reviewStatus}`}>
                        {reviewStatusText(language, item.reviewStatus)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>

      <section className="panel detail-hub-panel">
        <div className="split-header compact">
          <div>
            <h3>{language === "zh" ? "信息面板" : "Detail hub"}</h3>
            <p className="helper">
              {language === "zh"
                ? "把常用信息放进标签页，深层内容按抽屉展开，减少长页面来回滚动。"
                : "Keep frequent information in tabs and expand deeper content only when needed."}
            </p>
          </div>
        </div>
        <div aria-label={language === "zh" ? "详情标签" : "Detail tabs"} className="detail-tab-list" role="tablist">
          {detailTabs.map((tab) => (
            <button
              aria-selected={activeDetailTab === tab.id}
              className={activeDetailTab === tab.id ? "detail-tab-button is-active" : "detail-tab-button"}
              key={tab.id}
              onClick={() => setActiveDetailTab(tab.id)}
              role="tab"
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

      {activeDetailTab === "inputs" && detailRows.length ? (
        <section className="detail-tab-section">
          <details className="details-drawer compact-details" open>
            <summary>{text.translatedInfo}</summary>
            <p className="helper">{text.translatedHint}</p>
            <div className="detail-compare-grid">
              <section className="detail-compare-column" aria-label={text.originalInfo}>
                <div className="detail-compare-heading">
                  <h4>{text.originalInfo}</h4>
                </div>
                <dl className="detail-kv-grid single-column">
                  {detailRows.map((row) => {
                    const fieldId = `original-${row.key}`;
                    return (
                      <div className="detail-kv-card" key={fieldId}>
                        <div className="detail-kv-head">
                          <dt>{row.label}</dt>
                          <button
                            className={`copy-chip-button${copiedFieldId === fieldId ? " is-copied" : ""}`}
                            onClick={() => handleCopy(fieldId, row.originalValue)}
                            type="button"
                          >
                            {copiedFieldId === fieldId ? text.copied : text.copy}
                          </button>
                        </div>
                        <dd>{row.originalValue || "-"}</dd>
                      </div>
                    );
                  })}
                </dl>
              </section>

              <section className="detail-compare-column" aria-label={text.localizedInfo}>
                <div className="detail-compare-heading">
                  <h4>{text.localizedInfo}</h4>
                </div>
                <dl className="detail-kv-grid single-column">
                  {detailRows.map((row) => {
                    const fieldId = `localized-${row.key}`;
                    return (
                      <div className="detail-kv-card" key={fieldId}>
                        <div className="detail-kv-head">
                          <dt>{row.label}</dt>
                          <button
                            className={`copy-chip-button${copiedFieldId === fieldId ? " is-copied" : ""}`}
                            onClick={() => handleCopy(fieldId, row.localizedValue)}
                            type="button"
                          >
                            {copiedFieldId === fieldId ? text.copied : text.copy}
                          </button>
                        </div>
                        <dd>{row.localizedValue || "-"}</dd>
                      </div>
                    );
                  })}
                </dl>
              </section>
            </div>
          </details>
        </section>
      ) : null}

      {activeDetailTab === "reference" &&
      details.job.creationMode === "reference-remix" &&
      details.job.referenceLayoutAnalysis ? (
        <section className="detail-tab-section">
          <details className="details-drawer compact-details" open>
            <summary>{text.referenceLayout}</summary>
            <dl className="detail-kv-grid single-column">
            <div className="detail-kv-card">
              <dt>{text.summary}</dt>
              <dd>{details.job.referenceLayoutAnalysis.summary || text.empty}</dd>
            </div>
            <div className="detail-kv-card">
              <dt>{text.backgroundType}</dt>
              <dd>{details.job.referenceLayoutAnalysis.backgroundType || text.empty}</dd>
            </div>
            <div className="detail-kv-card">
              <dt>{text.primaryPlacement}</dt>
              <dd>{details.job.referenceLayoutAnalysis.primaryProductPlacement || text.empty}</dd>
            </div>
            <div className="detail-kv-card">
              <dt>{text.packagingPlacement}</dt>
              <dd>{details.job.referenceLayoutAnalysis.packagingPlacement || text.empty}</dd>
            </div>
            <div className="detail-kv-card">
              <dt>{text.packagingRelationship}</dt>
              <dd>{details.job.referenceLayoutAnalysis.productPackagingRelationship || text.empty}</dd>
            </div>
            <div className="detail-kv-card">
              <dt>{text.camera}</dt>
              <dd>{details.job.referenceLayoutAnalysis.cameraAngle || text.empty}</dd>
            </div>
            <div className="detail-kv-card">
              <dt>{text.lighting}</dt>
              <dd>{details.job.referenceLayoutAnalysis.depthAndLighting || text.empty}</dd>
            </div>
            <div className="detail-kv-card">
              <dt>{text.palette}</dt>
              <dd>{joinOrEmpty(details.job.referenceLayoutAnalysis.palette)}</dd>
            </div>
            <div className="detail-kv-card">
              <dt>{text.props}</dt>
              <dd>{joinOrEmpty(details.job.referenceLayoutAnalysis.supportingProps)}</dd>
            </div>
            <div className="detail-kv-card">
              <div className="detail-kv-head">
                <dt>JSON</dt>
                <button
                  className={`copy-chip-button${copiedFieldId === "reference-layout-json" ? " is-copied" : ""}`}
                  onClick={() => handleCopy("reference-layout-json", referenceLayoutJson)}
                  type="button"
                >
                  {copiedFieldId === "reference-layout-json" ? text.copied : text.copy}
                </button>
              </div>
              <dd>
                <pre className="json-block">{referenceLayoutJson}</pre>
              </dd>
            </div>
            </dl>
          </details>
        </section>
      ) : null}

      {activeDetailTab === "reference" &&
      details.job.creationMode === "reference-remix" &&
      details.job.referencePosterCopy ? (
        <section className="detail-tab-section">
          <details className="details-drawer compact-details">
            <summary>{text.referencePosterCopy}</summary>
            <dl className="detail-kv-grid single-column">
            <div className="detail-kv-card">
              <dt>{text.summary}</dt>
              <dd>{details.job.referencePosterCopy.summary || text.empty}</dd>
            </div>
            <div className="detail-kv-card">
              <dt>{text.topBanner}</dt>
              <dd>{details.job.referencePosterCopy.topBanner || text.empty}</dd>
            </div>
            <div className="detail-kv-card">
              <dt>{text.headline}</dt>
              <dd>{details.job.referencePosterCopy.headline || text.empty}</dd>
            </div>
            <div className="detail-kv-card">
              <dt>{text.subheadline}</dt>
              <dd>{details.job.referencePosterCopy.subheadline || text.empty}</dd>
            </div>
            <div className="detail-kv-card">
              <dt>{text.bottomBanner}</dt>
              <dd>{details.job.referencePosterCopy.bottomBanner || text.empty}</dd>
            </div>
            <div className="detail-kv-card">
              <dt>{text.callouts}</dt>
              <dd>{joinOrEmpty(details.job.referencePosterCopy.callouts)}</dd>
            </div>
            <div className="detail-kv-card">
              <div className="detail-kv-head">
                <dt>JSON</dt>
                <button
                  className={`copy-chip-button${copiedFieldId === "reference-poster-copy-json" ? " is-copied" : ""}`}
                  onClick={() => handleCopy("reference-poster-copy-json", referencePosterCopyJson)}
                  type="button"
                >
                  {copiedFieldId === "reference-poster-copy-json" ? text.copied : text.copy}
                </button>
              </div>
              <dd>
                <pre className="json-block">{referencePosterCopyJson}</pre>
              </dd>
            </div>
            </dl>
          </details>
        </section>
      ) : null}

      {activeDetailTab === "variants" ? (
      <section className="detail-tab-section">
          <p className="helper">
            {language === "zh"
              ? "上方工作台聚焦当前结果，这里保留完整归档；按需展开单个变体即可查看全部细节。"
              : "The workspace above stays focused on the current result. Expand a single variant here only when you need the full record."}
          </p>
          <div className="variant-drawer-list">
          {details.items.map((item) => {
            const dimensionWarning = getDimensionWarning(item);

            return (
            <details className="details-drawer compact-details variant-drawer" key={item.id}>
              <summary>
                <span className="variant-drawer-summary">
                  <span className="variant-drawer-title">
                    {imageTypeLabel(language, item.imageType)}
                    {text.separator}
                    {item.ratio}
                    {text.separator}
                    {item.resolutionLabel}
                    {text.separator}#{item.variantIndex}
                  </span>
                  <span className="variant-drawer-meta">
                    <span className={`review-status-chip is-${item.reviewStatus}`}>
                      {reviewStatusText(language, item.reviewStatus)}
                    </span>
                    <span className="variant-browser-chip">{statusText(language, item.status)}</span>
                    {item.generatedAsset ? <span className="variant-browser-chip">{text.generated}</span> : null}
                    {item.layoutAsset ? <span className="variant-browser-chip">{text.layout}</span> : null}
                    {item.id === activeItem?.id ? (
                      <span className="variant-browser-chip is-focus-chip">
                        {language === "zh" ? "当前焦点" : "Focused"}
                      </span>
                    ) : null}
                  </span>
                </span>
              </summary>
              <div className="variant-card variant-drawer-body">
              <header className="variant-header">
                <div>
                  <h4>
                    {imageTypeLabel(language, item.imageType)}
                    {text.separator}
                    {item.ratio}
                    {text.separator}
                    {item.resolutionLabel}
                    {text.separator}#{item.variantIndex}
                  </h4>
                  <p className="helper">{statusText(language, item.status)}</p>
                </div>
                <div className="variant-toolbar">
                  <span className={`review-status-chip is-${item.reviewStatus}`}>
                    {reviewStatusText(language, item.reviewStatus)}
                  </span>
                  {item.generatedAsset ? (
                    <button className="ghost-button mini-button" onClick={() => toggleCompare(item.id)} type="button">
                      {compareIds.includes(item.id) ? text.removeCompare : text.addCompare}
                    </button>
                  ) : null}
                </div>
              </header>

              <div className="asset-grid">
                {item.generatedAsset ? (
                  <figure className="asset-card">
                    <img alt={item.generatedAsset.originalName} src={assetPreviewUrl(item.generatedAsset.id)} />
                    <figcaption>
                      {text.generated}
                      <a download href={assetDownloadUrl(item.generatedAsset.id)}>
                        {text.download}
                      </a>
                    </figcaption>
                  </figure>
                ) : null}
                {item.layoutAsset ? (
                  <figure className="asset-card">
                    <img alt={item.layoutAsset.originalName} src={assetPreviewUrl(item.layoutAsset.id)} />
                    <figcaption>
                      {text.layout}
                      <a download href={assetDownloadUrl(item.layoutAsset.id)}>
                        {text.download}
                      </a>
                    </figcaption>
                  </figure>
                ) : null}
              </div>

              <div className="variant-metadata-grid">
                <div className="variant-metadata-card">
                  <span className="helper">{text.requestSize}</span>
                  <strong>
                    {formatRequestedSizeDisplay({
                      width: item.width,
                      height: item.height,
                      resolutionLabel: item.resolutionLabel,
                      language,
                      emptyLabel: text.unknown,
                    })}
                  </strong>
                </div>
                <div className="variant-metadata-card">
                  <span className="helper">{text.actualSize}</span>
                  <strong>
                    {formatDimensions(item.generatedAsset?.width ?? null, item.generatedAsset?.height ?? null, text.unknown)}
                  </strong>
                </div>
                <div className="variant-metadata-card">
                  <span className="helper">{text.requestRatio}</span>
                  <strong>{item.ratio}</strong>
                </div>
                <div className="variant-metadata-card">
                  <span className="helper">{text.actualRatio}</span>
                  <strong>
                    {formatRatio(item.generatedAsset?.width ?? null, item.generatedAsset?.height ?? null, text.unknown)}
                  </strong>
                </div>
                <div className="variant-metadata-card is-wide">
                  <span className="helper">{text.actualFileSize}</span>
                  <strong>{formatSizeMb(item.generatedAsset?.sizeBytes ?? null, text.unknown)}</strong>
                </div>
              </div>

              {dimensionWarning ? (
                <div className="provider-debug-panel">
                  <div className="detail-kv-head">
                    <strong>{text.warning}</strong>
                  </div>
                  <p className="warning-text">{dimensionWarning}</p>
                </div>
              ) : null}

              <div className="variant-actions">
                <button className="ghost-button mini-button" onClick={() => handleReviewUpdate(item.id, "shortlisted")} type="button">
                  {text.shortlisted}
                </button>
                <button className="ghost-button mini-button" onClick={() => handleReviewUpdate(item.id, "approved")} type="button">
                  {text.approved}
                </button>
                <button className="ghost-button mini-button danger-button" onClick={() => handleReviewUpdate(item.id, "rejected")} type="button">
                  {text.rejected}
                </button>
                <button className="ghost-button mini-button" onClick={() => handleReviewUpdate(item.id, "unreviewed")} type="button">
                  {text.resetReview}
                </button>
              </div>

              {item.copy ? (
                <div className="copy-panel">
                  <strong>{item.copy.title || details.job.productName}</strong>
                  {item.copy.subtitle ? <p>{item.copy.subtitle}</p> : null}
                  {item.copy.highlights.length ? (
                    <ul>
                      {item.copy.highlights.map((highlight) => (
                        <li key={highlight}>{highlight}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : item.errorMessage ? (
                <>
                  <p className="error-text">{item.errorMessage}</p>
                  {item.providerDebug?.imageUrl || item.providerDebug?.failureReason || item.providerDebug?.rawText ? (
                    <div className="provider-debug-panel">
                      {item.providerDebug?.imageUrl ? (
                        <div className="detail-kv-card provider-debug-card">
                          <div className="detail-kv-head">
                            <dt>{text.providerImageUrl}</dt>
                            <div className="button-row compact-row">
                              <a className="ghost-button mini-button" href={item.providerDebug.imageUrl} rel="noreferrer" target="_blank">
                                {text.openLink}
                              </a>
                              <button
                                className={`copy-chip-button${copiedFieldId === `provider-url-${item.id}` ? " is-copied" : ""}`}
                                onClick={() => handleCopy(`provider-url-${item.id}`, item.providerDebug?.imageUrl || "")}
                                type="button"
                              >
                                {copiedFieldId === `provider-url-${item.id}` ? text.copied : text.copy}
                              </button>
                            </div>
                          </div>
                          <dd>{item.providerDebug.imageUrl}</dd>
                        </div>
                      ) : null}
                      {item.providerDebug?.failureReason ? (
                        <div className="detail-kv-card provider-debug-card">
                          <dt>{text.failureReason}</dt>
                          <dd>{item.providerDebug.failureReason}</dd>
                        </div>
                      ) : null}
                      {item.providerDebug?.rawText ? (
                        <details className="provider-debug-details">
                          <summary>{text.rawProviderResponse}</summary>
                          <pre className="json-block prompt-block">{item.providerDebug.rawText}</pre>
                        </details>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : null}

              {item.promptText ? (
                <div className="prompt-debug-panel">
                  <div className="detail-kv-head">
                    <strong>{actualPromptLabel}</strong>
                <div className="button-row compact-row">
                  {details.job.creationMode === "reference-remix" ? (
                    <button className="ghost-button mini-button" onClick={() => handleReusePrompt(item)} type="button">
                      {text.reusePrompt}
                    </button>
                      ) : null}
                      <button
                        className={`copy-chip-button${copiedFieldId === `prompt-${item.id}` ? " is-copied" : ""}`}
                        onClick={() => handleCopy(`prompt-${item.id}`, item.promptText || "")}
                        type="button"
                      >
                        {copiedFieldId === `prompt-${item.id}` ? text.copied : text.copy}
                      </button>
                    </div>
                  </div>
                  <pre className="json-block prompt-block">{item.promptText}</pre>
                </div>
              ) : null}
              </div>
            </details>
          )})}
          </div>
      </section>
      ) : null}
      </section>
    </div>
  );
}
