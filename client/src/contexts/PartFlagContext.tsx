// TailSpend — Part Flagging Context
// Persists per-part flags (note, category, custom online price/url) to
// localStorage so a BD analyst's annotations survive page refreshes.
// Keyed by part_number (must be unique in the dataset).

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

export type PartFlagCategory =
  | "review"
  | "priority"
  | "negotiate"
  | "sole-source-risk"
  | "exclude";

export interface PartFlagEntry {
  part_number: string;
  nomenclature: string;
  oem: string;
  ata_description: string;
  airline_source: string;
  total_cost: number | null;
  is_sole_source: boolean;
  note: string;
  category: PartFlagCategory;
  custom_online_price: number | null;
  custom_price_url: string;
  flagged_at: string;
}

interface PartFlagContextValue {
  flags: Record<string, PartFlagEntry>;
  isFlagged: (partNumber: string) => boolean;
  getFlag: (partNumber: string) => PartFlagEntry | undefined;
  addFlag: (entry: Omit<PartFlagEntry, "flagged_at">) => void;
  removeFlag: (partNumber: string) => void;
  clearAll: () => void;
  flagCount: number;
}

const PartFlagContext = createContext<PartFlagContextValue | null>(null);
const LS_KEY = "tailspend_part_flags";

export function PartFlagProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<Record<string, PartFlagEntry>>(() => {
    try {
      const s = localStorage.getItem(LS_KEY);
      if (s) return JSON.parse(s) as Record<string, PartFlagEntry>;
    } catch {}
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(flags));
    } catch {}
  }, [flags]);

  const isFlagged = useCallback((p: string) => !!flags[p], [flags]);
  const getFlag = useCallback((p: string) => flags[p], [flags]);

  const addFlag = useCallback((entry: Omit<PartFlagEntry, "flagged_at">) => {
    setFlags((prev) => ({
      ...prev,
      [entry.part_number]: {
        ...entry,
        flagged_at: new Date().toISOString(),
      },
    }));
  }, []);

  const removeFlag = useCallback((p: string) => {
    setFlags((prev) => {
      const next = { ...prev };
      delete next[p];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setFlags({});
    try {
      localStorage.removeItem(LS_KEY);
    } catch {}
  }, []);

  return (
    <PartFlagContext.Provider
      value={{
        flags,
        isFlagged,
        getFlag,
        addFlag,
        removeFlag,
        clearAll,
        flagCount: Object.keys(flags).length,
      }}
    >
      {children}
    </PartFlagContext.Provider>
  );
}

export function usePartFlags() {
  const ctx = useContext(PartFlagContext);
  if (!ctx) throw new Error("usePartFlags must be used within PartFlagProvider");
  return ctx;
}

export const PART_FLAG_CATEGORIES: {
  value: PartFlagCategory;
  label: string;
  color: string;
  bg: string;
}[] = [
  { value: "review", label: "For Review", color: "#F59E0B", bg: "#FEF3C7" },
  { value: "priority", label: "Priority", color: "#EF4444", bg: "#FEE2E2" },
  { value: "negotiate", label: "Negotiate", color: "#4A90D9", bg: "#DBEAFE" },
  { value: "sole-source-risk", label: "Sole-source Risk", color: "#E87722", bg: "rgba(232,119,34,0.1)" },
  { value: "exclude", label: "Exclude", color: "#6B7280", bg: "#F3F4F6" },
];
