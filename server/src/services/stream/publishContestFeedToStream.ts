/** Opaque feed item for Stream (sport packages own the full shape). */
export type ContestFeedStreamItem = {
  id: string;
  text: string;
  storyType: string;
  priority?: number;
  round?: number | null;
  generatedAt?: string;
  subjects: {
    entryIds?: string[];
  };
};

type ContestFeedItem = ContestFeedStreamItem;

import {
  STREAM_CONTEST_FEED_GROUP,
  STREAM_CUTBOT_USER_ID,
} from "./constants.js";
import {
  loadUserDisplayNames,
  resolveMentionedUserIds,
  upsertStreamUsers,
} from "./resolveMentionedUsers.js";
import {
  getStreamFeedsClient,
  isStreamFeedsEnabled,
} from "./streamFeedsClient.js";

export function contestStreamFeedId(contestId: string): string {
  return `${STREAM_CONTEST_FEED_GROUP}:${contestId}`;
}

function filterTagsForItem(item: ContestFeedItem): string[] {
  const tags: string[] = [item.storyType];
  if (item.round != null && Number.isFinite(item.round)) {
    tags.push(`round:${item.round}`);
  }
  return tags;
}

export async function ensureContestStreamFeed(contestId: string): Promise<void> {
  const client = getStreamFeedsClient();
  if (!client) return;

  const feed = client.feeds.feed(STREAM_CONTEST_FEED_GROUP, contestId);
  await feed.getOrCreate({
    user_id: STREAM_CUTBOT_USER_ID,
    data: {
      name: `Contest ${contestId}`,
      visibility: "public",
      custom: { contestId },
    },
  });
}

export async function publishContestFeedItemsToStream(params: {
  contestId: string;
  items: readonly ContestFeedItem[];
}): Promise<{ published: number; failed: number }> {
  if (!isStreamFeedsEnabled() || params.items.length === 0) {
    return { published: 0, failed: 0 };
  }

  const client = getStreamFeedsClient();
  if (!client) return { published: 0, failed: 0 };

  let published = 0;
  let failed = 0;

  try {
    await ensureContestStreamFeed(params.contestId);
  } catch (error) {
    console.error(
      `[stream] Failed to ensure contest feed ${params.contestId}:`,
      error,
    );
  }

  for (const item of params.items) {
    try {
      const mentionedUserIds = await resolveMentionedUserIds({
        contestId: params.contestId,
        entryIds: item.subjects.entryIds,
      });

      if (mentionedUserIds.length > 0) {
        const names = await loadUserDisplayNames(mentionedUserIds);
        await upsertStreamUsers(
          mentionedUserIds.map((id) => {
            const name = names.get(id);
            return name ? { id, name } : { id };
          }),
        );
      }

      const hasMentions = mentionedUserIds.length > 0;
      await client.feeds.addActivity({
        id: item.id,
        type: item.storyType,
        feeds: [contestStreamFeedId(params.contestId)],
        text: item.text,
        user_id: STREAM_CUTBOT_USER_ID,
        filter_tags: filterTagsForItem(item),
        ...(hasMentions
          ? {
              mentioned_user_ids: mentionedUserIds,
              create_notification_activity: true,
              copy_custom_to_notification: true,
            }
          : {
              create_notification_activity: false,
            }),
        skip_push: true,
        create_users: true,
        restrict_replies: "nobody",
        custom: {
          contestId: params.contestId,
          storyType: item.storyType,
          priority: item.priority,
          subjects: item.subjects,
          round: item.round ?? null,
          generatedAt: item.generatedAt,
        },
      });
      published += 1;
    } catch (error) {
      failed += 1;
      console.error(
        `[stream] Failed to publish activity ${item.id} for contest ${params.contestId}:`,
        error,
      );
    }
  }

  return { published, failed };
}
