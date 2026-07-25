import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { upsertBike } from "@/lib/bikes.functions";
import { articleImageUrl } from "@/lib/article-image-url";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Loader2, Upload, X, Plus, Trash2 } from "lucide-react";
import { BIKE_TYPES, bikeSlugify, type Bike } from "@/lib/bike-types";
import { BikeFileImport, type ImportedBike } from "@/components/admin/BikeFileImport";
import { parseBikeNumber } from "@/lib/bike-import";

type Form = {
  id?: string;
  slug: string;
  brand: string;
  model: string;
  year: number | null;
  category: "bike" | "ebike";
  bike_type: string;
  price_eur: number | null;
  image_url: string;
  gallery: string[];
  manufacturer_url: string;
  excerpt: string;
  description: string;
  highlights: { pros: string[]; cons: string[] };
  specs: Record<string, string | number>;
  ebike: Record<string, any>;
  ratings: Record<string, number>;
  intended_use: string[];
  terrain: string[];
  meta_title: string;
  meta_description: string;
  og_image_url: string;
  keywords: string[];
  featured: boolean;
  published: boolean;
  // Extended
  geometry: Record<string, any>;
  cockpit: Record<string, any>;
  wheelset: Record<string, any>;
  drivetrain_detail: Record<string, any>;
  brakes_detail: Record<string, any>;
  ebike_detail: Record<string, any>;
  suitability: Record<string, number>;
  performance: Record<string, number>;
  range_matrix: Record<string, any>;
  maintenance: Record<string, any>;
  costs: Record<string, any>;
  environmental: Record<string, any>;
  safety_features: Record<string, any>;
  accessories: string[];
  awards: { name: string; year?: number; source?: string }[];
  model_history: Record<string, any>;
  videos: { url: string; title?: string }[];
  faq: { q: string; a: string }[];
  ai_summary: Record<string, any>;
  availability: string;
  expert_rating: number | null;
};

const empty: Form = {
  slug: "",
  brand: "",
  model: "",
  year: new Date().getFullYear(),
  category: "bike",
  bike_type: "",
  price_eur: null,
  image_url: "",
  gallery: [],
  manufacturer_url: "",
  excerpt: "",
  description: "",
  highlights: { pros: [], cons: [] },
  specs: {},
  ebike: {},
  ratings: {},
  intended_use: [],
  terrain: [],
  meta_title: "",
  meta_description: "",
  og_image_url: "",
  keywords: [],
  featured: false,
  published: false,
  geometry: {},
  cockpit: {},
  wheelset: {},
  drivetrain_detail: {},
  brakes_detail: {},
  ebike_detail: {},
  suitability: {},
  performance: {},
  range_matrix: {},
  maintenance: {},
  costs: {},
  environmental: {},
  safety_features: {},
  accessories: [],
  awards: [],
  model_history: {},
  videos: [],
  faq: [],
  ai_summary: {},
  availability: "",
  expert_rating: null,
};

function fromBike(b: Bike): Form {
  return {
    id: b.id,
    slug: b.slug,
    brand: b.brand,
    model: b.model,
    year: b.year,
    category: b.category,
    bike_type: b.bike_type ?? "",
    price_eur: b.price_eur,
    image_url: b.image_url ?? "",
    gallery: b.gallery,
    manufacturer_url: b.manufacturer_url ?? "",
    excerpt: b.excerpt ?? "",
    description: b.description ?? "",
    highlights: { pros: b.highlights?.pros ?? [], cons: b.highlights?.cons ?? [] },
    specs: (b.specs as any) ?? {},
    ebike: (b.ebike as any) ?? {},
    ratings: (b.ratings as any) ?? {},
    intended_use: b.intended_use ?? [],
    terrain: b.terrain ?? [],
    meta_title: b.meta_title ?? "",
    meta_description: b.meta_description ?? "",
    og_image_url: b.og_image_url ?? "",
    keywords: b.keywords ?? [],
    featured: b.featured,
    published: b.published,
    geometry: b.geometry ?? {},
    cockpit: b.cockpit ?? {},
    wheelset: b.wheelset ?? {},
    drivetrain_detail: b.drivetrain_detail ?? {},
    brakes_detail: b.brakes_detail ?? {},
    ebike_detail: b.ebike_detail ?? {},
    suitability: (b.suitability as any) ?? {},
    performance: (b.performance as any) ?? {},
    range_matrix: b.range_matrix ?? {},
    maintenance: b.maintenance ?? {},
    costs: b.costs ?? {},
    environmental: b.environmental ?? {},
    safety_features: b.safety_features ?? {},
    accessories: b.accessories ?? [],
    awards: b.awards ?? [],
    model_history: b.model_history ?? {},
    videos: b.videos ?? [],
    faq: b.faq ?? [],
    ai_summary: b.ai_summary ?? {},
    availability: b.availability ?? "",
    expert_rating: b.expert_rating,
  };
}

