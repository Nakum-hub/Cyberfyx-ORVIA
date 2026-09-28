/**
 * VENDOR SIDE. The subscription tiers the vendor sells, and how many member
 * logins each option allows. The website shows these; the licence issued for a
 * purchase carries the chosen option's seats as `licensed_limits.member_seats`,
 * which the customer installation enforces. Owner (ORG_SUPER_ADMIN) and
 * administrator (ORG_ADMIN) logins are included with every tier and are not
 * counted.
 *
 * Status of this catalogue (2026-09-28):
 * - Tier 1 options (5 and 10 members) are as stated by the product owner.
 * - Tiers 2 and 3 have no options yet: the team has not decided them. An
 *   option that does not exist cannot be issued.
 * - Tier-to-edition mapping (Tier 1 = FOUNDATION, Tier 2 = CONTROL, Tier 3 =
 *   ENTERPRISE) is an engineering assumption awaiting confirmation.
 * - Payments: Indian providers only; Razorpay selected (2026-09-28, see
 *   docs/engineering/PAYMENTS_PROVIDER_DECISION.md). Prices, taxes and billing
 *   periods stay absent until the team approves commercial terms.
 */
export type PlanOption = { code: string; label: string; member_seats: number };
export type Tier = { code: string; name: string; edition: 'FOUNDATION' | 'CONTROL' | 'ENTERPRISE'; options: PlanOption[] };

export const INCLUDED_LOGINS = { ORG_SUPER_ADMIN: 1, ORG_ADMIN: 1 } as const;

export const CATALOGUE: readonly Tier[] = [
  { code: 'tier_1', name: 'Tier 1', edition: 'FOUNDATION', options: [
    { code: 'tier_1_members_5', label: 'Up to 5 members', member_seats: 5 },
    { code: 'tier_1_members_10', label: 'Up to 10 members', member_seats: 10 },
  ] },
  { code: 'tier_2', name: 'Tier 2', edition: 'CONTROL', options: [] },
  { code: 'tier_3', name: 'Tier 3', edition: 'ENTERPRISE', options: [] },
];

/** Structural checks, so a catalogue edit cannot quietly produce a nonsensical seat count. */
export function validateCatalogue(catalogue: readonly Tier[] = CATALOGUE) {
  const codes = new Set<string>();
  for (const tier of catalogue) {
    if (!/^[a-z][a-z0-9_]{1,40}$/.test(tier.code) || codes.has(tier.code)) throw new Error(`Invalid or duplicate tier code ${tier.code}`);
    codes.add(tier.code);
    for (const option of tier.options) {
      if (!/^[a-z][a-z0-9_]{1,60}$/.test(option.code) || codes.has(option.code)) throw new Error(`Invalid or duplicate option code ${option.code}`);
      codes.add(option.code);
      if (!Number.isInteger(option.member_seats) || option.member_seats < 1 || option.member_seats > 10000) throw new Error(`Option ${option.code} must allow 1 to 10000 members`);
    }
  }
  return catalogue;
}

export function findOption(optionCode: string, catalogue: readonly Tier[] = CATALOGUE) {
  for (const tier of validateCatalogue(catalogue)) {
    const option = tier.options.find(o => o.code === optionCode);
    if (option) return { tier, option };
  }
  throw new Error(`No plan option ${optionCode} in the catalogue. Tiers without options have not been defined yet.`);
}
