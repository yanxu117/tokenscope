import type { DashboardData } from "./types";

export interface PricingEntry {
  id: string;
  provider: string;
  model: string;
  input: number;
  output: number;
  cacheRead: number;
  currency: "usd" | "cny";
}

export interface CustomPrice {
  input: number;
  output: number;
  cacheRead: number;
  currency: "usd" | "cny";
}

export interface PricingConfig {
  modelMappings: Record<string, string>;
  customPricing: Record<string, CustomPrice>;
}

const LS_KEY = "token-dashboard-pricing-config";

export const PRICING_DB: PricingEntry[] = [
  // Anthropic (USD)
  { id: "anthropic/claude-opus-4.6", provider: "Anthropic", model: "Claude Opus 4.6", input: 15.0, output: 75.0, cacheRead: 1.50, currency: "usd" },
  { id: "anthropic/claude-sonnet-4.6", provider: "Anthropic", model: "Claude Sonnet 4.6", input: 3.0, output: 15.0, cacheRead: 0.30, currency: "usd" },
  { id: "anthropic/claude-haiku-4.5", provider: "Anthropic", model: "Claude Haiku 4.5", input: 0.80, output: 4.0, cacheRead: 0.08, currency: "usd" },
  // OpenAI (USD)
  { id: "openai/gpt-4o", provider: "OpenAI", model: "GPT-4o", input: 2.50, output: 10.0, cacheRead: 1.25, currency: "usd" },
  { id: "openai/gpt-4o-mini", provider: "OpenAI", model: "GPT-4o mini", input: 0.15, output: 0.60, cacheRead: 0, currency: "usd" },
  { id: "openai/gpt-5.4", provider: "OpenAI", model: "GPT-5.4", input: 2.50, output: 10.0, cacheRead: 1.25, currency: "usd" },
  { id: "openai/o1", provider: "OpenAI", model: "o1", input: 15.0, output: 60.0, cacheRead: 0, currency: "usd" },
  { id: "openai/o3", provider: "OpenAI", model: "o3", input: 2.0, output: 8.0, cacheRead: 0.20, currency: "usd" },
  { id: "openai/o3-mini", provider: "OpenAI", model: "o3-mini", input: 1.10, output: 4.40, cacheRead: 0, currency: "usd" },
  { id: "openai/o4-mini", provider: "OpenAI", model: "o4-mini", input: 0.75, output: 4.50, cacheRead: 0.075, currency: "usd" },
  // Google (USD)
  { id: "google/gemini-2.5-pro", provider: "Google", model: "Gemini 2.5 Pro", input: 1.25, output: 10.0, cacheRead: 0.125, currency: "usd" },
  { id: "google/gemini-2.5-flash", provider: "Google", model: "Gemini 2.5 Flash", input: 0.15, output: 1.25, cacheRead: 0.03, currency: "usd" },
  { id: "google/gemini-2.0-flash", provider: "Google", model: "Gemini 2.0 Flash", input: 0.10, output: 0.40, cacheRead: 0.025, currency: "usd" },
  // Zhipu (CNY)
  { id: "zhipu/glm-5-turbo", provider: "Zhipu", model: "GLM-5-Turbo", input: 5.0, output: 22.0, cacheRead: 1.20, currency: "cny" },
  { id: "zhipu/glm-5", provider: "Zhipu", model: "GLM-5", input: 4.0, output: 18.0, cacheRead: 1.0, currency: "cny" },
  { id: "zhipu/glm-5.1", provider: "Zhipu", model: "GLM-5.1", input: 4.0, output: 18.0, cacheRead: 1.0, currency: "cny" },
  { id: "zhipu/glm-4.7", provider: "Zhipu", model: "GLM-4.7", input: 2.0, output: 8.0, cacheRead: 0.40, currency: "cny" },
  { id: "zhipu/glm-4.5-air", provider: "Zhipu", model: "GLM-4.5-Air", input: 0.80, output: 2.0, cacheRead: 0.16, currency: "cny" },
  // DeepSeek (CNY)
  { id: "deepseek/v3", provider: "DeepSeek", model: "DeepSeek-V3", input: 2.0, output: 3.0, cacheRead: 0.20, currency: "cny" },
  { id: "deepseek/r1", provider: "DeepSeek", model: "DeepSeek-R1", input: 2.0, output: 3.0, cacheRead: 0.20, currency: "cny" },
  // Mistral (USD)
  { id: "mistral/large", provider: "Mistral", model: "Mistral Large", input: 2.0, output: 6.0, cacheRead: 0, currency: "usd" },
  { id: "mistral/medium", provider: "Mistral", model: "Mistral Medium", input: 1.0, output: 3.0, cacheRead: 0, currency: "usd" },
  { id: "mistral/codestral", provider: "Mistral", model: "Codestral", input: 0.20, output: 0.60, cacheRead: 0, currency: "usd" },
];

