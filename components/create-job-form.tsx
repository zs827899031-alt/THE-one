"use client";

import { type CSSProperties, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  ASPECT_RATIOS,
  COUNTRIES,
  getDefaultCountryForLanguage,
  getDefaultLanguageForCountry,
  IMAGE_TYPE_OPTIONS,
  OUTPUT_LANGUAGES,
  PLATFORMS,
  PRODUCT_CATEGORIES,
  RESOLUTIONS,
} from "@/lib/constants";
import { getRecommendedCreateDefaults } from "@/lib/recommendations";
import type { BrandRecord, TemplateRecord, UiLanguage } from "@/lib/types";

interface TemplateMatchPreview {
  imageType: string;
  template: TemplateRecord | null;
  candidates: TemplateRecord[];
}

type SubmitBlockReason =
  | "files"
  | "prompt"
  | "reference"
  | "product-name"
  | "suite-selling-points"
  | "suite-material"
  | "suite-size";

const CREATE_JOB_DRAFT_KEY = "commerce-image-studio.create-draft.v1";
const INITIAL_SELECTED_TYPES = ["scene", "detail", "pain-point"];
const SUITE_SELECTED_TYPES = ["main-image", "lifestyle", "feature-overview", "scene", "material-craft", "size-spec"];
const AMAZON_A_PLUS_SELECTED_TYPES = ["poster", "feature-overview", "multi-scene", "detail", "size-spec", "culture-value"];
const INITIAL_SELECTED_RATIOS = ["1:1"];
const INITIAL_SELECTED_RESOLUTIONS = ["4K"];
const INITIAL_OPEN_SECTIONS = {
  base: true,
  market: true,
  advanced: false,
};
const INITIAL_PAYLOAD = {
  creationMode: "standard" as "standard" | "reference-remix" | "prompt" | "suite" | "amazon-a-plus",
  referenceStrength: "balanced" as "reference" | "balanced" | "product",
  preserveReferenceText: true,
  referenceCopyMode: "reference" as "reference" | "copy-sheet",
  productName: "",
  sku: "",
  brandName: "",
  category: "general",
  sellingPoints: "",
  restrictions: "",
  sourceDescription: "",
  materialInfo: "",
  sizeInfo: "",
  customPrompt: "",
  customNegativePrompt: "",
  translatePromptToOutputLanguage: false,
  autoOptimizePrompt: false,
  country: "US",
  language: "en-US",
  platform: "amazon",
  variantsPerType: 1,
  includeCopyLayout: false,
  temporaryApiKey: "",
  temporaryApiBaseUrl: "",
  temporaryApiVersion: "",
  temporaryApiHeaders: "",
  referenceExtraPrompt: "",
  referenceNegativePrompt: "",
  referenceLayoutOverrideJson: "",
  referencePosterCopyOverrideJson: "",
};

