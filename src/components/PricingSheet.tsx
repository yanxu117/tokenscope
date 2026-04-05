import { usePricingConfig } from "../PricingContext";
import { PRICING_DB, findPricingEntry, type CustomPrice } from "../pricing";
import { useLang, useTranslations } from "../i18n";
import { X, RotateCcw } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";

export default function PricingSheet() {
  const { config, detectedModels, isOpen, setOpen, updateModelMapping, updateCustomPricing, resetConfig } =
    usePricingConfig();
  const { lang } = useLang();
  const tr = useTranslations(lang);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={() => setOpen(false)}
      />
      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-[420px] max-w-full bg-background border-l border-border z-50 shadow-xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold">{tr.modelPricing}</h2>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <p className="text-xs text-muted-foreground">
            {tr.detectedModels}: {detectedModels.length}
          </p>

          {detectedModels.map((modelName) => (
            <ModelConfigRow
              key={modelName}
              modelName={modelName}
              mapping={config.modelMappings[modelName]}
              custom={config.customPricing[modelName]}
              onMappingChange={(id) => updateModelMapping(modelName, id)}
              onCustomChange={(cp) => updateCustomPricing(modelName, cp)}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={resetConfig} className="w-full gap-2">
            <RotateCcw className="w-3 h-3" />
            {tr.resetToDefaults}
          </Button>
        </div>
      </div>
    </>
  );
}

function ModelConfigRow({
  modelName,
  mapping,
  custom,
  onMappingChange,
  onCustomChange,
}: {
  modelName: string;
  mapping?: string;
  custom?: CustomPrice;
  onMappingChange: (id: string | null) => void;
  onCustomChange: (cp: CustomPrice | null) => void;
}) {
  const { lang } = useLang();
  const tr = useTranslations(lang);
  const [isCustom, setIsCustom] = useState(!!custom);
  const [customInput, setCustomInput] = useState(custom?.input ?? 0);
  const [customOutput, setCustomOutput] = useState(custom?.output ?? 0);
  const [customCacheRead, setCustomCacheRead] = useState(custom?.cacheRead ?? 0);
  const [customCurrency, setCustomCurrency] = useState<"usd" | "cny">(custom?.currency ?? "usd");

  const currentEntry = mapping ? findPricingEntry(mapping) : undefined;

  const handleSelectChange = (value: string) => {
    if (value === "__custom__") {
      setIsCustom(true);
    } else {
      setIsCustom(false);
      onMappingChange(value || null);
      onCustomChange(null);
    }
  };

  const handleCustomApply = () => {
    onCustomChange({
      input: customInput,
      output: customOutput,
      cacheRead: customCacheRead,
      currency: customCurrency,
    });
  };

  // Group pricing entries by provider
  const providers = PRICING_DB.reduce<Record<string, typeof PRICING_DB>>((acc, entry) => {
    if (!acc[entry.provider]) acc[entry.provider] = [];
    acc[entry.provider].push(entry);
    return acc;
  }, {});

  const curSymbol = (c: string) => (c === "cny" ? "¥" : "$");

  return (
    <div className="space-y-2.5 rounded-lg border border-border p-3">
      {/* Model name + current pricing preview */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold font-mono">{modelName}</span>
        {currentEntry && (
          <span className="text-[10px] text-muted-foreground">
            {curSymbol(currentEntry.currency)}
            {currentEntry.input}/{curSymbol(currentEntry.currency)}
            {currentEntry.output}/{curSymbol(currentEntry.currency)}
            {currentEntry.cacheRead}
          </span>
        )}
        {custom && (
          <span className="text-[10px] text-muted-foreground">
            {curSymbol(custom.currency)}
            {custom.input}/{curSymbol(custom.currency)}
            {custom.output}/{curSymbol(custom.currency)}
            {custom.cacheRead}
          </span>
        )}
      </div>

      {/* Pricing selector */}
      <select
        value={isCustom ? "__custom__" : (mapping ?? "")}
        onChange={(e) => handleSelectChange(e.target.value)}
        className="w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="">{tr.noPricing}</option>
        {Object.entries(providers).map(([provider, entries]) => (
          <optgroup key={provider} label={provider}>
            {entries.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.model} ({curSymbol(entry.currency)}{entry.input}/{curSymbol(entry.currency)}{entry.output})
              </option>
            ))}
          </optgroup>
        ))}
        <option value="__custom__">{tr.customPricing}</option>
      </select>

      {/* Custom pricing inputs */}
      {isCustom && (
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground">{tr.inputPrice}</label>
              <input
                type="number"
                step="0.01"
                value={customInput}
                onChange={(e) => setCustomInput(Number(e.target.value))}
                className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">{tr.outputPrice}</label>
              <input
                type="number"
                step="0.01"
                value={customOutput}
                onChange={(e) => setCustomOutput(Number(e.target.value))}
                className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">{tr.cacheReadPrice}</label>
              <input
                type="number"
                step="0.01"
                value={customCacheRead}
                onChange={(e) => setCustomCacheRead(Number(e.target.value))}
                className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={customCurrency}
              onChange={(e) => setCustomCurrency(e.target.value as "usd" | "cny")}
              className="bg-background border border-border rounded px-2 py-1 text-xs"
            >
              <option value="usd">USD ($)</option>
              <option value="cny">CNY (¥)</option>
            </select>
            <span className="text-[10px] text-muted-foreground">{tr.perMillionTokens}</span>
            <Button size="sm" variant="secondary" onClick={handleCustomApply} className="ml-auto text-xs h-7">
              Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
