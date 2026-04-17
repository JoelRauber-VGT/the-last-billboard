// Root layout for Next.js App Router with i18n
// The actual <html> and <body> tags are in src/app/[locale]/layout.tsx
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
