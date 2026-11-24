import { HomeScreen } from '@/views/screens/HomeScreen';

export const dynamic = 'force-dynamic';

/** Sin codigo en la URL, se cae a la pantalla de inicio donde se teclea. */
export default function JoinIndexPage() {
  return <HomeScreen />;
}
