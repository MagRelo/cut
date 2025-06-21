/**
 * Formatting utilities for international support
 */

/**
 * Formats a number as an ordinal (1st, 2nd, 3rd, etc.) with international support
 * @param num - The number to format
 * @param _locale - The locale to use (defaults to 'en-US') - currently unused
 * @returns The formatted ordinal string
 */
export function formatOrdinal(num: number | null | undefined): string {
  // , _locale: string = "en-US"
  // Handle null, undefined, or non-positive numbers
  if (num === null || num === undefined || num <= 0) {
    return "-";
  }

  try {
    // For now, use English ordinal formatting
    // In the future, we could add locale-specific ordinal suffixes using Intl.PluralRules
    return formatEnglishOrdinal(num);
  } catch {
    // Fallback to English ordinal formatting
    return formatEnglishOrdinal(num);
  }
}

/**
 * English-specific ordinal formatting as fallback
 * @param num - The number to format
 * @returns The formatted ordinal string
 */
function formatEnglishOrdinal(num: number): string {
  const j = num % 10;
  const k = num % 100;

  if (j === 1 && k !== 11) {
    return `${num}st`;
  }
  if (j === 2 && k !== 12) {
    return `${num}nd`;
  }
  if (j === 3 && k !== 13) {
    return `${num}rd`;
  }
  return `${num}th`;
}

/**
 * Formats a number with proper international number formatting
 * @param num - The number to format
 * @param locale - The locale to use (defaults to 'en-US')
 * @param options - NumberFormat options
 * @returns The formatted number string
 */
export function formatNumber(
  num: number,
  locale: string = "en-US",
  options?: Intl.NumberFormatOptions
): string {
  try {
    return new Intl.NumberFormat(locale, options).format(num);
  } catch {
    // Fallback to basic number formatting
    return num.toString();
  }
}

/**
 * Formats a percentage with international support
 * @param value - The decimal value (0-1)
 * @param locale - The locale to use (defaults to 'en-US')
 * @param maximumFractionDigits - Maximum fraction digits (defaults to 1)
 * @returns The formatted percentage string
 */
export function formatPercentage(
  value: number,
  locale: string = "en-US",
  maximumFractionDigits: number = 1
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "percent",
      maximumFractionDigits,
    }).format(value);
  } catch {
    // Fallback to basic percentage formatting
    return `${(value * 100).toFixed(maximumFractionDigits)}%`;
  }
}

/**
 * Formats currency with international support
 * @param amount - The amount to format
 * @param currency - The currency code (defaults to 'USD')
 * @param locale - The locale to use (defaults to 'en-US')
 * @returns The formatted currency string
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD",
  locale: string = "en-US"
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    // Fallback to basic currency formatting
    return `${currency} ${amount.toFixed(2)}`;
  }
}
