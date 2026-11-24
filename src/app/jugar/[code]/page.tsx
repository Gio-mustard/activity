import { BuzzerScreen } from '@/views/screens/BuzzerScreen';

export const dynamic = 'force-dynamic';

export default async function PlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <BuzzerScreen code={code.toUpperCase()} />;
}
