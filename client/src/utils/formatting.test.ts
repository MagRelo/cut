import { formatOrdinal, formatNumber, formatPercentage, formatCurrency } from "./formatting";

// Simple test function to verify formatting utilities work correctly
export function testFormattingUtilities() {
  console.log("Testing formatting utilities...");

  // Test ordinal formatting
  console.log("Ordinal formatting:");
  console.log("1 ->", formatOrdinal(1)); // Should be "1st"
  console.log("2 ->", formatOrdinal(2)); // Should be "2nd"
  console.log("3 ->", formatOrdinal(3)); // Should be "3rd"
  console.log("4 ->", formatOrdinal(4)); // Should be "4th"
  console.log("11 ->", formatOrdinal(11)); // Should be "11th"
  console.log("12 ->", formatOrdinal(12)); // Should be "12th"
  console.log("13 ->", formatOrdinal(13)); // Should be "13th"
  console.log("21 ->", formatOrdinal(21)); // Should be "21st"
  console.log("22 ->", formatOrdinal(22)); // Should be "22nd"
  console.log("23 ->", formatOrdinal(23)); // Should be "23rd"
  console.log("null ->", formatOrdinal(null)); // Should be "-"
  console.log("undefined ->", formatOrdinal(undefined)); // Should be "-"
  console.log("0 ->", formatOrdinal(0)); // Should be "-"

  // Test number formatting
  console.log("\nNumber formatting:");
  console.log("1234.56 ->", formatNumber(1234.56)); // Should be "1,234.56"
  console.log("1000000 ->", formatNumber(1000000)); // Should be "1,000,000"

  // Test percentage formatting
  console.log("\nPercentage formatting:");
  console.log("0.123 ->", formatPercentage(0.123)); // Should be "12.3%"
  console.log("0.5 ->", formatPercentage(0.5)); // Should be "50%"

  // Test currency formatting
  console.log("\nCurrency formatting:");
  console.log("1234.56 ->", formatCurrency(1234.56)); // Should be "$1,234.56"
  console.log("1000000 ->", formatCurrency(1000000)); // Should be "$1,000,000.00"

  console.log("\nFormatting utilities test completed!");
}
