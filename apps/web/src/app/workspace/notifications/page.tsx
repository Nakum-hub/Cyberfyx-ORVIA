'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { NotificationTasks } from '../../../components/screens/notifications.tsx';
export default function Page(){return <StaffArea capability="notification.read">{()=><NotificationTasks/>}</StaffArea>;}
