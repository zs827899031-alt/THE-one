import {
  analyzeReferenceLayout,
  optimizeUserImagePrompt,
  buildRemakeCopyBundle,
  generateCopyBundle,
  generateEditedImage,
  generateRemakePosterCopy,
  normalizeProviderError,
  translateUserPromptInputs,
  translateCreativeInputs,
} from "@/lib/gemini";
import { splitCompositeSourceDescription } from "@/lib/creative-fields";
import { syncJobToFeishu } from "@/lib/feishu";
import { buildProviderDimensionWarning, meetsRequestedResolutionBucket } from "@/lib/image-size-policy";
import { createPosterSvg } from "@/lib/poster";
import {
  getAssetById,
  getBrandByName,
  getJobById,
  getJobDetails,
  getSettings,
  getTemplateById,
  insertAsset,
  listJobItems,
  resolveTemplate,
  updateJobFeishuSyncState,
  updateJobItemFailure,
  updateJobItemProcessing,
  updateJobItemResult,
  updateJobItemWarning,
  updateJobLocalizedInputs,
  updateJobReferenceArtifacts,
  updateJobStatus,
} from "@/lib/db";
import { readAssetBuffer, writeFileAsset } from "@/lib/storage";
import type { AssetRecord, ProviderDebugInfo, ProviderOverride } from "@/lib/types";
import { buildPromptModeCopyBundle } from "@/lib/templates";
import { detectImageDimensions, isGeminiImageSizeBucket } from "@/lib/utils";

function ratioDelta(actualWidth: number, actualHeight: number, requestedRatio: string) {
  const [requestedWidth, requestedHeight] = requestedRatio.split(":").map(Number);
  const actual = actualWidth / actualHeight;
  const requested = (requestedWidth || 1) / (requestedHeight || 1);
  return Math.abs(actual - requested);
}

function buildDimensionWarning(input: {
  requestedRatio: string;
  requestedResolutionLabel: string;
  requestedWidth: number;
  requestedHeight: number;
  actualWidth: number | null;
  actualHeight: number | null;
}) {
  if (!input.actualWidth || !input.actualHeight) {
    return null;
  }

  const aspectMismatch = ratioDelta(input.actualWidth, input.actualHeight, input.requestedRatio) > 0.01;

  if (!aspectMismatch) {
    return null;
  }

  return `Requested ${input.requestedRatio} / ${input.requestedResolutionLabel} (${input.requestedWidth}×${input.requestedHeight}), but provider returned ${input.actualWidth}×${input.actualHeight}.`;
}

function summarizePartialFailure(
  totalCount: number,
  successCount: number,
  failedDebugs: Array<ProviderDebugInfo | null>,
) {
  const failureCount = totalCount - successCount;
  const downloadFailures = failedDebugs.filter((debug) => debug?.failureStage === "provider-image-download").length;

  if (downloadFailures > 0) {
    return `${totalCount} variants requested: ${successCount} succeeded, ${failureCount} failed. ${downloadFailures} failed while downloading provider-returned image URLs.`;
  }

  return `${totalCount} variants requested: ${successCount} succeeded, ${failureCount} failed.`;
}

function extensionForMimeType(mimeType: string) {
  switch (mimeType) {
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return ".png";
  }
}

async function syncJobSummaryToFeishu(jobId: string, settings = getSettings()) {
  const details = getJobDetails(jobId);
  if (!details) {
    return;
  }

  const feishuState = await syncJobToFeishu({
    settings,
    details,
  });

  if (feishuState) {
    updateJobFeishuSyncState(jobId, feishuState.recordId, feishuState.fileTokens);
  }
}

function shouldRetryForResolutionBucket(imageModel: string, resolutionLabel: string) {
  return imageModel.startsWith("gemini-3") && isGeminiImageSizeBucket(resolutionLabel);
}

function withProviderDebugContext(error: unknown, fallbackMessage: string) {
  const message = error instanceof Error ? error.message : fallbackMessage;
  const wrapped = new Error(message) as Error & {
    promptText?: string;
    providerDebug?: ProviderDebugInfo | null;
  };

  if (error && typeof error === "object") {
    if ("promptText" in error) {
      wrapped.promptText = String((error as { promptText?: string }).promptText ?? "");
    }
    if ("providerDebug" in error) {
      wrapped.providerDebug = (error as { providerDebug?: ProviderDebugInfo | null }).providerDebug ?? null;
    }
  }

  return wrapped;
}

