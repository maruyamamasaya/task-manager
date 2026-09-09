import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Task Manager", template: "%s | Task Manager" },
  description: "予定・実績・進捗・振り返りをひとつにつなぐタスク管理アプリ",
  applicationName: "Taskflow",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#4f46e5" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
