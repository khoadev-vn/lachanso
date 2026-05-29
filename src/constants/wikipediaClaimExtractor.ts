export interface WikipediaIdentityClaim {
  personName: string;
  claimedNames: string[];
}

export interface WikipediaExtractedClaims {
  personName: string;
  queryCandidates: string[];
  identityClaims: WikipediaIdentityClaim[];
  hasProfileClaim: boolean;
}

export interface WikipediaIdentityComparison {
  matchedNames: string[];
  mismatchedNames: string[];
}

export interface WikipediaProfileComparison {
  matchedSignals: string[];
  missingSignals: string[];
  mismatchedSignals: string[];
}

interface KnownPersonProfile {
  canonical: string;
  aliases: string[];
  wikiTitle: string;
  validNames: string[];
}

const KNOWN_PERSON_PROFILES: KnownPersonProfile[] = [
  {
    canonical: "ho chi minh",
    aliases: [
      "há»“ chÃ­ minh",
      "ho chi minh",
      "chá»§ tá»‹ch há»“ chÃ­ minh",
      "chu tich ho chi minh",
      "bÃ¡c há»“",
      "bac ho",
      "nguyá»…n Ã¡i quá»‘c",
      "nguyen ai quoc",
    ],
    wikiTitle: "Ho Chi Minh",
    validNames: [
      "nguyá»…n sinh cung",
      "nguyen sinh cung",
      "nguyá»…n táº¥t thÃ nh",
      "nguyen tat thanh",
      "nguyá»…n Ã¡i quá»‘c",
      "nguyen ai quoc",
      "há»“ chÃ­ minh",
      "ho chi minh",
      "bÃ¡c há»“",
      "bac ho",
    ],
  },
  {
    canonical: "donald trump",
    aliases: ["donald trump", "donal trump", "trump", "president donald trump", "tá»•ng thá»‘ng donald trump"],
    wikiTitle: "Donald Trump",
    validNames: ["donald john trump", "donald trump", "trump"],
  },
];

const NAME_VALUE_PATTERNS = [
  /tÃªn\s+khai\s+sinh\s+(?:lÃ |:)\s+([^,.;]+)/giu,
  /tÃªn\s+tháº­t\s+(?:lÃ |:)\s+([^,.;]+)/giu,
  /tÃªn\s+lÃºc\s+nhá»\s+(?:lÃ |:)\s+([^,.;]+)/giu,
  /tÃªn\s+khi\s+Ä‘i\s+há»c\s+(?:lÃ |:)\s+([^,.;]+)/giu,
  /tÃªn\s+gá»i\s+(?:lÃ |:)\s+([^,.;]+)/giu,
  /nghá»‡\s+danh\s+(?:lÃ |:)?\s*([^,.;]+)/giu,
  /bÃ­\s+danh\s+(?:lÃ |:)\s+([^,.;]+)/giu,
  /bÃºt\s+danh\s+(?:lÃ |:)\s+([^,.;]+)/giu,
  /cÃ²n\s+(?:Ä‘Æ°á»£c\s+)?(?:biáº¿t\s+Ä‘áº¿n|gá»i|gá»i\s+phá»•\s+biáº¿n)[^,.;]*?(?:lÃ |vá»›i\s+tÃªn\s+gá»i)\s+([^,.;]+)/giu,
  /(?:Ä‘Æ°á»£c\s+)?biáº¿t\s+Ä‘áº¿n\s+vá»›i\s+tÃªn\s+([^,.;]+)/giu,
  /(?:tá»«ng\s+)?(?:dÃ¹ng|sá»­\s+dá»¥ng|láº¥y)\s+tÃªn\s+([^,.;]+)/giu,
  /(?:cÃ²n\s+)?mang\s+tÃªn\s+([^,.;]+)/giu,
];

