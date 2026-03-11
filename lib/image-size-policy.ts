import type { UiLanguage } from "@/lib/types";
import { isGeminiImageSizeBucket, parseRatio } from "@/lib/utils";

function ratioDelta(actualWidth: number, actualHeight: number, requestedRatio: string) {
  const actual = actualWidth / actualHeight;
  const [requestedWidth, requestedHeight] = parseRatio(requestedRatio);
  const requested = requestedWidth / requestedHeight;
  return Math.abs(actual - requested);
}

export function buildProviderDimensionWarning(input: {
  requestedRatio: string;
  requestedResolutionLabel: string;
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

  const resolutionHint = isGeminiImageSizeBucket(input.requestedResolutionLabel)
    ? `${input.requestedResolutionLabel} bucket`
    : input.requestedResolutionLabel;

  return `Requested ${input.requestedRatio} / ${resolutionHint}, but provider returned ${input.actualWidth}×${input.actualHeight} with a different aspect ratio.`;
}

export function formatRequestedSizeDisplay(input: {
  width: number | null | undefined;
  height: number | null | undefined;
  resolutionLabel: string;
  language: UiLanguage;
  emptyLabel: string;
}) {
  if (isGeminiImageSizeBucket(input.resolutionLabel)) {
    return input.language === "zh" ? `${input.resolutionLabel} 档位` : `${input.resolutionLabel} bucket`;
  }

  if (!input.width || !input.height) {
    return input.emptyLabel;
  }

  return `${input.width}x${input.height}`;
}
