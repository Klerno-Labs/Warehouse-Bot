import type { Metadata } from "next";
import { Providers } from "./providers";
import "../client/src/index.css";

export const metadata: Metadata = {
  title: "Warehouse Core Platform",
  description: "Enterprise warehouse management platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
