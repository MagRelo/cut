import React from "react";

export type PageSectionVariant = "default" | "card";

interface PageSectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  variant?: PageSectionVariant;
}

const variantClassNames: Record<PageSectionVariant, string> = {
  default: "border-b border-gray-200 pb-4 last:border-b-0 last:pb-0 [&:not(:first-child)]:pt-4",
  card: "rounded-lg border border-gray-200 bg-white p-4 shadow-sm",
};

/** Section divider inside a PagePanel. */
export const PageSection: React.FC<PageSectionProps> = ({
  children,
  className = "",
  id,
  variant = "default",
}) => {
  return (
    <section id={id} className={[variantClassNames[variant], className].filter(Boolean).join(" ")}>
      {children}
    </section>
  );
};
