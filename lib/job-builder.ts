import type { CreateJobInput } from "@/lib/db";
import type {
  AssetRecord,
  JobDetails,
  JobItemRecord,
  ProviderOverride,
  ReferenceCopyMode,
  ReferenceLayoutAnalysis,
  ReferencePosterCopy,
  UiLanguage,
} from "@/lib/types";
import { buildCompositeSourceDescription } from "@/lib/creative-fields";
import { createId, dimensionsForVariant, nowIso } from "@/lib/utils";

function normalizeJobNameCandidate(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 48);
}

function inferNameFromAssets(...groups: AssetRecord[][]) {
  for (const group of groups) {
    for (const asset of group) {
      const candidate = normalizeJobNameCandidate(asset.originalName.replace(/\.[^.]+$/, ""));
      if (candidate) {
        return candidate;
      }
    }
  }

  return "";
}

function inferJobName(payload: CreatePayload, sourceAssets: AssetRecord[], referenceAssets: AssetRecord[]) {
  const explicitName = payload.productName.trim();
  if (explicitName) {
    return explicitName;
  }

  if (payload.creationMode === "standard") {
    return explicitName;
  }

  if (payload.creationMode === "suite") {
    const fallbackText =
      normalizeJobNameCandidate(payload.brandName) ||
      normalizeJobNameCandidate(payload.category) ||
      normalizeJobNameCandidate(payload.sourceDescription) ||
      normalizeJobNameCandidate(payload.sellingPoints);

    return fallbackText || inferNameFromAssets(sourceAssets, referenceAssets) || "Image set job";
  }

  if (payload.creationMode === "amazon-a-plus") {
    const fallbackText =
      normalizeJobNameCandidate(payload.brandName) ||
      normalizeJobNameCandidate(payload.category) ||
      normalizeJobNameCandidate(payload.sourceDescription) ||
      normalizeJobNameCandidate(payload.sellingPoints);

    return fallbackText || inferNameFromAssets(sourceAssets, referenceAssets) || "Amazon A+ job";
  }

  if (payload.creationMode === "reference-remix") {
    const fallbackText =
      normalizeJobNameCandidate(payload.sourceDescription) ||
      normalizeJobNameCandidate(payload.sellingPoints) ||
      normalizeJobNameCandidate(payload.brandName);

    return fallbackText || inferNameFromAssets(sourceAssets, referenceAssets) || "Reference remix job";
  }

  const normalized = normalizeJobNameCandidate(payload.customPrompt ?? "");

  return normalized || "Prompt job";
}

export interface CreatePayload {
  creationMode?: "standard" | "reference-remix" | "prompt" | "suite" | "amazon-a-plus";
  referenceStrength?: "reference" | "balanced" | "product";
  preserveReferenceText?: boolean;
  referenceCopyMode?: ReferenceCopyMode;
  productName: string;
  sku: string;
  brandName: string;
  category: string;
  sellingPoints: string;
  restrictions: string;
  sourceDescription: string;
  materialInfo?: string;
  sizeInfo?: string;
  customPrompt?: string;
  customNegativePrompt?: string;
  translatePromptToOutputLanguage?: boolean;
  autoOptimizePrompt?: boolean;
  referenceExtraPrompt?: string;
  referenceNegativePrompt?: string;
  country: string;
  language: string;
  platform: string;
  selectedTypes: string[];
  selectedRatios: string[];
  selectedResolutions: string[];
  variantsPerType: number;
  includeCopyLayout: boolean;
  uiLanguage: UiLanguage;
  selectedTemplateOverrides?: Record<string, string>;
  referenceLayoutOverride?: ReferenceLayoutAnalysis | null;
  referencePosterCopyOverride?: ReferencePosterCopy | null;
  temporaryProvider?: ProviderOverride;
}

function normalizeCreatePayload(payload: CreatePayload): CreatePayload {
  if (payload.creationMode !== "reference-remix") {
    return payload;
  }

  return {
    ...payload,
    referenceStrength: "reference",
    preserveReferenceText: true,
    referenceCopyMode: payload.referenceCopyMode === "copy-sheet" ? "copy-sheet" : "reference",
    referenceExtraPrompt: "",
    referenceNegativePrompt: "",
    selectedTypes: ["scene"],
    selectedRatios: payload.selectedRatios.length ? [payload.selectedRatios[0]] : ["1:1"],
    selectedResolutions: payload.selectedResolutions.length ? [payload.selectedResolutions[0]] : ["4K"],
    includeCopyLayout: false,
    selectedTemplateOverrides: {},
    referenceLayoutOverride: null,
    referencePosterCopyOverride: null,
  };
}

export function buildJobItems(sourceAssets: AssetRecord[], payload: CreatePayload, jobId: string): JobItemRecord[] {
  const items: JobItemRecord[] = [];
  const now = nowIso();
  const sourceAssetEntries =
    sourceAssets.length > 0
      ? sourceAssets.map((asset) => ({
          id: asset.id,
          originalName: asset.originalName,
        }))
      : payload.creationMode === "prompt"
        ? [{ id: "", originalName: "prompt-only" }]
        : [];

  for (const sourceAsset of sourceAssetEntries) {
    for (const imageType of payload.selectedTypes) {
      for (const ratio of payload.selectedRatios) {
        for (const resolutionLabel of payload.selectedResolutions) {
          for (let variantIndex = 1; variantIndex <= payload.variantsPerType; variantIndex += 1) {
            const { width, height } = dimensionsForVariant(ratio, resolutionLabel);
            items.push({
              id: createId("item"),
              jobId,
              sourceAssetId: sourceAsset.id,
              sourceAssetName: sourceAsset.originalName,
              imageType: imageType as JobItemRecord["imageType"],
              ratio,
              resolutionLabel,
              width,
              height,
              variantIndex,
              status: "queued",
              promptText: null,
              negativePrompt: null,
              copyJson: null,
              generatedAssetId: null,
              layoutAssetId: null,
              reviewStatus: "unreviewed",
              createdAt: now,
              updatedAt: now,
              errorMessage: null,
              warningMessage: null,
              providerDebug: null,
            });
          }
        }
      }
    }
  }

  return items;
}

