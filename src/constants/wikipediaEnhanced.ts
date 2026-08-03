import { withTimeout } from "../utils/performanceOptimizer";
import { wikipediaCache } from "../utils/cacheManager";
export interface WikipediaProfile {
  title: string;
  extract: string;
  pageUrl?: string;
  infobox?: {
    [key: string]: string;
  };
  claims?: WikidataClaim[];
  birthYear?: number;
  birthDate?: {
    day: number;
    month: number;
    year: number;
  };
  nationality?: string;
  profession?: string;
}
export interface WikidataClaim {
  property: string;
  value: string;
  confidence: number;
}
export interface EntityMatch {
  entity: string;
  type: "person" | "organization" | "location" | "event";
  confidence: number;
  wikidataId?: string;
}
export async function getWikipediaProfile(personName: string): Promise<WikipediaProfile | null> {
  const cacheKey = `wiki_profile_${personName.toLowerCase()}`;
  const cached = wikipediaCache.get<WikipediaProfile>(cacheKey);
  if (cached) {
    return cached;
  }
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(personName)}&format=json&utf8=true`;
    const searchResponse = await withTimeout(fetch(searchUrl), 3000);
    if (!searchResponse)
    return null;
    const searchData = await searchResponse.json();
    const results = searchData.query?.search || [];
    if (results.length === 0)
    return null;
    const pageTitle = results[0].title;
    const pageUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=extracts|info&format=json&utf8=true`;
    const pageResponse = await withTimeout(fetch(pageUrl), 3000);
    if (!pageResponse)
    return null;
    const pageData = await pageResponse.json();
    const page = Object.values(pageData.query?.pages || {})[0] as any;
    if (!page)
    return null;
    const profile: WikipediaProfile = {
      title: page.title,
      extract: (page.extract || "").substring(0, 500),
      pageUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`
    };
    const wikidataClaims = await getWikidataClaimsForEntity(pageTitle);
    if (wikidataClaims.length > 0) {
      profile.claims = wikidataClaims;
      const birthYearClaim = wikidataClaims.find((c) => c.property === "birth_year");
      if (birthYearClaim) {
        profile.birthYear = parseInt(birthYearClaim.value, 10);
      }
      const nationalityClaim = wikidataClaims.find((c) => c.property === "nationality");
      if (nationalityClaim) {
        profile.nationality = nationalityClaim.value;
      }
      const professionClaim = wikidataClaims.find((c) => c.property === "profession");
      if (professionClaim) {
        profile.profession = professionClaim.value;
      }
    }
    wikipediaCache.set(cacheKey, profile, 5 * 60 * 1000);
    return profile;
  }
  catch (error) {
    console.error("[v0] Wikipedia fetch error:", error);
    return null;
  }
}
export async function getWikidataClaimsForEntity(entityName: string): Promise<WikidataClaim[]> {
  const cacheKey = `wikidata_claims_${entityName.toLowerCase()}`;
  const cached = wikipediaCache.get<WikidataClaim[]>(cacheKey);
  if (cached) {
    return cached;
  }
  try {
    const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(entityName)}&language=en&format=json`;
    const searchResponse = await withTimeout(fetch(searchUrl), 2000);
    if (!searchResponse)
    return [];
    const searchData = await searchResponse.json();
    const entities = searchData.search || [];
    if (entities.length === 0)
    return [];
    const entityId = entities[0].id;
    const claimsUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entityId}&props=claims&format=json`;
    const claimsResponse = await withTimeout(fetch(claimsUrl), 2000);
    if (!claimsResponse)
    return [];
    const claimsData = await claimsResponse.json();
    const entity = claimsData.entities?.[entityId];
    if (!entity?.claims)
    return [];
    const claims: WikidataClaim[] = [];
    const propertyMap: {
      [key: string]: string;
    } = {
      P569: "birth_date",
      P570: "death_date",
      P27: "nationality",
      P106: "profession",
      P19: "birthplace",
      P20: "deathplace",
      P54: "sports_team",
      P69: "education"
    };
    for (const [propertyId, propertyName] of Object.entries(propertyMap)) {
      const claimList = entity.claims[propertyId];
      if (claimList && claimList.length > 0) {
        const mainSnak = claimList[0].mainsnak;
        if (mainSnak?.datatype === "time") {
          const dateStr = mainSnak.datavalue?.value?.time;
          if (dateStr) {
            const year = dateStr.match(/\d{4}/)?.[0];
            if (year && propertyName === "birth_date") {
              claims.push({
                property: "birth_year",
                value: year,
                confidence: 0.95
              });
            }
          }
        } else
        if (mainSnak?.datatype === "wikibase-entityid") {
          const entityIdValue = mainSnak.datavalue?.value?.id;
          if (entityIdValue) {
            const labelUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entityIdValue}&props=labels&format=json`;
            try {
              const labelResponse = await withTimeout(fetch(labelUrl), 1000);
              if (labelResponse) {
                const labelData = await labelResponse.json();
                const label = labelData.entities?.[entityIdValue]?.labels?.en?.value;
                if (label) {
                  claims.push({
                    property: propertyName,
                    value: label,
                    confidence: 0.9
                  });
                }
              }
            }
            catch {
            }
          }
        } else
        if (mainSnak?.datatype === "string") {
          const value = mainSnak.datavalue?.value;
          if (value) {
            claims.push({
              property: propertyName,
              value,
              confidence: 0.85
            });
          }
        }
      }
    }
    wikipediaCache.set(cacheKey, claims, 5 * 60 * 1000);
    return claims;
  }
  catch (error) {
    console.error("[v0] Wikidata fetch error:", error);
    return [];
  }
}
export async function linkEntitiesToWikidata(text: string): Promise<EntityMatch[]> {
  const entityPattern = /\b[A-ZÀ-Ỹ][\w\s.-]*[A-ZÀ-Ỹ]\b/gu;
  const matches = text.match(entityPattern) || [];
  const uniqueEntities = Array.from(new Set(matches.map((e) => e.trim())));
  const results: EntityMatch[] = [];
  for (const entity of uniqueEntities.slice(0, 5)) {
    try {
      const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(entity)}&language=en&format=json`;
      const response = await withTimeout(fetch(searchUrl), 1500);
      if (!response)
      continue;
      const data = await response.json();
      const matches = data.search || [];
      if (matches.length > 0) {
        const match = matches[0];
        results.push({
          entity,
          type: inferEntityType(match.label, match.description),
          confidence: entity.toLowerCase() === match.label.toLowerCase() ? 0.95 : 0.7,
          wikidataId: match.id
        });
      }
    }
    catch {
    }
  }
  return results;
}
export async function compareFactsWithWikipedia(personName: string, claimedBirthYear?: number, claimedNationality?: string): Promise<{
  matches: boolean;
  confidence: number;
  details: string;
}> {
  const profile = await getWikipediaProfile(personName);
  if (!profile) {
    return {
      matches: false,
      confidence: 0,
      details: "No Wikipedia profile found"
    };
  }
  let matchCount = 0;
  let totalChecks = 0;
  const details: string[] = [];
  if (claimedBirthYear && profile.birthYear) {
    totalChecks++;
    if (Math.abs(claimedBirthYear - profile.birthYear) <= 1) {
      matchCount++;
      details.push(`✓ Birth year matches: ${profile.birthYear}`);
    } else
    {
      details.push(`✗ Birth year mismatch: claimed ${claimedBirthYear}, Wikipedia says ${profile.birthYear}`);
    }
  }
  if (claimedNationality && profile.nationality) {
    totalChecks++;
    const normalizedClaimed = claimedNationality.toLowerCase().trim();
    const normalizedWiki = profile.nationality.toLowerCase().trim();
    if (normalizedClaimed === normalizedWiki || normalizedWiki.includes(normalizedClaimed)) {
      matchCount++;
      details.push(`✓ Nationality matches: ${profile.nationality}`);
    } else
    {
      details.push(`✗ Nationality mismatch: claimed ${claimedNationality}, Wikipedia says ${profile.nationality}`);
    }
  }
  const confidence = totalChecks > 0 ? matchCount / totalChecks : 0;
  return {
    matches: matchCount > 0,
    confidence,
    details: details.join(" | ")
  };
}
function inferEntityType(label: string, description: string): EntityMatch["type"] {
  const desc = (description || "").toLowerCase();
  if (desc.includes("person") ||
  desc.includes("politician") ||
  desc.includes("actor") ||
  desc.includes("writer") ||
  desc.includes("artist")) {
    return "person";
  }
  if (desc.includes("organization") ||
  desc.includes("company") ||
  desc.includes("government") ||
  desc.includes("party")) {
    return "organization";
  }
  if (desc.includes("city") ||
  desc.includes("country") ||
  desc.includes("region") ||
  desc.includes("location")) {
    return "location";
  }
  if (desc.includes("event") ||
  desc.includes("war") ||
  desc.includes("crisis") ||
  desc.includes("attack")) {
    return "event";
  }
  return "person";
}
export async function batchGetWikipediaProfiles(names: string[]): Promise<WikipediaProfile[]> {
  const profiles: WikipediaProfile[] = [];
  for (const name of names) {
    try {
      const profile = await getWikipediaProfile(name);
      if (profile) {
        profiles.push(profile);
      }
    }
    catch {
    }
  }
  return profiles;
}
