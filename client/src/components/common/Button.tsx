import { type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { cn } from "../../lib/tabStyles";

type ButtonVariant = "primary" | "neutral";
type ButtonSize = "md" | "compact";

type ButtonStyleProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  pressed?: boolean;
  className?: string;
  children?: ReactNode;
};

type ButtonAsButton = ButtonStyleProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    to?: undefined;
    href?: undefined;
  };

type ButtonAsLink = ButtonStyleProps &
  Omit<LinkProps, "className" | "children" | "to"> & {
    to: LinkProps["to"];
    href?: undefined;
  };

type ButtonAsAnchor = ButtonStyleProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children" | "href"> & {
    href: string;
    to?: undefined;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink | ButtonAsAnchor;

function buttonClassName({
  variant = "primary",
  size = "md",
  block = false,
  pressed = false,
  className,
}: Pick<ButtonStyleProps, "variant" | "size" | "block" | "pressed" | "className"> = {}) {
  const color = pressed
    ? "bg-blue-600"
    : variant === "neutral"
      ? "bg-slate-500 hover:bg-slate-600"
      : "bg-blue-500 hover:bg-blue-600";

  return cn(
    "inline-flex shrink-0 items-center justify-center gap-1 font-display text-white transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-50",
    size === "compact"
      ? "h-7 rounded px-2 text-xs font-medium"
      : "h-10 rounded px-4 text-sm font-semibold",
    block && "w-full",
    color,
    className,
  );
}

export function Button({
  variant,
  size,
  block,
  pressed,
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = buttonClassName({ variant, size, block, pressed, className });

  if ("href" in rest && rest.href != null) {
    const { href, ...anchorRest } = rest;
    return (
      <a href={href} className={classes} {...anchorRest}>
        {children}
      </a>
    );
  }

  if ("to" in rest && rest.to != null) {
    const { to, ...linkRest } = rest;
    return (
      <Link to={to} className={classes} {...linkRest}>
        {children}
      </Link>
    );
  }

  const buttonRest = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button {...buttonRest} type={buttonRest.type ?? "button"} className={classes}>
      {children}
    </button>
  );
}
