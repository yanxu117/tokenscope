import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Overview from "./components/Overview";
import SessionDetail from "./components/SessionDetail";
import PricingSheet from "./components/PricingSheet";
import { PricingProvider, usePricingConfig } from "./PricingContext";
import { LangContext, useTranslations, type Lang } from "./i18n";
import { Activity, Moon, Sun, Languages, Settings } from "lucide-react";
import { Button } from "./components/ui/button";

function App() {
  const [dark, setDark] = useState(true);
  const [lang, setLang] = useState<Lang>("zh");

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      <PricingProvider>
        <div className={dark ? "dark" : ""}>
          <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <BrowserRouter>
              <div className="max-w-7xl mx-auto px-4 py-6">
                <Header
                  lang={lang}
                  setLang={setLang}
                  dark={dark}
                  setDark={setDark}
                />
                <Routes>
                  <Route path="/" element={<Overview />} />
                  <Route path="/session/:sessionKey" element={<SessionDetail />} />
                </Routes>
              </div>
            </BrowserRouter>
            <PricingSheet />
          </div>
        </div>
      </PricingProvider>
    </LangContext.Provider>
  );
}

function Header({
  lang,
  setLang,
  dark,
  setDark,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  dark: boolean;
  setDark: (d: boolean) => void;
}) {
  const { setOpen } = usePricingConfig();
  const tr = useTranslations(lang);

  return (
    <header className="flex items-center justify-between mb-8 border-b border-border pb-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/20">
          <Activity className="w-5 h-5 text-violet-500" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">{tr.title}</h1>
          <p className="text-xs text-muted-foreground">Your token, visualized.</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
          className="gap-1.5 text-xs"
          title={tr.settings}
        >
          <Settings className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLang(lang === "zh" ? "en" : "zh")}
          className="gap-1.5 text-xs"
        >
          <Languages className="w-4 h-4" />
          {lang === "zh" ? "EN" : "中文"}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDark(!dark)}
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>
    </header>
  );
}

export default App;
