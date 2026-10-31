/**
 * searchEngine.ts — Robust Hybrid Search & Retrieval Engine for StudyStack
 * Implements Query Normalization, Generic Parameter Extraction,
 * Multi-Level Fallback Search, Fuzzy Matching, and Weighted Relevance Ranking.
 */

import { supabase } from './supabaseClient';

export interface ExtractedSearchParams {
  originalQuery: string;
  normalizedQuery: string;
  subject: string | null;
  unit: string | null; // Digits e.g. "1", "2"
  category: string | null;
  keywords: string[];
}

export interface ScoredFileResult {
  id: string;
  file_name: string;
  file_url: string;
  category: string;
  unit_no?: string;
  subject_id?: string;
  subject_name?: string;
  relevanceScore: number;
  matchLevel: number;
}

export interface HybridSearchResult {
  extractedParams: ExtractedSearchParams;
  selectedLevel: number;
  stageResultsCount: Record<number, number>;
  files: ScoredFileResult[];
  isExactMatch: boolean;
  searchSummary: string;
}

// ── ABBREVIATIONS & DICTIONARIES ─────────────────────────────────────────────

const ABBREVIATIONS: Record<string, string> = {
  'os': 'operating systems',
  'dbms': 'database management systems',
  'cn': 'computer networks',
  'ml': 'machine learning',
  'ai': 'artificial intelligence',
  'dl': 'deep learning',
  'pyq': 'previous year question papers',
  'pyqs': 'previous year question papers',
  'se': 'software engineering',
  'dsa': 'data structures and algorithms',
  'co': 'computer organization',
  'coa': 'computer organization and architecture',
  'flat': 'formal languages and automata theory',
  'wt': 'web technologies'
};

const STOP_WORDS = new Set([
  'i', 'want', 'need', 'give', 'me', 'get', 'find', 'search', 'show', 'please', 
  'looking', 'for', 'a', 'an', 'the', 'can', 'you', 'with', 'in', 'of', 'and', 'or',
  'resource', 'resources', 'file', 'files', 'pdf', 'pdfs', 'material', 'materials'
]);

const GENERIC_CS_WORDS = new Set([
  'system', 'systems', 'management', 'engineering', 'technology', 'technologies',
  'science', 'computer', 'computers', 'advanced', 'basic', 'basics', 'introduction',
  'previous', 'year', 'past', 'question', 'questions', 'paper', 'papers', 'mid', 'exam'
]);

const ROMAN_MAP: Record<string, string> = {
  'i': '1',
  'ii': '2',
  'iii': '3',
  'iv': '4',
  'v': '5',
  'vi': '6'
};

const WORD_NUM_MAP: Record<string, string> = {
  'first': '1', '1st': '1',
  'second': '2', '2nd': '2',
  'third': '3', '3rd': '3',
  'fourth': '4', '4th': '4',
  'fifth': '5', '5th': '5'
};

// ── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

/** Normalizes token singular/plural forms */
export function stemWord(word: string): string {
  const w = word.toLowerCase();
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
  if (w.endsWith('es') && w.length > 3 && (w.endsWith('shes') || w.endsWith('ches') || w.endsWith('sses') || w.endsWith('xes'))) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) return w.slice(0, -1);
  return w;
}

/** Levenshtein distance for fuzzy matching */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/** Compute fuzzy similarity score (0.0 to 1.0) */
export function fuzzySimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(s1, s2);
  return (maxLen - dist) / maxLen;
}

/** Extract numeric unit digit from any string like "Unit 1", "u1", "Unit-1", "1st unit", "Unit I" */
export function extractUnitDigit(text: string): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();

  // Pattern 1: unit 1, unit-1, unit_1, u1, u-1
  const p1 = lower.match(/(?:unit|u|mod|module)[\s\-_:]*(\d+)/);
  if (p1) return p1[1];

  // Pattern 2: unit i, unit ii, unit iii, unit iv, unit v
  const p2 = lower.match(/(?:unit|u|mod|module)[\s\-_:]*(i{1,3}|iv|v|vi)\b/);
  if (p2 && ROMAN_MAP[p2[1]]) return ROMAN_MAP[p2[1]];

  // Pattern 3: 1st unit, 2nd unit, 3rd unit, 4th unit, 5th unit, 1 unit
  const p3 = lower.match(/(\d+)(?:st|nd|rd|th)?[\s\-_:]*(?:unit|u|mod|module)/);
  if (p3) return p3[1];

  // Pattern 4: first unit, second unit...
  const p4 = lower.match(/(first|second|third|fourth|fifth)[\s\-_:]*(?:unit|u|mod|module)/);
  if (p4 && WORD_NUM_MAP[p4[1]]) return WORD_NUM_MAP[p4[1]];

  // Standalone "u1", "u2" etc
  const p5 = lower.match(/\bu([1-5])\b/);
  if (p5) return p5[1];

  return null;
}

