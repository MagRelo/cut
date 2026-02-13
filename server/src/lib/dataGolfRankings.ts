import * as cheerio from "cheerio";

export interface DataGolfRanking {
  dg_rank: number;
  dg_rank_change?: number;
  dg_skill?: number;
  dgp_rank?: number;
  dgp_rank_change?: number;
  player?: string;
  [key: string]: any; // Allow for additional fields
}

export interface DataGolfRankingsData {
  current_date?: string;
  data?: DataGolfRanking[]; // Rankings are in the 'data' property
  rankings?: DataGolfRanking[]; // Fallback for different structures
  dates?: any;
  last_update?: string;
  tours?: any;
  [key: string]: any; // Allow for additional fields from the JSON
}

interface CacheItem {
  data: DataGolfRankingsData;
  timestamp: number;
}

let cache: CacheItem | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches and parses the Data Golf rankings from datagolf.com/datagolf-rankings.
 * Extracts JSON data from the pull_data() function in a script tag.
 */
export async function fetchDataGolfRankings(): Promise<DataGolfRankingsData> {
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_DURATION) {
    return cache.data;
  }

  const response = await fetch("https://datagolf.com/datagolf-rankings", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
  });

  if (!response.ok) {
    switch (response.status) {
      case 429:
        throw new Error("Rate limit exceeded. Please try again later.");
      case 403:
        throw new Error("Access forbidden. Please check your request headers.");
      case 404:
        throw new Error("Rankings data not found.");
      case 500:
      case 502:
      case 503:
      case 504:
        throw new Error("Data Golf service is currently unavailable. Please try again later.");
      default:
        throw new Error(`Failed to fetch rankings data: ${response.statusText}`);
    }
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Find script tags that contain pull_data function
  let rankingsData: DataGolfRankingsData | null = null;

  $("script").each((_, element): void | false => {
    const scriptContent = $(element).html() || "";
    
    // Look for pull_data function with JSON.parse containing "current_"
    if (scriptContent.includes("pull_data") && scriptContent.includes("JSON.parse")) {
      // Try multiple patterns to extract the JSON
      
      // Pattern 1: JSON.parse('...') or JSON.parse("...")
      const jsonMatch1 = scriptContent.match(/JSON\.parse\(['"](.*?)['"]\)/s);
      if (jsonMatch1 && jsonMatch1[1]) {
        try {
          let jsonString = jsonMatch1[1];
          
          // Handle escaped characters
          jsonString = jsonString.replace(/\\"/g, '"');
          jsonString = jsonString.replace(/\\n/g, '\n');
          jsonString = jsonString.replace(/\\r/g, '\r');
          jsonString = jsonString.replace(/\\t/g, '\t');
          jsonString = jsonString.replace(/\\\\/g, '\\');
          
          const parsed = JSON.parse(jsonString);
          
          if (parsed && typeof parsed === 'object' && (parsed.current_ || parsed.rankings || Object.keys(parsed).length > 0)) {
            rankingsData = parsed as DataGolfRankingsData;
            return false; // Break out of the loop
          }
        } catch (error) {
          // Continue to next pattern
        }
      }
      
      // Pattern 2: JSON.parse(`...`) (template literal)
      const jsonMatch2 = scriptContent.match(/JSON\.parse\(`(.*?)`\)/s);
      if (jsonMatch2 && jsonMatch2[1] && !rankingsData) {
        try {
          const parsed = JSON.parse(jsonMatch2[1]);
          if (parsed && typeof parsed === 'object' && (parsed.current_ || parsed.rankings || Object.keys(parsed).length > 0)) {
            rankingsData = parsed as DataGolfRankingsData;
            return false;
          }
        } catch (error) {
          // Continue to next pattern
        }
      }
      
      // Pattern 3: Look for JSON object directly starting with {"current_
      const directJsonMatch = scriptContent.match(/\{"current_[^}]*\}/s);
      if (directJsonMatch && !rankingsData) {
        try {
          // Try to extract a complete JSON object
          const startIdx = scriptContent.indexOf('{"current_');
          if (startIdx !== -1) {
            // Find the matching closing brace
            let braceCount = 0;
            let endIdx = startIdx;
            for (let i = startIdx; i < scriptContent.length; i++) {
              if (scriptContent[i] === '{') braceCount++;
              if (scriptContent[i] === '}') {
                braceCount--;
                if (braceCount === 0) {
                  endIdx = i + 1;
                  break;
                }
              }
            }
            
            if (endIdx > startIdx) {
              const jsonStr = scriptContent.substring(startIdx, endIdx);
              const parsed = JSON.parse(jsonStr);
              if (parsed && typeof parsed === 'object') {
                rankingsData = parsed as DataGolfRankingsData;
                return false;
              }
            }
          }
        } catch (error) {
          // Continue searching
        }
      }
    }
  });

  if (!rankingsData) {
    throw new Error("Could not find rankings data in script tags. The page structure may have changed.");
  }


  // Update cache
  cache = { data: rankingsData, timestamp: now };
  
  return rankingsData;
}