function copyFor(language: UiLanguage) {
  return language === "zh"
    ? {
        sourceImages: "图片原图",
        sourceImagesOptionalHint: "提示词模式下可不上传图片，直接按自定义提示词生成。",
        sourceImagesExpand: "展开图片原图（可选）",
        sourceImagesCollapse: "收起图片原图",
        referenceImages: "参考图",
        referenceHint: "上传一张参考图即可。系统会把参考图当作母版，只替换原图主体与同类关联元素；默认尽量保留参考图原文案，如需改字可切换到“按文案表格”。",
        creationMode: "创作模式",
        creationModeHint: "标准模式基于图片原图优化；套图模式生成一整套通用图片套图；亚马逊A+模式生成固定详情模块；提示词模式由你直接输入文字提示；参考图复刻会直接用原图主体还原参考图画面。",
        standardMode: "标准出图",
        promptMode: "提示词模式",
        referenceMode: "参考图复刻",
        customPrompt: "自定义提示词",
        customPromptHint: "直接写你希望生成的画面、风格、背景、光线、构图和细节要求。",
        customNegativePrompt: "负向提示词",
        customNegativePromptHint: "填写你不希望出现的内容，比如“不要手部”“不要英文文字”“不要厨房背景”。",
        translatePromptToOutputLanguage: "翻译为输出语言",
        translatePromptToOutputLanguageHint:
          "开启后，会先把你填写的提示词和负向提示词翻译成当前输出语言；关闭后保留原文。",
        autoOptimizePrompt: "自动优化为真实照片",
        autoOptimizePromptHint:
          "开启后，会在当前提示词基础上进一步优化成更适合真实摄影出图的文本，优先强调真实光线、镜头感、材质细节、自然阴影和商业摄影质感。",
        promptModePanelHint: "提示词模式不会使用模板匹配，系统会优先按你填写的文字提示词出图。",
        promptOptionalContext: "补充图片上下文（可选）",
        promptOptionalContextHint: "如果你只想直接按提示词出图，下面这些字段都可以留空。",
        referenceStrength: "复刻强度",
        referenceStrengthHint: "控制最终画面更接近参考图，还是更保留原图场景表达。",
        preserveReferenceText: "尽量保留参考图原文字与字体风格",
        preserveReferenceTextHint: "开启后，会优先保留参考图里的原始文字内容、字体风格、描边感觉和文案区块位置，而不是重写一整套新文案。",
        referenceCopyMode: "文案来源",
        referenceCopyModeHint: "参考图仍然是母版。这里只决定参考图里需要改掉的文案，优先按哪一套来源处理。",
        referenceCopyModeReference: "完全参照原图",
        referenceCopyModeReferenceHint: "默认尽量保留参考图原文案，只在主体替换后出现明显冲突时做最小必要改字。",
        referenceCopyModeCopySheet: "按文案表格",
        referenceCopyModeCopySheetHint: "保持参考图的文字版式、字体风格和区块位置，但需要替换的文案优先按下方字段生成；字段缺失时回退到原图识别。",
        referenceCopySheetFields: "文案表格（可选）",
        referenceCopySheetFieldsHint: "只有在“按文案表格”时才会使用这些字段；留空部分会回退到原图内容识别。",
        referenceSingleHint: "仅使用第一张参考图。",
        strengthReference: "更像参考图",
        strengthBalanced: "平衡",
        strengthProduct: "更像原图场景",
        remakeSimplifiedHint: "严格还原参考图，只替换主体与所有同类关联元素。复刻模式只保留图1基础参数：比例、分辨率和生成数量，不再参与市场参数、模板、复刻强度或额外 JSON 覆盖。",
        jsonOverrides: "JSON 覆盖（可选）",
        jsonOverridesHint: "这属于高级覆盖能力。默认复刻不会依赖 JSON。只有当你想手动修正关键词、结构提示或文案槽位时，再粘贴 JSON 覆盖。",
        referenceLayoutOverride: "参考图分析 JSON",
        referencePosterCopyOverride: "海报槽位文案 JSON",
        jsonOverridePlaceholder: "留空则使用系统自动分析结果。可先从结果页复制 JSON 再回来修改。",
        invalidReferenceLayoutJson: "参考图分析 JSON 格式无效，请检查后重试。",
        invalidReferencePosterCopyJson: "海报槽位文案 JSON 格式无效，请检查后重试。",
        referenceExtraPrompt: "复刻补充提示词（可选）",
        referenceNegativePrompt: "额外避免内容（可选）",
        referenceExtraPromptHint: "只写你想额外强调的视觉要求，比如“保持绿色顶部横幅”“突出右侧包装箱”。",
        referenceNegativePromptHint: "只写你想额外避免的内容，比如“不要改成厨房场景”“不要改成英文标题”。",
        livePreview: "实时预览",
        livePreviewEmpty: "上传图片后，这里会实时显示预览。",
        referencePreviewEmpty: "开启参考图复刻模式后，上传参考图，这里会显示参考画面预览。",
        previousImage: "上一张",
        nextImage: "下一张",
        keyboardHint: "支持键盘左右方向键切换图片。",
        expandSection: "展开",
        collapseSection: "收起",
        imageCounter: "第 {current} / {total} 张",
        baseInfo: "基础信息",
        market: "参数设置",
        generation: "生成参数",
        advanced: "高级选项",
        templatePreview: "本次模板命中预览",
        templatePreviewHint: "系统会按国家、语言、平台、品类和图片类型自动匹配最具体的模板。",
        templateLoading: "正在计算模板命中...",
        templateDefault: "默认模板",
        templateCustom: "自定义模板",
        templateAuto: "自动匹配",
        templateManual: "手动指定",
        chooseTemplate: "自选模板",
        clearTemplateChoice: "恢复匹配",
        templatePickerLabel: "当前图片类型模板",
        templateFallback: "未命中模板，将回退到内置默认策略。",
        wildcard: "全部适用",
        productName: "图片名",
        sku: "SKU",
        brandName: "品牌名",
        category: "品类",
        sellingPoints: "核心卖点",
        restrictions: "限制词 / 禁用内容",
        sourceDescription: "补充说明",
        country: "国家",
        autoLanguageToggle: "跟随国家自动切换语言",
        autoLanguageHint: "开启后，切换国家时会自动带出该市场默认语言。",
        outputLanguage: "输出语言",
        outputLanguageHint: "生成前会自动把文案翻译成当前输出语言；提示词模式下你可以分别控制“是否先翻译提示词”和“是否继续做真实照片优化”。",
        promptMarketToggle: "自定义目标市场参数（可选）",
        promptMarketToggleHint: "默认沿用当前提示词模式的市场与语言参数；只有在你需要指定国家、语言或平台时再展开。",
        platform: "平台",
        brandLibraryHint: "可直接输入品牌名，也可从品牌库中选择。",
        imageTypes: "图片类型",
        ratios: "比例",
        resolutions: "分辨率",
        variants: "每种类型生成数量",
        remakeVariants: "图片数量",
        applyRecommendation: "一键推荐参数",
        recommendationApplied: "已应用推荐参数",
        clearDraft: "清空已填信息",
        clearBaseInfo: "清空基础信息",
        clearAdvancedInfo: "清空临时配置",
        leavePrompt: "当前有未提交的创作草稿，离开页面后本次上传的图片需要重新选择。确认离开吗？",
        submitSuccessTitle: "任务已创建成功",
        submitSuccessHint: "你可以继续创建下一条图片任务，或立即查看本次结果页。",
        continueCreate: "继续创建下一条",
        viewResults: "查看结果页",
        temporaryApiKey: "临时 API Key（可选）",
        temporaryApiBaseUrl: "临时中转 Base URL（可选）",
        temporaryApiVersion: "临时 API 版本（可选）",
        temporaryApiHeaders: "临时请求头 JSON（可选）",
        temporaryRelayHint: "填写这些字段后，本次任务会优先使用临时中转配置，不影响系统默认设置。",
        submit: "提交任务",
        submitting: "提交中...",
        hint: "一次任务会按：图片 × 类型 × 比例 × 分辨率 × 数量 组合生成。",
        requestCountSummary: "本次将发起 {count} 次图像请求。",
        requestCountBreakdown: "计算方式：输入 {sources} × 类型 {types} × 比例 {ratios} × 分辨率 {resolutions} × 数量 {variants}。",
        multiTypeBillingHint: "当前选择了多个图片类型。系统会分别调用模型并分别计费，不是同一种图的多张变体。",
        filesRequired: "请至少上传一张图片。",
        promptRequired: "提示词模式下，请填写自定义提示词。",
        referenceFilesRequired: "参考图复刻模式下，请至少上传一张参考图。",
        generateError: "提交失败，请检查表单和 API Key。",
        baseSummaryEmpty: "填写图片信息、卖点与限制词。",
        advancedSummaryEmpty: "可选的临时密钥与额外配置。",
        temporaryApiKeySet: "已填写高级配置",
        promptPrefillApplied: "已从结果页回填复刻 prompt 到高级提示词，请重新上传图片后再提交。",
        typesUnit: "类图",
        ratiosUnit: "种比例",
        resolutionsUnit: "种分辨率",
      }
    : {
        sourceImages: "Source images",
        sourceImagesOptionalHint: "In prompt mode, source images are optional. You can generate directly from the custom prompt.",
        sourceImagesExpand: "Expand source images (optional)",
        sourceImagesCollapse: "Collapse source images",
        referenceImages: "Reference images",
        referenceHint: "Upload one reference image. The system treats it as the master, replaces only the source subject plus related elements, and keeps the original reference copy by default. Switch to copy-sheet mode if text should change.",
        creationMode: "Creation mode",
        creationModeHint: "Standard mode optimizes from the product source image. Image set mode creates a fixed six-image product set. Amazon A+ mode creates a fixed A+ detail module set. Prompt mode lets you write the image prompt yourself. Reference remake directly restores the reference image with your source subject.",
        standardMode: "Standard",
        promptMode: "Prompt mode",
        referenceMode: "Reference remake",
        customPrompt: "Custom prompt",
        customPromptHint: "Describe the desired scene, style, background, lighting, composition, and detail requirements directly.",
        customNegativePrompt: "Negative prompt",
        customNegativePromptHint: "Add anything you want to avoid, such as “no hands”, “no English text”, or “no kitchen background”.",
        translatePromptToOutputLanguage: "Translate to output language",
        translatePromptToOutputLanguageHint:
          "When enabled, the system translates your prompt and negative prompt into the selected output language first. When disabled, it keeps your original wording.",
        autoOptimizePrompt: "Optimize for realistic photos",
        autoOptimizePromptHint:
          "When enabled, the system further rewrites the current prompt into a more realistic photo-oriented brief, prioritizing natural lighting, believable camera language, material detail, real shadows, and commercial photography quality.",
        promptModePanelHint: "Prompt mode does not use template matching. The system primarily follows your text prompt.",
        promptOptionalContext: "Add optional product context",
        promptOptionalContextHint: "If you only want to generate directly from your prompt, you can leave all fields below empty.",
        referenceStrength: "Remake strength",
        referenceStrengthHint: "Control whether the result stays closer to the reference image or preserves more of the original product scene logic.",
        preserveReferenceText: "Preserve reference text and font feel when possible",
        preserveReferenceTextHint: "When enabled, the model prioritizes keeping the reference poster's original wording, typography feel, outlined text style, and text block positions instead of rewriting fresh copy.",
        referenceCopyMode: "Copy source",
        referenceCopyModeHint: "The reference image stays the master. This only decides which source should drive the text that must change.",
        referenceCopyModeReference: "Follow reference text",
        referenceCopyModeReferenceHint: "Default. Keep the original reference wording whenever possible and only make the smallest required changes after subject replacement.",
        referenceCopyModeCopySheet: "Use copy sheet",
        referenceCopyModeCopySheetHint: "Keep the reference text layout, typography feel, and block positions, but rewrite changed copy from the fields below. Missing fields fall back to source-image inference.",
        referenceCopySheetFields: "Copy sheet (optional)",
        referenceCopySheetFieldsHint: "These fields are used only in copy-sheet mode. Blank fields fall back to source-image understanding.",
        referenceSingleHint: "Only the first reference image is used.",
        strengthReference: "Closer to reference",
        strengthBalanced: "Balanced",
        strengthProduct: "Closer to product scene",
        remakeSimplifiedHint: "Strictly restore the reference image and replace only the subject plus directly related elements. Reference remake keeps only ratio, resolution, and quantity, and ignores market parameters, templates, remake strength, and JSON overrides.",
        jsonOverrides: "JSON overrides (optional)",
        jsonOverridesHint: "This is an advanced override. The default remake flow does not depend on JSON. Only use it when you explicitly want to override keywords, structure hints, or poster copy slots.",
        referenceLayoutOverride: "Reference layout JSON",
        referencePosterCopyOverride: "Poster copy slots JSON",
        jsonOverridePlaceholder: "Leave blank to use the automatic analysis. Copy JSON from the result page and edit it here if needed.",
        invalidReferenceLayoutJson: "Reference layout JSON is invalid. Please check the format and try again.",
        invalidReferencePosterCopyJson: "Poster copy JSON is invalid. Please check the format and try again.",
        referenceExtraPrompt: "Extra remake guidance (optional)",
        referenceNegativePrompt: "Extra avoid instructions (optional)",
        referenceExtraPromptHint: "Only add what you want to emphasize, such as “keep the green top banner” or “make the right-side carton obvious”.",
        referenceNegativePromptHint: "Only add what you want to avoid, such as “do not turn it into a kitchen scene” or “do not switch to English text”.",
        livePreview: "Live preview",
        livePreviewEmpty: "Upload product images and the live preview will appear here.",
        referencePreviewEmpty: "Enable reference remake mode and upload reference images to preview the target composition here.",
        previousImage: "Previous image",
        nextImage: "Next image",
        keyboardHint: "Use keyboard left and right arrows to switch images.",
        expandSection: "Expand",
        collapseSection: "Collapse",
        imageCounter: "Image {current} / {total}",
        baseInfo: "Base info",
        market: "Parameters",
        generation: "Generation settings",
        advanced: "Advanced",
        templatePreview: "Template match preview",
        templatePreviewHint: "The system matches the most specific template by country, language, platform, category, and image type.",
        templateLoading: "Calculating template matches...",
        templateDefault: "Default template",
        templateCustom: "Custom template",
        templateAuto: "Auto match",
        templateManual: "Manual override",
        chooseTemplate: "Choose template",
        clearTemplateChoice: "Back to match",
        templatePickerLabel: "Template for this image type",
        templateFallback: "No template matched. The system will fall back to the built-in default guidance.",
        wildcard: "Applies to all",
        productName: "Product name",
        sku: "SKU",
        brandName: "Brand",
        category: "Category",
        sellingPoints: "Selling points",
        restrictions: "Restrictions / banned content",
        sourceDescription: "Additional notes",
        country: "Country",
        autoLanguageToggle: "Follow country for language",
        autoLanguageHint: "When enabled, changing country will automatically switch to that market's default language.",
        outputLanguage: "Output language",
        outputLanguageHint: "Before generation, copy is auto-translated into the current output language. In prompt mode, you can control prompt translation and realistic-photo optimization separately.",
        promptMarketToggle: "Customize target market settings (optional)",
        promptMarketToggleHint: "Prompt mode uses the current default market and language settings unless you explicitly expand and override them.",
        platform: "Platform",
        brandLibraryHint: "Type a brand freely or pick one from the brand library.",
        imageTypes: "Image types",
        ratios: "Aspect ratios",
        resolutions: "Resolutions",
        variants: "Variants per type",
        remakeVariants: "Image count",
        applyRecommendation: "Recommend setup",
        recommendationApplied: "Recommendation applied",
        clearDraft: "Clear draft",
        clearBaseInfo: "Clear base info",
        clearAdvancedInfo: "Clear temporary config",
        leavePrompt: "You have an unsubmitted draft. If you leave now, the uploaded images must be selected again. Leave this page?",
        submitSuccessTitle: "Job created successfully",
        submitSuccessHint: "You can keep creating the next product or jump straight to the result page.",
        continueCreate: "Create next",
        viewResults: "View result",
        temporaryApiKey: "Temporary API key (optional)",
        temporaryApiBaseUrl: "Temporary relay base URL (optional)",
        temporaryApiVersion: "Temporary API version (optional)",
        temporaryApiHeaders: "Temporary headers JSON (optional)",
        temporaryRelayHint: "When filled, this job will use the temporary relay config first without changing global settings.",
        submit: "Create job",
        submitting: "Submitting...",
        hint: "Each job expands as: images × types × ratios × resolutions × quantity.",
        requestCountSummary: "This job will make {count} image-generation requests.",
        requestCountBreakdown: "Formula: inputs {sources} × types {types} × ratios {ratios} × resolutions {resolutions} × quantity {variants}.",
        multiTypeBillingHint: "Multiple image types are selected. They are generated and billed separately, not as multiple variations of the same type.",
        filesRequired: "Upload at least one product image.",
        promptRequired: "Prompt mode requires a custom text prompt.",
        referenceFilesRequired: "Upload at least one reference image in reference remake mode.",
        generateError: "Submit failed. Check the form and API key.",
        baseSummaryEmpty: "Fill in product details, selling points, and restrictions.",
        advancedSummaryEmpty: "Optional temporary key and extra configuration.",
        temporaryApiKeySet: "Advanced overrides added",
        promptPrefillApplied: "The remake prompt was sent back from the result page into advanced guidance. Re-upload images before submitting.",
        typesUnit: "types",
        ratiosUnit: "ratios",
        resolutionsUnit: "resolutions",
      };
}

function labelFor(value: string, language: UiLanguage, options: Array<{ value: string; label: Record<UiLanguage, string> }>) {
  if (value === "*") {
    return copyFor(language).wildcard;
  }
  return options.find((option) => option.value === value)?.label[language] ?? value;
}