const UNICODE_NAME_VALUE_PATTERNS = [
  /t\u00ean\s+khai\s+sinh\s+(?:l\u00e0|:)\s+([^,.;]+)/giu,
  /t\u00ean\s+th\u1eadt\s+(?:l\u00e0|:)\s+([^,.;]+)/giu,
  /t\u00ean\s+khi\s+\u0111i\s+h\u1ecdc\s+(?:l\u00e0|:)\s+([^,.;]+)/giu,
  /ngh\u1ec7\s+danh\s+(?:l\u00e0|:)?\s*([^,.;]+)/giu,
  /(?:\u0111\u01b0\u1ee3c\s+)?bi\u1ebft\s+\u0111\u1ebfn\s+v\u1edbi\s+(?:ngh\u1ec7\s+danh|t\u00ean)\s+([^,.;]+)/giu,
  /c\u00f2n\s+(?:\u0111\u01b0\u1ee3c\s+)?(?:bi\u1ebft\s+\u0111\u1ebfn|g\u1ecdi|g\u1ecdi\s+ph\u1ed5\s+bi\u1ebfn)[^,.;]*?(?:l\u00e0|v\u1edbi\s+t\u00ean\s+g\u1ecdi)\s+([^,.;]+)/giu,
];

const REVERSED_NAME_PATTERNS = [
  /([^,.;]{3,80}?)\s+lÃ \s+tÃªn\s+khai\s+sinh\s+cá»§a\s+([\p{Lu}][\p{L}.'-]+(?:\s+[\p{Lu}][\p{L}.'-]+){1,6})/giu,
  /([^,.;]{3,80}?)\s+lÃ \s+tÃªn\s+(?:tháº­t|lÃºc\s+nhá»|khi\s+Ä‘i\s+há»c|gá»i)\s+cá»§a\s+([\p{Lu}][\p{L}.'-]+(?:\s+[\p{Lu}][\p{L}.'-]+){1,6})/giu,
  /([^,.;]{3,80}?)\s+lÃ \s+(?:bÃ­\s+danh|bÃºt\s+danh)\s+cá»§a\s+([\p{Lu}][\p{L}.'-]+(?:\s+[\p{Lu}][\p{L}.'-]+){1,6})/giu,
  /([\p{Lu}][\p{L}.'-]+(?:\s+[\p{Lu}][\p{L}.'-]+){1,6})\s+(?:cÃ³|mang|dÃ¹ng|sá»­\s+dá»¥ng|láº¥y)\s+(?:tÃªn|bÃ­\s+danh|bÃºt\s+danh)\s+([^,.;]{3,80})/giu,
];

const NAME_SPLIT_PATTERN = /\s+hoáº·c\s+|\s+hay\s+|\s+cÃ²n\s+gá»i\s+lÃ \s+|\s+vÃ \s+|\/|;/iu;
const LIGHT_WORDS = new Set(["la", "cua", "ten", "goi", "ong", "ba", "bac", "chu", "tich", "tong", "thong"]);

const PROFILE_SIGNAL_GROUPS = [
  { input: ["chinh tri gia", "politician"], evidence: ["politician"] },
  { input: ["doanh nhan", "businessman"], evidence: ["businessman", "businessperson"] },
  { input: ["truyen thong", "media personality"], evidence: ["media personality"] },
  { input: ["dang cong hoa", "republican party", "republican"], evidence: ["republican"] },
  { input: ["hoa ky", "nuoc my", "united states", "america"], evidence: ["united states", "american"] },
  { input: ["ca si", "singer"], evidence: ["ca si"] },
  { input: ["ca si", "singer"], evidence: ["singer"] },
  { input: ["nhac si sang tac", "songwriter"], evidence: ["songwriter"] },
  { input: ["nhac si sang tac", "nhac si", "songwriter"], evidence: ["nhac si"] },
  { input: ["nha san xuat thu am", "record producer"], evidence: ["record producer"] },
  { input: ["nha san xuat thu am", "nha san xuat", "record producer"], evidence: ["nha san xuat"] },
  { input: ["rapper"], evidence: ["rapper"] },
  { input: ["dien vien", "actor"], evidence: ["actor"] },
  { input: ["dien vien", "actor"], evidence: ["dien vien"] },
  { input: ["nguoi viet nam", "vietnamese"], evidence: ["vietnamese"] },
  { input: ["nguoi viet nam", "vietnamese"], evidence: ["viet nam"] },
];

