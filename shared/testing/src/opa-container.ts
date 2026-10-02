/** Only the explicitly reserved synthetic stack may override a Compose name. */
export function opaContainer(profile: { profile: string; compose_project: string }) {
  const override = process.env.ORVIA_TEST_OPA_CONTAINER;
  if (!override) return `${profile.compose_project}-opa-1`;
  if (profile.profile !== 'codex-a00' || override !== 'orvia-round9-opa') throw new Error('Unapproved synthetic OPA container override');
  return override;
}
