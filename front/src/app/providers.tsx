"use client";

import { HeroUIProvider } from "@heroui/react";
import { AuthProvider } from "@/contexts/AuthContext";
import { TabletProvider } from "@/contexts/TabletContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <HeroUIProvider>
      <AuthProvider>
        <TabletProvider>{children}</TabletProvider>
      </AuthProvider>
    </HeroUIProvider>
  );
}
