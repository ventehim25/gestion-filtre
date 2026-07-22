"use client";
export const dynamic = "force-dynamic";
// Catalogue PUBLIC (QR de la carte de visite). SANS prix — les prix restent privés
// (envoyés aux garages via /tarif). Panier + quantités → commande WhatsApp « QTÉ RÉF »
// qui se colle dans /commandes.
import { useEffect, useMemo, useState } from "react";
import { PubItem, CAT_FR, CAT_ORDER, loadPublicCatalogueItems } from "@/lib/catalogue";

const WA = "212602350290";

export default function CataloguePublicPage() {
  const [items, setItems] = useState<PubItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [cart, setCart] = useState<Record<string, number>>({});

  useEffect(() => { loadPublicCatalogueItems().then(list => { setItems(list); setLoading(false); }); }, []);

  const keyOf = (i: PubItem) => `${i.reference}|${i.marque}`;
  function addQty(i: PubItem, d: number) {
    setCart(prev => { const k = keyOf(i); const n = Math.max(0, (prev[k] ?? 0) + d); const next = { ...prev }; if (n === 0) delete next[k]; else next[k] = n; return next; });
  }
  function setQtyDirect(i: PubItem, val: string) {
    const n = Math.max(0, Math.floor(Number(val) || 0));
    setCart(prev => { const k = keyOf(i); const next = { ...prev }; if (n === 0) delete next[k]; else next[k] = n; return next; });
  }

  const cats = useMemo(() => { const p = new Set(items.map(i => i.categorie)); return CAT_ORDER.filter(c => p.has(c)); }, [items]);
  const filtered = useMemo(() => {
    const s = q.trim().toUpperCase().replace(/\s+/g, "");
    return items.filter(i => (!cat || i.categorie === cat) && (!s || i.reference.toUpperCase().replace(/\s+/g, "").includes(s) || i.marque.toUpperCase().includes(s)));
  }, [items, q, cat]);
  const groups = useMemo(() => {
    const m = new Map<string, PubItem[]>();
    for (const i of filtered) { const a = m.get(i.categorie) ?? []; a.push(i); m.set(i.categorie, a); }
    return CAT_ORDER.filter(c => m.has(c)).map(c => [c, m.get(c)!] as const);
  }, [filtered]);

  const cartItems = useMemo(() => items.filter(i => (cart[keyOf(i)] ?? 0) > 0), [items, cart]);
  const cartCount = useMemo(() => Object.values(cart).reduce((s, n) => s + n, 0), [cart]);

  function sendCart() {
    if (cartItems.length === 0) { window.open(`https://wa.me/${WA}?text=${encodeURIComponent("Salam 🙏 Je veux passer une commande :")}`, "_blank"); return; }
    const lignes = ["Salam 🙏 *Commande FiltroPro* :"];
    for (const i of cartItems) lignes.push(`${cart[keyOf(i)]} ${i.reference}`);
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(lignes.join("\n"))}`, "_blank");
  }

  return (
    <div className="pub">
      <style>{`
        .pub{ --ink:#100e13; --ink2:#17141b; --paper:#f4efe3; --muted:#a99f8c; --line:rgba(216,180,96,.30); --gold:#e2c56b;
          min-height:100vh; background:
            radial-gradient(120% 60% at 80% -10%, rgba(216,180,96,.10), transparent 55%),
            linear-gradient(160deg,#161219,#100e13 55%,#0b0a0e);
          color:var(--paper); font-family:"Helvetica Neue",Arial,system-ui,sans-serif; }
        .pub .wrap{ max-width:760px; margin:0 auto; padding:22px 16px 40px; }
        .gold{ background:linear-gradient(135deg,#fff2c2,#f2d375 30%,#c99a2e 60%,#f4d97e); -webkit-background-clip:text; background-clip:text; color:transparent; }
        .pub .head{ display:flex; align-items:center; gap:12px; }
        .pub .logo{ width:44px; height:44px; flex:0 0 auto; }
        .pub h1{ margin:0; font-size:22px; font-weight:800; letter-spacing:-.01em; }
        .pub .sub{ margin:2px 0 0; font-size:12px; color:var(--muted); }
        .pub .bar{ position:sticky; top:0; z-index:5; padding:14px 0 10px; margin-top:16px; background:linear-gradient(#100e13,#100e13 70%,transparent); }
        .pub .search{ width:100%; background:var(--ink2); border:1px solid var(--line); color:var(--paper); border-radius:12px; padding:12px 14px; font-size:15px; font-family:inherit; }
        .pub .search::placeholder{ color:#7c766a; }
        .pub .chips{ display:flex; gap:7px; overflow-x:auto; padding:10px 0 2px; }
        .pub .chip{ white-space:nowrap; font-size:12.5px; padding:7px 12px; border-radius:20px; cursor:pointer; border:1px solid var(--line); background:transparent; color:var(--paper); font-family:inherit; }
        .pub .chip.on{ background:var(--gold); color:#231a06; border-color:var(--gold); font-weight:700; }
        .pub .cat{ margin:22px 0 8px; font-size:12px; letter-spacing:.16em; text-transform:uppercase; color:var(--gold); font-weight:700; }
        .pub .item{ display:flex; align-items:center; gap:12px; padding:12px 4px; border-bottom:1px solid rgba(255,255,255,.06); }
        .pub .ref{ font-family:ui-monospace,Menlo,Consolas,monospace; font-size:15px; font-weight:700; }
        .pub .mk{ font-size:11px; color:var(--muted); }
        .pub .item .sp{ margin-left:auto; }
        .pub .add{ background:var(--gold); color:#231a06; border:0; border-radius:10px; font-weight:800; font-size:12.5px; padding:9px 13px; cursor:pointer; font-family:inherit; white-space:nowrap; }
        .pub .stepper{ display:flex; align-items:center; background:var(--ink2); border:1px solid var(--line); border-radius:10px; overflow:hidden; }
        .pub .stepper button{ width:34px; height:38px; background:transparent; border:0; color:var(--gold); font-size:19px; font-weight:800; cursor:pointer; font-family:inherit; }
        .pub .stepper input{ width:40px; height:38px; text-align:center; background:transparent; border:0; color:var(--paper); font-weight:800; font-size:15px; font-family:inherit; -moz-appearance:textfield; }
        .pub .stepper input::-webkit-outer-spin-button,.pub .stepper input::-webkit-inner-spin-button{ -webkit-appearance:none; margin:0; }
        .pub .stepper input:focus{ outline:none; }
        .pub .cta{ position:sticky; bottom:14px; margin-top:24px; display:flex; justify-content:center; }
        .pub .cta button{ background:#25D366; color:#04310f; border:0; border-radius:999px; cursor:pointer; font-size:15px; font-weight:800; padding:13px 26px; box-shadow:0 12px 30px -10px rgba(37,211,102,.6); font-family:inherit; }
        .pub .cartbar{ position:sticky; bottom:12px; z-index:6; margin-top:24px; display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; background:linear-gradient(#1b1720,#120f16); border:1px solid var(--line); border-radius:16px; padding:12px 14px; box-shadow:0 18px 44px -14px rgba(0,0,0,.75); }
        .pub .cartbar .info{ font-size:14px; } .pub .cartbar .info b{ color:var(--gold); }
        .pub .cartbar .send{ background:#25D366; color:#04310f; border:0; border-radius:999px; font-weight:800; padding:12px 20px; cursor:pointer; font-family:inherit; }
        .pub .cartbar .clear{ background:transparent; color:var(--muted); border:0; cursor:pointer; margin-right:6px; font-family:inherit; font-size:13px; }
        .pub .empty{ text-align:center; color:var(--muted); padding:60px 20px; }
        .pub .foot{ margin-top:30px; text-align:center; font-size:11px; color:#6f6a5f; line-height:1.7; }
      `}</style>

      <div className="wrap">
        <div className="head">
          <svg className="logo" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <defs><linearGradient id="pl" x1="6" y1="3" x2="42" y2="45" gradientUnits="userSpaceOnUse"><stop stopColor="#f43f5e"/><stop offset="0.6" stopColor="#dc2626"/><stop offset="1" stopColor="#7f1d1d"/></linearGradient></defs>
            <path d="M24 2.5 41.55 12.75 V33.25 L24 43.5 6.45 33.25 V12.75 Z" fill="url(#pl)"/>
            <g stroke="#fff" strokeWidth="2.6" strokeLinecap="round" fill="none"><path d="M13 18 C 19.5 13.5, 28.5 13.5, 35 18"/><path d="M13 24 C 19.5 19.5, 28.5 19.5, 35 24"/><path d="M13 30 C 19.5 25.5, 28.5 25.5, 35 30"/></g>
            <circle cx="35" cy="18" r="2.1" fill="#fff"/>
          </svg>
          <div>
            <h1>Filtro<span className="gold">Pro</span> · Catalogue</h1>
            <p className="sub">Filtres &amp; pièces auto · livraison garages · prix sur WhatsApp</p>
          </div>
        </div>

        <div className="bar">
          <input className="search" placeholder="Chercher une référence (ex : OE667/6, WL7510…)" value={q} onChange={e => setQ(e.target.value)} />
          <div className="chips">
            <button className={`chip ${cat === "" ? "on" : ""}`} onClick={() => setCat("")}>Tout</button>
            {cats.map(c => <button key={c} className={`chip ${cat === c ? "on" : ""}`} onClick={() => setCat(c)}>{CAT_FR[c]}</button>)}
          </div>
        </div>

        {loading ? (
          <p className="empty">Chargement du catalogue…</p>
        ) : filtered.length === 0 ? (
          <p className="empty">Aucun article trouvé.</p>
        ) : (
          groups.map(([c, list]) => (
            <div key={c}>
              <div className="cat">{CAT_FR[c]}</div>
              {list.map((i, idx) => {
                const n = cart[keyOf(i)] ?? 0;
                return (
                  <div className="item" key={c + idx}>
                    <div>
                      <div className="ref">{i.reference}</div>
                      <div className="mk">{i.marque}</div>
                    </div>
                    <div className="sp">
                      {n === 0 ? (
                        <button className="add" onClick={() => addQty(i, 1)}>+ Panier</button>
                      ) : (
                        <div className="stepper">
                          <button onClick={() => addQty(i, -1)} aria-label="moins">−</button>
                          <input type="number" min={0} inputMode="numeric" value={n} onChange={e => setQtyDirect(i, e.target.value)} onFocus={e => e.target.select()} />
                          <button onClick={() => addQty(i, 1)} aria-label="plus">+</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}

        {!loading && (
          cartCount > 0 ? (
            <div className="cartbar">
              <div className="info">🛒 {cartCount} article(s)</div>
              <div>
                <button className="clear" onClick={() => setCart({})}>Vider</button>
                <button className="send" onClick={sendCart}>Envoyer la commande</button>
              </div>
            </div>
          ) : filtered.length > 0 ? (
            <div className="cta"><button onClick={sendCart}>💬 Commander sur WhatsApp</button></div>
          ) : null
        )}

        <p className="foot">Livraison aux garages · tout le Maroc<br />FiltroPro · Pièces &amp; Filtres Auto · 06 02 35 02 90</p>
      </div>
    </div>
  );
}
