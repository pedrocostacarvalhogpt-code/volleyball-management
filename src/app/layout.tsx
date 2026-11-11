import type { Metadata } from "next";
import "./styles.css";
export const metadata: Metadata = { title: "Volleyball Club", description: "Gestão de clubes de voleibol", manifest: "/manifest.webmanifest" };
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="pt"><body>{children}</body></html>}
