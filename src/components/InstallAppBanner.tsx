import { useEffect, useState } from "react";
import { Download, X, Share, Plus, Smartphone } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "welchesfahrrad.install.dismissed";
const DISMISS_DAYS = 7;

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // @ts-expect-error legacy iOS
    window.navigator.standalone === true
  );
}

function detectPlatform(): "android" | "ios" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  // iPad on iOS 13+ reports as Mac with touch
  if (/Macintosh/.test(ua) && "ontouchend" in document) return "ios";
  return "other";
}

function recentlyDismissed() {
  try {
    const v = localStorage.getItem(DISMISS_KEY);
    if (!v) return false;
    const ts = Number(v);
    if (!ts) return false;
    return Date.now() - ts < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

export function InstallAppBanner() {
  const [platform, setPlatform] = useState<"android" | "ios" | "other">("other");
  const [bip, setBip] = useState<BIPEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [iosSheet, setIosSheet] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;
    if (recentlyDismissed()) return;

    const p = detectPlatform();
    setPlatform(p);

    const onBip = (e: Event) => {
      e.preventDefault();
      setBip(e as BIPEvent);
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    // iOS has no beforeinstallprompt — show after small delay
    if (p === "ios") {
      const t = setTimeout(() => setOpen(true), 1500);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBip);
      };
    }

    // Android fallback: if beforeinstallprompt hasn't fired in 4s but PWA criteria might be met later, keep waiting
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  useEffect(() => {
    const onInstalled = () => {
      setOpen(false);
      try {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  const dismiss = () => {
    setOpen(false);
    setIosSheet(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (platform === "ios") {
      setIosSheet(true);
      return;
    }
    if (!bip) return;
    try {
      await bip.prompt();
      const res = await bip.userChoice;
      if (res.outcome === "accepted") {
        setOpen(false);
      } else {
        dismiss();
      }
    } catch {
      dismiss();
    }
  };

  if (!open) return null;
  // Only show banner if there's something actionable
  if (platform === "other") return null;
  if (platform === "android" && !bip) return null;

  return (
    <>
      <div
        className="fixed inset-x-0 bottom-0 z-[70] md:hidden pointer-events-none"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 72px)" }}
      >
        <div className="mx-3 mb-3 pointer-events-auto">
          <div className="relative rounded-2xl glass-card !shadow-elevated overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-signal to-transparent" />
            <div className="flex items-center gap-3 p-3.5">
              <div className="h-11 w-11 shrink-0 rounded-xl bg-signal/15 grid place-items-center border border-signal/30">
                <Smartphone className="h-5 w-5 text-signal" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-[0.18em] text-signal font-bold">
                  Welches Fahrrad App
                </div>
                <div className="text-sm font-semibold text-foreground leading-tight mt-0.5 truncate">
                  Installiere Welches Fahrrad auf dem Startbildschirm
                </div>
              </div>
              <button
                onClick={install}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider hover:bg-signal hover:text-signal-foreground transition-colors shadow-glow"
              >
                <Download className="h-3.5 w-3.5" />
                {platform === "ios" ? "Anleitung" : "Installieren"}
              </button>
              <button
                onClick={dismiss}
                aria-label="Schließen"
                className="shrink-0 h-8 w-8 rounded-full grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {iosSheet && (
        <div
          className="fixed inset-0 z-[80] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={dismiss}
        >
          <div
            className="w-full md:max-w-sm bg-card border-t md:border border-border md:rounded-3xl rounded-t-3xl overflow-hidden animate-fade-up shadow-elevated"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="p-5 border-b border-border flex items-start justify-between gap-4">
              <div>
                <div className="eyebrow text-signal">Welches Fahrrad App</div>
                <h3 className="mt-2 font-display text-xl font-black">
                  Auf dem iPhone installieren
                </h3>
              </div>
              <button
                onClick={dismiss}
                aria-label="Schließen"
                className="h-8 w-8 rounded-full grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ol className="p-5 space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <span className="h-7 w-7 shrink-0 grid place-items-center rounded-full bg-signal/15 border border-signal/30 text-signal font-mono font-bold text-xs">
                  1
                </span>
                <span className="pt-1">
                  Öffne Welches Fahrrad in <strong>Safari</strong>.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="h-7 w-7 shrink-0 grid place-items-center rounded-full bg-signal/15 border border-signal/30 text-signal font-mono font-bold text-xs">
                  2
                </span>
                <span className="pt-1 flex items-center gap-1.5">
                  Tippe auf
                  <Share className="h-4 w-4 inline text-signal" />
                  <strong>Teilen</strong> in der Symbolleiste.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="h-7 w-7 shrink-0 grid place-items-center rounded-full bg-signal/15 border border-signal/30 text-signal font-mono font-bold text-xs">
                  3
                </span>
                <span className="pt-1 flex items-center gap-1.5 flex-wrap">
                  Wähle
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-1.5 py-0.5 font-semibold">
                    <Plus className="h-3.5 w-3.5" /> Zum Home-Bildschirm
                  </span>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="h-7 w-7 shrink-0 grid place-items-center rounded-full bg-signal/15 border border-signal/30 text-signal font-mono font-bold text-xs">
                  4
                </span>
                <span className="pt-1">
                  Bestätige mit <strong>Hinzufügen</strong> — fertig.
                </span>
              </li>
            </ol>
            <div className="px-5 pb-5">
              <button
                onClick={dismiss}
                className="w-full rounded-full bg-foreground text-background py-3 text-xs font-bold uppercase tracking-widest hover:bg-signal hover:text-signal-foreground transition-colors shadow-glow"
              >
                Verstanden
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
