import { createContext, useContext, useState, useMemo, useCallback } from "react";
import type { DashboardData } from "./types";
import { useData } from "./data";
import type { PricingConfig, CustomPrice } from "./pricing";
import {
  loadConfig,
  saveConfig,
  getEffectivePricing,
  calculateCost,
  detectModels,
  getDefaultConfig,
} from "./pricing";

interface PricingContextValue {
  config: PricingConfig;
  detectedModels: string[];
  currencySymbol: string;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  updateModelMapping: (modelName: string, pricingEntryId: string | null) => void;
  updateCustomPricing: (modelName: string, pricing: CustomPrice | null) => void;
  resetConfig: () => void;
}

const PricingContext = createContext<PricingContextValue | null>(null);

export function usePricingConfig(): PricingContextValue {
  const ctx = useContext(PricingContext);
  if (!ctx) throw new Error("usePricingConfig must be used within PricingProvider");
  return ctx;
}

export function PricingProvider({ children }: { children: React.ReactNode }) {
  const rawData = useData();
  const [isOpen, setOpen] = useState(false);

  const initialConfig = useMemo(() => loadConfig(rawData), [rawData]);
  const [config, setConfig] = useState<PricingConfig>(initialConfig);

  const detectedModels = useMemo(() => detectModels(rawData), [rawData]);

  const currencySymbol = useMemo(() => {
    const firstModel = detectedModels[0];
    if (!firstModel) return "$";
    const pricing = getEffectivePricing(firstModel, config);
    return pricing.currency === "cny" ? "¥" : "$";
  }, [detectedModels, config]);

  const updateConfig = useCallback(
    (updater: (prev: PricingConfig) => PricingConfig) => {
      setConfig((prev) => {
        const next = updater(prev);
        saveConfig(next);
        return next;
      });
    },
    []
  );

  const updateModelMapping = useCallback(
    (modelName: string, pricingEntryId: string | null) => {
      updateConfig((prev) => {
        const next = { ...prev, modelMappings: { ...prev.modelMappings }, customPricing: { ...prev.customPricing } };
        if (pricingEntryId) {
          next.modelMappings[modelName] = pricingEntryId;
          delete next.customPricing[modelName];
        } else {
          delete next.modelMappings[modelName];
        }
        return next;
      });
    },
    [updateConfig]
  );

  const updateCustomPricing = useCallback(
    (modelName: string, pricing: CustomPrice | null) => {
      updateConfig((prev) => {
        const next = { ...prev, modelMappings: { ...prev.modelMappings }, customPricing: { ...prev.customPricing } };
        if (pricing) {
          next.customPricing[modelName] = pricing;
          delete next.modelMappings[modelName];
        } else {
          delete next.customPricing[modelName];
        }
        return next;
      });
    },
    [updateConfig]
  );

  const resetConfig = useCallback(() => {
    const defaults = getDefaultConfig(rawData);
    setConfig(defaults);
    saveConfig(defaults);
  }, [rawData]);

  return (
    <PricingContext.Provider
      value={{ config, detectedModels, currencySymbol, isOpen, setOpen, updateModelMapping, updateCustomPricing, resetConfig }}
    >
      {children}
    </PricingContext.Provider>
  );
}

export function useRecalculatedData(): DashboardData {
  const rawData = useData();
  const { config } = usePricingConfig();

  return useMemo(() => {
    const result = JSON.parse(JSON.stringify(rawData)) as DashboardData;

    for (const [modelName, modelData] of Object.entries(result.models)) {
      const pricing = getEffectivePricing(modelName, config);

      for (const sessionData of Object.values(modelData.sessions)) {
        for (const turn of sessionData.turns) {
          turn.cost = calculateCost(turn.input, turn.output, turn.cache_read, pricing);
        }
        sessionData.stats.cost = sessionData.turns.reduce((sum, t) => sum + t.cost, 0);
      }

      modelData.stats.cost = Object.values(modelData.sessions).reduce((sum, s) => sum + s.stats.cost, 0);
    }

    result.grand_total.cost = Object.values(result.models).reduce((sum, m) => sum + m.stats.cost, 0);

    return result;
  }, [rawData, config]);
}