export function normalizeClaimText(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function compactWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function resolveKnownProfile(text: string): KnownPersonProfile | null {
  const normalized = normalizeClaimText(text);
  return KNOWN_PERSON_PROFILES.find((profile) =>
    profile.aliases.some((alias) => normalized.includes(normalizeClaimText(alias))),
  ) ?? null;
}

function extractLeadingPersonName(text: string): string | null {
  return text.match(/^([\p{Lu}][\p{L}.'-]+(?:\s+[\p{Lu}][\p{L}.'-]+){1,6})[,ï¼Œ]/u)?.[1] ?? null;
}

function cleanClaimedName(name: string): string {
  return compactWhitespace(
    name
      .replace(/\([^)]*\)/g, " ")
      .replace(/^(lÃ |vá»›i tÃªn gá»i|tÃªn gá»i lÃ )\s+/iu, "")
      .replace(/\s+cÅ©ng\s+nhÆ°\s+/giu, " ")
      .replace(/\s+cÃ²n\s+Ä‘Æ°á»£c\s+gá»i\s+.*$/iu, ""),
  );
}

function splitClaimedNames(rawName: string): string[] {
  return rawName
    .split(NAME_SPLIT_PATTERN)
    .map(cleanClaimedName)
    .filter((name) => name.length >= 3);
}

function looksLikeLookupCandidate(name: string): boolean {
  const tokens = nameTokens(name);
  return tokens.length >= 2 && tokens.length <= 8;
}

function buildWikipediaQueryCandidates(personName: string, claimedNames: string[], knownProfile: KnownPersonProfile | null): string[] {
  return unique([
    knownProfile?.wikiTitle ?? "",
    ...claimedNames,
    personName,
  ])
    .map(compactWhitespace)
    .filter((name) => name.length >= 3 && looksLikeLookupCandidate(name));
}

export function extractWikipediaClaims(text: string): WikipediaExtractedClaims | null {
  const compacted = compactWhitespace(text);
  const knownProfile = resolveKnownProfile(compacted);
  let personName = knownProfile?.wikiTitle ?? extractLeadingPersonName(compacted);

  const claimedNames: string[] = [];

  for (const pattern of [...NAME_VALUE_PATTERNS, ...UNICODE_NAME_VALUE_PATTERNS]) {
    for (const match of compacted.matchAll(pattern)) {
      if (match[1]) {
        claimedNames.push(...splitClaimedNames(match[1]));
      }
    }
  }

  for (const pattern of REVERSED_NAME_PATTERNS) {
    for (const match of compacted.matchAll(pattern)) {
      const first = match[1] ? compactWhitespace(match[1]) : "";
      const second = match[2] ? compactWhitespace(match[2]) : "";
      const firstLooksLikePerson = resolveKnownProfile(first) || normalizeClaimText(first) === normalizeClaimText(personName || "");

      if (firstLooksLikePerson) {
        personName = personName ?? first;
        claimedNames.push(...splitClaimedNames(second));
      } else {
        personName = personName ?? second;
        claimedNames.push(...splitClaimedNames(first));
      }
    }
  }

  if (!personName) return null;

  const cleanedNames = unique(claimedNames)
    .map(cleanClaimedName)
    .filter((name) => name.length >= 3 && normalizeClaimText(name) !== normalizeClaimText(personName));
  const normalizedCompacted = normalizeClaimText(compacted);
  const hasProfileSignals = Boolean(personName) && /\b(is|was|served|president|party|rapper|actor|singer|songwriter|businessman|politician|tong thong|chinh tri gia|doanh nhan|dang|ca si|nhac si|dien vien|nghe danh|nha san xuat|nguoi viet nam|nguoi my)\b/i.test(normalizedCompacted);

  return {
    personName,
    queryCandidates: buildWikipediaQueryCandidates(personName, cleanedNames, knownProfile),
    identityClaims: cleanedNames.length > 0 ? [{ personName, claimedNames: cleanedNames }] : [],
    hasProfileClaim: hasProfileSignals,
  };
}

function nameTokens(name: string): string[] {
  return normalizeClaimText(name)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !LIGHT_WORDS.has(token));
}

function hasNameEvidence(name: string, evidenceText: string, validNames: string[]): boolean {
  const normalizedName = normalizeClaimText(name);
  const normalizedEvidence = normalizeClaimText(evidenceText);

  if (normalizedEvidence.includes(normalizedName)) {
    return true;
  }

  if (validNames.some((validName) => normalizeClaimText(validName) === normalizedName)) {
    return true;
  }

  const tokens = nameTokens(name);
  if (tokens.length <= 1) {
    return false;
  }

  return tokens.every((token) => normalizedEvidence.includes(token));
}

