"use client";

import { createContext, useContext } from "react";

const MaintenanceContext = createContext<string[]>([]);

export function MaintenanceProvider({
  enabledKeys,
  children,
}: {
  enabledKeys: string[];
  children: React.ReactNode;
}) {
  return (
    <MaintenanceContext.Provider value={enabledKeys}>
      {children}
    </MaintenanceContext.Provider>
  );
}

export function useMaintenanceEnabled(pageKey: string) {
  return useContext(MaintenanceContext).includes(pageKey);
}
