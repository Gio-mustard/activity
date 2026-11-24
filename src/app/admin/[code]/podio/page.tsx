import { PodiumScreen } from '@/views/screens/PodiumScreen';

export const dynamic = 'force-dynamic';

export default async function PodiumPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <PodiumScreen code={code.toUpperCase()} />;
}
