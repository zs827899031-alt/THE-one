import path from "node:path";

import { APP_NAME } from "@/lib/constants";
import { getRecommendedFeishuFieldMappingJson } from "@/lib/feishu-field-mapping";
import type { AppSettings } from "@/lib/types";

export { APP_NAME };

const configuredDataDir = process.env.COMMERCE_STUDIO_DATA_DIR;
const configuredStorageDir = process.env.COMMERCE_STUDIO_STORAGE_DIR;
const configuredDatabasePath = process.env.COMMERCE_STUDIO_DB_PATH;

export const DEFAULT_DATA_DIR = path.resolve(configuredDataDir ?? path.join(process.cwd(), "data"));
export const DEFAULT_STORAGE_DIR = path.resolve(configuredStorageDir ?? path.join(DEFAULT_DATA_DIR, "assets"));
export const DEFAULT_DATABASE_PATH = path.resolve(
  configuredDatabasePath ?? path.join(DEFAULT_DATA_DIR, "commerce-image-studio.sqlite"),
);
export const DEFAULT_FEISHU_FIELD_MAPPING = getRecommendedFeishuFieldMappingJson();

export const DEFAULT_SETTINGS: AppSettings = {
  defaultApiKey: "",
  defaultTextModel: "gemini-2.5-flash",
  defaultImageModel: "gemini-2.5-flash-image",
  defaultApiBaseUrl: "",
  defaultApiVersion: "v1beta",
  defaultApiHeaders: "",
  storageDir: DEFAULT_STORAGE_DIR,
  maxConcurrency: 2,
  defaultUiLanguage: "zh",
  feishuSyncEnabled: false,
  feishuAppId: "",
  feishuAppSecret: "",
  feishuBitableAppToken: "",
  feishuBitableTableId: "",
  feishuUploadParentType: "bitable_image",
  feishuFieldMappingJson: DEFAULT_FEISHU_FIELD_MAPPING,
};