const SPEC_FIELDS: { key: string; label: string; type?: "number" | "text" }[] = [
  { key: "frame_material", label: "Rahmen Material" },
  { key: "frame_sizes", label: "Rahmengrößen (z.B. S, M, L, XL)" },
  { key: "fork", label: "Gabel" },
  { key: "weight_kg", label: "Gewicht (kg)", type: "number" },
  { key: "drivetrain", label: "Schaltgruppe" },
  { key: "gears", label: "Gänge" },
  { key: "brakes", label: "Bremsen" },
  { key: "wheels", label: "Laufräder" },
  { key: "tire_brand", label: "Reifenmarke" },
  { key: "tire_size", label: "Reifengröße (z.B. 700×40c)" },
  { key: "tire_tread", label: "Reifenprofil" },
  { key: "saddle", label: "Sattel" },
  { key: "handlebar", label: "Lenker" },
  { key: "stem", label: "Vorbau" },
  { key: "lights", label: "Beleuchtung" },
  { key: "rack", label: "Gepäckträger" },
  { key: "fenders", label: "Schutzbleche" },
];

const EBIKE_FIELDS: { key: string; label: string; type?: "number" | "text" | "bool" }[] = [
  { key: "motor_brand", label: "Motor Marke" },
  { key: "motor_model", label: "Motor Modell" },
  { key: "motor_nm", label: "Drehmoment (Nm)", type: "number" },
  { key: "motor_w", label: "Leistung (W)", type: "number" },
  { key: "assist_kmh", label: "Unterstützung bis (km/h)", type: "number" },
  { key: "battery_wh", label: "Akku (Wh)", type: "number" },
  { key: "battery_removable", label: "Akku abnehmbar", type: "bool" },
  { key: "charge_time_h", label: "Ladezeit (h)", type: "number" },
  { key: "range_eco_km", label: "Reichweite Eco (km)", type: "number" },
  { key: "range_tour_km", label: "Reichweite Tour (km)", type: "number" },
  { key: "range_turbo_km", label: "Reichweite Turbo (km)", type: "number" },
  { key: "display", label: "Display" },
  { key: "sensor", label: "Sensor" },
];

const RATING_FIELDS: { key: string; label: string }[] = [
  { key: "comfort", label: "Komfort" },
  { key: "drivetrain", label: "Antrieb" },
  { key: "brakes", label: "Bremsen" },
  { key: "equipment", label: "Ausstattung" },
  { key: "value", label: "Preis-Leistung" },
  { key: "overall", label: "Gesamt" },
];

const SUITABILITY_FIELDS: { key: string; label: string }[] = [
  { key: "beginner", label: "Anfänger" },
  { key: "intermediate", label: "Fortgeschritten" },
  { key: "pro", label: "Profi" },
  { key: "commuting", label: "Pendeln" },
  { key: "touring", label: "Tour" },
  { key: "gravel", label: "Gravel" },
  { key: "mountain", label: "Mountainbike" },
  { key: "bikepacking", label: "Bikepacking" },
  { key: "city", label: "Stadt" },
  { key: "family", label: "Familie" },
  { key: "cargo", label: "Cargo" },
  { key: "racing", label: "Racing" },
];

const PERFORMANCE_FIELDS: { key: string; label: string }[] = [
  { key: "comfort", label: "Komfort" },
  { key: "handling", label: "Handling" },
  { key: "cornering", label: "Kurvenlage" },
  { key: "stability", label: "Stabilität" },
  { key: "acceleration", label: "Beschleunigung" },
  { key: "climbing", label: "Bergauf" },
  { key: "descending", label: "Bergab" },
  { key: "offroad", label: "Offroad" },
  { key: "city", label: "Stadt" },
  { key: "longdistance", label: "Langstrecke" },
  { key: "sportiness", label: "Sportlichkeit" },
  { key: "suspension", label: "Federung" },
];

