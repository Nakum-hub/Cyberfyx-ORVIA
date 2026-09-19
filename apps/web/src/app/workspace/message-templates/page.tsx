'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { NotificationTemplates } from '../../../components/screens/notifications.tsx';
export default function Page(){return <StaffArea capability="notification.read">{()=><NotificationTemplates/>}</StaffArea>;}
