import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.extraction.skills import get_taxonomy  # noqa: E402


def test_exact_alias_match():
    taxonomy = get_taxonomy()
    matches, _ = taxonomy.match_exact("Proficient in JS, Python, and ML.")
    names = {m.skill for m in matches}
    assert "JavaScript" in names
    assert "Python" in names
    assert "Machine Learning" in names


def test_word_boundary_avoids_false_positive_on_r():
    taxonomy = get_taxonomy()
    matches, _ = taxonomy.match_exact("We are hiring for the marketing team.")
    names = {m.skill for m in matches}
    assert "R" not in names


def test_fuzzy_catches_typo():
    taxonomy = get_taxonomy()
    matches = taxonomy.match("Experience with Kubernetes and Dockerr containers.")
    names = {m.skill for m in matches}
    assert "Kubernetes" in names


def test_compound_terms_like_cplusplus():
    taxonomy = get_taxonomy()
    matches, _ = taxonomy.match_exact("Strong background in C++ and C#.")
    names = {m.skill for m in matches}
    assert "C++" in names
    assert "C#" in names


if __name__ == "__main__":
    test_exact_alias_match()
    test_word_boundary_avoids_false_positive_on_r()
    test_fuzzy_catches_typo()
    test_compound_terms_like_cplusplus()
    print("All skills tests passed.")
