'use client';
import { Overview } from '../../components/overview.tsx';
import { StaffArea } from '../../components/workspace.tsx';

export default function WorkspacePage() {
  return <StaffArea capability="overview.read">{session => <Overview session={session} />}</StaffArea>;
}