function ordinalSuffix(value: number): string {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";

  switch (value % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function extractPresidentOrdinalClaims(normalizedInput: string): number[] {
  const ordinals = new Set<number>();
  const patterns = [
    /tong\s+thong\s+thu\s+(\d+)/g,
    /(\d+)(?:st|nd|rd|th)\s+president/g,
  ];

  for (const pattern of patterns) {
    for (const match of normalizedInput.matchAll(pattern)) {
      ordinals.add(Number(match[1]));
    }
  }

  return Array.from(ordinals).filter((value) => Number.isFinite(value));
}

function hasPresidentOrdinalEvidence(value: number, normalizedEvidence: string): boolean {
  return (
    normalizedEvidence.includes(`tong thong thu ${value}`) ||
    normalizedEvidence.includes(`${value}${ordinalSuffix(value)} president`) ||
    (normalizedEvidence.includes(`${value}th`) && normalizedEvidence.includes("president"))
  );
}

function extractYearRangeClaims(normalizedInput: string): string[] {
  const ranges = new Set<string>();
  const patterns = [
    /tu\s+nam\s+(\d{4})\s+den\s+nam\s+(\d{4})/g,
    /from\s+(\d{4})\s+to\s+(\d{4})/g,
  ];

  for (const pattern of patterns) {
    for (const match of normalizedInput.matchAll(pattern)) {
      ranges.add(`${match[1]}-${match[2]}`);
    }
  }

  return Array.from(ranges);
}

export function compareIdentityClaimsWithWikipedia(
  identityClaim: WikipediaIdentityClaim,
  wikipediaTitle: string,
  wikipediaExtract: string,
): WikipediaIdentityComparison {
  const profile = resolveKnownProfile(identityClaim.personName) ?? resolveKnownProfile(wikipediaTitle);
  const evidenceText = `${wikipediaTitle} ${wikipediaExtract} ${(profile?.validNames ?? []).join(" ")}`;

  const matchedNames: string[] = [];
  const mismatchedNames: string[] = [];

  for (const name of identityClaim.claimedNames) {
    if (hasNameEvidence(name, evidenceText, profile?.validNames ?? [])) {
      matchedNames.push(name);
    } else {
      mismatchedNames.push(name);
    }
  }

  return { matchedNames, mismatchedNames };
}

export function compareProfileClaimWithWikipedia(
  inputText: string,
  wikipediaTitle: string,
  wikipediaExtract: string,
): WikipediaProfileComparison {
  const normalizedInput = normalizeClaimText(inputText);
  const normalizedEvidence = normalizeClaimText(`${wikipediaTitle} ${wikipediaExtract}`);
  const activeSignals = PROFILE_SIGNAL_GROUPS.filter((group) =>
    group.input.some((signal) => normalizedInput.includes(normalizeClaimText(signal))),
  );

  const matchedSignals: string[] = [];
  const missingSignals: string[] = [];
  const mismatchedSignals: string[] = [];

  for (const group of activeSignals) {
    const hasEvidence = group.evidence.every((signal) => normalizedEvidence.includes(normalizeClaimText(signal)));
    const label = group.input[0];

    if (hasEvidence) {
      matchedSignals.push(label);
    } else {
      missingSignals.push(label);
    }
  }

  const presidentOrdinals = extractPresidentOrdinalClaims(normalizedInput);
  for (const ordinal of presidentOrdinals) {
    const label = `president ordinal ${ordinal}`;
    if (hasPresidentOrdinalEvidence(ordinal, normalizedEvidence)) {
      matchedSignals.push(label);
    } else {
      mismatchedSignals.push(label);
    }
  }

  const yearRanges = extractYearRangeClaims(normalizedInput);
  for (const range of yearRanges) {
    const [startYear, endYear] = range.split("-");
    if (normalizedEvidence.includes(startYear) && normalizedEvidence.includes(endYear)) {
      matchedSignals.push(`term ${range}`);
    } else {
      missingSignals.push(`term ${range}`);
    }
  }

  return { matchedSignals, missingSignals, mismatchedSignals };
}

