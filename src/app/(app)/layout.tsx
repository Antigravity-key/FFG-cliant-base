import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, role")
    .eq("id", user.id)
    .single();

  const email = profile?.email ?? user.email ?? "";
  const role = (profile?.role ?? "staff") as "owner" | "staff";

  return (
    <div className="min-h-dvh flex flex-col">
      <TopNav email={email} role={role} />
      <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-6 py-4 sm:py-6 pb-20 md:pb-6">
        {children}
      </main>
    </div>
  );
}
