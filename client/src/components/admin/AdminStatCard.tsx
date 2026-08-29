import React from "react";

export interface AdminStatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  variant?: "default" | "warning" | "success" | "info";
}

const variantClasses = {
  default: "border-gray-100 bg-gray-50",
  warning: "border-amber-200 bg-amber-50",
  success: "border-emerald-200 bg-emerald-50",
  info: "border-blue-200 bg-gradient-to-tl from-blue-100 via-blue-50 to-white",
};

const labelClasses = {
  default: "text-gray-500",
  warning: "text-amber-800",
  success: "text-emerald-800",
  info: "text-blue-700",
};

export const AdminStatCard: React.FC<AdminStatCardProps> = ({
  label,
  value,
  hint,
  variant = "default",
}) => (
  <div className={`rounded-sm border px-3 py-2 ${variantClasses[variant]}`}>
    <p className={`text-xs uppercase tracking-wide ${labelClasses[variant]}`}>{label}</p>
    <p className="font-semibold text-gray-900 text-lg tabular-nums">{value}</p>
    {hint ? <p className="text-xs text-gray-500 mt-0.5">{hint}</p> : null}
  </div>
);
