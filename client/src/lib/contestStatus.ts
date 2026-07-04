import type { ContestStatus } from "../types/contest";

export function formatContestStatus(status: ContestStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function contestStatusValueClass(status: ContestStatus): string {
  switch (status) {
    case "OPEN":
      return "text-emerald-600";
    case "ACTIVE":
      return "text-blue-600";
    case "LOCKED":
      return "text-amber-600";
    case "SETTLED":
      return "text-green-700";
    case "CLOSED":
      return "text-gray-600";
    case "CANCELLED":
      return "text-red-600";
    default:
      return "text-gray-900";
  }
}
