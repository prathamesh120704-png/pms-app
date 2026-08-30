import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AlignPMS — Performance Appraisals Reimagined",
  description:
    "From weighted SMART goal planning to side-by-side manager appraisals and HR cycle governance—all in one auditable platform.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 font-sans text-zinc-900">
        <ClerkProvider
          publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
          signInFallbackRedirectUrl="/dashboard"
          signUpFallbackRedirectUrl="/dashboard"
          appearance={{
            variables: {
              colorBackground: "#ffffff",
              colorInputBackground: "#fafafa",
              colorInputText: "#18181b",
              colorPrimary: "#4f46e5",
              colorText: "#52525b",
            },
          }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
