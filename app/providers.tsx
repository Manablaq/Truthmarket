"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WalletProvider } from "./components/wallet-provider";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WalletProvider>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WalletProvider>
  );
}
