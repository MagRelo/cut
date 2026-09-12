export function formatReferralEarned(amount: number): string {
  if (amount > 0 && amount < 0.01) return "<$0.01";
  return `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
