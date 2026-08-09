import BottomNav from "@/components/BottomNav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-bg-0)" }}>
      <div className="flex-1">{children}</div>
      <BottomNav />
    </div>
  );
}
