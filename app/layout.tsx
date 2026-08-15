import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Moncast — Onchain Commitment Protocol on Monad",
  description: "抛锚立约，一诺上链，坚持自动发生。可验证目标、自动履约与契约内闭环结算。",
  icons: { icon: "/moncast-mark.svg" },
  openGraph: {
    title: "Moncast",
    description: "抛锚立约，一诺上链，坚持自动发生。",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
