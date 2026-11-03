import { cn } from "../../lib/tabStyles";

interface ErrorMessageProps {
  message: string;
  className?: string;
}

export const ErrorMessage = ({ message, className }: ErrorMessageProps) => {
  if (!message) return null;

  return (
    <p
      role="alert"
      className={cn("whitespace-pre-line font-display text-sm font-medium text-red-600", className)}
    >
      {message}
    </p>
  );
};
