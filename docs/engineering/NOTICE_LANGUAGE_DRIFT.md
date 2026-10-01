# Eighth Schedule language drift guard (NoticeContextDrift)

**Basis:**
- DPDP Act s5(3): a person may read the notice in English or in any language in the Eighth Schedule.
- DPDP Rules, Rule 3.
- Migration `0078_notice_translation_basis.sql`.

**Status:** built; synthetic data only; not release-qualified.

## What it guards

Each notice is published per language, and each language has its own version history. A language version is *out of step* when people reading it are told something different from the organisation's latest statement.

ORVIA compares the facts a person consents on: the **purposes** and **data categories** a version lists. Each currently published language is given one of these states:

| State | Meaning |
|---|---|
| `REFERENCE` | The most recently published original, meaning a version not recorded as a translation. English is not assumed: an original in Tamil or Hindi can be the reference. |
| `SCOPE_MISMATCH` | It lists different purposes or data categories from the reference. People reading it are told a different scope. |
| `BEHIND_ITS_SOURCE` | It translates a version that has since been replaced. The scope still matches, but the wording may not. |
| `MAY_BE_BEHIND` | An older original with the same scope, not recorded as a translation of the reference. Someone should check the wording. |
| `IN_STEP` | It has the same scope as the reference. |

## Where it acts

1. **Publication (runtime).** Publishing a version is refused (HTTP 409) while any other language of the notice is out of step. The refusal carries one field error per affected language.
   - Acknowledgement is needed only when the changes statement itself changes.
   - The person's chosen language is kept.
   - Test: `tests/integration/operations/notice-language-drift.test.ts`.
2. **Operations attention.** `NOTICE_LANGUAGE_DRIFT` lists every notice with a language out of step. The `notice_language_drift` route gives the full report.
3. **CI guard (NoticeContextDrift).** `tests/unit/notice-context-drift.test.ts` runs on every push through `pnpm test` in the source-validation workflow. It needs no database.
   - It checks the state rules above in nine scenarios.
   - It proves it would notice a regression: five deliberately broken versions of the rules must each fail at least one scenario. The broken versions are:
     - the oldest version taken as the reference;
     - translations counted as originals;
     - data categories ignored;
     - a replaced source treated as current;
     - scope differences ignored.

## Translation equivalence: the reviewed method

ORVIA **does not translate and does not judge a translation**. It makes no claim that wording is legally equivalent across the 22 Eighth Schedule languages. The method is:

1. The translation is prepared and reviewed by people the organisation appoints, outside ORVIA.
2. When it is published, it records the version it translates (`translates_version_id`). That record is what makes `BEHIND_ITS_SOURCE` detectable once the source changes.
3. The scope (purposes and data categories) must match the reference before publication succeeds.
4. Equivalence of wording remains the organisation's reviewed attestation, recorded with the publication evidence. ORVIA reports when a translation *may* be stale. It never reports a translation as equivalent.

## Not claimed

- No automatic legal-equivalence check of wording, in any language.
- No requirement to publish in all 22 languages: the Act allows English or any Eighth Schedule language. Languages without a notice are listed for information.
