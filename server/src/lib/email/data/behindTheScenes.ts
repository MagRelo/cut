import { formatInTimeZone } from "date-fns-tz";
import {
  DEFAULT_BTS_PARAGRAPHS,
  type BehindTheScenesEmailData,
} from "../emails/behindTheScenes.js";

const ET = "America/New_York";

/** Campaign id for idempotency: YYYY-MM in America/New_York */
export function currentBtsCampaignId(date = new Date()): string {
  return formatInTimeZone(date, ET, "yyyy-MM");
}

export function loadBehindTheScenesEmailData(campaignId?: string): BehindTheScenesEmailData {
  const id = campaignId?.trim() || currentBtsCampaignId();
  const rawHtml = process.env.BTS_EMAIL_BODY_HTML?.trim();

  if (rawHtml) {
    return {
      campaignLabel: id,
      bodyParagraphs: [rawHtml],
      useRawHtml: true,
    };
  }

  return {
    campaignLabel: id,
    bodyParagraphs: DEFAULT_BTS_PARAGRAPHS,
  };
}
