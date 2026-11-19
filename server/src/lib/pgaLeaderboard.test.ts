import { describe, expect, it } from "vitest";
import { parseLeaderboardPayload } from "./pgaLeaderboard.js";

function payload(queries: unknown[], tournament: Record<string, unknown>) {
  return {
    props: {
      pageProps: {
        tournament,
        dehydratedState: { queries },
      },
    },
  };
}

const scored = (id: string, position: string, total: string) => ({
  player: { id, firstName: "Max", lastName: "Greyserman" },
  scoringData: { position, total },
});

describe("parseLeaderboardPayload", () => {
  it("skips an earlier odds list and reads the unscored-typename leaderboard", () => {
    const result = parseLeaderboardPayload(
      payload(
        [
          {
            queryKey: ["oddsToWin", { tournamentId: "R2026493" }],
            state: { data: { players: [{ playerId: "51977", odds: "+800" }] } },
          },
          {
            queryKey: ["leaderboard", { tournamentId: "R2026493" }],
            state: { data: { players: [scored("51977", "T1", "-3"), { id: "skip-me" }] } },
          },
        ],
        { tournamentId: "R2026493", tournamentName: "The RSM Classic" },
      ),
    );

    expect(result.tournamentId).toBe("R2026493");
    expect(result.tournamentName).toBe("The RSM Classic");
    expect(result.players).toEqual([scored("51977", "T1", "-3")]);
  });

  it("still reads an older page whose first players array is PlayerRowV3", () => {
    const row = { __typename: "PlayerRowV3", ...scored("33141", "T2", "-1") };
    const result = parseLeaderboardPayload(
      payload([{ state: { data: { players: [row] } } }], {
        id: "R2026001",
        tournamentName: "Older Event",
      }),
    );

    expect(result.tournamentId).toBe("R2026001");
    expect(result.players).toHaveLength(1);
    expect(result.players[0]?.player.id).toBe("33141");
  });

  it("throws when no query has scored players", () => {
    expect(() =>
      parseLeaderboardPayload(
        payload(
          [{ state: { data: { players: [{ playerId: "1", odds: "+100" }] } } }],
          { tournamentId: "R2026493", tournamentName: "The RSM Classic" },
        ),
      ),
    ).toThrow(/scored players/);
  });
});
