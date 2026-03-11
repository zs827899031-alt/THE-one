import { CreateJobForm } from "@/components/create-job-form";
import { t } from "@/lib/i18n";
import { getUiLanguage } from "@/lib/ui-language";

export default async function CreatePage() {
  const language = await getUiLanguage();
  return (
    <div className="create-page-shell stack gap-24">
      <section className="panel page-intro create-page-intro">
        <p className="eyebrow">{t(language, "navCreate")}</p>
        <h2>{t(language, "createTitle")}</h2>
        <p>{t(language, "createSubtitle")}</p>
      </section>
      <CreateJobForm language={language} />
    </div>
  );
}
