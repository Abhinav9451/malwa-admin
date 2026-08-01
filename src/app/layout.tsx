import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { ThemeProvider, themeScript } from "@/lib/theme";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Malwa Builders — Admin Panel",
  description:
    "Projects, payments, reminders, materials and hisab-kitab for Malwa Builders, Jagraon.",
};

export const viewport: Viewport = {
  themeColor: "#10141a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <StoreProvider>
            <ToastProvider>{children}</ToastProvider>
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