const JSON_GROUPS: { key: keyof Form; label: string; hint?: string }[] = [
  { key: "geometry", label: "Geometrie", hint: "wheelbase_mm, stack_mm, reach_mm, seat_tube_mm, head_tube_mm, bottom_bracket_mm, frame_weight_kg, max_rider_weight_kg" },
  { key: "cockpit", label: "Cockpit", hint: "handlebar, stem, seatpost, saddle, grips" },
  { key: "wheelset", label: "Laufradsatz", hint: "rims, hubs, spokes, tubeless_ready, tire_pressure_recommended" },
  { key: "drivetrain_detail", label: "Antrieb (Detail)", hint: "crankset, bb, chain, cassette, rear_der, front_der, shifters, pedals, gear_ratios" },
  { key: "brakes_detail", label: "Bremsen (Detail)", hint: "model, rotor_front_mm, rotor_rear_mm, type" },
  { key: "ebike_detail", label: "E-Bike System (erweitert)", hint: "peak_power_w, voltage, ah, cell_type, charge_cycles, dual_battery, fast_charging, bluetooth, gps, app, ota, walk_assist, usb_charging, assist_modes, security_features" },
  { key: "range_matrix", label: "Reichweite Matrix", hint: '{ "eco": { "75kg_flat": 120, "75kg_hills": 90 }, ... }' },
  { key: "maintenance", label: "Wartung", hint: "schedule, chain_km, brake_pads_km, disc_km, battery_care, suspension_service_km, lubricants, annual_cost_eur" },
  { key: "costs", label: "Laufende Kosten", hint: "electricity_kwh_price, cost_per_charge_eur, cost_per_100km_eur, annual_electricity_eur, five_year_total_eur" },
  { key: "environmental", label: "Umwelt", hint: "co2_saved_kg_year, fuel_saved_l_year, money_saved_eur_year, trees_equivalent, sustainability_score" },
  { key: "safety_features", label: "Sicherheit", hint: "integrated_lights, abs, gps, alarm, frame_lock, airtag, nfc, recommended_locks[], visibility_score, night_score" },
  { key: "model_history", label: "Modell-Historie", hint: "launch_year, previous_generations[], whats_new, improvements, known_issues, common_upgrades" },
  { key: "awards", label: "Auszeichnungen", hint: '[{ "name": "Design & Innovation Award", "year": 2025, "source": "Eurobike" }]' },
  { key: "videos", label: "Videos", hint: '[{ "url": "https://...", "title": "Test" }]' },
];

