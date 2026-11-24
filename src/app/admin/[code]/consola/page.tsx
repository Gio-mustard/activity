import { ConsoleScreen } from '@/views/screens/ConsoleScreen';

export const dynamic = 'force-dynamic';

export default async function ConsolePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <ConsoleScreen code={code.toUpperCase()} />;
}
