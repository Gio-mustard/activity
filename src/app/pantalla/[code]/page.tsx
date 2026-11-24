import { ScreenView } from '@/views/screens/ScreenView';

export const dynamic = 'force-dynamic';

export default async function ProjectorPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <ScreenView code={code.toUpperCase()} />;
}
