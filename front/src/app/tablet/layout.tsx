import { TabletProvider } from '@/contexts/TabletContext';

export default function TabletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TabletProvider>{children}</TabletProvider>;
}
