import { ConfigScreen } from '@/views/screens/ConfigScreen';

export const dynamic = 'force-dynamic';

export default async function ConfigPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <ConfigScreen code={code.toUpperCase()} />;
}
