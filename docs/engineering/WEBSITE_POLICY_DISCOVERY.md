# Website privacy-policy discovery

Status: built on synthetic loopback sites, pending Codex review. Acceptance NOT_RUN. Migration 0077, contract 0.51.0.

## Who uses it, and how

The organisation's privacy staff, in the workspace: **Website consent → a site → Privacy policy on the website**. It applies to the organisation's own website, registered as a site whose origins a second person approved. Data Principals do not use this screen. They read the policy on the organisation's website as they always have.

## The handshake

1. ORVIA opens the approved origin's home page. This is one page; ORVIA does not crawl.
2. It asks the page where the policy is, in the way the site declares it: `<link rel="privacy-policy" href="…">`. This is a registered HTML link type, and `rel="terms-of-service"` is read alongside it.
3. Only if there is no declaration does ORVIA take a link on the same page whose **whole** text names the policy: "Privacy policy", "Privacy notice", "गोपनीयता नीति", and so on. The result says it was found this way and asks the site to declare it. A link that merely contains "privacy" (for example, "Privacy tips for shoppers") is never taken.
4. If the policy is on an approved origin, ORVIA reads that one document. It keeps the rendered text, its SHA-256 digest, the title, the language and Last-Modified.
5. The result is compared with the previous discovery for the site:
   - changed text is flagged;
   - a moved address is noted;
   - a missing, unreachable or near-empty policy is marked HIGH.
6. A changed or failed policy appears in **Operations attention** until someone records a review. A discovery is reviewed only once, and is never edited or deleted.
7. The worker rediscovers every enabled site weekly by itself. Discoveries a person asks for run before the weekly ones.

## What it never does

- It never reads a policy on an origin that has not been approved. It reports that the policy is there and asks for the origin to be approved.
- It never contacts the site's third parties. While reading, every request to an unapproved origin is aborted, and images, media and fonts are not loaded. Chromium's own background services (updates, metrics, safe browsing) are switched off for this browser and for the consent scanner (`services/worker/src/local-browser.ts`).
- It never judges the policy. Detecting a change is not a legal review against the DPDP Act or the notices recorded in ORVIA.

## Evidence

`tests/integration/expansion/policy-discovery.test.ts` passed 30/30 on codex-a00 (synthetic loopback sites). It covers:
- declared and undeclared policies, including a Hindi link;
- a missing policy, a policy on another origin, a broken address and an empty page;
- an unchanged recheck, a changed policy and its review;
- no crawl, and the tracker never contacted;
- the weekly schedule;
- permissions, tenancy and database guards.

## Limits

- Only synthetic loopback sites have been tested. No real website has been read.
- A site that builds its links only after user interaction is not seen; the page is read after it loads.
- A JS-rendered link that needs a script from an unapproved origin is not seen, because those requests are blocked.
- Comparison is exact on the normalised text, so a formatting change that alters the text counts as a change.
