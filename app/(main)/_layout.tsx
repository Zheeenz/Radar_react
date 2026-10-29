import { Slot } from 'expo-router';
import { AppShell } from '../../src/components/AppShell';
export default function MainLayout() { return <AppShell><Slot /></AppShell>; }