export function BikeEditor({ initial }: { initial?: Bike }) {
  const [form, setForm] = useState<Form>(() => (initial ? fromBike(initial) : empty));
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const save = useServerFn(upsertBike);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!slugTouched && form.brand && form.model) {
      setForm((f) => ({ ...f, slug: bikeSlugify(f.brand, f.model, f.year) }));
    }
  }, [form.brand, form.model, form.year, slugTouched]);

  const handleUpload = async (file: File, target: "image_url" | "og_image_url" | "gallery") => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const name = `bikes/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("article-images").upload(name, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const stored = `article-images/${name}`;
      if (target === "gallery") set("gallery", [...form.gallery, stored]);
      else set(target, stored);
      toast.success("Bild hochgeladen");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (publish: boolean) => {
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        id: form.id,
        bike_type: form.bike_type || null,
        published: publish ? true : form.published,
        ebike: form.category === "ebike" ? form.ebike : null,
        image_url: form.image_url || null,
        og_image_url: form.og_image_url || null,
        manufacturer_url: form.manufacturer_url || null,
        excerpt: form.excerpt || null,
        description: form.description || null,
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
        availability: form.availability || null,
        faq: (form.faq ?? [])
          .map((f) => ({ q: String(f?.q ?? ""), a: String(f?.a ?? "") }))
          .filter((f) => f.q.trim() || f.a.trim()),
        videos: (form.videos ?? [])
          .map((v) => ({ url: String(v?.url ?? ""), title: v?.title ? String(v.title) : undefined }))
          .filter((v) => v.url.trim()),
        awards: (form.awards ?? [])
          .map((a) => ({
            name: String(a?.name ?? ""),
            year: typeof a?.year === "number" ? a.year : undefined,
            source: a?.source ? String(a.source) : undefined,
          }))
          .filter((a) => a.name.trim()),
      };
      const res = await save({ data: payload });
      toast.success(publish ? "Veröffentlicht" : "Gespeichert");
      qc.invalidateQueries({ queryKey: ["admin-bikes"] });
      qc.invalidateQueries({ queryKey: ["featured-bikes"] });
      qc.invalidateQueries({ queryKey: ["public-bikes"] });
      if (!form.id) navigate({ to: "/mnv/bikes/$id", params: { id: res.id }, replace: true });
    } catch (e) {
      console.error("[BikeEditor] save failed", e);
      const raw = e instanceof Error ? e.message : String(e);
      let msg = raw;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          msg = parsed
            .map((i: any) => `${(i.path || []).join(".") || "?"}: ${i.message}`)
            .join(" · ");
        } else if (parsed?.message) {
          msg = parsed.message;
        }
      } catch {
        // raw already a plain string
      }
      toast.error(msg.slice(0, 400), { duration: 10000 });
    } finally {
      setSaving(false);
    }
  };

  const previewImg = useMemo(() => articleImageUrl(form.image_url) || form.image_url, [form.image_url]);

  return (
    <div className="space-y-4 text-zinc-200">
      <div className="flex flex-wrap items-center justify-between gap-3 sticky top-16 z-20 bg-zinc-950/95 backdrop-blur py-3 -mx-4 lg:-mx-8 px-4 lg:px-8 border-b border-zinc-900">
        <div className="flex items-center gap-2 text-xs">
          <span className={`h-2 w-2 rounded-full ${form.published ? "bg-emerald-500" : "bg-amber-500"}`} />
          <span className="text-zinc-400">{form.published ? "Veröffentlicht" : "Entwurf"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onSubmit(false)} disabled={saving} className="border-zinc-800 text-zinc-100 hover:bg-zinc-900">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
            Entwurf speichern
          </Button>
          <Button size="sm" onClick={() => onSubmit(true)} disabled={saving} className="bg-[#FF6A1A] hover:bg-[#e85d10] text-zinc-950 font-medium">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Veröffentlichen
          </Button>
        </div>
      </div>

      <BikeFileImport
        mainImage={form.image_url}
        gallery={form.gallery}
        uploading={uploading}
        onUploadMain={(f) => handleUpload(f, "image_url")}
        onUploadGallery={(f) => handleUpload(f, "gallery")}
        onRemoveGalleryImage={(i) => set("gallery", form.gallery.filter((_, j) => j !== i))}
        onPromoteToMain={(url) => {
          const prev = form.image_url;
          set("image_url", url);
          const next = form.gallery.filter((g) => g !== url);
          if (prev && !next.includes(prev)) next.push(prev);
          set("gallery", next);
          toast.success("Главна снимка обновена");
        }}
        onImport={(d: ImportedBike) => {
          try {
            const arr = (v: any): any[] => (Array.isArray(v) ? v : []);
            const strArr = (v: any): string[] => {
              if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
              if (typeof v === "string") {
                return v.split(/\r?\n|;|\s\|\s|,/g).map((x) => x.trim()).filter(Boolean);
              }
              return [];
            };
            const obj = (v: any): Record<string, any> =>
              v && typeof v === "object" && !Array.isArray(v) ? v : {};
            const str = (v: any): string => (v == null ? "" : String(v));
            const num = (v: any): number | null => {
              if (v == null || v === "") return null;
              const n = parseBikeNumber(v);
              return Number.isFinite(n) ? n : null;
            };
            const has = (v: any): boolean => {
              if (v == null || v === "") return false;
              if (Array.isArray(v)) return v.length > 0;
              if (typeof v === "object") return Object.keys(v).length > 0;
              return true;
            };

            setForm((f) => ({
              ...f,
              brand: d.brand ? str(d.brand) : f.brand,
              model: d.model ? str(d.model) : f.model,
              year: d.year != null ? num(d.year) : f.year,
              category: d.category === "ebike" || d.category === "bike" ? d.category : f.category,
              bike_type: d.bike_type ? str(d.bike_type) : f.bike_type,
              price_eur: d.price_eur != null ? num(d.price_eur) : f.price_eur,
              image_url: d.image_url ? str(d.image_url) : f.image_url,
              manufacturer_url: d.manufacturer_url ? str(d.manufacturer_url) : f.manufacturer_url,
              excerpt: d.excerpt ? str(d.excerpt) : f.excerpt,
              description: d.description ? str(d.description) : f.description,
              availability: d.availability ? str(d.availability) : f.availability,
              expert_rating: d.expert_rating != null ? num(d.expert_rating) : f.expert_rating,
              meta_title: d.meta_title ? str(d.meta_title) : f.meta_title,
              meta_description: d.meta_description ? str(d.meta_description) : f.meta_description,
              og_image_url: d.og_image_url ? str(d.og_image_url) : f.og_image_url,
              gallery: d.gallery !== undefined ? strArr(d.gallery) : f.gallery,
              intended_use: d.intended_use !== undefined ? strArr(d.intended_use) : f.intended_use,
              terrain: d.terrain !== undefined ? strArr(d.terrain) : f.terrain,
              keywords: d.keywords !== undefined ? strArr(d.keywords) : f.keywords,
              accessories: d.accessories !== undefined ? strArr(d.accessories) : f.accessories,
              highlights: d.highlights
                ? { pros: strArr(obj(d.highlights).pros), cons: strArr(obj(d.highlights).cons) }
                : f.highlights,
              specs: d.specs !== undefined ? obj(d.specs) : f.specs,
              ebike: d.ebike !== undefined ? obj(d.ebike) : f.ebike,
              ratings: d.ratings !== undefined ? obj(d.ratings) : f.ratings,
              suitability: d.suitability !== undefined ? obj(d.suitability) : f.suitability,
              performance: d.performance !== undefined ? obj(d.performance) : f.performance,
              geometry: d.geometry !== undefined ? obj(d.geometry) : f.geometry,
              cockpit: d.cockpit !== undefined ? obj(d.cockpit) : f.cockpit,
              wheelset: d.wheelset !== undefined ? obj(d.wheelset) : f.wheelset,
              drivetrain_detail: d.drivetrain_detail !== undefined ? obj(d.drivetrain_detail) : f.drivetrain_detail,
              brakes_detail: d.brakes_detail !== undefined ? obj(d.brakes_detail) : f.brakes_detail,
              ebike_detail: d.ebike_detail !== undefined ? obj(d.ebike_detail) : f.ebike_detail,
              range_matrix: d.range_matrix !== undefined ? obj(d.range_matrix) : f.range_matrix,
              maintenance: d.maintenance !== undefined ? obj(d.maintenance) : f.maintenance,
              costs: d.costs !== undefined ? obj(d.costs) : f.costs,
              environmental: d.environmental !== undefined ? obj(d.environmental) : f.environmental,
              safety_features: d.safety_features !== undefined ? obj(d.safety_features) : f.safety_features,
              model_history: d.model_history !== undefined ? obj(d.model_history) : f.model_history,
              ai_summary: d.ai_summary !== undefined ? obj(d.ai_summary) : f.ai_summary,
              awards: d.awards !== undefined ? (arr(d.awards)
                .map((a) => (typeof a === "object" && a && a.name ? { name: str(a.name), year: num(a.year) ?? undefined, source: a.source ? str(a.source) : undefined } : null))
                .filter(Boolean)) as { name: string; year?: number; source?: string }[] : f.awards,
              videos: d.videos !== undefined ? (arr(d.videos)
                .map((v) => (typeof v === "object" && v && v.url ? { url: str(v.url), title: v.title ? str(v.title) : undefined } : null))
                .filter(Boolean)) as { url: string; title?: string }[] : f.videos,
              faq: d.faq !== undefined ? (arr(d.faq)
                .map((q) => (typeof q === "object" && q && q.q ? { q: str(q.q), a: str(q.a) } : null))
                .filter(Boolean)) as { q: string; a: string }[] : f.faq,
              slug: d.slug
                ? str(d.slug)
                : bikeSlugify(
                    d.brand ? str(d.brand) : f.brand,
                    d.model ? str(d.model) : f.model,
                    d.year != null ? num(d.year) : f.year,
                  ),
            }));
            if (d.slug || has(d.brand) || has(d.model)) setSlugTouched(!!d.slug);
          } catch (err) {
            console.error("Bike import merge failed", err);
            toast.error("Грешка при попълване на полетата от файла");
          }
        }}
      />


      <Tabs defaultValue="basic">
        <TabsList className="bg-zinc-900 border border-zinc-800 flex-wrap h-auto">
          <TabsTrigger value="basic">Grunddaten</TabsTrigger>
          <TabsTrigger value="content">Inhalt</TabsTrigger>
          <TabsTrigger value="specs">Specs</TabsTrigger>
          <TabsTrigger value="ebike" disabled={form.category !== "ebike"}>E-Bike</TabsTrigger>
          <TabsTrigger value="ratings">Bewertung</TabsTrigger>
          <TabsTrigger value="suitability">Eignung &amp; Performance</TabsTrigger>
          <TabsTrigger value="extras">Erweitert (JSON)</TabsTrigger>
          <TabsTrigger value="faq">FAQ &amp; KI</TabsTrigger>
          <TabsTrigger value="media">Medien</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        {/* BASIC */}
        <TabsContent value="basic" className="space-y-4 mt-4">
          <Section title="Grunddaten">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Marke *">
                <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} className={inputC} placeholder="Cube, Canyon, Riese & Müller…" />
              </Field>
              <Field label="Modell *">
                <Input value={form.model} onChange={(e) => set("model", e.target.value)} className={inputC} />
              </Field>
              <Field label="Modelljahr">
                <Input type="number" value={form.year ?? ""} onChange={(e) => set("year", e.target.value ? Number(e.target.value) : null)} className={inputC} />
              </Field>
              <Field label="Kategorie *">
                <Select value={form.category} onValueChange={(v: any) => set("category", v)}>
                  <SelectTrigger className={inputC}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bike">Fahrrad</SelectItem>
                    <SelectItem value="ebike">E-Bike</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Typ">
                <Select value={form.bike_type || "_"} onValueChange={(v) => set("bike_type", v === "_" ? "" : v)}>
                  <SelectTrigger className={inputC}><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_">—</SelectItem>
                    {BIKE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Preis (€)">
                <Input type="number" value={form.price_eur ?? ""} onChange={(e) => set("price_eur", e.target.value ? Number(e.target.value) : null)} className={inputC} />
              </Field>
              <Field label="Slug *">
                <Input value={form.slug} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }} className={inputC} />
              </Field>
              <Field label="Hersteller-URL">
                <Input value={form.manufacturer_url} onChange={(e) => set("manufacturer_url", e.target.value)} className={inputC} placeholder="https://…" />
              </Field>
            </div>
            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.featured} onCheckedChange={(v) => set("featured", v)} />
                Auf Startseite hervorheben
              </label>
            </div>
          </Section>
        </TabsContent>

        {/* CONTENT */}
        <TabsContent value="content" className="space-y-4 mt-4">
          <Section title="Beschreibung">
            <Field label="Kurzbeschreibung (Excerpt, max. 600)">
              <Textarea rows={3} value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} className={inputC} maxLength={600} />
            </Field>
            <Field label="Ausführliche Beschreibung">
              <Textarea rows={12} value={form.description} onChange={(e) => set("description", e.target.value)} className={inputC} />
            </Field>
          </Section>
          <Section title="Stärken & Schwächen">
            <div className="grid md:grid-cols-2 gap-6">
              <ChipList label="Pro" items={form.highlights.pros} onChange={(v) => set("highlights", { ...form.highlights, pros: v })} placeholder="z.B. Starker Motor" />
              <ChipList label="Contra" items={form.highlights.cons} onChange={(v) => set("highlights", { ...form.highlights, cons: v })} placeholder="z.B. Schweres Gewicht" />
            </div>
          </Section>
          <Section title="Einsatz">
            <div className="grid md:grid-cols-2 gap-6">
              <ChipList label="Einsatzbereiche" items={form.intended_use} onChange={(v) => set("intended_use", v)} placeholder="Pendeln, Tour, Sport…" />
              <ChipList label="Untergrund" items={form.terrain} onChange={(v) => set("terrain", v)} placeholder="Stadt, Schotter, Trails…" />
            </div>
          </Section>
        </TabsContent>

        {/* SPECS */}
        <TabsContent value="specs" className="space-y-4 mt-4">
          <Section title="Spezifikationen">
            <div className="grid md:grid-cols-2 gap-4">
              {SPEC_FIELDS.map((f) => (
                <Field key={f.key} label={f.label}>
                  <Input
                    type={f.type === "number" ? "number" : "text"}
                    step="0.1"
                    value={(form.specs[f.key] as any) ?? ""}
                    onChange={(e) =>
                      set("specs", {
                        ...form.specs,
                        [f.key]: e.target.value === "" ? "" : f.type === "number" ? Number(e.target.value) : e.target.value,
                      })
                    }
                    className={inputC}
                  />
                </Field>
              ))}
            </div>
          </Section>
        </TabsContent>

        {/* EBIKE */}
        <TabsContent value="ebike" className="space-y-4 mt-4">
          <Section title="E-Bike Motor & Akku">
            <div className="grid md:grid-cols-2 gap-4">
              {EBIKE_FIELDS.map((f) => (
                <Field key={f.key} label={f.label}>
                  {f.type === "bool" ? (
                    <div className="flex items-center h-10">
                      <Switch checked={!!form.ebike[f.key]} onCheckedChange={(v) => set("ebike", { ...form.ebike, [f.key]: v })} />
                    </div>
                  ) : (
                    <Input
                      type={f.type === "number" ? "number" : "text"}
                      step="0.1"
                      value={form.ebike[f.key] ?? ""}
                      onChange={(e) =>
                        set("ebike", {
                          ...form.ebike,
                          [f.key]: e.target.value === "" ? "" : f.type === "number" ? Number(e.target.value) : e.target.value,
                        })
                      }
                      className={inputC}
                    />
                  )}
                </Field>
              ))}
            </div>
          </Section>
        </TabsContent>

        {/* RATINGS */}
        <TabsContent value="ratings" className="space-y-4 mt-4">
          <Section title="Bewertung (0–10)">
            <div className="grid md:grid-cols-2 gap-4">
              {RATING_FIELDS.map((r) => (
                <Field key={r.key} label={r.label}>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={(form.ratings[r.key] as any) ?? ""}
                    onChange={(e) => set("ratings", { ...form.ratings, [r.key]: Number(e.target.value) })}
                    className={inputC}
                  />
                </Field>
              ))}
            </div>
          </Section>
        </TabsContent>

        {/* MEDIA */}
        <TabsContent value="media" className="space-y-4 mt-4">
          <Section title="Hauptbild">
            <ImageUpload
              value={form.image_url}
              preview={previewImg}
              uploading={uploading}
              onUpload={(f) => handleUpload(f, "image_url")}
              onClear={() => set("image_url", "")}
            />
          </Section>
          <Section title="Galerie">
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {form.gallery.map((g, i) => (
                <div key={i} className="relative aspect-square bg-zinc-900 group">
                  <img src={articleImageUrl(g) || g} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <button
                    onClick={() => set("gallery", form.gallery.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 h-6 w-6 bg-rose-600 grid place-items-center opacity-0 group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5 text-white" />
                  </button>
                </div>
              ))}
              <label className="aspect-square border-2 border-dashed border-zinc-800 hover:border-[#FF6A1A] grid place-items-center cursor-pointer text-zinc-500 hover:text-[#FF6A1A] transition">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file, "gallery");
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
          </Section>
        </TabsContent>

        {/* SUITABILITY & PERFORMANCE */}
        <TabsContent value="suitability" className="space-y-4 mt-4">
          <Section title="Eignung (0–10)">
            <div className="grid md:grid-cols-3 gap-4">
              {SUITABILITY_FIELDS.map((s) => (
                <Field key={s.key} label={s.label}>
                  <Input type="number" min={0} max={10} step={0.5}
                    value={(form.suitability[s.key] as any) ?? ""}
                    onChange={(e) => set("suitability", { ...form.suitability, [s.key]: Number(e.target.value) })}
                    className={inputC} />
                </Field>
              ))}
            </div>
          </Section>
          <Section title="Performance (0–10)">
            <div className="grid md:grid-cols-3 gap-4">
              {PERFORMANCE_FIELDS.map((s) => (
                <Field key={s.key} label={s.label}>
                  <Input type="number" min={0} max={10} step={0.5}
                    value={(form.performance[s.key] as any) ?? ""}
                    onChange={(e) => set("performance", { ...form.performance, [s.key]: Number(e.target.value) })}
                    className={inputC} />
                </Field>
              ))}
            </div>
          </Section>
          <Section title="Experten-Wertung & Verfügbarkeit">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Experten-Gesamtnote (0–10)">
                <Input type="number" min={0} max={10} step={0.1}
                  value={form.expert_rating ?? ""}
                  onChange={(e) => set("expert_rating", e.target.value ? Number(e.target.value) : null)}
                  className={inputC} />
              </Field>
              <Field label="Verfügbarkeit (Text)">
                <Input value={form.availability} onChange={(e) => set("availability", e.target.value)}
                  className={inputC} placeholder="Auf Lager · Lieferzeit 2 Wochen · …" />
              </Field>
            </div>
          </Section>
          <Section title="Kompatibles Zubehör">
            <ChipList label="Zubehör" items={form.accessories} onChange={(v) => set("accessories", v)} placeholder="Schutzbleche, Gepäckträger, Kindersitz…" />
          </Section>
        </TabsContent>

        {/* EXTRAS (JSON) */}
        <TabsContent value="extras" className="space-y-4 mt-4">
          <p className="text-xs text-zinc-500">Diese Felder akzeptieren JSON. Lassen Sie das Feld leer ({"{}"} oder []) wenn keine Daten vorhanden sind.</p>
          {JSON_GROUPS.map((g) => (
            <JsonField key={g.key} label={g.label} hint={g.hint}
              value={form[g.key] as any}
              onChange={(v) => set(g.key as any, v as any)} />
          ))}
        </TabsContent>

        {/* FAQ */}
        <TabsContent value="faq" className="space-y-4 mt-4">
          <Section title="FAQ">
            <div className="space-y-3">
              {form.faq.map((f, i) => (
                <div key={i} className="grid md:grid-cols-2 gap-2 border border-zinc-800 p-3">
                  <Input value={f.q} placeholder="Frage" className={inputC}
                    onChange={(e) => { const c = [...form.faq]; c[i] = { ...c[i], q: e.target.value }; set("faq", c); }} />
                  <Textarea rows={2} value={f.a} placeholder="Antwort" className={inputC}
                    onChange={(e) => { const c = [...form.faq]; c[i] = { ...c[i], a: e.target.value }; set("faq", c); }} />
                  <button onClick={() => set("faq", form.faq.filter((_, j) => j !== i))} className="text-xs text-rose-400 col-span-2 text-left hover:text-rose-300">Entfernen</button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => set("faq", [...form.faq, { q: "", a: "" }])} className="border-zinc-800 text-zinc-100 hover:bg-zinc-900">
                <Plus className="h-3.5 w-3.5 mr-1" /> FAQ hinzufügen
              </Button>
            </div>
          </Section>
          <Section title="KI-Zusammenfassung (manuell)">
            <Field label="Stärken (eine pro Zeile)">
              <Textarea rows={4} className={inputC}
                value={(form.ai_summary.strengths || []).join("\n")}
                onChange={(e) => set("ai_summary", { ...form.ai_summary, strengths: e.target.value.split("\n").filter(Boolean) })} />
            </Field>
            <Field label="Schwächen (eine pro Zeile)">
              <Textarea rows={4} className={inputC}
                value={(form.ai_summary.weaknesses || []).join("\n")}
                onChange={(e) => set("ai_summary", { ...form.ai_summary, weaknesses: e.target.value.split("\n").filter(Boolean) })} />
            </Field>
            <Field label="Ideal für">
              <Input className={inputC} value={form.ai_summary.best_for || ""}
                onChange={(e) => set("ai_summary", { ...form.ai_summary, best_for: e.target.value })} />
            </Field>
            <Field label="Nicht empfohlen wenn">
              <Input className={inputC} value={form.ai_summary.avoid_if || ""}
                onChange={(e) => set("ai_summary", { ...form.ai_summary, avoid_if: e.target.value })} />
            </Field>
          </Section>
        </TabsContent>


        {/* SEO */}
        <TabsContent value="seo" className="space-y-4 mt-4">
          <Section title="SEO">
            <Field label={`SEO Titel (${form.meta_title.length}/180)`}>
              <Input value={form.meta_title} onChange={(e) => set("meta_title", e.target.value)} className={inputC} maxLength={180} placeholder={`${form.brand} ${form.model} — Test, Specs & Preis`} />
            </Field>
            <Field label={`Meta-Beschreibung (${form.meta_description.length}/300)`}>
              <Textarea rows={3} value={form.meta_description} onChange={(e) => set("meta_description", e.target.value)} className={inputC} maxLength={300} />
            </Field>
            <ChipList label="Keywords" items={form.keywords} onChange={(v) => set("keywords", v)} placeholder="enter zum hinzufügen" />
            <Field label="OG Bild URL (optional, sonst Hauptbild)">
              <ImageUpload
                value={form.og_image_url}
                preview={articleImageUrl(form.og_image_url) || form.og_image_url}
                uploading={uploading}
                onUpload={(f) => handleUpload(f, "og_image_url")}
                onClear={() => set("og_image_url", "")}
              />
            </Field>
          </Section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const inputC = "bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-4 md:p-6">
      <h3 className="text-sm font-semibold text-zinc-100 mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-zinc-400">{label}</Label>
      {children}
    </div>
  );
}

function ImageUpload({
  value, preview, uploading, onUpload, onClear,
}: {
  value: string;
  preview: string;
  uploading: boolean;
  onUpload: (f: File) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="relative h-32 w-48 bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0">
        {preview ? (
          <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full grid place-items-center text-zinc-600 text-xs">Kein Bild</div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <label className="inline-flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs cursor-pointer">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {value ? "Ersetzen" : "Hochladen"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.currentTarget.value = "";
            }}
          />
        </label>
        {value && (
          <button onClick={onClear} className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300">
            <Trash2 className="h-3 w-3" /> Entfernen
          </button>
        )}
      </div>
    </div>
  );
}

function ChipList({
  label, items, onChange, placeholder,
}: {
  label: string;
  items: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...items, v]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <Label className="text-xs text-zinc-400">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it, i) => (
          <span key={i} className="inline-flex items-center gap-1 bg-zinc-800 text-zinc-100 text-xs px-2 py-1 rounded">
            {it}
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-zinc-500 hover:text-rose-400">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className={inputC}
        />
        <Button type="button" variant="outline" size="sm" onClick={add} className="border-zinc-800 text-zinc-100 hover:bg-zinc-800">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function JsonField({ label, hint, value, onChange }: { label: string; hint?: string; value: any; onChange: (v: any) => void }) {
  const [text, setText] = useState(() => JSON.stringify(value ?? (Array.isArray(value) ? [] : {}), null, 2));
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { setText(JSON.stringify(value ?? {}, null, 2)); /* eslint-disable-next-line */ }, []);
  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-4">
      <div className="flex items-baseline justify-between mb-2">
        <Label className="text-sm font-semibold text-zinc-100">{label}</Label>
        {err && <span className="text-xs text-rose-400">{err}</span>}
      </div>
      {hint && <p className="text-[11px] text-zinc-500 mb-2 font-mono">{hint}</p>}
      <Textarea rows={6} value={text} onChange={(e) => {
        setText(e.target.value);
        try {
          const parsed = e.target.value.trim() === "" ? {} : JSON.parse(e.target.value);
          onChange(parsed);
          setErr(null);
        } catch (ex) {
          setErr("Ungültiges JSON");
        }
      }} className={`${inputC} font-mono text-xs`} spellCheck={false} />
    </div>
  );
}
