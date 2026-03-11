import { NextResponse } from "next/server";

import { getJobDetails, getSettings, updateJobFeishuSyncState, updateJobItemWarning } from "@/lib/db";
import { rebuildJobFeishuSync } from "@/lib/feishu";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const details = getJobDetails(id);
  if (!details) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const settings = getSettings();
  if (!settings.feishuSyncEnabled) {
    return NextResponse.json({ error: "Feishu sync is not enabled." }, { status: 400 });
  }

  try {
    const result = await rebuildJobFeishuSync({
      settings,
      details,
    });

    if (result) {
      updateJobFeishuSyncState(id, result.recordId, result.fileTokens);
    }

    const warningByItemId = new Map(result?.itemResults.map((itemResult) => [itemResult.itemId, itemResult]) ?? []);
    for (const item of details.items) {
      if (!item.generatedAsset) {
        continue;
      }

      const syncResult = warningByItemId.get(item.id);
      if (syncResult?.ok) {
        if (item.warningMessage?.startsWith("Feishu sync failed:")) {
          updateJobItemWarning(item.id, null);
        }
        continue;
      }

      if (syncResult?.message) {
        updateJobItemWarning(item.id, `Feishu sync failed: ${syncResult.message}`);
      }
    }

    const refreshedDetails = getJobDetails(id);
    return NextResponse.json({
      ok: true,
      uploadedCount: result?.fileTokens.length ?? 0,
      failedCount: result?.itemResults.filter((itemResult) => !itemResult.ok).length ?? 0,
      details: refreshedDetails,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Feishu resync failed.",
      },
      { status: 500 },
    );
  }
}