export async function processJob(jobId: string, providerOverride?: ProviderOverride) {
  const job = getJobById(jobId);
  if (!job) {
    throw new Error(`Job ${jobId} not found.`);
  }
  const jobDetails = getJobDetails(jobId);
  const referenceAssets = jobDetails?.referenceAssets ?? [];

  const settings = getSettings();
  const apiKey = providerOverride?.apiKey || settings.defaultApiKey;
  const apiBaseUrl = providerOverride?.apiBaseUrl ?? settings.defaultApiBaseUrl;
  const apiVersion = providerOverride?.apiVersion ?? settings.defaultApiVersion;
  const apiHeaders = providerOverride?.apiHeaders ?? settings.defaultApiHeaders;

  if (!apiKey) {
    updateJobStatus(jobId, "failed", "Gemini API key is missing.");
    return;
  }

  if (job.creationMode === "reference-remix" && referenceAssets.length === 0) {
    updateJobStatus(jobId, "failed", "Reference remix mode requires at least one reference image.");
    return;
  }

  updateJobStatus(jobId, "processing");
  const items = listJobItems(jobId);
  let successCount = 0;
  let failureCount = 0;
  let firstFailureMessage: string | null = null;
  const failureDebugs: Array<ProviderDebugInfo | null> = [];
  const rawCreativeFields = splitCompositeSourceDescription(job.sourceDescription);

  const localizedInputs =
    job.creationMode === "prompt"
      ? null
      : await translateCreativeInputs({
          apiKey,
          textModel: settings.defaultTextModel,
          apiBaseUrl,
          apiVersion,
          apiHeaders,
          country: job.country,
          language: job.language,
          platform: job.platform,
          category: job.category,
          brandName: job.brandName,
          sku: job.sku,
          productName: job.productName,
          sellingPoints: job.sellingPoints,
          restrictions: job.restrictions,
          sourceDescription: rawCreativeFields.sourceDescription,
          materialInfo: rawCreativeFields.materialInfo,
          sizeInfo: rawCreativeFields.sizeInfo,
        }).catch(() => null);
  updateJobLocalizedInputs(jobId, localizedInputs);

  const translatedPromptInputs =
    job.creationMode === "prompt"
      ? await translateUserPromptInputs({
          apiKey,
          textModel: settings.defaultTextModel,
          apiBaseUrl,
          apiVersion,
          apiHeaders,
          country: job.country,
          language: job.language,
          platform: job.platform,
          customPrompt: job.customPrompt,
          customNegativePrompt: job.customNegativePrompt,
        }).catch(() => ({
          customPrompt: job.customPrompt,
          customNegativePrompt: job.customNegativePrompt,
        }))
      : null;

  const effectiveInputs = {
    productName: localizedInputs?.productName || job.productName,
    sellingPoints: localizedInputs?.sellingPoints || job.sellingPoints,
    restrictions: localizedInputs?.restrictions || job.restrictions,
    sourceDescription: localizedInputs?.sourceDescription || rawCreativeFields.sourceDescription,
    materialInfo: localizedInputs?.materialInfo || rawCreativeFields.materialInfo,
    sizeInfo: localizedInputs?.sizeInfo || rawCreativeFields.sizeInfo,
  };
  const brandProfile = job.brandName ? getBrandByName(job.brandName) : null;
  let referenceLayoutAnalysis = job.referenceLayoutAnalysis;
  let referencePosterCopy = job.referencePosterCopy;
  const referenceLayoutPromptHints = job.referenceLayoutOverride;
  const referencePosterCopyPromptHints = job.referencePosterCopyOverride;

  if (job.creationMode === "reference-remix") {
    const primaryReferenceAsset = referenceAssets[0];
    if (!primaryReferenceAsset) {
      updateJobStatus(jobId, "failed", "Reference remix mode requires at least one reference image.");
      return;
    }

    if (!referenceLayoutAnalysis) {
      try {
        const referenceBuffer = await readAssetBuffer(primaryReferenceAsset);
        referenceLayoutAnalysis = await analyzeReferenceLayout({
          apiKey,
          textModel: settings.defaultTextModel,
          apiBaseUrl,
          apiVersion,
          apiHeaders,
          uiLanguage: job.uiLanguage,
          referenceImage: {
            mimeType: primaryReferenceAsset.mimeType,
            buffer: referenceBuffer,
          },
        });
      } catch {
        referenceLayoutAnalysis = null;
      }
    }

    if (!job.preserveReferenceText && !referencePosterCopy && referenceLayoutAnalysis) {
      try {
        referencePosterCopy = await generateRemakePosterCopy({
          apiKey,
          textModel: settings.defaultTextModel,
          apiBaseUrl,
          apiVersion,
          apiHeaders,
          country: job.country,
          language: job.language,
          platform: job.platform,
          category: job.category,
          productName: effectiveInputs.productName,
          brandName: job.brandName,
          sellingPoints: effectiveInputs.sellingPoints,
          restrictions: effectiveInputs.restrictions,
          sourceDescription: effectiveInputs.sourceDescription,
          referenceLayout: referenceLayoutAnalysis,
        });
      } catch {
        referencePosterCopy = null;
      }
    }

    updateJobReferenceArtifacts(jobId, referenceLayoutAnalysis, referencePosterCopy);
  }

  for (const item of items) {
    try {
      updateJobItemProcessing(item.id);
      const sourceAsset = item.sourceAssetId ? getAssetById(item.sourceAssetId) : null;
      if (!sourceAsset && job.creationMode !== "prompt") {
        throw new Error("Source asset not found.");
      }

      const sourceImages = sourceAsset
        ? [
            {
              mimeType: sourceAsset.mimeType,
              buffer: await readAssetBuffer(sourceAsset),
            },
          ]
        : [];
      const referenceImages = await Promise.all(
        referenceAssets.map(async (asset) => ({
          mimeType: asset.mimeType,
          buffer: await readAssetBuffer(asset),
        })),
      );
      const overrideTemplateId = job.selectedTemplateOverrides[item.imageType];
      const matchedTemplate =
        job.creationMode === "reference-remix" || job.creationMode === "prompt"
          ? null
          : (overrideTemplateId ? getTemplateById(overrideTemplateId) : null) ??
            resolveTemplate({
              country: job.country,
              language: job.language,
              platform: job.platform,
              category: job.category,
              imageType: item.imageType,
            });

      const copy =
        job.creationMode === "reference-remix"
          ? buildRemakeCopyBundle(
              referencePosterCopyPromptHints ??
                referencePosterCopy ?? {
                  summary: effectiveInputs.sourceDescription || effectiveInputs.sellingPoints || effectiveInputs.productName,
                  topBanner: "",
                  headline: effectiveInputs.productName,
                  subheadline: "",
                  bottomBanner: "",
                  callouts: [],
                },
            )
          : job.creationMode === "prompt"
            ? buildPromptModeCopyBundle({
                productName: effectiveInputs.productName,
                customPrompt: job.customPrompt,
              })
          : await generateCopyBundle({
              apiKey,
              textModel: settings.defaultTextModel,
              apiBaseUrl,
              apiVersion,
              apiHeaders,
              country: job.country,
              language: job.language,
              platform: job.platform,
              category: job.category,
              brandName: job.brandName,
              productName: effectiveInputs.productName,
              sellingPoints: effectiveInputs.sellingPoints,
              restrictions: effectiveInputs.restrictions,
              sourceDescription: effectiveInputs.sourceDescription,
              materialInfo: effectiveInputs.materialInfo,
              sizeInfo: effectiveInputs.sizeInfo,
              brandProfile,
              imageType: item.imageType,
              ratio: item.ratio,
              resolutionLabel: item.resolutionLabel,
              template: matchedTemplate,
            });

      const promptModePrompt =
        job.creationMode === "prompt"
          ? job.autoOptimizePrompt
            ? await optimizeUserImagePrompt({
                apiKey,
                textModel: settings.defaultTextModel,
                apiBaseUrl,
                apiVersion,
                apiHeaders,
                country: job.country,
                language: job.language,
                platform: job.platform,
                category: job.category,
                productName: effectiveInputs.productName,
                brandName: job.brandName,
                sellingPoints: effectiveInputs.sellingPoints,
                restrictions: effectiveInputs.restrictions,
                sourceDescription: effectiveInputs.sourceDescription,
                materialInfo: effectiveInputs.materialInfo,
                sizeInfo: effectiveInputs.sizeInfo,
                imageType: item.imageType,
                ratio: item.ratio,
                resolutionLabel: item.resolutionLabel,
                customPrompt: translatedPromptInputs?.customPrompt || job.customPrompt,
                customNegativePrompt: translatedPromptInputs?.customNegativePrompt || job.customNegativePrompt,
              })
            : translatedPromptInputs?.customPrompt || job.customPrompt
          : null;

      const imageInput = {
        apiKey,
        imageModel: settings.defaultImageModel,
        apiBaseUrl,
        apiVersion,
        apiHeaders,
        creationMode: job.creationMode,
        referenceStrength: job.referenceStrength,
        preserveReferenceText: job.preserveReferenceText,
        customPromptText:
          promptModePrompt ?? (job.creationMode === "prompt" ? translatedPromptInputs?.customPrompt || job.customPrompt : undefined),
        customNegativePrompt:
          job.creationMode === "prompt"
            ? translatedPromptInputs?.customNegativePrompt || job.customNegativePrompt
            : undefined,
        referenceExtraPrompt: job.referenceExtraPrompt,
        referenceNegativePrompt: job.referenceNegativePrompt,
        country: job.country,
        language: job.language,
        platform: job.platform,
        category: job.category,
        brandName: job.brandName,
        productName: effectiveInputs.productName,
        sellingPoints: effectiveInputs.sellingPoints,
        restrictions: effectiveInputs.restrictions,
        sourceDescription: effectiveInputs.sourceDescription,
        materialInfo: effectiveInputs.materialInfo,
        sizeInfo: effectiveInputs.sizeInfo,
        brandProfile,
        imageType: item.imageType,
        ratio: item.ratio,
        resolutionLabel: item.resolutionLabel,
        copy,
        referenceLayout: referenceLayoutPromptHints,
        referencePosterCopy: referencePosterCopyPromptHints,
        template: matchedTemplate,
        sourceImages: [...sourceImages, ...referenceImages],
      };

      const generateOneImage = async () => {
        if (job.creationMode === "reference-remix") {
          return generateEditedImage(imageInput);
        }

        return generateEditedImage(imageInput);
      };

      const maxGenerationAttempts = shouldRetryForResolutionBucket(settings.defaultImageModel, item.resolutionLabel) ? 3 : 1;
      let generated: Awaited<ReturnType<typeof generateEditedImage>> | null = null;
      let actualDimensions: ReturnType<typeof detectImageDimensions> = null;

      for (let attempt = 1; attempt <= maxGenerationAttempts; attempt += 1) {
        generated = await generateOneImage();
        actualDimensions = detectImageDimensions(generated.buffer, generated.mimeType);

        if (
          !generated ||
          meetsRequestedResolutionBucket({
            requestedResolutionLabel: item.resolutionLabel,
            actualWidth: actualDimensions?.width ?? null,
            actualHeight: actualDimensions?.height ?? null,
          })
        ) {
          break;
        }

        if (attempt === maxGenerationAttempts) {
          const undersizedError = withProviderDebugContext(
            generated,
            `Provider returned a lower-than-requested image size for ${item.resolutionLabel}.`,
          );
          undersizedError.message = `Provider returned ${actualDimensions?.width ?? "unknown"}×${actualDimensions?.height ?? "unknown"} for requested ${item.resolutionLabel} bucket after ${maxGenerationAttempts} attempts. The current model or relay is not honoring the requested size bucket.`;
          throw undersizedError;
        }
      }

      if (!generated) {
        throw new Error("Image generation failed without returning any image data.");
      }

      const generatedAsset = await writeFileAsset({
        jobId,
        jobItemId: item.id,
        kind: "generated",
        originalName: `${job.productName}-${item.imageType}-${item.variantIndex}${extensionForMimeType(generated.mimeType)}`,
        mimeType: generated.mimeType,
        buffer: generated.buffer,
        width: item.width,
        height: item.height,
      });
      insertAsset(generatedAsset);
      const dimensionWarning = buildProviderDimensionWarning({
        requestedRatio: item.ratio,
        requestedResolutionLabel: item.resolutionLabel,
        actualWidth: generatedAsset.width,
        actualHeight: generatedAsset.height,
        language: job.uiLanguage,
      });

      let layoutAsset: AssetRecord | null = null;
      if (job.includeCopyLayout) {
        const posterSvg = createPosterSvg({
          imageBuffer: generated.buffer,
          imageMimeType: generated.mimeType,
          width: item.width,
          height: item.height,
          copy,
          platform: job.platform,
          imageType: item.imageType,
          productName: effectiveInputs.productName,
        });
        layoutAsset = await writeFileAsset({
          jobId,
          jobItemId: item.id,
          kind: "layout",
          originalName: `${job.productName}-${item.imageType}-${item.variantIndex}.svg`,
          mimeType: "image/svg+xml",
          buffer: Buffer.from(posterSvg, "utf8"),
          width: item.width,
          height: item.height,
        });
        insertAsset(layoutAsset);
      }

      updateJobItemResult({
        itemId: item.id,
        promptText: generated.promptText || copy.optimizedPrompt,
        negativePrompt:
          job.creationMode === "prompt"
            ? translatedPromptInputs?.customNegativePrompt || job.customNegativePrompt
            : null,
        copy,
        generatedAssetId: generatedAsset.id,
        layoutAssetId: layoutAsset?.id ?? null,
        warningMessage: dimensionWarning,
        providerDebug: {
          ...(generated.providerDebug ?? {}),
          requestedWidth: item.width,
          requestedHeight: item.height,
          actualWidth: generatedAsset.width ?? undefined,
          actualHeight: generatedAsset.height ?? undefined,
        },
      });

      let syncWarning: string | null = null;
      try {
        const details = getJobDetails(jobId);
        const feishuState = details
          ? await syncJobToFeishu({
              settings,
              details,
              latestGeneratedAsset: generatedAsset,
              latestAssetBuffer: generated.buffer,
            })
          : null;

        if (feishuState) {
          updateJobFeishuSyncState(jobId, feishuState.recordId, feishuState.fileTokens);
        }
      } catch (syncError) {
        syncWarning = `Feishu sync failed: ${syncError instanceof Error ? syncError.message : "Unknown error."}`;
      }

      const warningMessage = [dimensionWarning, syncWarning].filter(Boolean).join(" | ") || null;
      updateJobItemWarning(item.id, warningMessage);

      successCount += 1;
    } catch (error) {
      failureCount += 1;
      const normalizedError = normalizeProviderError(error);
      const promptText =
        error && typeof error === "object" && "promptText" in error ? String((error as { promptText?: string }).promptText ?? "") : null;
      const providerDebug =
        error && typeof error === "object" && "providerDebug" in error
          ? ((error as { providerDebug?: ProviderDebugInfo | null }).providerDebug ?? null)
          : null;
      const failureMessage =
        job.creationMode === "reference-remix" ? `Poster remake generation failed: ${normalizedError}` : normalizedError;
      if (!firstFailureMessage) {
        firstFailureMessage = failureMessage;
      }
      failureDebugs.push(providerDebug);
      updateJobItemFailure(
        item.id,
        failureMessage,
        promptText,
        job.creationMode === "prompt"
          ? translatedPromptInputs?.customNegativePrompt || job.customNegativePrompt
          : null,
        providerDebug,
      );

      try {
        await syncJobSummaryToFeishu(jobId, settings);
      } catch {
        // Swallow task-level sync errors on failed items so generation status remains authoritative.
      }
    }
  }

  if (successCount > 0 && failureCount > 0) {
    updateJobStatus(jobId, "partial", summarizePartialFailure(items.length, successCount, failureDebugs));
    try {
      await syncJobSummaryToFeishu(jobId, settings);
    } catch {
      // Keep task completion flow resilient if Feishu summary sync fails.
    }
    return;
  }

  if (successCount > 0) {
    updateJobStatus(jobId, "completed");
    try {
      await syncJobSummaryToFeishu(jobId, settings);
    } catch {
      // Keep task completion flow resilient if Feishu summary sync fails.
    }
    return;
  }

  updateJobStatus(jobId, "failed", firstFailureMessage ?? "All variants failed to generate.");
  try {
    await syncJobSummaryToFeishu(jobId, settings);
  } catch {
    // Keep task completion flow resilient if Feishu summary sync fails.
  }
}
