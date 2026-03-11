import type { CreateJobInput } from "@/lib/db";
import type {
  AssetRecord,
  JobDetails,
  JobItemRecord,
  ProviderOverride,
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
  const items = buildJobItems(sourceAssets, payload, jobId);

  return {
    id: jobId,
    creationMode: payload.creationMode ?? "standard",
    referenceStrength: payload.referenceStrength ?? "balanced",
    preserveReferenceText: payload.preserveReferenceText ?? true,
    productName: inferJobName(payload, sourceAssets, referenceAssets),
    sku: payload.sku,
    category: payload.category,
    brandName: payload.brandName,
    sellingPoints: payload.sellingPoints,
    restrictions: payload.restrictions,
    customPrompt: payload.customPrompt ?? "",
    customNegativePrompt: payload.customNegativePrompt ?? "",
    autoOptimizePrompt: payload.autoOptimizePrompt ?? false,
    country: payload.country,
    language: payload.language,
    platform: payload.platform,
    referenceExtraPrompt: payload.referenceExtraPrompt ?? "",
    referenceNegativePrompt: payload.referenceNegativePrompt ?? "",
    selectedTypes: payload.selectedTypes,
    selectedRatios: payload.selectedRatios,
    selectedResolutions: payload.selectedResolutions,
    variantsPerType: payload.variantsPerType,
    includeCopyLayout: payload.includeCopyLayout,
    batchFileCount: sourceAssets.length,
    sourceDescription: buildCompositeSourceDescription({
      sourceDescription: payload.sourceDescription,
      materialInfo: payload.materialInfo,
      sizeInfo: payload.sizeInfo,
    }),
    uiLanguage: payload.uiLanguage,
    selectedTemplateOverrides: payload.selectedTemplateOverrides ?? {},
    referenceLayoutOverride: payload.referenceLayoutOverride ?? null,
    referencePosterCopyOverride: payload.referencePosterCopyOverride ?? null,
    sourceAssets: sourceAssets.map((asset) => ({ ...asset, jobId })),
    referenceAssets: referenceAssets.map((asset) => ({ ...asset, jobId })),
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
      productName: details.job.productName,
      sku: details.job.sku,
      brandName: details.job.brandName,
      category: details.job.category,
      sellingPoints: details.job.sellingPoints,
      restrictions: details.job.restrictions,
      sourceDescription: details.job.sourceDescription,
      customPrompt: details.job.customPrompt,
      customNegativePrompt: details.job.customNegativePrompt,
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
      includeCopyLayout: details.job.includeCopyLayout,
      uiLanguage: details.job.uiLanguage,
      selectedTemplateOverrides: details.job.selectedTemplateOverrides,
      referenceLayoutOverride: details.job.referenceLayoutOverride,
      referencePosterCopyOverride: details.job.referencePosterCopyOverride,
    },
    undefined,
    referenceAssets,
  );
}
