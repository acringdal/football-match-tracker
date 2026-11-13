import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Football Match Tracker",
  description: "Follow your favourite teams across football tournaments",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "Arial, Helvetica, sans-serif",
          background: "#f5f6f8",
          color: "#17202a",
        }}
      >
        {children}
      </body>
    </html>
  );
}
