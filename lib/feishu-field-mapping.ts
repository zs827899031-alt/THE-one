import type { FeishuFieldMapping } from "@/lib/types";

export const FEISHU_FIELD_MAPPING_KEYS: Array<keyof FeishuFieldMapping> = [
  "title",
  "image",
  "mode",
  "platform",
  "country",
  "language",
  "typeSummary",
  "ratioSummary",
  "resolutionSummary",
  "sizeSummary",
  "statusSummary",
  "ratio",
  "resolution",
  "requestedSize",
  "actualSize",
  "status",
  "promptTranslation",
  "promptOptimization",
  "prompt",
  "negativePrompt",
  "createdAt",
  "jobId",
  "itemId",
];

export const RECOMMENDED_FEISHU_FIELD_MAPPING: FeishuFieldMapping = {
  title: "标题",
  image: "生成图片",
  mode: "生图模式",
  language: "语言",
  promptTranslation: "提示词翻译",
  promptOptimization: "真实照片优化",
  typeSummary: "图片统计",
  ratioSummary: "比例汇总",
  resolutionSummary: "分辨率汇总",
  sizeSummary: "尺寸汇总",
  statusSummary: "生成统计",
  status: "任务状态",
  prompt: "提示词摘要",
  negativePrompt: "负向提示词",
  createdAt: "生成时间",
  jobId: "任务ID",
};

export function parseFeishuFieldMapping(rawJson?: string): FeishuFieldMapping {
  if (!rawJson?.trim()) {
    return {};
  }

  const parsed = JSON.parse(rawJson) as Record<string, unknown>;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Feishu field mapping JSON must be an object.");
  }

  const mapping: FeishuFieldMapping = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === "string" && value.trim()) {
      const normalizedKey = key === "file" ? "image" : key;
      if (FEISHU_FIELD_MAPPING_KEYS.includes(normalizedKey as keyof FeishuFieldMapping)) {
        mapping[normalizedKey as keyof FeishuFieldMapping] = value.trim();
      }
    }
  }

  return mapping;
}

export function stringifyFeishuFieldMapping(mapping: FeishuFieldMapping) {
  const ordered = FEISHU_FIELD_MAPPING_KEYS.reduce<FeishuFieldMapping>((acc, key) => {
    const value = mapping[key];
    if (typeof value === "string" && value.trim()) {
      acc[key] = value.trim();
    }
    return acc;
  }, {});

  return JSON.stringify(ordered, null, 2);
}

export function getRecommendedFeishuFieldMappingJson() {
  return stringifyFeishuFieldMapping(RECOMMENDED_FEISHU_FIELD_MAPPING);
}

export function formatFeishuFieldMapping(rawJson?: string) {
  const parsed = parseFeishuFieldMapping(rawJson);
  if (!Object.keys(parsed).length) {
    return "{}";
  }

  return stringifyFeishuFieldMapping(parsed);
}
