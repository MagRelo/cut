import { describe, expect, it } from "vitest";
import { attachPlayerIds, dgIdToPgaTourId } from "./eventOdds.js";
import type { EventOddsPlayer } from "./pga-golf/datagolf/eventOdds.js";

const player: EventOddsPlayer = {
  dgId: 26649,
  playerName: "Thorbjornsen, Michael",
  displayName: "Michael Thorbjornsen",
  country: "USA",
  win: 6.74,
  top5: 2.3,
  top10: 1.6,
};

describe("attachPlayerIds", () => {
  it("joins dg id to the PGA id and the field rows", () => {
    const map = dgIdToPgaTourId([
      { dg_id: 26649, player_num: 52955, player_name: "Thorbjornsen, Michael" },
    ]);
    const [row] = attachPlayerIds(
      [player, { ...player, dgId: 1, playerName: "Missing, Player", displayName: "Player Missing" }],
      [
        {
          eventParticipantId: "ep-1",
          participantId: "p-1",
          externalId: "52955",
        },
      ],
      map,
    );
    expect(row).toMatchObject({
      dgId: 26649,
      pgaTourId: "52955",
      eventParticipantId: "ep-1",
      participantId: "p-1",
    });
    expect(attachPlayerIds([{ ...player, dgId: 9 }], [], map)[0]).toMatchObject({
      pgaTourId: null,
      eventParticipantId: null,
      participantId: null,
    });
  });
});