export function CreateJobForm({ language }: { language: UiLanguage }) {
  const router = useRouter();
  const text = useMemo(() => copyFor(language), [language]);
  const suiteModeLabel = language === "zh" ? "套图模式" : "Image set mode";
  const suiteModeHint =
    language === "zh"
      ? "上传主图后，系统会自动生成一整套通用图片套图：主图、生活方式、卖点总览、场景图、材质工艺和尺寸参数。"
      : "Upload a source image and the system will generate a full generic image set: main image, lifestyle, feature overview, scene, material & craft, and size spec.";
  const suiteModulesSummary =
    language === "zh"
      ? "固定覆盖：主图、生活方式、卖点总览、场景图、材质工艺、尺寸参数。"
      : "Fixed coverage: main image, lifestyle, feature overview, scene, material & craft, and size spec.";
  const suiteMaterialLabel = language === "zh" ? "材质（必填）" : "Material (required)";
  const suiteSizeLabel = language === "zh" ? "尺寸大小（必填）" : "Size / dimensions (required)";
  const suiteSellingPointsLabel = language === "zh" ? "核心卖点（必填）" : "Selling points (required)";
  const suiteQuantityLabel = language === "zh" ? "套图数量" : "Set count";
  const suiteModeRequiredHint =
    language === "zh" ? "套图模式需要填写品类、卖点、材质和尺寸大小。" : "Image set mode requires category, selling points, material, and size.";
  const amazonAPlusModeLabel = language === "zh" ? "亚马逊A+图" : "Amazon A+";
  const amazonAPlusModeHint =
    language === "zh"
      ? "上传主图后，系统会自动生成一整套 Amazon A+ 详情模块：主视觉海报、核心卖点解析、多场景应用、产品细节、尺寸标注和文化价值。"
      : "Upload a main image and the system will generate a full Amazon A+ module set: hero poster, feature overview, multi-scene usage, detail close-ups, size spec, and cultural value.";
  const amazonAPlusLockedPlatformHint =
    language === "zh" ? "A+ 模式固定按 Amazon 详情页模块生成。" : "A+ mode is locked to Amazon detail-page modules.";
  const amazonAPlusContextHint =
    language === "zh"
      ? "可选补充产品名、品牌、卖点和补充说明，帮助模型更稳定地生成整套 A+ 模块。"
      : "Optionally add the product name, brand, selling points, and extra notes to make the A+ module set more consistent.";
  const amazonAPlusModulesSummary =
    language === "zh"
      ? "固定覆盖：主视觉海报、核心卖点解析、多场景应用、产品细节、尺寸标注、文化价值。"
      : "Fixed coverage: hero poster, feature overview, multi-scene usage, detail close-ups, size spec, and cultural value.";
  const amazonAPlusProductLabel = language === "zh" ? "产品名称（可选）" : "Product name (optional)";
  const amazonAPlusSellingPointsLabel = language === "zh" ? "核心卖点（可选）" : "Selling points (optional)";
  const amazonAPlusSourceDescriptionLabel = language === "zh" ? "补充说明（可选）" : "Additional notes (optional)";
  const [isPending, startTransition] = useTransition();
  const [files, setFiles] = useState<File[]>([]);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [referencePreviewUrls, setReferencePreviewUrls] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [referencePreviewIndex, setReferencePreviewIndex] = useState(0);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(INITIAL_SELECTED_TYPES);
  const [selectedRatios, setSelectedRatios] = useState<string[]>(INITIAL_SELECTED_RATIOS);
  const [selectedResolutions, setSelectedResolutions] = useState<string[]>(INITIAL_SELECTED_RESOLUTIONS);
  const [templateMatches, setTemplateMatches] = useState<TemplateMatchPreview[]>([]);
  const [selectedTemplateOverrides, setSelectedTemplateOverrides] = useState<Record<string, string>>({});
  const [templatePickerOpen, setTemplatePickerOpen] = useState<Record<string, boolean>>({});
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [recommendationMessage, setRecommendationMessage] = useState("");
  const [autoLanguageByCountry, setAutoLanguageByCountry] = useState(true);
  const [promptMarketOverridesEnabled, setPromptMarketOverridesEnabled] = useState(false);
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [openSections, setOpenSections] = useState(INITIAL_OPEN_SECTIONS);
  const [payload, setPayload] = useState(INITIAL_PAYLOAD);
  const [draftReady, setDraftReady] = useState(false);
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);
  const [submitBlockedFeedback, setSubmitBlockedFeedback] = useState(false);
  const allowLeaveRef = useRef(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const sourceFileInputRef = useRef<HTMLInputElement | null>(null);
  const referenceFileInputRef = useRef<HTMLInputElement | null>(null);
  const productNameInputRef = useRef<HTMLInputElement | null>(null);
  const customPromptInputRef = useRef<HTMLTextAreaElement | null>(null);
  const suiteSellingPointsInputRef = useRef<HTMLTextAreaElement | null>(null);
  const suiteMaterialInfoInputRef = useRef<HTMLTextAreaElement | null>(null);
  const suiteSizeInfoInputRef = useRef<HTMLTextAreaElement | null>(null);
  const submitBlockedTimerRef = useRef<number | null>(null);
  const [viewportLayout, setViewportLayout] = useState({
    compact: false,
    cramped: false,
    availableHeight: 0,
  });

  const hasDraftChanges = useMemo(() => {
    const payloadChanged = JSON.stringify(payload) !== JSON.stringify(INITIAL_PAYLOAD);
    const typesChanged = JSON.stringify(selectedTypes) !== JSON.stringify(INITIAL_SELECTED_TYPES);
    const ratiosChanged = JSON.stringify(selectedRatios) !== JSON.stringify(INITIAL_SELECTED_RATIOS);
    const resolutionsChanged = JSON.stringify(selectedResolutions) !== JSON.stringify(INITIAL_SELECTED_RESOLUTIONS);
    const hasTemplateOverride = Object.keys(selectedTemplateOverrides).length > 0;
    const hasImages = files.length > 0 || referenceFiles.length > 0;
    const promptMarketChanged = promptMarketOverridesEnabled;

    return payloadChanged || typesChanged || ratiosChanged || resolutionsChanged || hasTemplateOverride || hasImages || promptMarketChanged;
  }, [files.length, payload, promptMarketOverridesEnabled, referenceFiles.length, selectedRatios, selectedResolutions, selectedTemplateOverrides, selectedTypes]);
  const shouldWarnBeforeLeave = hasDraftChanges && !submittedJobId;
  const submitBlockReason = useMemo<SubmitBlockReason | null>(() => {
    if (isPending) {
      return null;
    }

    if (payload.creationMode !== "prompt" && !files.length) {
      return "files";
    }

    if (payload.creationMode === "prompt" && !payload.customPrompt.trim()) {
      return "prompt";
    }

    if (payload.creationMode === "reference-remix" && !referenceFiles.length) {
      return "reference";
    }

    if (payload.creationMode === "standard" && !payload.productName.trim()) {
      return "product-name";
    }

    if (payload.creationMode === "suite" && !payload.sellingPoints.trim()) {
      return "suite-selling-points";
    }

    if (payload.creationMode === "suite" && !payload.materialInfo.trim()) {
      return "suite-material";
    }

    if (payload.creationMode === "suite" && !payload.sizeInfo.trim()) {
      return "suite-size";
    }

    return null;
  }, [
    files.length,
    isPending,
    payload.creationMode,
    payload.customPrompt,
    payload.materialInfo,
    payload.productName,
    payload.sellingPoints,
    payload.sizeInfo,
    referenceFiles.length,
  ]);
  const submitBlockedMessage =
    submitBlockReason === "files"
      ? text.filesRequired
      : submitBlockReason === "prompt"
        ? text.promptRequired
        : submitBlockReason === "reference"
          ? text.referenceFilesRequired
          : submitBlockReason === "suite-selling-points" ||
              submitBlockReason === "suite-material" ||
              submitBlockReason === "suite-size"
            ? suiteModeRequiredHint
            : submitBlockReason === "product-name"
              ? language === "zh"
                ? "请先填写图片名。"
                : "Please fill in the image name first."
              : "";
  const isSubmitBlocked = Boolean(submitBlockReason);

  useEffect(() => {
    try {
      const rawDraft = window.localStorage.getItem(CREATE_JOB_DRAFT_KEY);
      if (!rawDraft) {
        setDraftReady(true);
        return;
      }

      const draft = JSON.parse(rawDraft) as {
        payload?: typeof INITIAL_PAYLOAD;
        selectedTypes?: string[];
        selectedRatios?: string[];
        selectedResolutions?: string[];
        selectedTemplateOverrides?: Record<string, string>;
        autoLanguageByCountry?: boolean;
        promptMarketOverridesEnabled?: boolean;
        openSections?: typeof INITIAL_OPEN_SECTIONS;
        recommendationMessage?: string;
      };

      if (draft.payload) {
        setPayload((current) => ({ ...current, ...draft.payload }));
      }
      if (draft.selectedTypes?.length) {
        setSelectedTypes(draft.selectedTypes);
      }
      if (draft.selectedRatios?.length) {
        setSelectedRatios([draft.selectedRatios[0]]);
      }
      if (draft.selectedResolutions?.length) {
        setSelectedResolutions([draft.selectedResolutions[0]]);
      }
      if (draft.selectedTemplateOverrides) {
        setSelectedTemplateOverrides(draft.selectedTemplateOverrides);
      }
      if (typeof draft.autoLanguageByCountry === "boolean") {
        setAutoLanguageByCountry(draft.autoLanguageByCountry);
      }
      if (typeof draft.promptMarketOverridesEnabled === "boolean") {
        setPromptMarketOverridesEnabled(draft.promptMarketOverridesEnabled);
      }
      if (draft.openSections) {
        setOpenSections((current) => ({ ...current, ...draft.openSections }));
      }
      if (draft.recommendationMessage) {
        setRecommendationMessage(draft.recommendationMessage);
      }

    } catch {
      window.localStorage.removeItem(CREATE_JOB_DRAFT_KEY);
    } finally {
      setDraftReady(true);
    }
  }, []);

  useEffect(
    () => () => {
      if (submitBlockedTimerRef.current) {
        window.clearTimeout(submitBlockedTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!draftReady) {
      return;
    }

    window.localStorage.setItem(
      CREATE_JOB_DRAFT_KEY,
      JSON.stringify({
        payload,
        selectedTypes,
        selectedRatios,
        selectedResolutions,
        selectedTemplateOverrides,
        autoLanguageByCountry,
        promptMarketOverridesEnabled,
        openSections,
        recommendationMessage,
      }),
    );
  }, [
    autoLanguageByCountry,
    promptMarketOverridesEnabled,
    draftReady,
    openSections,
    payload,
    recommendationMessage,
    selectedRatios,
    selectedResolutions,
    selectedTemplateOverrides,
    selectedTypes,
  ]);

  useEffect(() => {
    if (!draftReady || !shouldWarnBeforeLeave) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowLeaveRef.current) {
        return;
      }

      event.preventDefault();
      event.returnValue = text.leavePrompt;
    };

    const handleDocumentClick = (event: MouseEvent) => {
      if (allowLeaveRef.current) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) {
        return;
      }

      const nextUrl = new URL(anchor.href, window.location.href);
      const currentUrl = new URL(window.location.href);
      if (nextUrl.href === currentUrl.href) {
        return;
      }

      const confirmed = window.confirm(text.leavePrompt);
      if (!confirmed) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        return;
      }

      allowLeaveRef.current = true;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [draftReady, shouldWarnBeforeLeave, text.leavePrompt]);

  useEffect(() => {
    let cancelled = false;

    async function loadBrands() {
      const response = await fetch("/api/brands");
      if (!response.ok) {
        return;
      }
      const body = (await response.json()) as { brands?: BrandRecord[] };
      if (!cancelled) {
        setBrands(body.brands ?? []);
      }
    }

    loadBrands();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!files.length) {
      setPreviewUrls([]);
      setPreviewIndex(0);
      return;
    }

    const objectUrls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(objectUrls);
    setPreviewIndex((current) => Math.min(current, objectUrls.length - 1));

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  useEffect(() => {
    if (!referenceFiles.length) {
      setReferencePreviewUrls([]);
      setReferencePreviewIndex(0);
      return;
    }

    const objectUrls = referenceFiles.map((file) => URL.createObjectURL(file));
    setReferencePreviewUrls(objectUrls);
    setReferencePreviewIndex((current) => Math.min(current, objectUrls.length - 1));

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [referenceFiles]);

  useEffect(() => {
    if (previewUrls.length <= 1) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      const isEditable = target?.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";

      if (isEditable) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setPreviewIndex((current) => (current === 0 ? previewUrls.length - 1 : current - 1));
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setPreviewIndex((current) => (current === previewUrls.length - 1 ? 0 : current + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [previewUrls.length]);

  useEffect(() => {
    setSelectedTemplateOverrides((current) =>
      Object.fromEntries(Object.entries(current).filter(([imageType]) => selectedTypes.includes(imageType))),
    );
    setTemplatePickerOpen((current) =>
      Object.fromEntries(Object.entries(current).filter(([imageType]) => selectedTypes.includes(imageType))),
    );
  }, [selectedTypes]);

  useEffect(() => {
    if (payload.creationMode !== "standard" || !selectedTypes.length) {
      setTemplateMatches([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsLoadingMatches(true);
      try {
        const response = await fetch("/api/templates/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            country: payload.country,
            language: payload.language,
            platform: payload.platform,
            category: payload.category,
            imageTypes: selectedTypes,
          }),
        });

        const body = (await response.json().catch(() => null)) as { matches?: TemplateMatchPreview[]; error?: string } | null;

        if (!cancelled) {
          setTemplateMatches(response.ok ? body?.matches ?? [] : []);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMatches(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [payload.category, payload.country, payload.creationMode, payload.language, payload.platform, selectedTypes]);

  useEffect(() => {
    if (payload.creationMode !== "reference-remix") {
      return;
    }

    if (selectedTypes.length !== 1 || selectedTypes[0] !== "scene") {
      setSelectedTypes(["scene"]);
    }

    if (Object.keys(selectedTemplateOverrides).length) {
      setSelectedTemplateOverrides({});
    }

      if (!selectedResolutions.length) {
      setSelectedResolutions(["4K"]);
    }

    const referenceDefaults =
      language === "zh"
        ? { country: "CN", language: "zh-CN", platform: "tmall" }
        : { country: "US", language: "en-US", platform: "amazon" };

    setPayload((current) => {
      const next = { ...current };
      let changed = false;

      if (current.includeCopyLayout) {
        next.includeCopyLayout = false;
        changed = true;
      }
      if (current.country !== referenceDefaults.country) {
        next.country = referenceDefaults.country;
        changed = true;
      }
      if (current.language !== referenceDefaults.language) {
        next.language = referenceDefaults.language;
        changed = true;
      }
      if (current.platform !== referenceDefaults.platform) {
        next.platform = referenceDefaults.platform;
        changed = true;
      }
      if (current.referenceStrength !== "reference") {
        next.referenceStrength = "reference";
        changed = true;
      }
      if (!current.preserveReferenceText) {
        next.preserveReferenceText = true;
        changed = true;
      }
      if (current.referenceCopyMode !== "reference" && current.referenceCopyMode !== "copy-sheet") {
        next.referenceCopyMode = "reference";
        changed = true;
      }
      if (current.referenceExtraPrompt) {
        next.referenceExtraPrompt = "";
        changed = true;
      }
      if (current.referenceNegativePrompt) {
        next.referenceNegativePrompt = "";
        changed = true;
      }
      if (current.referenceLayoutOverrideJson) {
        next.referenceLayoutOverrideJson = "";
        changed = true;
      }
      if (current.referencePosterCopyOverrideJson) {
        next.referencePosterCopyOverrideJson = "";
        changed = true;
      }

      return changed ? next : current;
    });
  }, [language, payload.creationMode, selectedResolutions, selectedTemplateOverrides, selectedTypes]);

  useEffect(() => {
    if (payload.creationMode !== "prompt") {
      return;
    }

    if (Object.keys(selectedTemplateOverrides).length) {
      setSelectedTemplateOverrides({});
    }

    const nextCountry = getDefaultCountryForLanguage(payload.language);
    if (nextCountry && payload.country !== nextCountry) {
      setPayload((current) => ({
        ...current,
        country: getDefaultCountryForLanguage(current.language) ?? current.country,
      }));
    }
  }, [
    payload.country,
    payload.creationMode,
    payload.language,
    selectedTemplateOverrides,
  ]);

  useEffect(() => {
    const updateViewportLayout = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const topOffset = formRef.current?.getBoundingClientRect().top ?? 0;
      const availableHeight = Math.max(height - topOffset - 16, 520);

      setViewportLayout({
        compact: height <= 980 || width <= 1560,
        cramped: height <= 860 || width <= 1320,
        availableHeight,
      });
    };

    updateViewportLayout();
    window.addEventListener("resize", updateViewportLayout);

    return () => {
      window.removeEventListener("resize", updateViewportLayout);
    };
  }, []);

  function toggleSelection(value: string, selected: string[], setter: (items: string[]) => void) {
    if (selected.includes(value)) {
      setter(selected.filter((item) => item !== value));
      return;
    }
    setter([...selected, value]);
  }

  function selectSingle(value: string, setter: (items: string[]) => void) {
    setter([value]);
  }

  function showPreviousPreview() {
    setPreviewIndex((current) => (current === 0 ? previewUrls.length - 1 : current - 1));
  }

  function showNextPreview() {
    setPreviewIndex((current) => (current === previewUrls.length - 1 ? 0 : current + 1));
  }

  function toggleSection(section: keyof typeof openSections) {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  function applyRecommendedSetup() {
    if (payload.creationMode !== "standard") {
      return;
    }

    const recommendation = getRecommendedCreateDefaults({
      platform: payload.platform,
      category: payload.category,
    });

    setSelectedTypes(recommendation.selectedTypes);
    setSelectedRatios(recommendation.selectedRatios.length ? [recommendation.selectedRatios[0]] : ["1:1"]);
    setSelectedResolutions(recommendation.selectedResolutions.length ? [recommendation.selectedResolutions[0]] : ["1K"]);
    setPayload((current) => ({
      ...current,
      variantsPerType: recommendation.variantsPerType,
    }));
    setRecommendationMessage(`${text.recommendationApplied} · ${recommendation.reason[language]}`);
  }

  function clearBaseInfo() {
    setPayload((current) => ({
      ...current,
      productName: "",
      sku: "",
      brandName: "",
      sellingPoints: "",
      restrictions: "",
      sourceDescription: "",
      materialInfo: "",
      sizeInfo: "",
      customPrompt: "",
      customNegativePrompt: "",
    }));
    setRecommendationMessage("");
    setErrorMessage("");
  }

  function clearAdvancedInfo() {
    setPayload((current) => ({
      ...current,
      temporaryApiKey: "",
      temporaryApiBaseUrl: "",
      temporaryApiVersion: "",
      temporaryApiHeaders: "",
      referenceExtraPrompt: "",
      referenceNegativePrompt: "",
      referenceLayoutOverrideJson: "",
      referencePosterCopyOverrideJson: "",
    }));
    setErrorMessage("");
  }

  function prepareNextCreate() {
    setFiles([]);
    setReferenceFiles([]);
    setPreviewUrls([]);
    setReferencePreviewUrls([]);
    setPreviewIndex(0);
    setReferencePreviewIndex(0);
    setErrorMessage("");
    setPayload((current) => ({
      ...current,
      productName: "",
      sku: "",
      brandName: "",
      sellingPoints: "",
      restrictions: "",
      sourceDescription: "",
      materialInfo: "",
      sizeInfo: "",
      customPrompt: "",
      customNegativePrompt: "",
      referenceExtraPrompt: "",
      referenceNegativePrompt: "",
      referenceLayoutOverrideJson: "",
      referencePosterCopyOverrideJson: "",
    }));
  }

  function clearDraft() {
    allowLeaveRef.current = true;
    setSubmittedJobId(null);
    setFiles([]);
    setReferenceFiles([]);
    setPreviewUrls([]);
    setReferencePreviewUrls([]);
    setPreviewIndex(0);
    setReferencePreviewIndex(0);
    setSelectedTypes(INITIAL_SELECTED_TYPES);
    setSelectedRatios(INITIAL_SELECTED_RATIOS);
    setSelectedResolutions(INITIAL_SELECTED_RESOLUTIONS);
    setSelectedTemplateOverrides({});
    setTemplatePickerOpen({});
    setRecommendationMessage("");
    setErrorMessage("");
    setAutoLanguageByCountry(true);
    setPromptMarketOverridesEnabled(false);
    setOpenSections(INITIAL_OPEN_SECTIONS);
    setPayload(INITIAL_PAYLOAD);
    window.localStorage.removeItem(CREATE_JOB_DRAFT_KEY);
    window.setTimeout(() => {
      allowLeaveRef.current = false;
    }, 0);
  }

  function focusBlockedSubmitTarget(reason: SubmitBlockReason) {
    if (reason === "files") {
      sourceFileInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      sourceFileInputRef.current?.focus();
      return;
    }

    if (reason === "reference") {
      referenceFileInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      referenceFileInputRef.current?.focus();
      return;
    }

    setOpenSections((current) => ({ ...current, base: true }));

    window.setTimeout(() => {
      if (reason === "prompt") {
        customPromptInputRef.current?.focus();
        customPromptInputRef.current?.select();
        return;
      }

      if (reason === "suite-selling-points") {
        suiteSellingPointsInputRef.current?.focus();
        suiteSellingPointsInputRef.current?.select();
        return;
      }

      if (reason === "suite-material") {
        suiteMaterialInfoInputRef.current?.focus();
        suiteMaterialInfoInputRef.current?.select();
        return;
      }

      if (reason === "suite-size") {
        suiteSizeInfoInputRef.current?.focus();
        suiteSizeInfoInputRef.current?.select();
        return;
      }

      productNameInputRef.current?.focus();
      productNameInputRef.current?.select();
    }, 0);
  }

  function triggerSubmitBlockedFeedback(reason: SubmitBlockReason) {
    setErrorMessage(
      reason === "files"
        ? text.filesRequired
        : reason === "prompt"
          ? text.promptRequired
          : reason === "reference"
            ? text.referenceFilesRequired
            : reason === "product-name"
              ? language === "zh"
                ? "请先填写图片名。"
                : "Please fill in the image name first."
              : suiteModeRequiredHint,
    );
    setSubmitBlockedFeedback(false);
    window.clearTimeout(submitBlockedTimerRef.current ?? undefined);
    window.requestAnimationFrame(() => {
      setSubmitBlockedFeedback(true);
      submitBlockedTimerRef.current = window.setTimeout(() => {
        setSubmitBlockedFeedback(false);
      }, 460);
    });
    focusBlockedSubmitTarget(reason);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (submitBlockReason) {
      triggerSubmitBlockedFeedback(submitBlockReason);
      return;
    }

    let referenceLayoutOverride: unknown = null;
    let referencePosterCopyOverride: unknown = null;

    startTransition(async () => {
      try {
        const formData = new FormData();
        for (const file of files) {
          formData.append("files", file);
        }
        if (payload.creationMode === "reference-remix") {
          for (const file of referenceFiles) {
            formData.append("referenceFiles", file);
          }
        }
        formData.append(
          "payload",
          JSON.stringify({
            ...payload,
            selectedTypes: effectiveSelectedTypes,
            selectedRatios,
            selectedResolutions,
            selectedTemplateOverrides,
            referenceStrength: payload.creationMode === "reference-remix" ? "reference" : payload.referenceStrength,
            preserveReferenceText: payload.creationMode === "reference-remix" ? true : payload.preserveReferenceText,
            referenceCopyMode:
              payload.creationMode === "reference-remix"
                ? payload.referenceCopyMode === "copy-sheet"
                  ? "copy-sheet"
                  : "reference"
                : payload.referenceCopyMode,
            referenceExtraPrompt: payload.creationMode === "reference-remix" ? "" : payload.referenceExtraPrompt,
            referenceNegativePrompt: payload.creationMode === "reference-remix" ? "" : payload.referenceNegativePrompt,
            referenceLayoutOverride: payload.creationMode === "reference-remix" ? null : referenceLayoutOverride,
            referencePosterCopyOverride: payload.creationMode === "reference-remix" ? null : referencePosterCopyOverride,
            temporaryProvider: {
              apiKey: payload.temporaryApiKey,
              apiBaseUrl: payload.temporaryApiBaseUrl,
              apiVersion: payload.temporaryApiVersion,
              apiHeaders: payload.temporaryApiHeaders,
            },
            uiLanguage: language,
          }),
        );

        const response = await fetch("/api/generate", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const rawText = await response.text().catch(() => "");
          let parsedBody: { error?: string } | null = null;
          try {
            parsedBody = rawText ? (JSON.parse(rawText) as { error?: string }) : null;
          } catch {
            parsedBody = null;
          }
          setErrorMessage(parsedBody?.error || rawText || text.generateError);
          return;
        }

        const body = (await response.json()) as { jobId: string };
        window.localStorage.removeItem(CREATE_JOB_DRAFT_KEY);
        setSubmittedJobId(body.jobId);
      } catch (error) {
        setErrorMessage(error instanceof Error && error.message ? error.message : text.generateError);
      }
    });
  }

  function handleContinueCreate() {
    setSubmittedJobId(null);
    prepareNextCreate();
    window.setTimeout(() => {
      if (payload.creationMode === "prompt") {
        customPromptInputRef.current?.focus();
        customPromptInputRef.current?.select();
        return;
      }

      productNameInputRef.current?.focus();
      productNameInputRef.current?.select();
    }, 0);
  }

  function handleViewResults() {
    if (!submittedJobId) {
      return;
    }

    allowLeaveRef.current = true;
    router.push(`/jobs/${submittedJobId}`);
  }

  function toggleTemplatePicker(imageType: string) {
    setTemplatePickerOpen((current) => ({
      ...current,
      [imageType]: !current[imageType],
    }));
  }

  function applyTemplateOverride(imageType: string, templateId: string) {
    setSelectedTemplateOverrides((current) => {
      if (!templateId) {
        const next = { ...current };
        delete next[imageType];
        return next;
      }

      return {
        ...current,
        [imageType]: templateId,
      };
    });
  }

  const currentPreviewUrl = previewUrls[previewIndex] ?? null;
  const currentReferencePreviewUrl = referencePreviewUrls[referencePreviewIndex] ?? null;
  const resolutionOptions = RESOLUTIONS;
  const effectiveSelectedTypes =
    payload.creationMode === "prompt" || payload.creationMode === "reference-remix"
      ? ["scene"]
      : payload.creationMode === "suite"
        ? SUITE_SELECTED_TYPES
        : payload.creationMode === "amazon-a-plus"
          ? AMAZON_A_PLUS_SELECTED_TYPES
          : selectedTypes;
  const referenceCopyModeLabel =
    payload.referenceCopyMode === "copy-sheet" ? text.referenceCopyModeCopySheet : text.referenceCopyModeReference;
  const generationHint =
    payload.creationMode === "prompt"
      ? text.promptModePanelHint
      : payload.creationMode === "suite"
        ? suiteModulesSummary
      : payload.creationMode === "amazon-a-plus"
        ? amazonAPlusModulesSummary
      : payload.creationMode === "reference-remix"
        ? text.remakeSimplifiedHint
        : recommendationMessage || text.hint;
  const baseSummary =
    payload.creationMode === "prompt"
      ? payload.customPrompt.trim() || text.baseSummaryEmpty
      : payload.creationMode === "suite"
        ? [payload.productName, labelFor(payload.category, language, PRODUCT_CATEGORIES), payload.materialInfo].filter(Boolean).join(" · ") || suiteModeHint
      : payload.creationMode === "amazon-a-plus"
        ? [payload.productName, payload.brandName, payload.sellingPoints].filter(Boolean).join(" · ") || amazonAPlusContextHint
      : payload.creationMode === "reference-remix"
        ? [text.remakeSimplifiedHint, `${text.referenceCopyMode}：${referenceCopyModeLabel}`].join(" ")
        : [payload.productName, payload.brandName, labelFor(payload.category, language, PRODUCT_CATEGORIES)].filter(Boolean).join(" · ") || text.baseSummaryEmpty;
  const marketSummary =
    payload.creationMode === "reference-remix"
      ? [
          referenceCopyModeLabel,
          selectedRatios[0] ?? "-",
          selectedResolutions[0] ?? "-",
          `${payload.variantsPerType}`,
        ].join(" · ")
      : payload.creationMode === "prompt"
        ? [
            labelFor(payload.country, language, COUNTRIES),
            labelFor(payload.platform, language, PLATFORMS),
            labelFor(payload.language, language, OUTPUT_LANGUAGES),
            text.promptMode,
            selectedRatios[0] ?? "-",
            selectedResolutions[0] ?? "-",
          ].join(" · ")
      : payload.creationMode === "suite"
        ? [
            labelFor(payload.country, language, COUNTRIES),
            labelFor(payload.language, language, OUTPUT_LANGUAGES),
            labelFor(payload.platform, language, PLATFORMS),
            suiteModeLabel,
            `${effectiveSelectedTypes.length} ${text.typesUnit}`,
            selectedRatios[0] ?? "-",
            selectedResolutions[0] ?? "-",
          ].join(" · ")
      : payload.creationMode === "amazon-a-plus"
        ? [
            labelFor(payload.country, language, COUNTRIES),
            labelFor(payload.language, language, OUTPUT_LANGUAGES),
            amazonAPlusModeLabel,
            `${effectiveSelectedTypes.length} ${text.typesUnit}`,
            selectedRatios[0] ?? "-",
            selectedResolutions[0] ?? "-",
          ].join(" · ")
      : [
          labelFor(payload.country, language, COUNTRIES),
          labelFor(payload.platform, language, PLATFORMS),
          text.standardMode,
          `${selectedTypes.length} ${text.typesUnit}`,
          selectedRatios[0] ?? "-",
          selectedResolutions[0] ?? "-",
        ].join(" · ");
  const advancedSummary =
    payload.temporaryApiKey ||
    payload.temporaryApiBaseUrl ||
    payload.temporaryApiVersion ||
    payload.temporaryApiHeaders ||
    payload.referenceExtraPrompt ||
    payload.referenceNegativePrompt ||
    payload.customNegativePrompt ||
    payload.referenceLayoutOverrideJson ||
    payload.referencePosterCopyOverrideJson
      ? text.temporaryApiKeySet
      : text.advancedSummaryEmpty;
  const requestInputCount = payload.creationMode === "prompt" ? Math.max(files.length, 1) : files.length;
  const requestCount =
    requestInputCount *
    effectiveSelectedTypes.length *
    selectedRatios.length *
    selectedResolutions.length *
    payload.variantsPerType;
  const requestCountSummary = text.requestCountSummary.replace("{count}", String(requestCount));
  const requestCountBreakdown = text.requestCountBreakdown
    .replace("{sources}", String(requestInputCount))
    .replace("{types}", String(effectiveSelectedTypes.length))
    .replace("{ratios}", String(selectedRatios.length))
    .replace("{resolutions}", String(selectedResolutions.length))
    .replace("{variants}", String(payload.variantsPerType));
  const createWorkspaceClassName = [
    "create-workspace",
    viewportLayout.compact ? "is-compact-viewport" : "",
    viewportLayout.cramped ? "is-cramped-viewport" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const createWorkspaceStyle = viewportLayout.compact
    ? ({ "--create-workspace-height": `${viewportLayout.availableHeight}px` } as CSSProperties)
    : undefined;
  const promptRows = viewportLayout.cramped ? 4 : viewportLayout.compact ? 5 : 6;
  const longRows = viewportLayout.compact ? 3 : 4;
  const mediumRows = viewportLayout.compact ? 2 : 3;
  const jsonRows = viewportLayout.cramped ? 5 : viewportLayout.compact ? 6 : 8;
  const posterJsonRows = viewportLayout.cramped ? 4 : viewportLayout.compact ? 5 : 6;
  const headerRows = viewportLayout.compact ? 3 : 4;

  return (
    <>
      <form className={createWorkspaceClassName} onSubmit={handleSubmit} ref={formRef} style={createWorkspaceStyle}>
        <aside className="create-sidebar">
          <div className="create-sidebar-sticky">
            <section className="panel create-panel">
              <div className="split-header compact">
                <div>
                  <h2>{text.sourceImages}</h2>
                  {payload.creationMode === "prompt" ? <p className="helper">{text.sourceImagesOptionalHint}</p> : null}
                  {!!files.length && <p className="helper">{files.length} file(s) selected</p>}
                </div>
                <div className="create-panel-actions">
                  {files.length ? (
                    <span className="helper">
                      {text.imageCounter.replace("{current}", String(previewIndex + 1)).replace("{total}", String(files.length))}
                    </span>
                  ) : null}
                </div>
              </div>
              <input
                ref={sourceFileInputRef}
                multiple
                accept="image/*"
                onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
                type="file"
              />
              <div className="split-header compact preview-header-row">
                <h3>{text.livePreview}</h3>
                <span className="helper">{text.keyboardHint}</span>
              </div>
              {currentPreviewUrl ? (
                <>
                  <div className="preview-stage">
                    <img
                      alt={files[previewIndex]?.name || text.livePreview}
                      className="preview-stage-image"
                      decoding="async"
                      src={currentPreviewUrl}
                    />
                    {previewUrls.length > 1 ? (
                      <>
                        <button aria-label={text.previousImage} className="preview-arrow preview-arrow-left" onClick={showPreviousPreview} type="button">
                          ‹
                        </button>
                        <button aria-label={text.nextImage} className="preview-arrow preview-arrow-right" onClick={showNextPreview} type="button">
                          ›
                        </button>
                      </>
                    ) : null}
                  </div>
                  {previewUrls.length > 1 ? (
                    <div className="preview-thumb-row" role="tablist" aria-label={text.livePreview}>
                      {previewUrls.map((url, index) => (
                        <button
                          aria-label={files[index]?.name || `${text.livePreview} ${index + 1}`}
                          className={index === previewIndex ? "preview-thumb is-active" : "preview-thumb"}
                          key={`${files[index]?.name || "image"}-${index}`}
                          onClick={() => setPreviewIndex(index)}
                          type="button"
                        >
                          <img alt={files[index]?.name || text.livePreview} decoding="async" loading="lazy" src={url} />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="preview-stage preview-stage-empty">
                  <p className="helper">{text.livePreviewEmpty}</p>
                </div>
              )}
            </section>

            {payload.creationMode === "reference-remix" ? (
              <section className="panel create-panel">
                <div className="split-header compact">
                  <div>
                    <h2>{text.referenceImages}</h2>
                    <p className="helper">{text.referenceHint}</p>
                    <p className="helper">{text.referenceSingleHint}</p>
                    {!!referenceFiles.length && <p className="helper">{referenceFiles[0]?.name}</p>}
                  </div>
                </div>
                <input
                  ref={referenceFileInputRef}
                  accept="image/*"
                  onChange={(event) => setReferenceFiles(Array.from(event.target.files ?? []).slice(0, 1))}
                  type="file"
                />
                {currentReferencePreviewUrl ? (
                  <>
                    <div className="preview-stage">
                      <img
                        alt={referenceFiles[referencePreviewIndex]?.name || text.referenceImages}
                        className="preview-stage-image"
                        decoding="async"
                        src={currentReferencePreviewUrl}
                      />
                    </div>
                  </>
                ) : (
                  <div className="preview-stage preview-stage-empty">
                    <p className="helper">{text.referencePreviewEmpty}</p>
                  </div>
                )}
              </section>
            ) : null}

            {payload.creationMode === "standard" ? (
              <section className="panel create-panel">
                <div className="split-header compact">
                  <div>
                    <h3>{text.templatePreview}</h3>
                    <p className="helper">{text.templatePreviewHint}</p>
                  </div>
                  {isLoadingMatches ? <span className="helper">{text.templateLoading}</span> : null}
                </div>
                <div className="template-match-list compact-template-match-list">
                  {selectedTypes.map((imageType) => {
                    const match = templateMatches.find((item) => item.imageType === imageType);
                    const selectedTemplateId = selectedTemplateOverrides[imageType] ?? "";
                    const displayTemplate = selectedTemplateId
                      ? match?.candidates.find((candidate) => candidate.id === selectedTemplateId) ?? match?.template ?? null
                      : match?.template ?? null;
                    const typeLabel = labelFor(imageType, language, IMAGE_TYPE_OPTIONS);
                    return (
                      <article className="template-match-card" key={imageType}>
                        <div className="template-match-header">
                          <strong>{typeLabel}</strong>
                          {displayTemplate ? (
                            <span className={displayTemplate.isDefault ? "tag default" : "tag custom"}>
                              {displayTemplate.isDefault ? text.templateDefault : text.templateCustom}
                            </span>
                          ) : null}
                        </div>
                        <p>{displayTemplate?.name || text.templateFallback}</p>
                        {displayTemplate ? (
                          <div className="tag-row">
                            <span>{labelFor(displayTemplate.country, language, COUNTRIES)}</span>
                            <span>{labelFor(displayTemplate.language, language, OUTPUT_LANGUAGES)}</span>
                            <span>{labelFor(displayTemplate.platform, language, PLATFORMS)}</span>
                            <span>{labelFor(displayTemplate.category, language, PRODUCT_CATEGORIES)}</span>
                          </div>
                        ) : null}
                        <div className="template-override-controls">
                          <button className="ghost-button mini-button" onClick={() => toggleTemplatePicker(imageType)} type="button">
                            {templatePickerOpen[imageType] ? text.templateManual : text.chooseTemplate}
                          </button>
                          {templatePickerOpen[imageType] ? (
                            <select value={selectedTemplateId} onChange={(event) => applyTemplateOverride(imageType, event.target.value)}>
                              <option value="">{text.templateAuto}</option>
                              {match?.candidates.map((candidate) => (
                                <option key={candidate.id} value={candidate.id}>
                                  {candidate.name} · {labelFor(candidate.platform, language, PLATFORMS)} · {labelFor(candidate.category, language, PRODUCT_CATEGORIES)}
                                </option>
                              ))}
                            </select>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : payload.creationMode === "suite" ? (
              <section className="panel create-panel">
                <div className="split-header compact">
                  <div>
                    <h3>{suiteModeLabel}</h3>
                    <p className="helper">{suiteModeHint}</p>
                  </div>
                </div>
              </section>
            ) : payload.creationMode === "amazon-a-plus" ? (
              <section className="panel create-panel">
                <div className="split-header compact">
                  <div>
                    <h3>{amazonAPlusModeLabel}</h3>
                    <p className="helper">{amazonAPlusModeHint}</p>
                  </div>
                </div>
              </section>
            ) : payload.creationMode === "reference-remix" ? (
              <section className="panel create-panel">
                <div className="split-header compact">
                  <div>
                    <h3>{text.referenceMode}</h3>
                    <p className="helper">{text.remakeSimplifiedHint}</p>
                  </div>
                </div>
              </section>
            ) : (
              <section className="panel create-panel">
                <div className="split-header compact">
                  <div>
                    <h3>{text.promptMode}</h3>
                    <p className="helper">{text.promptModePanelHint}</p>
                  </div>
                </div>
              </section>
            )}
          </div>
        </aside>

        <div className="create-main stack gap-24">
          <section className="panel create-panel create-submit-toolbar">
            <div className="create-submit-toolbar-copy">
              <p className="helper">{requestCountSummary}</p>
              <p className="helper">{requestCountBreakdown}</p>
              {payload.creationMode === "prompt" && effectiveSelectedTypes.length > 1 ? (
                <p className="helper warning-text">{text.multiTypeBillingHint}</p>
              ) : null}
              <p className="helper">{text.hint}</p>
              {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
            </div>
            <div className="button-row create-submit-toolbar-actions">
              <button className="ghost-button" onClick={clearDraft} type="button">
                {text.clearDraft}
              </button>
              <button
                aria-disabled={isPending || isSubmitBlocked}
                className={[
                  "primary-button",
                  isSubmitBlocked ? "is-blocked" : "",
                  submitBlockedFeedback ? "is-shaking" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={isPending}
                onClick={isSubmitBlocked ? () => triggerSubmitBlockedFeedback(submitBlockReason!) : undefined}
                title={isSubmitBlocked ? submitBlockedMessage : undefined}
                type={isSubmitBlocked ? "button" : "submit"}
              >
                {isPending ? text.submitting : text.submit}
              </button>
            </div>
          </section>

          <div className="create-primary-grid">
        <section className="panel create-panel accordion-panel">
          <div className="accordion-header">
            <div className="accordion-title-group">
              <h2>{text.baseInfo}</h2>
              <p className="helper">{baseSummary}</p>
            </div>
            <div className="accordion-actions">
              <button className="ghost-button mini-button" onClick={clearBaseInfo} type="button">
                {text.clearBaseInfo}
              </button>
              <button
                aria-expanded={openSections.base}
                className="accordion-toggle-button"
                onClick={() => toggleSection("base")}
                type="button"
              >
                <span>{openSections.base ? text.collapseSection : text.expandSection}</span>
                <span className={openSections.base ? "accordion-icon is-open" : "accordion-icon"}>⌄</span>
              </button>
            </div>
          </div>
          {openSections.base ? (
            <div className="accordion-body">
              <fieldset>
                <legend>{text.creationMode}</legend>
                <div className="chip-grid small creation-mode-grid">
                  <label className={payload.creationMode === "standard" ? "chip is-active" : "chip"}>
                    <input
                      checked={payload.creationMode === "standard"}
                      name="creation-mode"
                      onChange={() => setPayload((current) => ({ ...current, creationMode: "standard" }))}
                      type="radio"
                    />
                    <span>{text.standardMode}</span>
                  </label>
                  <label className={payload.creationMode === "suite" ? "chip is-active" : "chip"}>
                    <input
                      checked={payload.creationMode === "suite"}
                      name="creation-mode"
                      onChange={() => setPayload((current) => ({ ...current, creationMode: "suite" }))}
                      type="radio"
                    />
                    <span>{suiteModeLabel}</span>
                  </label>
                  <label className={payload.creationMode === "amazon-a-plus" ? "chip is-active" : "chip"}>
                    <input
                      checked={payload.creationMode === "amazon-a-plus"}
                      name="creation-mode"
                      onChange={() => setPayload((current) => ({ ...current, creationMode: "amazon-a-plus", platform: "amazon" }))}
                      type="radio"
                    />
                    <span>{amazonAPlusModeLabel}</span>
                  </label>
                  <label className={payload.creationMode === "prompt" ? "chip is-active" : "chip"}>
                    <input
                      checked={payload.creationMode === "prompt"}
                      name="creation-mode"
                      onChange={() => setPayload((current) => ({ ...current, creationMode: "prompt" }))}
                      type="radio"
                    />
                    <span>{text.promptMode}</span>
                  </label>
                  <label className={payload.creationMode === "reference-remix" ? "chip is-active" : "chip"}>
                    <input
                      checked={payload.creationMode === "reference-remix"}
                      name="creation-mode"
                      onChange={() => setPayload((current) => ({ ...current, creationMode: "reference-remix" }))}
                      type="radio"
                    />
                    <span>{text.referenceMode}</span>
                  </label>
                </div>
                <p className="helper inline-helper">
                  {payload.creationMode === "suite"
                    ? suiteModeHint
                    : payload.creationMode === "amazon-a-plus"
                      ? amazonAPlusModeHint
                      : text.creationModeHint}
                </p>
              </fieldset>
              {payload.creationMode === "prompt" ? (
                <>
                  <label>
                    <span>{text.customPrompt}</span>
                    <textarea
                      ref={customPromptInputRef}
                      required
                      rows={promptRows}
                      value={payload.customPrompt}
                      onChange={(event) => setPayload((current) => ({ ...current, customPrompt: event.target.value }))}
                    />
                    <small className="helper">{text.customPromptHint}</small>
                  </label>
                  <label>
                    <span>{text.customNegativePrompt}</span>
                    <textarea
                      rows={mediumRows}
                      value={payload.customNegativePrompt}
                      onChange={(event) =>
                        setPayload((current) => ({
                          ...current,
                          customNegativePrompt: event.target.value,
                        }))
                      }
                    />
                    <small className="helper">{text.customNegativePromptHint}</small>
                  </label>
                  <label className="checkbox-row helper-toggle-row">
                    <input
                      checked={payload.translatePromptToOutputLanguage}
                      type="checkbox"
                      onChange={(event) =>
                        setPayload((current) => ({
                          ...current,
                          translatePromptToOutputLanguage: event.target.checked,
                        }))
                      }
                    />
                    <span>{text.translatePromptToOutputLanguage}</span>
                  </label>
                  <p className="helper inline-helper">{text.translatePromptToOutputLanguageHint}</p>
                  <label className="checkbox-row helper-toggle-row">
                    <input
                      checked={payload.autoOptimizePrompt}
                      type="checkbox"
                      onChange={(event) =>
                        setPayload((current) => ({
                          ...current,
                          autoOptimizePrompt: event.target.checked,
                        }))
                      }
                    />
                    <span>{text.autoOptimizePrompt}</span>
                  </label>
                  <p className="helper inline-helper">{text.autoOptimizePromptHint}</p>
                  <p className="helper inline-helper">{text.outputLanguageHint}</p>
                </>
              ) : null}
              {payload.creationMode === "suite" ? (
                <>
                  <label>
                    <span>{text.productName}</span>
                    <input
                      ref={productNameInputRef}
                      value={payload.productName}
                      onChange={(event) => setPayload({ ...payload, productName: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>{text.category}</span>
                    <select value={payload.category} onChange={(event) => setPayload({ ...payload, category: event.target.value })}>
                      {PRODUCT_CATEGORIES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label[language]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>{text.brandName}</span>
                    <input
                      list="brand-library-options"
                      value={payload.brandName}
                      onChange={(event) => setPayload({ ...payload, brandName: event.target.value })}
                    />
                    <datalist id="brand-library-options">
                      {brands.map((brand) => (
                        <option key={brand.id} value={brand.name} />
                      ))}
                    </datalist>
                    <small className="helper">{text.brandLibraryHint}</small>
                  </label>
                  <label>
                    <span>{suiteSellingPointsLabel}</span>
                    <textarea
                      ref={suiteSellingPointsInputRef}
                      rows={longRows}
                      value={payload.sellingPoints}
                      onChange={(event) => setPayload({ ...payload, sellingPoints: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>{suiteMaterialLabel}</span>
                    <textarea
                      ref={suiteMaterialInfoInputRef}
                      rows={mediumRows}
                      value={payload.materialInfo}
                      onChange={(event) => setPayload({ ...payload, materialInfo: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>{suiteSizeLabel}</span>
                    <textarea
                      ref={suiteSizeInfoInputRef}
                      rows={mediumRows}
                      value={payload.sizeInfo}
                      onChange={(event) => setPayload({ ...payload, sizeInfo: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>{text.sourceDescription}</span>
                    <textarea rows={mediumRows} value={payload.sourceDescription} onChange={(event) => setPayload({ ...payload, sourceDescription: event.target.value })} />
                    <small className="helper">{suiteModeHint}</small>
                  </label>
                </>
              ) : null}
              {payload.creationMode === "amazon-a-plus" ? (
                <>
                  <label>
                    <span>{amazonAPlusProductLabel}</span>
                    <input
                      ref={productNameInputRef}
                      value={payload.productName}
                      onChange={(event) => setPayload({ ...payload, productName: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>{text.brandName}</span>
                    <input
                      list="brand-library-options"
                      value={payload.brandName}
                      onChange={(event) => setPayload({ ...payload, brandName: event.target.value })}
                    />
                    <datalist id="brand-library-options">
                      {brands.map((brand) => (
                        <option key={brand.id} value={brand.name} />
                      ))}
                    </datalist>
                    <small className="helper">{text.brandLibraryHint}</small>
                  </label>
                  <label>
                    <span>{language === "zh" ? "品类（可选）" : "Category (optional)"}</span>
                    <select value={payload.category} onChange={(event) => setPayload({ ...payload, category: event.target.value })}>
                      {PRODUCT_CATEGORIES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label[language]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>{amazonAPlusSellingPointsLabel}</span>
                    <textarea rows={mediumRows} value={payload.sellingPoints} onChange={(event) => setPayload({ ...payload, sellingPoints: event.target.value })} />
                  </label>
                  <label>
                    <span>{amazonAPlusSourceDescriptionLabel}</span>
                    <textarea rows={mediumRows} value={payload.sourceDescription} onChange={(event) => setPayload({ ...payload, sourceDescription: event.target.value })} />
                    <small className="helper">{amazonAPlusContextHint}</small>
                  </label>
                </>
              ) : null}
              {payload.creationMode === "standard" ? (
                <>
                  <label>
                    <span>{text.productName}</span>
                    <input
                      ref={productNameInputRef}
                      required
                      value={payload.productName}
                      onChange={(event) => setPayload({ ...payload, productName: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>{text.sku}</span>
                    <input value={payload.sku} onChange={(event) => setPayload({ ...payload, sku: event.target.value })} />
                  </label>
                  <label>
                    <span>{text.brandName}</span>
                    <input list="brand-library-options" value={payload.brandName} onChange={(event) => setPayload({ ...payload, brandName: event.target.value })} />
                    <datalist id="brand-library-options">
                      {brands.map((brand) => (
                        <option key={brand.id} value={brand.name} />
                      ))}
                    </datalist>
                    <small className="helper">{text.brandLibraryHint}</small>
                  </label>
                  <label>
                    <span>{text.category}</span>
                    <select value={payload.category} onChange={(event) => setPayload({ ...payload, category: event.target.value })}>
                      {PRODUCT_CATEGORIES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label[language]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>{text.sellingPoints}</span>
                    <textarea rows={longRows} value={payload.sellingPoints} onChange={(event) => setPayload({ ...payload, sellingPoints: event.target.value })} />
                  </label>
                  <label>
                    <span>{text.restrictions}</span>
                    <textarea rows={mediumRows} value={payload.restrictions} onChange={(event) => setPayload({ ...payload, restrictions: event.target.value })} />
                  </label>
                  <label>
                    <span>{text.sourceDescription}</span>
                    <textarea rows={mediumRows} value={payload.sourceDescription} onChange={(event) => setPayload({ ...payload, sourceDescription: event.target.value })} />
                  </label>
                </>
              ) : null}
              {payload.creationMode === "reference-remix" ? (
                <>
                  <fieldset>
                    <legend>{text.referenceCopyMode}</legend>
                    <div className="chip-grid small">
                      <label className={payload.referenceCopyMode === "reference" ? "chip is-active" : "chip"}>
                        <input
                          checked={payload.referenceCopyMode === "reference"}
                          name="reference-copy-mode"
                          onChange={() => setPayload((current) => ({ ...current, referenceCopyMode: "reference" }))}
                          type="radio"
                        />
                        <span>{text.referenceCopyModeReference}</span>
                      </label>
                      <label className={payload.referenceCopyMode === "copy-sheet" ? "chip is-active" : "chip"}>
                        <input
                          checked={payload.referenceCopyMode === "copy-sheet"}
                          name="reference-copy-mode"
                          onChange={() => setPayload((current) => ({ ...current, referenceCopyMode: "copy-sheet" }))}
                          type="radio"
                        />
                        <span>{text.referenceCopyModeCopySheet}</span>
                      </label>
                    </div>
                    <p className="helper inline-helper">{text.referenceCopyModeHint}</p>
                    <p className="helper inline-helper">
                      {payload.referenceCopyMode === "copy-sheet"
                        ? text.referenceCopyModeCopySheetHint
                        : text.referenceCopyModeReferenceHint}
                    </p>
                  </fieldset>
                  {payload.referenceCopyMode === "copy-sheet" ? (
                    <>
                      <div className="split-header compact">
                        <div>
                          <h3>{text.referenceCopySheetFields}</h3>
                          <p className="helper">{text.referenceCopySheetFieldsHint}</p>
                        </div>
                      </div>
                      <label>
                        <span>{text.productName}</span>
                        <input
                          ref={productNameInputRef}
                          value={payload.productName}
                          onChange={(event) => setPayload({ ...payload, productName: event.target.value })}
                        />
                      </label>
                      <label>
                        <span>{text.brandName}</span>
                        <input
                          list="brand-library-options"
                          value={payload.brandName}
                          onChange={(event) => setPayload({ ...payload, brandName: event.target.value })}
                        />
                        <datalist id="brand-library-options">
                          {brands.map((brand) => (
                            <option key={brand.id} value={brand.name} />
                          ))}
                        </datalist>
                      </label>
                      <label>
                        <span>{text.sellingPoints}</span>
                        <textarea rows={longRows} value={payload.sellingPoints} onChange={(event) => setPayload({ ...payload, sellingPoints: event.target.value })} />
                      </label>
                      <label>
                        <span>{text.sourceDescription}</span>
                        <textarea rows={mediumRows} value={payload.sourceDescription} onChange={(event) => setPayload({ ...payload, sourceDescription: event.target.value })} />
                      </label>
                    </>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="panel create-panel accordion-panel">
          <div className="accordion-header">
            <div className="accordion-title-group">
              <h2>{text.market}</h2>
              <p className="helper">{marketSummary}</p>
            </div>
            <button
              aria-expanded={openSections.market}
              className="accordion-toggle-button"
              onClick={() => toggleSection("market")}
              type="button"
            >
              <span>{openSections.market ? text.collapseSection : text.expandSection}</span>
              <span className={openSections.market ? "accordion-icon is-open" : "accordion-icon"}>⌄</span>
            </button>
          </div>
          {openSections.market ? (
            <div className="accordion-body">
              {payload.creationMode !== "reference-remix" ? (
                <>
                  {payload.creationMode !== "prompt" ? (
                    <>
                      <label>
                        <span>{text.country}</span>
                        <select
                          value={payload.country}
                          onChange={(event) => {
                            const country = event.target.value;
                            const nextLanguage = getDefaultLanguageForCountry(country);
                            setPayload({
                              ...payload,
                              country,
                              language:
                                payload.creationMode === "standard" && autoLanguageByCountry
                                  ? nextLanguage ?? payload.language
                                  : payload.language,
                            });
                          }}
                        >
                          {COUNTRIES.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label[language]}
                            </option>
                          ))}
                        </select>
                      </label>
                      {payload.creationMode === "standard" ? (
                        <>
                          <label className="checkbox-row helper-toggle-row">
                            <input
                              checked={autoLanguageByCountry}
                              type="checkbox"
                              onChange={(event) => {
                                const checked = event.target.checked;
                                setAutoLanguageByCountry(checked);
                                if (checked) {
                                  const nextLanguage = getDefaultLanguageForCountry(payload.country);
                                  if (nextLanguage) {
                                    setPayload((current) => ({
                                      ...current,
                                      language: nextLanguage,
                                    }));
                                  }
                                }
                              }}
                            />
                            <span>{text.autoLanguageToggle}</span>
                          </label>
                          <p className="helper inline-helper">{text.autoLanguageHint}</p>
                        </>
                      ) : null}
                      <label>
                        <span>{text.outputLanguage}</span>
                        <select
                          value={payload.language}
                          onChange={(event) =>
                            setPayload((current) => ({
                              ...current,
                              language: event.target.value,
                              country:
                                current.creationMode === "prompt"
                                  ? getDefaultCountryForLanguage(event.target.value) ?? current.country
                                  : current.country,
                            }))
                          }
                        >
                          {OUTPUT_LANGUAGES.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label[language]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <p className="helper inline-helper">{text.outputLanguageHint}</p>
                      {payload.creationMode === "amazon-a-plus" ? (
                        <p className="helper inline-helper">{amazonAPlusLockedPlatformHint}</p>
                      ) : (
                        <label>
                          <span>{text.platform}</span>
                          <select value={payload.platform} onChange={(event) => setPayload({ ...payload, platform: event.target.value })}>
                            {PLATFORMS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label[language]}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </>
                  ) : null}

                  <h2>{text.generation}</h2>
                  <div className="split-header compact generator-header-row">
                    <p className="helper">{generationHint}</p>
                    {payload.creationMode === "standard" ? (
                      <button className="ghost-button mini-button" onClick={applyRecommendedSetup} type="button">
                        {text.applyRecommendation}
                      </button>
                    ) : null}
                  </div>
                  {payload.creationMode === "standard" ? (
                    <fieldset>
                      <legend>{text.imageTypes}</legend>
                      <div className="chip-grid chip-grid-types">
                        {IMAGE_TYPE_OPTIONS.map((option) => (
                          <label className={selectedTypes.includes(option.value) ? "chip is-active" : "chip"} key={option.value}>
                            <input checked={selectedTypes.includes(option.value)} onChange={() => toggleSelection(option.value, selectedTypes, setSelectedTypes)} type="checkbox" />
                            <span>{option.label[language]}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ) : payload.creationMode === "suite" ? (
                    <fieldset>
                      <legend>{text.imageTypes}</legend>
                      <div className="chip-grid chip-grid-types">
                        {SUITE_SELECTED_TYPES.map((imageType) => (
                          <span className="chip is-active" key={imageType}>
                            <span>{labelFor(imageType, language, IMAGE_TYPE_OPTIONS)}</span>
                          </span>
                        ))}
                      </div>
                      <p className="helper inline-helper">{suiteModulesSummary}</p>
                    </fieldset>
                  ) : payload.creationMode === "amazon-a-plus" ? (
                    <fieldset>
                      <legend>{text.imageTypes}</legend>
                      <div className="chip-grid chip-grid-types">
                        {AMAZON_A_PLUS_SELECTED_TYPES.map((imageType) => (
                          <span className="chip is-active" key={imageType}>
                            <span>{labelFor(imageType, language, IMAGE_TYPE_OPTIONS)}</span>
                          </span>
                        ))}
                      </div>
                    </fieldset>
                  ) : null}
                </>
              ) : null}
              <fieldset>
                <legend>{text.ratios}</legend>
                <div className="chip-grid chip-grid-ratios small">
                  {ASPECT_RATIOS.map((option) => (
                    <label className={selectedRatios.includes(option.value) ? "chip is-active" : "chip"} key={option.value}>
                      <input checked={selectedRatios.includes(option.value)} onChange={() => selectSingle(option.value, setSelectedRatios)} type="checkbox" />
                      <span>{option.label[language]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>{text.resolutions}</legend>
                <div className="chip-grid chip-grid-resolutions small">
                  {resolutionOptions.map((option) => (
                    <label className={selectedResolutions.includes(option.value) ? "chip is-active" : "chip"} key={option.value}>
                      <input checked={selectedResolutions.includes(option.value)} onChange={() => selectSingle(option.value, setSelectedResolutions)} type="checkbox" />
                      <span>{option.label[language]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label>
                <span>
                  {payload.creationMode === "reference-remix"
                    ? text.remakeVariants
                    : payload.creationMode === "suite"
                      ? suiteQuantityLabel
                      : payload.creationMode === "amazon-a-plus"
                        ? language === "zh"
                          ? "每个模块生成数量"
                          : "Per-module count"
                        : text.variants}
                </span>
                <input min={1} max={6} type="number" value={payload.variantsPerType} onChange={(event) => setPayload({ ...payload, variantsPerType: Number(event.target.value) || 1 })} />
              </label>
              {payload.creationMode === "prompt" ? (
                <>
                  <label className="checkbox-row helper-toggle-row">
                    <input
                      checked={promptMarketOverridesEnabled}
                      type="checkbox"
                      onChange={(event) => setPromptMarketOverridesEnabled(event.target.checked)}
                    />
                    <span>{text.promptMarketToggle}</span>
                  </label>
                  <p className="helper inline-helper">{text.promptMarketToggleHint}</p>
                  {promptMarketOverridesEnabled ? (
                    <div className="stack gap-16">
                      <label>
                        <span>{text.country}</span>
                        <select
                          value={payload.country}
                          onChange={(event) => {
                            const country = event.target.value;
                            setPayload((current) => ({
                              ...current,
                              country,
                            }));
                          }}
                        >
                          {COUNTRIES.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label[language]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>{text.outputLanguage}</span>
                        <select
                          value={payload.language}
                          onChange={(event) =>
                            setPayload((current) => ({
                              ...current,
                              language: event.target.value,
                              country: getDefaultCountryForLanguage(event.target.value) ?? current.country,
                            }))
                          }
                        >
                          {OUTPUT_LANGUAGES.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label[language]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <p className="helper inline-helper">{text.outputLanguageHint}</p>
                      <label>
                        <span>{text.platform}</span>
                        <select value={payload.platform} onChange={(event) => setPayload({ ...payload, platform: event.target.value })}>
                          {PLATFORMS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label[language]}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}
        </section>
          </div>

        <section className="panel create-panel accordion-panel">
          <div className="accordion-header">
            <div className="accordion-title-group">
              <h2>{text.advanced}</h2>
              <p className="helper">{advancedSummary}</p>
            </div>
            <div className="accordion-actions">
              <button className="ghost-button mini-button" onClick={clearAdvancedInfo} type="button">
                {text.clearAdvancedInfo}
              </button>
              <button
                aria-expanded={openSections.advanced}
                className="accordion-toggle-button"
                onClick={() => toggleSection("advanced")}
                type="button"
              >
                <span>{openSections.advanced ? text.collapseSection : text.expandSection}</span>
                <span className={openSections.advanced ? "accordion-icon is-open" : "accordion-icon"}>⌄</span>
              </button>
            </div>
          </div>
          {openSections.advanced ? (
            <div className="accordion-body">
              <label>
                <span>{text.temporaryApiKey}</span>
                <input type="password" value={payload.temporaryApiKey} onChange={(event) => setPayload({ ...payload, temporaryApiKey: event.target.value })} />
              </label>
              <label>
                <span>{text.temporaryApiBaseUrl}</span>
                <input
                  placeholder="https://your-relay-host.example"
                  value={payload.temporaryApiBaseUrl}
                  onChange={(event) => setPayload({ ...payload, temporaryApiBaseUrl: event.target.value })}
                />
              </label>
              <label>
                <span>{text.temporaryApiVersion}</span>
                <input value={payload.temporaryApiVersion} onChange={(event) => setPayload({ ...payload, temporaryApiVersion: event.target.value })} />
              </label>
              <label>
                <span>{text.temporaryApiHeaders}</span>
                <textarea
                  rows={headerRows}
                  placeholder='{"Authorization":"Bearer your-key"}'
                  value={payload.temporaryApiHeaders}
                  onChange={(event) => setPayload({ ...payload, temporaryApiHeaders: event.target.value })}
                />
              </label>
              <p className="helper">{text.temporaryRelayHint}</p>
            </div>
          ) : null}
        </section>

        </div>
      </form>

      {submittedJobId ? (
        <div className="success-modal-backdrop" role="presentation">
          <section aria-modal="true" className="success-modal" role="dialog" aria-labelledby="create-success-title">
            <p className="eyebrow success-text">{text.submitSuccessTitle}</p>
            <h3 id="create-success-title">{text.submitSuccessTitle}</h3>
            <p className="helper">{text.submitSuccessHint}</p>
            <div className="button-row success-modal-actions">
              <button className="ghost-button" onClick={handleContinueCreate} type="button">
                {text.continueCreate}
              </button>
              <button className="primary-button" onClick={handleViewResults} type="button">
                {text.viewResults}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
