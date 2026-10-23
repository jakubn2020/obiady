import { getStore } from "@netlify/blobs";

const PASS = "kaczyce123";
const PEOPLE = ["kuba", "wika", "mama", "tata"];

const empty = () => ({
  dishes: [],
  prefs: { kuba: [], wika: [], mama: [], tata: [] },
});

export default async (req) => {
  if (req.headers.get("x-pass") !== PASS) {
    return new Response("unauthorized", { status: 401 });
  }

  const store = getStore({ name: "obiady", consistency: "strong" });
  const data = (await store.get("data", { type: "json" })) || empty();
  for (const p of PEOPLE) data.prefs[p] = data.prefs[p] || [];

  if (req.method === "POST") {
    let b;
    try { b = await req.json(); } catch { return new Response("bad request", { status: 400 }); }
    const who = b.who;
    if (!PEOPLE.includes(who)) return new Response("bad who", { status: 400 });

    if (b.action === "add") {
      const name = String(b.name || "").trim().slice(0, 60);
      if (!name) return new Response("bad name", { status: 400 });
      let d = data.dishes.find((x) => x.name.toLowerCase() === name.toLowerCase());
      if (!d) {
        d = { id: crypto.randomUUID().slice(0, 8), name, meat: !!b.meat, by: who };
        data.dishes.push(d);
      }
      if (!data.prefs[who].includes(d.id)) data.prefs[who].push(d.id);
    } else if (b.action === "toggle") {
      const d = data.dishes.find((x) => x.id === b.id);
      if (!d) return new Response("no dish", { status: 404 });
      const has = data.prefs[who].includes(d.id);
      if (b.on && !has) data.prefs[who].push(d.id);
      if (!b.on && has) data.prefs[who] = data.prefs[who].filter((x) => x !== d.id);
    } else if (b.action === "remove") {
      const d = data.dishes.find((x) => x.id === b.id);
      if (d && d.by === who) {
        data.dishes = data.dishes.filter((x) => x.id !== d.id);
        for (const p of PEOPLE) data.prefs[p] = data.prefs[p].filter((x) => x !== d.id);
      }
    } else {
      return new Response("bad action", { status: 400 });
    }
    await store.setJSON("data", data);
  }

  return Response.json(data);
};

export const config = { path: "/api/data" };
