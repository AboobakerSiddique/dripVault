import LogoutButton from "@/components/LogoutButton";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count: itemCount } = await supabase
    .from("clothing_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user!.id);

  const { count: outfitCount } = await supabase
    .from("outfits")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user!.id);

  return (
    <div className="px-5 pt-8 pb-4 max-w-md mx-auto">
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700 }} className="text-xl mb-1">
        MY PROFILE
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>{user?.email}</p>

      <div className="grid grid-cols-2 gap-2 mb-6">
        {[["Items", itemCount ?? 0], ["Outfits", outfitCount ?? 0]].map(([label, n]) => (
          <div
            key={label as string}
            className="rounded-xl p-4 text-center border"
            style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)" }}
          >
            <p className="text-lg" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{n}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{label}</p>
          </div>
        ))}
      </div>

      <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
        Style profile fills in as you rate outfits — that&apos;s a later phase.
      </p>

      <LogoutButton />
    </div>
  );
}
