"""
Skill taxonomy loading + matching.

Matching strategy (two passes, both fast enough for sub-second scoring):

1. Exact/alias pass — every canonical skill + its aliases are compiled into
   a single alternation regex with word boundaries, matched against the
   text in one linear pass. This is the primary matcher: cheap, precise,
   and handles the common "JS" / "Machine Learning" alias-normalization
   case directly.

2. Fuzzy pass — words/short phrases in the text that were NOT already
   covered by an exact match are compared against the taxonomy with
   rapidfuzz (token_sort_ratio) to catch typos/variants (e.g. "Pyhton",
   "Java Script"). Only run over the leftover vocabulary, not the full
   taxonomy x full text cross-product, so it stays fast even as the
   taxonomy grows toward thousands of entries.
"""
import json
import os
import re
from dataclasses import dataclass
from functools import lru_cache
from typing import Dict, List, Set, Tuple

from rapidfuzz import fuzz, process

_TAXONOMY_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "skills_taxonomy.json")

FUZZY_SCORE_CUTOFF = 90  # rapidfuzz score (0-100); conservative to avoid false positives
MIN_FUZZY_TERM_LEN = 4    # skip fuzzy-matching very short tokens (too many false hits)


@dataclass(frozen=True)
class SkillMatch:
    skill: str
    category: str
    matched_text: str
    match_type: str  # "exact" | "fuzzy"


class SkillTaxonomy:
    def __init__(self, path: str = _TAXONOMY_PATH):
        with open(path, "r", encoding="utf-8") as f:
            raw = json.load(f)

        self.entries = raw
        # term (lowercased) -> (canonical skill, category)
        self.term_to_skill: Dict[str, Tuple[str, str]] = {}
        for entry in raw:
            canonical = entry["skill"]
            category = entry["category"]
            self.term_to_skill[canonical.lower()] = (canonical, category)
            for alias in entry["aliases"]:
                self.term_to_skill[alias.lower()] = (canonical, category)

        self._all_terms = sorted(self.term_to_skill.keys(), key=len, reverse=True)
        self._pattern = self._build_pattern(self._all_terms)
        # For fuzzy pass: only consider terms with reasonable length.
        self._fuzzy_terms = [t for t in self._all_terms if len(t) >= MIN_FUZZY_TERM_LEN]

    @staticmethod
    def _build_pattern(terms: List[str]) -> re.Pattern:
        escaped = [re.escape(t) for t in terms]
        # \b works fine for alnum terms; terms with '/', '.', '+', '#' (C++, C#,
        # Node.js, CI/CD) still get boundary protection from the surrounding
        # lookaround since those chars aren't word chars themselves.
        pattern = r"(?<![\w])(" + "|".join(escaped) + r")(?![\w])"
        return re.compile(pattern, re.IGNORECASE)

    def match_exact(self, text: str) -> Tuple[List[SkillMatch], Set[str]]:
        """Returns matches plus the set of matched character spans (lowercased
        matched substrings) so the fuzzy pass can skip already-covered text."""
        matches: Dict[str, SkillMatch] = {}
        covered_terms: Set[str] = set()

        for m in self._pattern.finditer(text):
            matched_text = m.group(0)
            key = matched_text.lower()
            canonical, category = self.term_to_skill.get(key, (None, None))
            if canonical is None:
                continue
            covered_terms.add(key)
            if canonical not in matches:
                matches[canonical] = SkillMatch(
                    skill=canonical,
                    category=category,
                    matched_text=matched_text,
                    match_type="exact",
                )

        return list(matches.values()), covered_terms

    def match_fuzzy(self, text: str, already_matched_skills: Set[str]) -> List[SkillMatch]:
        """Tokenize into 1-2 word candidate phrases not already matched, then
        fuzzy-compare the unique leftover vocabulary against the taxonomy."""
        words = re.findall(r"[A-Za-z][A-Za-z0-9+.#]*", text)
        candidates: Set[str] = set()
        for i, w in enumerate(words):
            if len(w) >= MIN_FUZZY_TERM_LEN:
                candidates.add(w)
            if i + 1 < len(words):
                bigram = f"{w} {words[i + 1]}"
                if len(bigram) >= MIN_FUZZY_TERM_LEN:
                    candidates.add(bigram)

        results: Dict[str, SkillMatch] = {}
        for cand in candidates:
            best = process.extractOne(
                cand.lower(),
                self._fuzzy_terms,
                scorer=fuzz.token_sort_ratio,
                score_cutoff=FUZZY_SCORE_CUTOFF,
            )
            if not best:
                continue
            matched_term, score, _ = best
            canonical, category = self.term_to_skill[matched_term]
            if canonical in already_matched_skills or canonical in results:
                continue
            results[canonical] = SkillMatch(
                skill=canonical,
                category=category,
                matched_text=cand,
                match_type="fuzzy",
            )

        return list(results.values())

    def match(self, text: str, use_fuzzy: bool = True) -> List[SkillMatch]:
        exact_matches, _covered_terms = self.match_exact(text)
        already = {m.skill for m in exact_matches}
        if not use_fuzzy:
            return exact_matches
        fuzzy_matches = self.match_fuzzy(text, already)
        return exact_matches + fuzzy_matches


@lru_cache(maxsize=1)
def get_taxonomy() -> SkillTaxonomy:
    return SkillTaxonomy()
