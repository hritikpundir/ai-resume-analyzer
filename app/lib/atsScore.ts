// A list of extremely common English words that carry no useful signal
// for keyword matching (we don't want to "match" on words like "the" or "and").
const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "is", "are", "was", "were", "be", "been", "being",
  "this", "that", "these", "those", "it", "as", "from", "will", "we",
  "you", "your", "our", "their", "have", "has", "had", "not", "can",
  // Generic job-posting filler words that aren't real skill/requirement keywords
  "more", "should", "must", "all", "non", "new", "part", "good",
  "ability", "abilities", "receive", "excellent", "individual", "learn",
  "urge", "explore", "grows", "successful", "candidate", "responsibility",
  "responsibilities", "taking", "assisting", "assist", "mentored",
  "members", "member", "integral", "innovative", "environments",
  "environment", "deliverables", "timescales", "defined", "necessary",
  "completion", "perform", "manage", "demonstrate", "excellent",
  "knowledge", "required", "requirement", "related", "relevant",
  "field", "tasks", "task",
]);

// Turns a raw block of text into a clean list of lowercase words,
// with punctuation stripped and stop words removed.
function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")   // strip punctuation, keep letters/numbers/spaces
    .split(/\s+/)                   // split into individual words
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}


export function calculateKeywordMatch(
  resumeText: string,
  jobDescription: string
): KeywordMatchResult {
  // If there's no job description provided, we have nothing to compare against.
  if (!jobDescription || jobDescription.trim().length === 0) {
    return { score: 0, matchedKeywords: [], missingKeywords: [] };
  }

  const jdKeywords = extractKeywords(jobDescription);
  const resumeKeywords = new Set(extractKeywords(resumeText));

  // Get the unique set of important words from the job description
  // (a Set automatically removes duplicates).
  const uniqueJdKeywords = Array.from(new Set(jdKeywords));

  const matched: string[] = [];
  const missing: string[] = [];

  for (const keyword of uniqueJdKeywords) {
    if (resumeKeywords.has(keyword)) {
      matched.push(keyword);
    } else {
      missing.push(keyword);
    }
  }

  const score =
    uniqueJdKeywords.length === 0
      ? 0
      : Math.round((matched.length / uniqueJdKeywords.length) * 100);

  return { score, matchedKeywords: matched, missingKeywords: missing };
}


// Common resume section headers we'd expect to see, in some form.
// We check case-insensitively, so "EDUCATION", "Education", "education" all count.
const EXPECTED_SECTIONS = [
  "education",
  "experience",
  "skills",
  "projects",
];

export function analyzeStructure(resumeText: string): StructureCheckResult {
  const text = resumeText || "";
  const lowerText = text.toLowerCase();

  const wordCount = text
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text);

  const digitsOnly = text.replace(/[^0-9]/g, "");
  const hasPhone = digitsOnly.length >= 10;

  // Split the resume into individual lines so we can check each one on its own,
  // rather than searching the whole blob of text at once.
  const lines = text.split(/\n/).map((line) => line.trim().toLowerCase());

  const looksLikeHeaderLine = (line: string, section: string): boolean => {
    // A real section header is usually short (not a full sentence) and
    // is essentially just the section name, maybe with a colon or extra spacing.
    const isShortLine = line.length > 0 && line.length <= section.length + 15;
    return isShortLine && line.includes(section);
  };

  const foundSections: string[] = [];
  const missingSections: string[] = [];

  for (const section of EXPECTED_SECTIONS) {
    const foundAsHeader = lines.some((line) => looksLikeHeaderLine(line, section));
    if (foundAsHeader) {
      foundSections.push(section);
    } else {
      missingSections.push(section);
    }
  }

  let score = 100;

  if (wordCount < 150) score -= 25;
  if (wordCount > 1200) score -= 10;
  if (!hasEmail) score -= 20;
  if (!hasPhone) score -= 15;
  score -= missingSections.length * 10;

  score = Math.max(0, Math.min(100, score));

  return { score, wordCount, hasEmail, hasPhone, foundSections, missingSections };
}

export function calculateDeterministicATS(
  resumeText: string,
  jobDescription: string
): DeterministicATSResult {
  const keywordMatch = calculateKeywordMatch(resumeText, jobDescription);
  const structure = analyzeStructure(resumeText);

  // Weight keyword matching a bit higher than structure, since matching the
  // job description's requirements matters more than formatting details —
  // but both contribute to the final number.
  const overallScore = Math.round(
    keywordMatch.score * 0.6 + structure.score * 0.4
  );

  return { overallScore, keywordMatch, structure };
}