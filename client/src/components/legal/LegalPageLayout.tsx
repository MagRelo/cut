import React from "react";
import { LAST_UPDATED, SUPPORT_EMAIL, supportMailto } from "../../lib/legalPlaceholders";

interface LegalPageLayoutProps {
  title: string;
  children: React.ReactNode;
}

export function LegalPageLayout({ title, children }: LegalPageLayoutProps) {
  return (
    <article className="max-w-none text-gray-800">
      <h1 className="mb-2 text-3xl font-bold">{title}</h1>
      <p className="mb-8 text-sm text-gray-600">
        Last updated · {LAST_UPDATED}
      </p>
      {children}
    </article>
  );
}

interface LegalSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function LegalSection({ title, children, className = "" }: LegalSectionProps) {
  return (
    <section className={`mb-8 ${className}`}>
      <h2 className="mb-3 text-xl font-semibold text-gray-900">{title}</h2>
      <div className="space-y-3 text-gray-700 leading-relaxed">{children}</div>
    </section>
  );
}

interface LegalSubsectionProps {
  title: string;
  children: React.ReactNode;
}

export function LegalSubsection({ title, children }: LegalSubsectionProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      {children}
    </div>
  );
}

export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-6">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function LegalSupportLink() {
  return (
    <a href={supportMailto} className="text-blue-600 hover:underline">
      {SUPPORT_EMAIL}
    </a>
  );
}
