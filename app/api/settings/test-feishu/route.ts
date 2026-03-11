import { NextResponse } from "next/server";

import { parseFeishuFieldMapping } from "@/lib/feishu-field-mapping";
import { testFeishuConnection } from "@/lib/feishu";
import type { AppSettings } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<AppSettings>;

  if (!body.feishuAppId || !body.feishuAppSecret || !body.feishuBitableAppToken || !body.feishuBitableTableId) {
    return NextResponse.json(
      { error: "Feishu App ID, App Secret, Bitable App Token, and Table ID are required." },
      { status: 400 },
    );
  }

  try {
    parseFeishuFieldMapping(body.feishuFieldMappingJson);
    const result = await testFeishuConnection({
      defaultApiKey: "",
      defaultTextModel: "",
      defaultImageModel: "",
      defaultApiBaseUrl: "",
      defaultApiVersion: "v1beta",
      defaultApiHeaders: "",
      storageDir: "",
      maxConcurrency: 1,
      defaultUiLanguage: "zh",
      feishuSyncEnabled: Boolean(body.feishuSyncEnabled),
      feishuAppId: body.feishuAppId,
      feishuAppSecret: body.feishuAppSecret,
      feishuBitableAppToken: body.feishuBitableAppToken,
      feishuBitableTableId: body.feishuBitableTableId,
      feishuUploadParentType: body.feishuUploadParentType || "bitable_image",
      feishuFieldMappingJson: body.feishuFieldMappingJson || "{}",
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Feishu connection test failed." },
      { status: 400 },
    );
  }
}
