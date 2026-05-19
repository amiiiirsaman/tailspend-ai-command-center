// TailSpend — Supplier Flagging Context
// Persists flagged supplier names to localStorage so flags survive page refreshes.
// Flags are keyed by vendor_name (the raw name from the Excel file).
// Each flag can have an optional note and a category tag.

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

export type FlagCategory = "review" | "priority" | "exclude" | "negotiate" | "consolidate";

export interface FlagEntry {
  vendor_name: string;
  cleansed_name: string;
  l1: string;
  l2: string;
  total_spend: number;
  confidence: string;
  tiering: string;
  note: string;
  category: FlagCategory;
  flagged_at: string;
}

interface FlagContextValue {
  flags: Record<string, FlagEntry>;
  isFlagged: (vendorName: string) => boolean;
  addFlag: (entry: Omit<FlagEntry, "flagged_at">) => void;
  removeFlag: (vendorName: string) => void;
  updateNote: (vendorName: string, note: string) => void;
  updateCategory: (vendorName: string, category: FlagCategory) => void;
  clearAllFlags: () => void;
  flagCount: number;
}

const FlagContext = createContext<FlagContextValue | null>(null);
const LS_KEY = "tailspend_flags";

export function FlagProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<Record<string, FlagEntry>>(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) return JSON.parse(stored) as Record<string, FlagEntry>;
    } catch {}
    return {};
  });

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(flags));
    } catch {}
  }, [flags]);

  const isFlagged = useCallback((vendorName: string) => !!flags[vendorName], [flags]);

  const addFlag = useCallback((entry: Omit<FlagEntry, "flagged_at">) => {
    setFlags(prev => ({
      ...prev,
      [entry.vendor_name]: { ...entry, flagged_at: new Date().toISOString() },
    }));
  }, []);

  const removeFlag = useCallback((vendorName: string) => {
    setFlags(prev => {
      const next = { ...prev };
      delete next[vendorName];
      return next;
    });
  }, []);

  const updateNote = useCallback((vendorName: string, note: string) => {
    setFlags(prev => prev[vendorName] ? { ...prev, [vendorName]: { ...prev[vendorName], note } } : prev);
  }, []);

  const updateCategory = useCallback((vendorName: string, category: FlagCategory) => {
    setFlags(prev => prev[vendorName] ? { ...prev, [vendorName]: { ...prev[vendorName], category } } : prev);
  }, []);

  const clearAllFlags = useCallback(() => {
    setFlags({});
    try { localStorage.removeItem(LS_KEY); } catch {}
  }, []);

  return (
    <FlagContext.Provider value={{
      flags,
      isFlagged,
      addFlag,
      removeFlag,
      updateNote,
      updateCategory,
      clearAllFlags,
      flagCount: Object.keys(flags).length,
    }}>
      {children}
    </FlagContext.Provider>
  );
}

export function useFlags() {
  const ctx = useContext(FlagContext);
  if (!ctx) throw new Error("useFlags must be used within FlagProvider");
  return ctx;
}
