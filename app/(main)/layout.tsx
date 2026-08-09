import { redirect } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/server";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-bg-0)" }}>
      <Header />
      <div className="flex-1">{children}</div>
      <BottomNav />
    </div>
  );
}
