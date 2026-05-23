import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// Senior Mode lives in its own slice because it has a side-effect: it toggles
// `.senior-mode` on documentElement. The class-sync component (mounted once
// in AppShell) subscribes to this store and applies the class on every change.

type SettingsState = {
  seniorMode: boolean;
  toggleSenior: () => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      seniorMode: false,
      toggleSenior: () => set((s) => ({ seniorMode: !s.seniorMode })),
    }),
    { name: "civis-settings", storage: createJSONStorage(() => localStorage) },
  ),
);
