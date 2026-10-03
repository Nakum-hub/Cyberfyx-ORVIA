/** The Cyberfyx ORVIA mark in the application header: the shield (a local static asset) and the wordmark from the sign-in. */
export function BrandMark() {
  return (
    <span className="mark" role="img" aria-label="Cyberfyx ORVIA">
      <img className="mark-shield" src="/brand/shield.png" alt="" width={22} height={30} />
      <span className="mark-name" aria-hidden="true">CYBERFYX</span>
      <span className="mark-orvia" aria-hidden="true">ORVIA</span>
    </span>
  );
}
