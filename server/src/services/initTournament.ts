// this service will run periodcally to keep the tournament up to date

import { prisma } from "../lib/prisma.js";
import { getActivePlayers } from "../lib/pgaField.js";
import { fetchPGATourPlayers } from "../lib/pgaPlayers.js";
import { getPlayerProfileOverview } from "../lib/pgaPlayerProfile.js";
import { updateTournament } from "./updateTournament.js";
import { fetchDataGolfRankings, type DataGolfRanking } from "../lib/dataGolfRankings.js";
// import { updateTournamentPlayerScores } from "./updateTournamentPlayers.js";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type TournamentSummarySections = Array<{
  title: string;
  items: Array<{
    label?: string;
    body: string;
  }>;
}>;

async function loadTournamentSummarySections(
  pgaTourId: string,
): Promise<TournamentSummarySections | undefined> {
  const thisDir = path.dirname(fileURLToPath(import.meta.url));
  const summaryFilePath = path.join(thisDir, "..", "tournamentSummaries", `${pgaTourId}.json`);

  try {
    const raw = await readFile(summaryFilePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    // Minimal validation: top-level must be an array of sections
    if (!Array.isArray(parsed)) {
      console.warn(`[initTournament] Invalid summary file format: expected array at ${summaryFilePath}`);
      return undefined;
    }

    return parsed as TournamentSummarySections;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("ENOENT")) {
      console.warn(`[initTournament] Summary file not found for pgaTourId=${pgaTourId} (${summaryFilePath})`);
      return undefined;
    }
    console.warn(`[initTournament] Failed to load summary for pgaTourId=${pgaTourId}: ${message}`);
    return undefined;
  }
}

// Helper function to chunk arrays for processing large datasets
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Maps Scandinavian/Nordic characters to ASCII equivalents for consistent name matching.
 * Some sources use "Åberg", others "Aberg"; this ensures both normalize to the same form.
 */
const SCANDINAVIAN_NORMALIZE: [RegExp, string][] = [
  [/å/g, "a"],
  [/Å/g, "a"],
  [/ä/g, "a"],
  [/Ä/g, "a"],
  [/ö/g, "o"],
  [/Ö/g, "o"],
  [/ø/g, "o"],
  [/Ø/g, "o"],
  [/æ/g, "ae"],
  [/Æ/g, "ae"],
  [/ü/g, "u"],
  [/Ü/g, "u"],
  [/ß/g, "ss"],
];

function normalizeScandinavianChars(str: string): string {
  let result = str;
  for (const [regex, replacement] of SCANDINAVIAN_NORMALIZE) {
    result = result.replace(regex, replacement);
  }
  return result;
}

/**
 * Normalizes a player name for matching by:
 * - Mapping Scandinavian characters to ASCII (å→a, ø→o, æ→ae, etc.)
 * - Converting to lowercase
 * - Trimming whitespace
 * - Removing common suffixes (Jr., Sr., III, etc.)
 * - Removing remaining special characters
 */
