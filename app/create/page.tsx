import { CreateJobForm } from "@/components/create-job-form";
import { t } from "@/lib/i18n";
import { getUiLanguage } from "@/lib/ui-language";

export default async function CreatePage() {
  const language = await getUiLanguage();
  const highlights =
    language === "zh"
      ? [
          { label: "创作模式", value: "5", description: "标准 / 提示词 / 复刻 / 套图 / A+" },
          { label: "任务结构", value: "Batch", description: "按类型、比例、分辨率和数量组合" },
          { label: "工作方式", value: "Studio", description: "左侧输入，右侧预览，底部提交联动" },
        ]
      : [
          { label: "Creation modes", value: "5", description: "Standard, prompt, remake, set, and Amazon A+" },
          { label: "Batch model", value: "Batch", description: "Expanded by type, ratio, resolution, and count" },
          { label: "Workflow", value: "Studio", description: "Input, preview, and submit bar stay in sync" },
        ];

  return (
    <div className="create-page-shell stack gap-24">
      <section className="panel page-hero create-page-intro">
        <div className="page-hero-copy">
          <p className="eyebrow">{t(language, "navCreate")}</p>
          <h2>{t(language, "createTitle")}</h2>
          <p>{t(language, "createSubtitle")}</p>
        </div>
        <div className="page-hero-meta">
          <div className="page-kpi-grid">
            {highlights.map((item) => (
              <article className="page-kpi" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <CreateJobForm language={language} />
    </div>
  );
}
