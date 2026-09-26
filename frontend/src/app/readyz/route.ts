import { readinessRoute } from '@orvia/backend';
export const dynamic='force-dynamic';
export function GET() { return readinessRoute(); }
