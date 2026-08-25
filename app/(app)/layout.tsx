import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <div className="min-h-screen md:flex"><Sidebar email={user.email ?? "ユーザー"} /><main className="min-w-0 flex-1 px-5 py-7 pb-24 sm:px-8 lg:px-12 lg:py-10">{children}</main></div>;
}
