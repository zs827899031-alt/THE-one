"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_NAME } from "@/lib/constants";
import { t } from "@/lib/i18n";
import type { UiLanguage } from "@/lib/types";

import { LanguageToggle } from "@/components/language-toggle";

export function Navigation({ language }: { language: UiLanguage }) {
  const pathname = usePathname();
  const links = [
    { href: "/", label: t(language, "navOverview") },
    { href: "/create", label: t(language, "navCreate") },
    { href: "/history", label: t(language, "navHistory") },
    { href: "/templates", label: t(language, "navTemplates") },
    { href: "/settings", label: t(language, "navSettings") },
  ];
  const subtitle =
    language === "zh"
      ? "面向电商创意生产、审核与协同交付的本地化工作台"
      : "A local workspace for ecommerce creative production, review, and delivery.";

  return (
    <header className="app-header">
      <div className="app-header-brand">
        <div className="app-brand-row">
          <p className="eyebrow">{APP_NAME}</p>
          <span className="app-brand-status">{language === "zh" ? "Product UI" : "Product UI"}</span>
        </div>
        <h1>{APP_NAME}</h1>
        <p className="app-brand-subtitle">{subtitle}</p>
      </div>
      <nav className="app-nav">
        {links.map((link) => (
          <Link key={link.href} className={pathname === link.href ? "is-active" : undefined} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="app-header-actions">
        <LanguageToggle language={language} />
      </div>
    </header>
  );
}