function normalizePlayerName(name: string | null | undefined): string {
  if (!name) return "";

  return normalizeScandinavianChars(name)
    .toLowerCase()
    .trim()
    .replace(/\s*,\s*(jr\.?|sr\.?|ii|iii|iv|v)$/i, "") // Remove suffixes
    .replace(/[^\w\s]/g, "") // Remove special characters
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

/**
 * Creates a lookup map from Data Golf rankings keyed by normalized player names.
 * Returns a Map where keys are normalized names and values are DataGolfRanking objects.
 */
function createPlayerNameLookup(rankings: DataGolfRanking[]): Map<string, DataGolfRanking> {
  const lookup = new Map<string, DataGolfRanking>();

  for (const ranking of rankings) {
    const rankingAny = ranking as any;
    
    // Data Golf structure uses 'first' and 'last' properties
    if (rankingAny.first && rankingAny.last) {
      const fullName = `${rankingAny.first} ${rankingAny.last}`;
      const normalizedName = normalizePlayerName(fullName);
      if (normalizedName) {
        lookup.set(normalizedName, ranking);
      }
    }
    // Fallback: try other possible property names
    else {
      const playerName = rankingAny.player || rankingAny.name || rankingAny.player_name;
      if (playerName) {
        const normalizedName = normalizePlayerName(playerName);
        if (normalizedName) {
          lookup.set(normalizedName, ranking);
        }
      }
    }
  }

  return lookup;
}

/**
 * Finds a Data Golf ranking for a player by matching normalized names.
 * Tries multiple name combinations: firstName+lastName, displayName, shortName.
 * Returns the ranking and the match method used for logging.
 */
function findDataGolfRanking(
  player: {
    pga_firstName?: string | null;
    pga_lastName?: string | null;
    pga_displayName?: string | null;
    pga_shortName?: string | null;
  },
  dgLookup: Map<string, DataGolfRanking>,
  playerDisplayName?: string | null
): { ranking: DataGolfRanking | null; matchMethod: string | null } {
  const playerName =
    playerDisplayName ||
    player.pga_displayName ||
    `${player.pga_firstName || ""} ${player.pga_lastName || ""}`.trim() ||
    "Unknown";

  // Try firstName + lastName combination
  if (player.pga_firstName && player.pga_lastName) {
    const fullName = normalizePlayerName(`${player.pga_firstName} ${player.pga_lastName}`);
    const ranking = dgLookup.get(fullName);
    if (ranking) {
      return { ranking, matchMethod: "fullName" };
    }
  }

  // Try displayName
  if (player.pga_displayName) {
    const displayName = normalizePlayerName(player.pga_displayName);
    const ranking = dgLookup.get(displayName);
    if (ranking) {
      return { ranking, matchMethod: "displayName" };
    }
  }

  // Try shortName
  if (player.pga_shortName) {
    const shortName = normalizePlayerName(player.pga_shortName);
    const ranking = dgLookup.get(shortName);
    if (ranking) {
      return { ranking, matchMethod: "shortName" };
    }
  }

  // Try lastName only (as fallback)
  if (player.pga_lastName) {
    const lastName = normalizePlayerName(player.pga_lastName);
    // Only match if it's a unique match (to avoid false positives)
    const matches = Array.from(dgLookup.keys()).filter((key) => key.includes(lastName));
    if (matches.length === 1 && matches[0]) {
      const ranking = dgLookup.get(matches[0]);
      if (ranking) {
        return { ranking, matchMethod: "lastName" };
      }
    }
  }

  // Log failed match attempts
  const attemptedNames = [
    player.pga_firstName && player.pga_lastName
      ? normalizePlayerName(`${player.pga_firstName} ${player.pga_lastName}`)
      : null,
    player.pga_displayName ? normalizePlayerName(player.pga_displayName) : null,
    player.pga_shortName ? normalizePlayerName(player.pga_shortName) : null,
  ].filter(Boolean);

  console.log(
    `  ✗ DG No Match: "${playerName}" (tried: ${attemptedNames.join(", ") || "no names available"})`
  );
  return { ranking: null, matchMethod: null };
}

export async function initTournament(pgaTourId: string) {
  try {
    // get the tournament
    const tournament = await prisma.tournament.findFirst({
      where: { pgaTourId: pgaTourId },
    });

    if (!tournament) {
      console.error("Tournament not found");
      return;
    }

    console.log(`\n=== Initializing Tournament ===`);
    console.log(`Tournament: ${tournament.name}`);

    // Update tournament metadata (and start/end dates) via shared service
    await updateTournament({ tournamentId: tournament.id });

    // Load the per-tournament summary content (optional)
    const summarySections = await loadTournamentSummarySections(pgaTourId);
    
    // Fetch updated tournament to get dates
    const updatedTournament = await prisma.tournament.findUnique({
      where: { id: tournament.id },
      select: { startDate: true, endDate: true, course: true, city: true, state: true },
    });

    if (updatedTournament) {
      const startDate = new Date(updatedTournament.startDate);
      const endDate = new Date(updatedTournament.endDate);
      const dateFormat = new Intl.DateTimeFormat('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      console.log(`Dates: ${dateFormat.format(startDate)} - ${dateFormat.format(endDate)}`);
      if (updatedTournament.course) {
        console.log(`Course: ${updatedTournament.course}${updatedTournament.city ? `, ${updatedTournament.city}` : ''}${updatedTournament.state ? `, ${updatedTournament.state}` : ''}`);
      }
    }

    // Update inField status for players in the field
    const fieldData = await getActivePlayers(pgaTourId);
    const fieldPlayerIds = fieldData.players.map((p) => p.id);
    console.log(`Players in field: ${fieldPlayerIds.length}`);

    // Fetch Data Golf rankings early (single API call for all players)
    let dgRankingsLookup: Map<string, DataGolfRanking> = new Map();
    try {
      const dgRankingsData = await fetchDataGolfRankings();
      
      // Try to extract rankings array from various possible structures
      let rankingsArray: DataGolfRanking[] | null = null;
      
      // Check if data is directly an array
      if (Array.isArray(dgRankingsData?.data)) {
        rankingsArray = dgRankingsData.data;
      }
      // Check if data is an object with rankings inside
      else if (dgRankingsData?.data && typeof dgRankingsData.data === 'object') {
        const dataObj = dgRankingsData.data as any;
        
        // Check for table_data.data structure (actual Data Golf structure)
        if (dataObj.table_data && Array.isArray(dataObj.table_data.data)) {
          rankingsArray = dataObj.table_data.data;
        }
        // Check common property names that might contain the array
        else if (Array.isArray(dataObj.rankings)) {
          rankingsArray = dataObj.rankings;
        } else if (Array.isArray(dataObj.players)) {
          rankingsArray = dataObj.players;
        } else if (Array.isArray(dataObj.data)) {
          rankingsArray = dataObj.data;
        } else {
          // Try to find any array property
          const arrayKeys = Object.keys(dataObj).filter(key => Array.isArray(dataObj[key]));
          const firstArrayKey = arrayKeys[0];
          if (firstArrayKey) {
            rankingsArray = dataObj[firstArrayKey];
          }
        }
      }
      // Fallback to rankings property
      else if (Array.isArray(dgRankingsData?.rankings)) {
        rankingsArray = dgRankingsData.rankings;
      }
      
      if (rankingsArray && Array.isArray(rankingsArray)) {
        dgRankingsLookup = createPlayerNameLookup(rankingsArray);
      } else {
        console.warn(`Warning: Could not extract Data Golf rankings array.`);
      }
    } catch (error) {
      console.warn(
        `- initTournament: Failed to fetch Data Golf rankings (continuing without DG data):`,
        error instanceof Error ? error.message : error
      );
    }

    // First, ensure all players from the field exist in the database
    // Find existing players by pga_pgaTourId
    const existingPlayers = await prisma.player.findMany({
      where: { pga_pgaTourId: { in: fieldPlayerIds } },
      select: { pga_pgaTourId: true },
    });
    const existingPlayerIds = new Set(
      existingPlayers
        .map((p: { pga_pgaTourId: string | null }) => p.pga_pgaTourId)
        .filter((id: string | null): id is string => id !== null)
    );

    // Find missing players (in field but not in database)
    const missingPlayerIds = fieldPlayerIds.filter((id) => !existingPlayerIds.has(id));

    // Create missing Player records using fetchPGATourPlayers() for actual player info when available
    if (missingPlayerIds.length > 0) {
      console.log(`Creating ${missingPlayerIds.length} new player records...`);

      const pgaPlayers = await fetchPGATourPlayers();
      const playerInfoById = new Map(pgaPlayers.map((p) => [p.id, p]));

      for (const pgaTourId of missingPlayerIds) {
        const info = playerInfoById.get(pgaTourId);
        if (info) {
          await prisma.player.create({
            data: {
              pga_pgaTourId: info.id,
              pga_displayName: info.displayName,
              pga_imageUrl: info.headshot,
              isActive: info.isActive,
              pga_firstName: info.firstName,
              pga_lastName: info.lastName,
              pga_shortName: info.shortName,
              pga_country: info.country,
              pga_countryFlag: info.countryFlag,
              pga_age: info.playerBio?.age ?? null,
              inField: true,
            },
          });
        } else {
          await prisma.player.create({
            data: {
              pga_pgaTourId: pgaTourId,
              inField: true,
            },
          });
        }
      }
    }

    // Batch update: set inField to true for players in the field
    await prisma.player.updateMany({
      where: { pga_pgaTourId: { in: fieldPlayerIds } },
      data: { inField: true },
    });

    // Batch update: set inField to false for all others
    await prisma.player.updateMany({
      where: { pga_pgaTourId: { notIn: fieldPlayerIds } },
      data: { inField: false },
    });

    // Get players in the field (include name fields for DG ranking matching)
    const playersInField = await prisma.player.findMany({
      where: { inField: true },
      select: {
        id: true,
        pga_pgaTourId: true,
        pga_firstName: true,
        pga_lastName: true,
        pga_displayName: true,
        pga_shortName: true,
      },
    });

    // Batch update player profiles - process in chunks to avoid overwhelming the API
    const CHUNK_SIZE = 20; // Process 20 players at a time
    const playerChunks = chunk(playersInField, CHUNK_SIZE);

    let totalProfilesUpdated = 0;

    for (const playerChunk of playerChunks) {
      // Get player profiles for this chunk
      const playerProfiles = await Promise.all(
        playerChunk.map(async (player: any) => {
          const profile = await getPlayerProfileOverview(player.pga_pgaTourId || "");
          return { playerId: player.id, profile };
        })
      );

      // Filter players that have profiles and update each individually
      const playersWithProfiles = playerProfiles.filter((p) => p.profile);

      if (playersWithProfiles.length > 0) {
        // Update each player with their own profile data, including DG ranking if available
        await Promise.all(
          playersWithProfiles.map(async (playerProfile) => {
            // Find the player record to get name fields for DG matching
            const player = playerChunk.find((p: any) => p.id === playerProfile.playerId);

            // Try to find matching Data Golf ranking
            let dgRanking: DataGolfRanking | null = null;
            if (player && dgRankingsLookup.size > 0) {
              const matchResult = findDataGolfRanking(
                player,
                dgRankingsLookup,
                player.pga_displayName || undefined
              );
              dgRanking = matchResult.ranking;
            }

            // Build pga_performance object with DG ranking if found
            const pgaPerformance: any = {
              performance: playerProfile.profile?.performance,
              standings: playerProfile.profile?.profileStandings?.find(
                (s) => s.title === "FedExCup Standings"
              ),
            };

            // Add DG ranking data if found
            if (dgRanking) {
              pgaPerformance.dataGolfRanking = {
                dg_rank: dgRanking.dg_rank,
                ...(dgRanking.dg_rank_change !== undefined && { dg_rank_change: dgRanking.dg_rank_change }),
                ...(dgRanking.dg_skill !== undefined && { dg_skill: dgRanking.dg_skill }),
                ...(dgRanking.dgp_rank !== undefined && { dgp_rank: dgRanking.dgp_rank }),
                ...(dgRanking.dgp_rank_change !== undefined && { dgp_rank_change: dgRanking.dgp_rank_change }),
              };
            }

            return prisma.player.update({
              where: { id: playerProfile.playerId },
              data: {
                pga_performance: pgaPerformance,
              },
            });
          })
        );

        totalProfilesUpdated += playersWithProfiles.length;
      }
    }

    console.log(`Updated ${totalProfilesUpdated} player profiles`);

    // Batch create TournamentPlayer records for all players in the field
    const tournamentPlayerData = playersInField.map((player: any) => ({
      tournamentId: tournament.id,
      playerId: player.id,
    }));

    // Use createMany with skipDuplicates to handle existing records
    await prisma.tournamentPlayer.createMany({
      data: tournamentPlayerData,
      skipDuplicates: true, // Skip if tournamentId_playerId combination already exists
    });

    const createdCount = tournamentPlayerData.length;
    console.log(`Created TournamentPlayer records for ${createdCount} players`);

    if (createdCount !== fieldPlayerIds.length) {
      console.warn(
        `Warning: Mismatch between field players (${fieldPlayerIds.length}) and TournamentPlayer records (${createdCount})`
      );
    }

    // Update manualActive to false for all tournaments
    await prisma.tournament.updateMany({
      where: { manualActive: true },
      data: { manualActive: false },
    });

    // Update manualActive to true for the current tournament
    await prisma.tournament.update({
      where: { id: tournament.id },
      data: {
        manualActive: true,
        ...(summarySections ? { summarySections } : {}),
      },
    });

    console.log(`\n✓ Tournament initialization completed: ${tournament.name}\n`);
  } catch (error) {
    console.error("Error in initTournament:", error);
    throw error;
  }
}

// Main execution block
if (import.meta.url === `file://${process.argv[1]}`) {
  const pgaTourId = process.argv[2];
  if (!pgaTourId) {
    console.error("Please provide a PGA Tour ID as an argument");
    process.exit(1);
  }

  initTournament(pgaTourId)
    .then(() => {
      console.log("Tournament initialization completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Tournament initialization failed:", error);
      process.exit(1);
    });
}
