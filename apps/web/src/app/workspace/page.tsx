'use client';
import { Overview } from '../../components/screens/overview.tsx';
import { StaffArea } from '../../components/shared/workspace.tsx';

export default function WorkspacePage() {
  return <StaffArea capability="overview.read">{session => <Overview session={session} />}</StaffArea>;
}