// ── QUERY NORMALIZATION & PARAMETER EXTRACTION ──────────────────────────────

export function extractSearchParams(query: string): ExtractedSearchParams {
  const originalQuery = query.trim();
  let text = originalQuery.toLowerCase();

  // Replace hyphens and punctuation with spaces except alphanumeric
  text = text.replace(/[\-_/\\,.:;()!?]/g, ' ');

  // Standardize spaces
  text = text.replace(/\s+/g, ' ').trim();

  // 1. Extract Unit
  let unitDigit = extractUnitDigit(originalQuery) || extractUnitDigit(text);

  // 2. Extract Category
  let category: string | null = null;
  if (/previous\s+year|pyq|pyqs|past\s+paper|question\s+paper|mid\s+paper|exam\s+paper/i.test(originalQuery)) {
    category = 'Previous Year Question Papers';
  } else if (/assignment|assignments|homework|hw/i.test(originalQuery)) {
    category = 'Assignments';
  } else if (/lab|labs|lab\s+resource|manual|manuals|practical/i.test(originalQuery)) {
    category = 'Lab Resources';
  } else if (/note|notes|study\s+material|lecture/i.test(originalQuery)) {
    category = 'Notes';
  }

  // 3. Expand Abbreviations in text
  let expandedWords: string[] = [];
  const rawWords = text.split(' ');
  for (const w of rawWords) {
    if (ABBREVIATIONS[w]) {
      expandedWords.push(...ABBREVIATIONS[w].split(' '));
    } else {
      expandedWords.push(w);
    }
  }

  // Normalized query string after expansion
  const normalizedQuery = expandedWords.join(' ');

  // 4. Extract subject keywords by removing category words, unit words, and stop words
  const keywords: string[] = [];
  const subjectTokens: string[] = [];

  for (const word of expandedWords) {
    const stemmed = stemWord(word);
    if (
      STOP_WORDS.has(word) || 
      STOP_WORDS.has(stemmed) ||
      /^(unit|u|mod|module|\d+|1st|2nd|3rd|4th|5th|first|second|third|fourth|fifth|i|ii|iii|iv|v)$/.test(word) ||
      /^(note|notes|assignment|assignments|lab|labs|resource|resources|previous|year|past|paper|papers|pyq|pyqs|question|questions|mid|exam)$/.test(stemmed)
    ) {
      continue;
    }
    keywords.push(word);
    subjectTokens.push(word);
  }

  const subjectCandidate = subjectTokens.length > 0 ? subjectTokens.join(' ') : null;

  return {
    originalQuery,
    normalizedQuery,
    subject: subjectCandidate,
    unit: unitDigit,
    category,
    keywords
  };
}

// ── RELEVANCE SCORING & HYBRID SEARCH PIPELINE ────────────────────────────────

