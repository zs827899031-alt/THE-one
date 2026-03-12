import { NextResponse } from "next/server";

import { createJob } from "@/lib/db";
import { buildCreateJobInput, type CreatePayload } from "@/lib/job-builder";
import { enqueueJob } from "@/lib/queue";
import { writeFileAsset } from "@/lib/storage";
import type { ProviderOverride } from "@/lib/types";
import { createId } from "@/lib/utils";

export const runtime = "nodejs";

function isPayload(value: unknown): value is CreatePayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  return true;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const payloadRaw = formData.get("payload");
  const files = formData.getAll("files").filter((file): file is File => file instanceof File);
  const referenceFiles = formData
    .getAll("referenceFiles")
    .filter((file): file is File => file instanceof File)
    .slice(0, 1);

  if (!payloadRaw || typeof payloadRaw !== "string") {
    return NextResponse.json({ error: "Missing payload." }, { status: 400 });
  }

  const payload = JSON.parse(payloadRaw) as unknown;
  if (!isPayload(payload)) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  const normalizedReferenceCopyMode: CreatePayload["referenceCopyMode"] =
    payload.referenceCopyMode === "copy-sheet" ? "copy-sheet" : "reference";

  const effectivePayload =
    payload.creationMode === "reference-remix"
      ? {
          ...payload,
          country: payload.uiLanguage === "zh" ? "CN" : payload.country || "US",
          language: payload.uiLanguage === "zh" ? "zh-CN" : payload.language || "en-US",
          platform: payload.uiLanguage === "zh" ? "tmall" : payload.platform || "amazon",
          selectedTypes: ["scene"],
          selectedRatios: payload.selectedRatios?.length ? [payload.selectedRatios[0]] : ["1:1"],
          selectedResolutions: payload.selectedResolutions?.length ? [payload.selectedResolutions[0]] : ["4K"],
          selectedTemplateOverrides: {},
          includeCopyLayout: false,
          referenceStrength: "reference" as const,
          preserveReferenceText: true,
          referenceCopyMode: normalizedReferenceCopyMode,
          referenceExtraPrompt: "",
          referenceNegativePrompt: "",
          referenceLayoutOverride: null,
          referencePosterCopyOverride: null,
        }
      : payload.creationMode === "suite"
        ? {
            ...payload,
            selectedTypes: ["main-image", "lifestyle", "feature-overview", "scene", "material-craft", "size-spec"],
            includeCopyLayout: false,
            selectedTemplateOverrides: {},
          }
      : payload.creationMode === "amazon-a-plus"
        ? {
            ...payload,
            platform: "amazon",
            selectedTypes: ["poster", "feature-overview", "multi-scene", "detail", "size-spec", "culture-value"],
            includeCopyLayout: false,
            selectedTemplateOverrides: {},
          }
      : payload.creationMode === "prompt"
        ? {
            ...payload,
            selectedTypes: ["scene"],
          }
      : payload;

  if (
    (effectivePayload.creationMode === "standard" && !effectivePayload.productName?.trim()) ||
    !effectivePayload.selectedTypes?.length ||
    !effectivePayload.selectedRatios?.length ||
    !effectivePayload.selectedResolutions?.length
  ) {
    return NextResponse.json({ error: "Please complete the required fields." }, { status: 400 });
  }

  if (
    effectivePayload.creationMode === "suite" &&
    (
      !effectivePayload.category?.trim() ||
      !effectivePayload.sellingPoints?.trim() ||
      !effectivePayload.materialInfo?.trim() ||
      !effectivePayload.sizeInfo?.trim()
    )
  ) {
    return NextResponse.json({ error: "Image set mode requires category name, selling points, material, and size details." }, { status: 400 });
  }

  if (effectivePayload.creationMode === "prompt" && !effectivePayload.customPrompt?.trim()) {
    return NextResponse.json({ error: "Prompt mode requires a text prompt." }, { status: 400 });
  }

  if (effectivePayload.creationMode !== "prompt" && !files.length) {
    return NextResponse.json({ error: "Missing files." }, { status: 400 });
  }

  if (effectivePayload.creationMode === "reference-remix" && !referenceFiles.length) {
    return NextResponse.json({ error: "Reference remix mode requires at least one reference image." }, { status: 400 });
  }

  const sourceCount = effectivePayload.creationMode === "prompt" ? Math.max(files.length, 1) : files.length;
  const totalVariants =
    sourceCount *
    effectivePayload.selectedTypes.length *
    effectivePayload.selectedRatios.length *
    effectivePayload.selectedResolutions.length *
    effectivePayload.variantsPerType;
  if (totalVariants > 96) {
    return NextResponse.json({ error: "This batch is too large. Keep it under 96 generated variants per job." }, { status: 400 });
  }

  const jobId = createId("job");
  const sourceAssets = await Promise.all(
    files.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      return writeFileAsset({
        jobId,
        kind: "source",
        originalName: file.name,
        mimeType: file.type || "image/png",
        buffer,
      });
    }),
  );
  const referenceAssets = await Promise.all(
    referenceFiles.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      return writeFileAsset({
        jobId,
        kind: "reference",
        originalName: file.name,
        mimeType: file.type || "image/png",
        buffer,
      });
    }),
  );

  const createInput = buildCreateJobInput(sourceAssets, effectivePayload, jobId, referenceAssets);
  const job = createJob(createInput);
  const temporaryProvider: ProviderOverride | undefined =
    effectivePayload.temporaryProvider &&
    (effectivePayload.temporaryProvider.apiKey ||
      effectivePayload.temporaryProvider.apiBaseUrl ||
      effectivePayload.temporaryProvider.apiVersion ||
      effectivePayload.temporaryProvider.apiHeaders)
      ? effectivePayload.temporaryProvider
      : undefined;
  enqueueJob(job.id, temporaryProvider);

  return NextResponse.json({ jobId: job.id });
}
