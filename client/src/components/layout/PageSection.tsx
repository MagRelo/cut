import React from "react";

interface PageSectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

/** Section divider inside a PagePanel. */
export const PageSection: React.FC<PageSectionProps> = ({ children, className = "", id }) => {
  return (
    <section
      id={id}
      className={[
        "border-b border-gray-100 pb-4 last:border-b-0 last:pb-0 [&:not(:first-child)]:pt-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </section>
  );
};
