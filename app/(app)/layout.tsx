import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <div className="min-h-screen md:flex"><Sidebar email={user.email ?? "ユーザー"} /><main className="min-w-0 flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-8 xl:px-10"><div className="mx-auto max-w-[1600px]">{children}</div></main></div>;
}