export function calculateCost(
  input: number,
  output: number,
  cacheRead: number,
  price: { input: number; output: number; cacheRead: number }
): number {
  return (input * price.input + output * price.output + cacheRead * price.cacheRead) / 1_000_000;
}

export function findPricingEntry(id: string): PricingEntry | undefined {
  return PRICING_DB.find((e) => e.id === id);
}

export function detectModels(data: DashboardData): string[] {
  return Object.keys(data.models);
}

export function fuzzyMatchModel(modelName: string): PricingEntry | undefined {
  const lower = modelName.toLowerCase();
  // Try exact id match first (e.g. "zhipu/glm-5.1")
  const exact = PRICING_DB.find((e) => e.id === lower || e.model.toLowerCase() === lower);
  if (exact) return exact;
  // Substring matching: check if the model name contains or is contained in an entry's id/model
  for (const entry of PRICING_DB) {
    const idParts = entry.id.split("/")[1] || entry.id;
    if (lower.includes(idParts) || idParts.includes(lower)) return entry;
  }
  // Broader matching by provider
  for (const entry of PRICING_DB) {
    if (lower.includes(entry.provider.toLowerCase())) return entry;
  }
  return undefined;
}

export function getEffectivePricing(
  modelName: string,
  config: PricingConfig
): { input: number; output: number; cacheRead: number; currency: "usd" | "cny" } {
  // 1. Custom pricing override
  const custom = config.customPricing[modelName];
  if (custom) return { input: custom.input, output: custom.output, cacheRead: custom.cacheRead, currency: custom.currency };
  // 2. Mapped pricing entry
  const mappedId = config.modelMappings[modelName];
  if (mappedId) {
    const entry = findPricingEntry(mappedId);
    if (entry) return { input: entry.input, output: entry.output, cacheRead: entry.cacheRead, currency: entry.currency };
  }
  // 3. Fuzzy match
  const fuzzy = fuzzyMatchModel(modelName);
  if (fuzzy) return { input: fuzzy.input, output: fuzzy.output, cacheRead: fuzzy.cacheRead, currency: fuzzy.currency };
  // 4. Fallback
  return { input: 0, output: 0, cacheRead: 0, currency: "usd" };
}

export function getDefaultConfig(data: DashboardData): PricingConfig {
  const config: PricingConfig = { modelMappings: {}, customPricing: {} };
  for (const modelName of detectModels(data)) {
    const match = fuzzyMatchModel(modelName);
    if (match) {
      config.modelMappings[modelName] = match.id;
    }
  }
  return config;
}

export function loadConfig(data: DashboardData): PricingConfig {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PricingConfig;
      if (parsed.modelMappings && parsed.customPricing) return parsed;
    }
  } catch {
    // ignore
  }
  return getDefaultConfig(data);
}

export function saveConfig(config: PricingConfig): void {
  localStorage.setItem(LS_KEY, JSON.stringify(config));
}
