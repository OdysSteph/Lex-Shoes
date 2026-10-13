import { createClient } from "@supabase/supabase-js";

const BASE = "https://emsifa.github.io/api-wilayah-indonesia/api";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const get = async (path) => {
  const res = await fetch(`${BASE}/${path}.json`);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
};

async function upsert(table, rows) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from(table).upsert(rows.slice(i, i + 500));
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

async function inChunks(items, size, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return out;
}

const provinces = await get("provinces");
await upsert("provinces", provinces.map((p) => ({ id: p.id, name: p.name })));
console.log("provinsi:", provinces.length);

const regencies = (await inChunks(provinces, 5, (p) => get(`regencies/${p.id}`))).flat();
await upsert("regencies", regencies.map((r) => ({ id: r.id, province_id: r.province_id, name: r.name })));
console.log("kab/kota:", regencies.length);

const districts = (await inChunks(regencies, 10, (r) => get(`districts/${r.id}`))).flat();
await upsert("districts", districts.map((d) => ({ id: d.id, regency_id: d.regency_id, name: d.name })));
console.log("kecamatan:", districts.length);