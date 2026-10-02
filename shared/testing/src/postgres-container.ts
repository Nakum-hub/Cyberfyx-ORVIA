/** A bounded override for the existing synthetic qualification stack. */
export function postgresContainer(profile: { profile: string; compose_project: string }) {
  const override = process.env.ORVIA_TEST_POSTGRES_CONTAINER;
  if (!override) return `${profile.compose_project}-postgres-1`;
  if (profile.profile !== 'codex-a00' || override !== 'orvia-qualification-20260930-postgres') throw new Error('Unapproved synthetic PostgreSQL container override');
  return override;
}
