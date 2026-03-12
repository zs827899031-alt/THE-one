import Link from "next/link";

import { JobTable } from "@/components/job-table";
import { COUNTRIES, OUTPUT_LANGUAGES, PLATFORMS, RESOLUTIONS } from "@/lib/constants";
import { listJobs, summarizeJobs } from "@/lib/db";
import { t } from "@/lib/i18n";
import { getUiLanguage } from "@/lib/ui-language";

const HISTORY_PAGE_SIZE = 24;

function readStringParam(params: Record<string, string | string[] | undefined>, key: string) {
  return typeof params[key] === "string" ? params[key] : undefined;
}

function parsePage(value: string | undefined) {
  if (!value) {
    return 1;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function buildHistoryHref(params: Record<string, string | string[] | undefined>, page: number) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value.length) {
      search.set(key, value);
    }
  }

  if (page > 1) {
    search.set("page", String(page));
  } else {
    search.delete("page");
  }

  const query = search.toString();
  return query ? `/history?${query}` : "/history";
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const language = await getUiLanguage();
  const filters = {
    search: readStringParam(params, "search"),
    status: readStringParam(params, "status"),
    platform: readStringParam(params, "platform"),
    country: readStringParam(params, "country"),
    language: readStringParam(params, "marketLanguage"),
    resolution: readStringParam(params, "resolution"),
    dateFrom: readStringParam(params, "dateFrom"),
    dateTo: readStringParam(params, "dateTo"),
  };

  const summary = summarizeJobs(filters);
  const totalPages = Math.max(1, Math.ceil(summary.totalJobs / HISTORY_PAGE_SIZE));
  const currentPage = Math.min(parsePage(readStringParam(params, "page")), totalPages);
  const jobs = listJobs(filters, {
    limit: HISTORY_PAGE_SIZE,
    offset: (currentPage - 1) * HISTORY_PAGE_SIZE,
  });
  const rangeStart = summary.totalJobs ? (currentPage - 1) * HISTORY_PAGE_SIZE + 1 : 0;
  const rangeEnd = summary.totalJobs ? Math.min((currentPage - 1) * HISTORY_PAGE_SIZE + jobs.length, summary.totalJobs) : 0;
  const paginationWindowStart = Math.max(1, currentPage - 1);
  const paginationWindowEnd = Math.min(totalPages, currentPage + 1);
  const pageNumbers = Array.from(
    { length: paginationWindowEnd - paginationWindowStart + 1 },
    (_, index) => paginationWindowStart + index,
  );
  const previousHref = buildHistoryHref(params, Math.max(1, currentPage - 1));
  const nextHref = buildHistoryHref(params, Math.min(totalPages, currentPage + 1));

  const heroStats =
    language === "zh"
      ? [
          { label: "任务总数", value: summary.totalJobs.toString(), description: "当前筛选条件下的历史任务与审核记录" },
          { label: "生成张数", value: summary.totalGenerated.toString(), description: "当前筛选范围内的总生成量" },
          { label: "成功张数", value: summary.totalSucceeded.toString(), description: "用于快速判断产出稳定性" },
          { label: "失败张数", value: summary.totalFailed.toString(), description: "用于回看问题任务与异常批次" },
        ]
      : [
          { label: "Total jobs", value: summary.totalJobs.toString(), description: "Saved batches and review records" },
          { label: "Generated", value: summary.totalGenerated.toString(), description: "Total outputs in the current filter" },
          { label: "Succeeded", value: summary.totalSucceeded.toString(), description: "A quick signal for production stability" },
          { label: "Failed", value: summary.totalFailed.toString(), description: "Useful for tracing problem batches" },
        ];

  return (
    <div className="stack gap-24 history-page">
      <section className="panel page-hero">
        <div className="page-hero-copy">
          <p className="eyebrow">{t(language, "navHistory")}</p>
          <h2>{t(language, "historyTitle")}</h2>
          <p>
            {language === "zh"
              ? "把历史任务当作可运营的资产库来管理：先筛，再看，再复用。"
              : "Treat history as an operational asset library: filter, review, and reuse from one place."}
          </p>
        </div>
        <div className="page-hero-meta">
          <div className="page-kpi-grid">
            {heroStats.map((item) => (
              <article className="page-kpi" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="panel panel-stack">
        <div>
          <p className="eyebrow">{language === "zh" ? "筛选控制台" : "Filter console"}</p>
          <h3>{language === "zh" ? "按市场、分辨率与时间切片回看任务" : "Slice job history by market, size, and time"}</h3>
        </div>
        <form className="filter-grid" method="get">
          <input
            defaultValue={typeof params.search === "string" ? params.search : ""}
            name="search"
            placeholder={language === "zh" ? "搜索图片名 / SKU" : "Search image / SKU"}
          />
          <select defaultValue={typeof params.platform === "string" ? params.platform : ""} name="platform">
            <option value="">{language === "zh" ? "全部平台" : "All platforms"}</option>
            {PLATFORMS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label[language]}
              </option>
            ))}
          </select>
          <select defaultValue={typeof params.country === "string" ? params.country : ""} name="country">
            <option value="">{language === "zh" ? "全部国家" : "All countries"}</option>
            {COUNTRIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label[language]}
              </option>
            ))}
          </select>
          <select defaultValue={typeof params.marketLanguage === "string" ? params.marketLanguage : ""} name="marketLanguage">
            <option value="">{language === "zh" ? "全部语言" : "All languages"}</option>
            {OUTPUT_LANGUAGES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label[language]}
              </option>
            ))}
          </select>
          <select defaultValue={typeof params.resolution === "string" ? params.resolution : ""} name="resolution">
            <option value="">{language === "zh" ? "全部分辨率" : "All resolutions"}</option>
            {RESOLUTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label[language]}
              </option>
            ))}
          </select>
          <input defaultValue={typeof params.dateFrom === "string" ? params.dateFrom : ""} name="dateFrom" type="date" />
          <input defaultValue={typeof params.dateTo === "string" ? params.dateTo : ""} name="dateTo" type="date" />
          <button className="primary-button" type="submit">
            {t(language, "filters")}
          </button>
        </form>
      </section>

      <section className="panel history-table-panel">
        <div className="split-header compact history-table-header">
          <div>
            <h3>{language === "zh" ? "任务明细" : "Job breakdown"}</h3>
            <p className="helper history-table-helper">
              {language === "zh"
                ? "先从顶部看整体产出，再在下方表格里按模式、语言、状态和创建时间回看每一批结果。"
                : "Read the top-level production snapshot first, then scan the table by mode, language, status, and created time."}
            </p>
          </div>
          {summary.totalJobs ? (
            <div className="history-pagination-top">
              {totalPages > 1 ? (
                <Link
                  aria-disabled={currentPage <= 1}
                  className={currentPage <= 1 ? "ghost-button mini-button is-disabled" : "ghost-button mini-button"}
                  href={previousHref}
                  tabIndex={currentPage <= 1 ? -1 : undefined}
                >
                  {language === "zh" ? "上一页" : "Previous"}
                </Link>
              ) : null}
              <p className="helper history-pagination-summary">
                {language === "zh"
                  ? `当前显示 ${rangeStart}-${rangeEnd} / ${summary.totalJobs}`
                  : `Showing ${rangeStart}-${rangeEnd} of ${summary.totalJobs}`}
              </p>
              {totalPages > 1 ? (
                <Link
                  aria-disabled={currentPage >= totalPages}
                  className={currentPage >= totalPages ? "ghost-button mini-button is-disabled" : "ghost-button mini-button"}
                  href={nextHref}
                  tabIndex={currentPage >= totalPages ? -1 : undefined}
                >
                  {language === "zh" ? "下一页" : "Next"}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
        {jobs.length ? (
          <>
            <JobTable jobs={jobs} language={language} />
            {totalPages > 1 ? (
              <nav aria-label={language === "zh" ? "历史分页" : "History pagination"} className="history-pagination">
                <Link
                  aria-disabled={currentPage <= 1}
                  className={currentPage <= 1 ? "ghost-button is-disabled" : "ghost-button"}
                  href={previousHref}
                  tabIndex={currentPage <= 1 ? -1 : undefined}
                >
                  {language === "zh" ? "上一页" : "Previous"}
                </Link>
                <div className="history-pagination-pages">
                  {paginationWindowStart > 1 ? (
                    <Link className="ghost-button mini-button" href={buildHistoryHref(params, 1)}>
                      1
                    </Link>
                  ) : null}
                  {paginationWindowStart > 2 ? <span className="history-pagination-ellipsis">…</span> : null}
                  {pageNumbers.map((pageNumber) => (
                    <Link
                      className={pageNumber === currentPage ? "ghost-button mini-button is-active" : "ghost-button mini-button"}
                      href={buildHistoryHref(params, pageNumber)}
                      key={pageNumber}
                    >
                      {pageNumber}
                    </Link>
                  ))}
                  {paginationWindowEnd < totalPages - 1 ? <span className="history-pagination-ellipsis">…</span> : null}
                  {paginationWindowEnd < totalPages ? (
                    <Link className="ghost-button mini-button" href={buildHistoryHref(params, totalPages)}>
                      {totalPages}
                    </Link>
                  ) : null}
                </div>
                <Link
                  aria-disabled={currentPage >= totalPages}
                  className={currentPage >= totalPages ? "ghost-button is-disabled" : "ghost-button"}
                  href={nextHref}
                  tabIndex={currentPage >= totalPages ? -1 : undefined}
                >
                  {language === "zh" ? "下一页" : "Next"}
                </Link>
              </nav>
            ) : null}
          </>
        ) : (
          <p>{t(language, "emptyJobs")}</p>
        )}
      </section>
    </div>
  );
}
