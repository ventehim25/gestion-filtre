"use client";
export const dynamic = "force-dynamic";
// Catalogue de prix PRIVÉ (envoyé aux garages). Ne s'ouvre qu'avec le bon lien (?k=...).
// Toujours à jour : lit les produits en direct. Ne montre JAMAIS le prix d'achat.
// Panier + quantités → message WhatsApp formaté « QTÉ RÉF » qui rentre dans /commandes.
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CatItem, CAT_FR, CAT_ORDER, TARIF_KEY, loadCatalogueItems } from "@/lib/catalogue";

const WA = "212602350290";

export default function TarifPage() {
  return <Suspense fallback={null}><TarifInner /></Suspense>;
}

function TarifInner() {
  const params = useSearchParams();
  const ok = params.get("k") === TARIF_KEY;

  const [items, setItems] = useState<CatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [cart, setCart] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!ok) { setLoading(false); return; }
    loadCatalogueItems().then(list => { setItems(list); setLoading(false); });
  }, [ok]);

  const keyOf = (i: CatItem) => `${i.reference}|${i.marque}`;
  function addQty(i: CatItem, d: number) {
    setCart(prev => {
      const k = keyOf(i); const n = Math.max(0, (prev[k] ?? 0) + d);
      const next = { ...prev }; if (n === 0) delete next[k]; else next[k] = n; return next;
    });
  }
  function setQtyDirect(i: CatItem, val: string) {
    const n = Math.max(0, Math.floor(Number(val) || 0));
    setCart(prev => { const k = keyOf(i); const next = { ...prev }; if (n === 0) delete next[k]; else next[k] = n; return next; });
  }

  const cats = useMemo(() => {
    const present = new Set(items.map(i => i.categorie));
    return CAT_ORDER.filter(c => present.has(c));
  }, [items]);

  const filtered = useMemo(() => {
    const s = q.trim().toUpperCase().replace(/\s+/g, "");
    return items.filter(i =>
      (!cat || i.categorie === cat) &&
      (!s || i.reference.toUpperCase().replace(/\s+/g, "").includes(s) || i.marque.toUpperCase().includes(s))
    );
  }, [items, q, cat]);

  const groups = useMemo(() => {
    const m = new Map<string, CatItem[]>();
    for (const i of filtered) { const a = m.get(i.categorie) ?? []; a.push(i); m.set(i.categorie, a); }
    return CAT_ORDER.filter(c => m.has(c)).map(c => [c, m.get(c)!] as const);
  }, [filtered]);

  const cartItems = useMemo(() => items.filter(i => (cart[keyOf(i)] ?? 0) > 0), [items, cart]);
  const cartCount = useMemo(() => Object.values(cart).reduce((s, n) => s + n, 0), [cart]);
  const cartTotal = useMemo(() => cartItems.reduce((s, i) => s + i.prix * cart[keyOf(i)], 0), [cartItems, cart]);

  function sendCart() {
    if (cartItems.length === 0) {
      window.open(`https://wa.me/${WA}?text=${encodeURIComponent("Salam 🙏 Je veux passer une commande :")}`, "_blank");
      return;
    }
    // Lignes « QTÉ RÉF » → se collent directement dans la page Commandes garages
    const lignes = ["Salam 🙏 *Commande FiltroPro* :"];
    for (const i of cartItems) lignes.push(`${cart[keyOf(i)]} ${i.reference}`);
    lignes.push("", `Total indicatif : ${cartTotal} MAD`);
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(lignes.join("\n"))}`, "_blank");
  }

  return (
    <div className="tarif">
      <style>{`
        .tarif{ --ink:#100e13; --ink2:#17141b; --paper:#f4efe3; --muted:#a99f8c; --line:rgba(216,180,96,.30);
          --gold:#e2c56b; --red:#e11d2a;
          min-height:100vh; background:
            radial-gradient(120% 60% at 80% -10%, rgba(216,180,96,.10), transparent 55%),
            linear-gradient(160deg,#161219, #100e13 55%, #0b0a0e);
          color:var(--paper); font-family:"Helvetica Neue",Arial,system-ui,sans-serif; }
        .tarif .wrap{ max-width:760px; margin:0 auto; padding:22px 16px 40px; }
        .gold{ background:linear-gradient(135deg,#fff2c2,#f2d375 30%,#c99a2e 60%,#f4d97e); -webkit-background-clip:text; background-clip:text; color:transparent; }
        .tarif .head{ display:flex; align-items:center; gap:12px; }
        .tarif .head .logo{ width:44px; height:44px; flex:0 0 auto; }
        .tarif h1{ margin:0; font-size:22px; font-weight:800; letter-spacing:-.01em; }
        .tarif .sub{ margin:2px 0 0; font-size:12px; color:var(--muted); letter-spacing:.02em; }
        .tarif .bar{ position:sticky; top:0; z-index:5; padding:14px 0 10px; margin-top:16px;
          background:linear-gradient(#100e13, #100e13 70%, transparent); }
        .tarif .search{ width:100%; background:var(--ink2); border:1px solid var(--line); color:var(--paper);
          border-radius:12px; padding:12px 14px; font-size:15px; font-family:inherit; }
        .tarif .search::placeholder{ color:#7c766a; }
        .tarif .chips{ display:flex; gap:7px; overflow-x:auto; padding:10px 0 2px; }
        .tarif .chip{ white-space:nowrap; font-size:12.5px; padding:7px 12px; border-radius:20px; cursor:pointer;
          border:1px solid var(--line); background:transparent; color:var(--paper); font-family:inherit; }
        .tarif .chip.on{ background:var(--gold); color:#231a06; border-color:var(--gold); font-weight:700; }
        .tarif .cat{ margin:22px 0 8px; font-size:12px; letter-spacing:.16em; text-transform:uppercase; color:var(--gold); font-weight:700; }
        .tarif .item{ display:flex; align-items:center; gap:12px; padding:12px 4px; border-bottom:1px solid rgba(255,255,255,.06); }
        .tarif .ref{ font-family:ui-monospace,Menlo,Consolas,monospace; font-size:15px; font-weight:700; }
        .tarif .mk{ font-size:11px; color:var(--muted); }
        .tarif .price{ margin-left:auto; text-align:right; white-space:nowrap; }
        .tarif .price .now{ font-size:16px; font-weight:800; font-variant-numeric:tabular-nums; }
        .tarif .price .was{ font-size:11px; color:#8b8578; text-decoration:line-through; margin-right:6px; }
        .tarif .promo{ display:inline-block; margin-top:2px; font-size:9px; font-weight:800; letter-spacing:.06em;
          background:rgba(225,29,42,.18); color:#ff8a92; padding:1px 6px; border-radius:20px; }
        .tarif .add{ flex:0 0 auto; background:var(--gold); color:#231a06; border:0; border-radius:10px;
          font-weight:800; font-size:12.5px; padding:9px 13px; cursor:pointer; font-family:inherit; white-space:nowrap; }
        .tarif .stepper{ flex:0 0 auto; display:flex; align-items:center; background:var(--ink2); border:1px solid var(--line); border-radius:10px; overflow:hidden; }
        .tarif .stepper button{ width:34px; height:38px; background:transparent; border:0; color:var(--gold); font-size:19px; font-weight:800; cursor:pointer; font-family:inherit; }
        .tarif .stepper input{ width:40px; height:38px; text-align:center; background:transparent; border:0; color:var(--paper); font-weight:800; font-size:15px; font-family:inherit; -moz-appearance:textfield; }
        .tarif .stepper input::-webkit-outer-spin-button,.tarif .stepper input::-webkit-inner-spin-button{ -webkit-appearance:none; margin:0; }
        .tarif .stepper input:focus{ outline:none; }
        .tarif .cta{ position:sticky; bottom:14px; margin-top:24px; display:flex; justify-content:center; }
        .tarif .cta button{ background:#25D366; color:#04310f; border:0; border-radius:999px; cursor:pointer;
          font-size:15px; font-weight:800; padding:13px 26px; box-shadow:0 12px 30px -10px rgba(37,211,102,.6); font-family:inherit; }
        .tarif .cartbar{ position:sticky; bottom:12px; z-index:6; margin-top:24px; display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;
          background:linear-gradient(#1b1720,#120f16); border:1px solid var(--line); border-radius:16px; padding:12px 14px; box-shadow:0 18px 44px -14px rgba(0,0,0,.75); }
        .tarif .cartbar .info{ font-size:14px; }
        .tarif .cartbar .info b{ color:var(--gold); }
        .tarif .cartbar .send{ background:#25D366; color:#04310f; border:0; border-radius:999px; font-weight:800; padding:12px 20px; cursor:pointer; font-family:inherit; }
        .tarif .cartbar .clear{ background:transparent; color:var(--muted); border:0; cursor:pointer; margin-right:6px; font-family:inherit; font-size:13px; }
        .tarif .empty{ text-align:center; color:var(--muted); padding:60px 20px; }
        .tarif .foot{ margin-top:30px; text-align:center; font-size:11px; color:#6f6a5f; line-height:1.7; }
        .tarif .gate{ min-height:100vh; display:grid; place-items:center; padding:24px; text-align:center; }
      `}</style>

      {!ok ? (
        <div className="gate">
          <div>
            <div style={{ fontSize: 40 }}>🔒</div>
            <h1 style={{ marginTop: 12 }}>Catalogue privé</h1>
            <p className="sub" style={{ marginTop: 8 }}>Ce catalogue de prix est réservé aux clients FiltroPro.<br />Demande le lien sur WhatsApp.</p>
            <div style={{ marginTop: 18 }}>
              <button className="chip on" onClick={() => window.open(`https://wa.me/${WA}`, "_blank")} style={{ padding: "11px 20px" }}>💬 Contacter FiltroPro</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="wrap">
          <div className="head">
            <svg className="logo" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <defs><linearGradient id="tl" x1="6" y1="3" x2="42" y2="45" gradientUnits="userSpaceOnUse"><stop stopColor="#f43f5e"/><stop offset="0.6" stopColor="#dc2626"/><stop offset="1" stopColor="#7f1d1d"/></linearGradient></defs>
              <path d="M24 2.5 41.55 12.75 V33.25 L24 43.5 6.45 33.25 V12.75 Z" fill="url(#tl)"/>
              <g stroke="#fff" strokeWidth="2.6" strokeLinecap="round" fill="none"><path d="M13 18 C 19.5 13.5, 28.5 13.5, 35 18"/><path d="M13 24 C 19.5 19.5, 28.5 19.5, 35 24"/><path d="M13 30 C 19.5 25.5, 28.5 25.5, 35 30"/></g>
              <circle cx="35" cy="18" r="2.1" fill="#fff"/>
            </svg>
            <div>
              <h1>Filtro<span className="gold">Pro</span> · Tarifs</h1>
              <p className="sub">Prix du jour · livraison aux garages · {items.length} article(s) dispo</p>
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
                      <div className="price">
                        <div>
                          {i.promo && i.prixAvant && <span className="was">{i.prixAvant}</span>}
                          <span className="now">{i.prix} MAD</span>
                        </div>
                        {i.promo && <span className="promo">PROMO</span>}
                      </div>
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
                  );
                })}
              </div>
            ))
          )}

          {!loading && (
            cartCount > 0 ? (
              <div className="cartbar">
                <div className="info">🛒 {cartCount} article(s) · <b>{cartTotal} MAD</b></div>
                <div>
                  <button className="clear" onClick={() => setCart({})}>Vider</button>
                  <button className="send" onClick={sendCart}>Envoyer la commande</button>
                </div>
              </div>
            ) : filtered.length > 0 ? (
              <div className="cta"><button onClick={sendCart}>💬 Commander sur WhatsApp</button></div>
            ) : null
          )}

          <p className="foot">Prix susceptibles d'évoluer · sous réserve de disponibilité<br />FiltroPro · Pièces &amp; Filtres Auto · Maroc · 06 02 35 02 90</p>
        </div>
      )}
    </div>
  );
}
