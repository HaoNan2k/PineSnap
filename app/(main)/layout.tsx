import { MainLayoutWrapper } from "@/components/main-layout-wrapper";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayoutWrapper>{children}</MainLayoutWrapper>;
}
