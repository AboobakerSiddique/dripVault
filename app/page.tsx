import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// No auth logic lives here anymore - that's app/auth/confirm/route.ts's job.
// This just routes a plain "/" visit to the right place.
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/home" : "/login");
}
