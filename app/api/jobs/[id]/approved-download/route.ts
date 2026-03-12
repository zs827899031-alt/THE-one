import fs from "node:fs/promises";
import path from "node:path";

import { zipSync } from "fflate";
import { NextResponse } from "next/server";

import { getJobDetails } from "@/lib/db";

export const runtime = "nodejs";

const PURE_IMAGE_FOLDER = "纯图";

const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

function inferDownloadName(originalName: string, mimeType: string) {
  const trimmed = originalName.trim() || "asset";
  const currentExtension = path.extname(trimmed);
  const preferredExtension = MIME_EXTENSION_MAP[mimeType] ?? "";

  if (currentExtension && currentExtension !== ".generated") {
    return trimmed;
  }

  const baseName = currentExtension ? path.basename(trimmed, currentExtension) : trimmed;
  return `${baseName}${preferredExtension}`;
}

function toAsciiFilename(filename: string) {
  const extension = path.extname(filename);
  const baseName = path.basename(filename, extension);
  const normalizedBase = baseName
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "download";
  const safeExtension = /^[.A-Za-z0-9_-]+$/.test(extension) ? extension : "";
  return `${normalizedBase}${safeExtension}`;
}

function makeContentDisposition(filename: string) {
  const asciiFilename = toAsciiFilename(filename);
  const encodedFilename = encodeURIComponent(filename)
    .replace(/['()]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/\*/g, "%2A");

  return `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`;
}

function slugifySegment(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[^\x20-\x7E]/g, "")
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "item"
  );
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const details = getJobDetails(id);
  if (!details) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const approvedItems = details.items.filter((item) => item.reviewStatus === "approved" && item.generatedAsset);

  if (!approvedItems.length) {
    return NextResponse.json({ error: "No approved images found for this job." }, { status: 400 });
  }

  const zipEntries: Record<string, Uint8Array> = {};

  for (const item of approvedItems) {
    const basePrefix = [
      String(item.variantIndex).padStart(2, "0"),
      slugifySegment(item.imageType),
      slugifySegment(item.ratio),
      slugifySegment(item.resolutionLabel),
    ].join("_");

    const buffer = await fs.readFile(item.generatedAsset!.filePath);
    const fileName = inferDownloadName(item.generatedAsset!.originalName, item.generatedAsset!.mimeType);
    zipEntries[`${PURE_IMAGE_FOLDER}/${basePrefix}_image${path.extname(fileName) || ".bin"}`] = new Uint8Array(buffer);
  }

  const zipBuffer = Buffer.from(zipSync(zipEntries, { level: 6 }));
  const zipName = `${details.job.productName || "approved-images"}-approved-images.zip`;

  return new NextResponse(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": makeContentDisposition(zipName),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
