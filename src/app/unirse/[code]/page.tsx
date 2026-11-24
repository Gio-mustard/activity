import { LobbyScreen } from '@/views/screens/LobbyScreen';

export const dynamic = 'force-dynamic';

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <LobbyScreen code={code.toUpperCase()} />;
}