export async function hybridSearch(
  queryText: string, 
  forcedSubject?: string, 
  forcedCategory?: string, 
  forcedUnit?: string
): Promise<HybridSearchResult> {
  const extracted = extractSearchParams(queryText);

  // If external function calls (e.g. Gemini) passed explicit args, override extracted if provided
  if (forcedSubject && forcedSubject.trim()) extracted.subject = forcedSubject.trim();
  if (forcedCategory && forcedCategory.trim()) extracted.category = forcedCategory.trim();
  if (forcedUnit && forcedUnit.trim()) {
    const parsedUnit = extractUnitDigit(forcedUnit) || forcedUnit.replace(/\D/g, '');
    if (parsedUnit) extracted.unit = parsedUnit;
  }

  // Fetch all DB subjects and files for in-memory hybrid evaluation
  const [{ data: dbSubjects }, { data: dbFiles }] = await Promise.all([
    supabase.from('subjects').select('*'),
    supabase.from('files').select('*')
  ]);

  const subjects = dbSubjects || [];
  const files = dbFiles || [];

  // Map subject ID -> subject name & category
  const subjectMap = new Map<string, { name: string; category: string }>();
  subjects.forEach(s => subjectMap.set(s.id, { name: s.name, category: s.category }));

  // Helper to score a file against extracted search parameters
  const scoreFile = (file: any, matchLevel: number): ScoredFileResult => {
    let score = 0;
    const fileSubjectName = subjectMap.get(file.subject_id)?.name || '';
    const fileCategory = file.category || subjectMap.get(file.subject_id)?.category || '';
    const fileUnitDigit = extractUnitDigit(file.unit_no || file.file_name);
    const fileNameLower = (file.file_name || '').toLowerCase();
    const subjectNameLower = fileSubjectName.toLowerCase();

    const queryLower = extracted.normalizedQuery;
    const extractedSubjectLower = (extracted.subject || '').toLowerCase();

    // 1. Exact / Full Subject Match (+40)
    if (extractedSubjectLower && (subjectNameLower === extractedSubjectLower || fileNameLower.includes(extractedSubjectLower))) {
      score += 40;
    } else if (extractedSubjectLower && (stemWord(subjectNameLower) === stemWord(extractedSubjectLower))) {
      score += 35;
    }

    // 2. Subject Keyword Matches (+25 per matching token)
    if (extracted.keywords.length > 0) {
      let matchedTokens = 0;
      for (const kw of extracted.keywords) {
        const stemmedKw = stemWord(kw);
        if (subjectNameLower.includes(kw) || subjectNameLower.includes(stemmedKw) || fileNameLower.includes(kw) || fileNameLower.includes(stemmedKw)) {
          matchedTokens++;
        }
      }
      if (matchedTokens > 0) {
        score += Math.min(30, matchedTokens * 15);
      }
    }

    // 3. Category Match (+20)
    if (extracted.category && fileCategory.toLowerCase() === extracted.category.toLowerCase()) {
      score += 20;
    }

    // 4. Unit Match (+20)
    if (extracted.unit && fileUnitDigit && fileUnitDigit === extracted.unit) {
      score += 20;
    }

    // 5. Title / File Name Exact Keyword Match (+20)
    if (queryLower && fileNameLower.includes(queryLower)) {
      score += 20;
    }

    // 6. Fuzzy Similarity Match (+10 max)
    if (extractedSubjectLower && subjectNameLower) {
      const sim = fuzzySimilarity(extractedSubjectLower, subjectNameLower);
      if (sim > 0.6) {
        score += Math.round(sim * 10);
      }
    }

    return {
      id: file.id,
      file_name: file.file_name,
      file_url: file.file_url,
      category: fileCategory,
      unit_no: file.unit_no,
      subject_id: file.subject_id,
      subject_name: fileSubjectName,
      relevanceScore: score,
      matchLevel
    };
  };

  const stageResultsCount: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let selectedLevel = 6;
  let candidateFiles: ScoredFileResult[] = [];

  // ── 5-LEVEL FALLBACK PIPELINE ─────────────────────────────────────────────

  // Level 1: Subject + Unit + Category
  const level1Candidates = files.filter(f => {
    const sName = subjectMap.get(f.subject_id)?.name || '';
    const fCat = f.category || subjectMap.get(f.subject_id)?.category;
    const fUnit = extractUnitDigit(f.unit_no || f.file_name);

    const matchesSubject = extracted.subject ? (
      sName.toLowerCase().includes(extracted.subject.toLowerCase()) || 
      fuzzySimilarity(sName, extracted.subject) > 0.7
    ) : true;

    const matchesCategory = extracted.category ? (
      fCat?.toLowerCase() === extracted.category.toLowerCase()
    ) : true;

    const matchesUnit = extracted.unit ? (
      fUnit === extracted.unit
    ) : true;

    return matchesSubject && matchesCategory && matchesUnit;
  });
  stageResultsCount[1] = level1Candidates.length;

  if (level1Candidates.length > 0) {
    selectedLevel = 1;
    candidateFiles = level1Candidates.map(f => scoreFile(f, 1));
  } else {
    // Level 2: Subject + Unit
    const level2Candidates = files.filter(f => {
      const sName = subjectMap.get(f.subject_id)?.name || '';
      const fUnit = extractUnitDigit(f.unit_no || f.file_name);

      const matchesSubject = extracted.subject ? (
        sName.toLowerCase().includes(extracted.subject.toLowerCase()) || 
        fuzzySimilarity(sName, extracted.subject) > 0.65
      ) : true;

      const matchesUnit = extracted.unit ? (
        fUnit === extracted.unit
      ) : true;

      return matchesSubject && matchesUnit;
    });
    stageResultsCount[2] = level2Candidates.length;

    if (level2Candidates.length > 0) {
      selectedLevel = 2;
      candidateFiles = level2Candidates.map(f => scoreFile(f, 2));
    } else {
      // Level 3: Subject + Category
      const level3Candidates = files.filter(f => {
        const sName = subjectMap.get(f.subject_id)?.name || '';
        const fCat = f.category || subjectMap.get(f.subject_id)?.category;

        const matchesSubject = extracted.subject ? (
          sName.toLowerCase().includes(extracted.subject.toLowerCase()) || 
          fuzzySimilarity(sName, extracted.subject) > 0.65
        ) : true;

        const matchesCategory = extracted.category ? (
          fCat?.toLowerCase() === extracted.category.toLowerCase()
        ) : true;

        return matchesSubject && matchesCategory;
      });
      stageResultsCount[3] = level3Candidates.length;

      if (level3Candidates.length > 0) {
        selectedLevel = 3;
        candidateFiles = level3Candidates.map(f => scoreFile(f, 3));
      } else {
        // Level 4: Subject Keywords / File Name Distinctive Keywords
        const level4Candidates = files.filter(f => {
          const sName = (subjectMap.get(f.subject_id)?.name || '').toLowerCase();
          const fName = (f.file_name || '').toLowerCase();

          // Require at least one non-generic keyword match
          const distinctiveKeywords = extracted.keywords.filter(kw => !GENERIC_CS_WORDS.has(kw.toLowerCase()));
          const keywordsToTest = distinctiveKeywords.length > 0 ? distinctiveKeywords : extracted.keywords;

          return keywordsToTest.some(kw => {
            const skw = stemWord(kw);
            return sName.includes(kw) || sName.includes(skw) || fName.includes(kw) || fName.includes(skw);
          });
        });
        stageResultsCount[4] = level4Candidates.length;

        if (level4Candidates.length > 0) {
          selectedLevel = 4;
          candidateFiles = level4Candidates.map(f => scoreFile(f, 4));
        } else {
          // Level 5: Fuzzy Matching across all files and subjects
          const level5Candidates = files.filter(f => {
            const sName = subjectMap.get(f.subject_id)?.name || '';
            const fName = f.file_name || '';

            if (extracted.subject && (fuzzySimilarity(sName, extracted.subject) > 0.55 || fuzzySimilarity(fName, extracted.subject) > 0.55)) {
              return true;
            }
            return false;
          });
          stageResultsCount[5] = level5Candidates.length;

          if (level5Candidates.length > 0) {
            selectedLevel = 5;
            candidateFiles = level5Candidates.map(f => scoreFile(f, 5));
          }
        }
      }
    }
  }

  // Sort candidate files by relevance score descending
  candidateFiles.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Deduplicate files by ID or file_url
  const uniqueFiles: ScoredFileResult[] = [];
  const seenIds = new Set<string>();
  for (const cf of candidateFiles) {
    if (!seenIds.has(cf.id)) {
      seenIds.add(cf.id);
      uniqueFiles.push(cf);
    }
  }

  const isExactMatch = selectedLevel === 1;

  // Build search summary for Alex response decisions
  let searchSummary = '';
  if (uniqueFiles.length > 0) {
    if (isExactMatch) {
      searchSummary = `Found ${uniqueFiles.length} exact match(es) at Stage 1.`;
    } else {
      searchSummary = `Exact Stage 1 match produced 0 results. Fallback to Stage ${selectedLevel} yielded ${uniqueFiles.length} resource(s).`;
    }
  } else {
    searchSummary = `All 5 search stages returned 0 results.`;
  }

  // ── DEBUG LOGGING (Requirement 15) ─────────────────────────────────────────

  console.log(`\n=================== [StudyStack Library Search Debug] ===================`);
  console.log(`Original query:      "${extracted.originalQuery}"`);
  console.log(`Normalized:          "${extracted.normalizedQuery}"`);
  console.log(`Extracted Subject:   "${extracted.subject || 'N/A'}"`);
  console.log(`Extracted Unit:      "${extracted.unit || 'N/A'}"`);
  console.log(`Extracted Category:  "${extracted.category || 'N/A'}"`);
  console.log(`Extracted Keywords:  [${extracted.keywords.join(', ')}]`);
  console.log(`Search Strategy:     Level ${selectedLevel} (${searchSummary})`);
  console.log(`Stage 1 Results:     ${stageResultsCount[1]}`);
  console.log(`Stage 2 Results:     ${stageResultsCount[2]}`);
  console.log(`Stage 3 Results:     ${stageResultsCount[3]}`);
  console.log(`Stage 4 Results:     ${stageResultsCount[4]}`);
  console.log(`Stage 5 Results:     ${stageResultsCount[5]}`);
  console.log(`Selected Documents:  ${uniqueFiles.length}`);
  uniqueFiles.forEach((f, idx) => {
    console.log(`  ${idx + 1}. [Score: ${f.relevanceScore}] "${f.file_name}" (Subject: ${f.subject_name}, Category: ${f.category}, Unit: ${f.unit_no || 'N/A'})`);
  });
  console.log(`=========================================================================\n`);

  return {
    extractedParams: extracted,
    selectedLevel,
    stageResultsCount,
    files: uniqueFiles,
    isExactMatch,
    searchSummary
  };
}