export function buildCreateJobInput(
  sourceAssets: AssetRecord[],
  payload: CreatePayload,
  jobId = createId("job"),
  referenceAssets: AssetRecord[] = [],
): CreateJobInput {
  const normalizedPayload = normalizeCreatePayload(payload);
  const normalizedReferenceAssets =
    normalizedPayload.creationMode === "reference-remix" ? referenceAssets.slice(0, 1) : referenceAssets;
  const items = buildJobItems(sourceAssets, normalizedPayload, jobId);

  return {
    id: jobId,
    creationMode: normalizedPayload.creationMode ?? "standard",
    referenceStrength: normalizedPayload.referenceStrength ?? "balanced",
    preserveReferenceText: normalizedPayload.preserveReferenceText ?? true,
    referenceCopyMode: normalizedPayload.referenceCopyMode ?? "reference",
    productName: inferJobName(normalizedPayload, sourceAssets, referenceAssets),
    sku: normalizedPayload.sku,
    category: normalizedPayload.category,
    brandName: normalizedPayload.brandName,
    sellingPoints: normalizedPayload.sellingPoints,
    restrictions: normalizedPayload.restrictions,
    customPrompt: normalizedPayload.customPrompt ?? "",
    customNegativePrompt: normalizedPayload.customNegativePrompt ?? "",
    translatePromptToOutputLanguage: normalizedPayload.translatePromptToOutputLanguage ?? false,
    autoOptimizePrompt: normalizedPayload.autoOptimizePrompt ?? false,
    country: normalizedPayload.country,
    language: normalizedPayload.language,
    platform: normalizedPayload.platform,
    referenceExtraPrompt: normalizedPayload.referenceExtraPrompt ?? "",
    referenceNegativePrompt: normalizedPayload.referenceNegativePrompt ?? "",
    selectedTypes: normalizedPayload.selectedTypes,
    selectedRatios: normalizedPayload.selectedRatios,
    selectedResolutions: normalizedPayload.selectedResolutions,
    variantsPerType: normalizedPayload.variantsPerType,
    includeCopyLayout: false,
    batchFileCount: sourceAssets.length,
    sourceDescription: buildCompositeSourceDescription({
      sourceDescription: normalizedPayload.sourceDescription,
      materialInfo: normalizedPayload.materialInfo,
      sizeInfo: normalizedPayload.sizeInfo,
    }),
    uiLanguage: normalizedPayload.uiLanguage,
    selectedTemplateOverrides: normalizedPayload.selectedTemplateOverrides ?? {},
    referenceLayoutOverride: normalizedPayload.referenceLayoutOverride ?? null,
    referencePosterCopyOverride: normalizedPayload.referencePosterCopyOverride ?? null,
    sourceAssets: sourceAssets.map((asset) => ({ ...asset, jobId })),
    referenceAssets: normalizedReferenceAssets.map((asset) => ({ ...asset, jobId })),
    items,
  };
}

export function buildRetryJobInput(details: JobDetails): CreateJobInput {
  const sourceAssets = details.sourceAssets.map((asset) => ({
    ...asset,
    id: createId("asset"),
    jobId: "",
    jobItemId: null,
    createdAt: nowIso(),
  }));

  const referenceAssets = details.referenceAssets.map((asset) => ({
    ...asset,
    id: createId("asset"),
    jobId: "",
    jobItemId: null,
    createdAt: nowIso(),
  }));

  return buildCreateJobInput(
    sourceAssets,
    {
      creationMode: details.job.creationMode,
      referenceStrength: details.job.referenceStrength,
      preserveReferenceText: details.job.preserveReferenceText,
      referenceCopyMode: details.job.referenceCopyMode,
      productName: details.job.productName,
      sku: details.job.sku,
      brandName: details.job.brandName,
      category: details.job.category,
      sellingPoints: details.job.sellingPoints,
      restrictions: details.job.restrictions,
      sourceDescription: details.job.sourceDescription,
      customPrompt: details.job.customPrompt,
      customNegativePrompt: details.job.customNegativePrompt,
      translatePromptToOutputLanguage: details.job.translatePromptToOutputLanguage,
      autoOptimizePrompt: details.job.autoOptimizePrompt,
      referenceExtraPrompt: details.job.referenceExtraPrompt,
      referenceNegativePrompt: details.job.referenceNegativePrompt,
      country: details.job.country,
      language: details.job.language,
      platform: details.job.platform,
      selectedTypes: details.job.selectedTypes,
      selectedRatios: details.job.selectedRatios,
      selectedResolutions: details.job.selectedResolutions,
      variantsPerType: details.job.variantsPerType,
      includeCopyLayout: false,
      uiLanguage: details.job.uiLanguage,
      selectedTemplateOverrides: details.job.selectedTemplateOverrides,
      referenceLayoutOverride: details.job.referenceLayoutOverride,
      referencePosterCopyOverride: details.job.referencePosterCopyOverride,
    },
    undefined,
    referenceAssets,
  );
}
