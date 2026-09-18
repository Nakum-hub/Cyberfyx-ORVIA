# ORVIA design system

**Scope:** the customer-local synthetic prototype interface. **Source of truth:**
`apps/web/src/app/globals.css` (tokens and component classes) and `apps/web/src/components/ui.tsx`
(primitives). Nothing here is decorative for its own sake: every rule exists to make a privacy-control fact
easier to read correctly, or harder to read incorrectly.

## Constraints that shaped it

- **Local only.** System font stack, no remote font, no CDN stylesheet, no icon font, no image request, no
  analytics beacon. Every glyph in the interface is a text character.
- **Truthfulness first.** A component may not be capable of drawing an unverified state in a success tone.
  That is enforced by construction: status tone comes from the canonical enum dictionaries in
  `state-labels.ts`, not from the caller.
- **Never colour alone.** Every status carries a glyph, its own words and a colour.

## Voice

Enterprise, calm, evidence-oriented. Not consumer fintech, not "cyber". Sentences state a fact and then its
limit: *"The target accepted the request. Acceptance is the target talking about itself; it is not proof
that the required state is now in place."*

## Tokens

| Group | Tokens | Notes |
|---|---|---|
| Ink | `--ink` `--ink-soft` `--ink-faint` `--ink-invert` | Slate, not pure black |
| Surface | `--canvas` `--panel` `--panel-sunken` `--panel-inverse` | Canvas is cool neutral so white panels read as content |
| Line | `--line` `--line-strong` | Hairlines carry structure instead of shadows |
| Accent | `--accent` `--accent-strong` `--accent-soft` `--accent-line` | One restrained navy. Never used for status |
| Status | `--ok` `--warn` `--stop` `--unknown` `--neutral` + `-soft` / `-line` | `--unknown` is deliberately violet, not grey or amber: uncertainty is its own state |
| Shape | `--r-sm` 4 · `--r-md` 8 · `--r-lg` 12 · `--r-pill` | |
| Space | `--s1` 4 … `--s9` 56 | 4px base |
| Elevation | `--shadow-sm` `--shadow-md` `--shadow-lg` | Panels use `sm`; only dialogs use `lg` |
| Type | 11 · 12 · 12.5 · 13 · 14 · 15 · 17 · 18 · 22 · 24 · 30 px | Base 15px/1.55 |

## Status language

| Tone | Glyph | Meaning in ORVIA | Example |
|---|---|---|---|
| `ok` | ✓ | Established by a fresh, satisfied, current-generation independent read | Independently observed |
| `info` | • | Informational or in progress; no claim about effect | Running · Independent scoped read |
| `warn` | ! | Real but not sufficient; a person has to do something | Acknowledged · Manual required · Observation expired |
| `unknown` | ? | The outcome genuinely is not known | Effect unknown · Unverifiable |
| `stop` | × | A definite negative fact | Failed · Observed not satisfied |
| `neutral` | – | Nothing has happened yet | Pending · Not run · Skipped |

`ACKNOWLEDGED` is `warn`, never `ok`. `EFFECT_UNKNOWN` is `unknown`, never `warn`-as-nearly-fine and never
`ok`. An unrecognised enum value renders unchanged in `unknown` tone with an explicit note that it must not
be read as success.

## Components

| Component | Purpose |
|---|---|
| `PageHead` | Eyebrow, title, one-sentence lede, right-aligned status/actions |
| `Section` | Small uppercase label + optional right-aligned aside; `aria-label`ed landmark |
| `Metric` | One real count. Has no slot for a trend, target, percentage or score |
| `Badge` / `StateBadge` | Status pill; `StateBadge` binds to a canonical enum dictionary |
| `NoticeBox` | Tone-carrying explanation block |
| `TechnicalDetails` | The single home for identifiers, digests, versions and raw enum values |
| `Facts` | Definition list; collapses to one column below 720px |
| `Lifecycle` | The eight-stage explanatory strip. Navigation, never runtime state |
| `Flow` | Vertical declared-relationship view with connector rail and per-node tone |
| `StoryCell` | Label-over-value cell used by the demonstration and summary cards |
| `verify-split` | Two panes: *Action — what ORVIA requested* and *Verification — what ORVIA independently observed* |
| `QueryBoundary` | Loading, failure, denied, unavailable and empty in one accessible place |
| `Timeline` | Ordered record with per-entry tone, category and optional identifiers |

### The verification split

The most important component in the product is a layout rule, not a widget: an action and its verification
are always two adjacent panes with different backgrounds and their own headings, followed by the line
**"API success is not the same as verification."** They are never merged into one status.

## States every screen implements

Loading (`Loading`), empty (`EmptyState`), failure (`FailureState`, `role="alert"`, keeps `request_id`),
forbidden (`StaffArea` capability notice), unauthenticated (`DomainGuard`), wrong actor domain, stale
(`Freshness` says the displayed snapshot is stale), unknown (`unknown` tone), manual (`warn` tone with the
attributed-action path), dependency unavailable (`PendingIntegration`), not found and server error
(`not-found.tsx` / `error.tsx` inside the ORVIA shell, HTTP 404 preserved, no stack trace).

## Motion

Only four: a pulsing loading dot, a skeleton shimmer, a 140ms dialog entrance, and a 120ms hover lift on
link cards. All of it is disabled under `prefers-reduced-motion: reduce`.

## Responsive

| Width | Behaviour |
|---|---|
| ≥1024px | Grouped sidebar navigation, 4-up metrics, 4×2 lifecycle, side-by-side verification split |
| 768–1023px | Navigation becomes a horizontal scroller with group labels hidden |
| ≤720px | Header stacks, `Facts` becomes one column, verification panes stack, lifecycle goes 2-up then 1-up |

A print stylesheet drops navigation, the banner and buttons, and prevents panels breaking across pages.

## Rules for anyone extending this

1. Take the status tone from `state-labels.ts`. Do not pass a literal tone for a canonical enum.
2. If a value is an identifier, a digest or a raw enum, it belongs in `TechnicalDetails`.
3. If the API does not return it, do not render it — not as `—`, not as an inferred stage. Say what is
   absent and why.
4. A new metric must be one value the server actually returned. If you want a ratio, show both numbers.
5. Any new label that could be read as "this is done" must be reachable only from a fresh, satisfied,
   current-generation `SCOPED_READ`.
