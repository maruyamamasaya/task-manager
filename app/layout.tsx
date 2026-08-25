import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Task Manager", template: "%s | Task Manager" },
  description: "予定・実績・進捗・振り返りをひとつにつなぐタスク管理アプリ",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
