import { chromium } from "playwright";

const OUT = "C:/Users/deux/Downloads/gestion filtre/scripts";
const URL = "http://localhost:3000/quotidien";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const browser = await chromium.launch({ channel: "chrome" });

// ---------- RUN A : date réelle, on ajoute des tâches ----------
{
  const ctx = await browser.newContext({ viewport: { width: 430, height: 1500 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("CONSOLE: " + m.text()); });

  await page.goto(URL, { waitUntil: "networkidle" });

  // Onglet Filtres : tâche due aujourd'hui -> doit remonter dans "priorités"
  await page.getByPlaceholder(/Note rapide dans Filtres/i).fill("Livrer filtres client Fès");
  await page.locator('input[type="date"]').fill(todayStr());
  await page.getByRole("button", { name: /Ajouter/i }).click();

  // Une 2e tâche Filtres sans date, épinglée en priorité ensuite
  await page.getByPlaceholder(/Note rapide dans Filtres/i).fill("Commander filtres à huile OP540");
  await page.getByRole("button", { name: /Ajouter/i }).click();

  // Onglet Maison
  await page.getByRole("button", { name: /🏠 Maison/i }).click();
  await page.getByPlaceholder(/Note rapide dans Maison/i).fill("Réparer robinet cuisine");
  await page.getByRole("button", { name: /Ajouter/i }).click();
  await page.getByPlaceholder(/Note rapide dans Maison/i).fill("Changer ampoule garage");
  await page.getByRole("button", { name: /Ajouter/i }).click();

  // Onglet Garage : notes de projet
  await page.getByRole("button", { name: /🚗 Garage/i }).click();
  await page.locator("textarea").fill("Ville : Tétouan ou Salé ? · vidange rapide + vente produits · budget départ à définir");
  await page.getByPlaceholder(/Note rapide dans Garage/i).fill("Comparer loyer local Tétouan vs Salé");
  await page.getByRole("button", { name: /Ajouter/i }).click();

  // Revenir en haut sur l'onglet Filtres pour la photo principale
  await page.getByRole("button", { name: /🔧 Filtres/i }).click();
  await page.waitForTimeout(400);

  await page.screenshot({ path: `${OUT}/quotidien-main.png`, fullPage: true });
  console.log("RUN A errors:", errors.length ? errors : "AUCUNE");
  await ctx.close();
}

// ---------- RUN B : on simule un VENDREDI pour voir la carte irrigation ----------
{
  const ctx = await browser.newContext({ viewport: { width: 430, height: 1200 } });
  const page = await ctx.newPage();
  await ctx.addInitScript(() => {
    const fixed = new Date("2026-06-05T10:00:00").getTime(); // vendredi
    const OrigDate = Date;
    class MockDate extends OrigDate {
      constructor(...args) { if (args.length === 0) super(fixed); else super(...args); }
      static now() { return fixed; }
    }
    // @ts-ignore
    window.Date = MockDate;
  });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/quotidien-vendredi.png`, fullPage: true });
  console.log("RUN B (vendredi) ok");
  await ctx.close();
}

await browser.close();
console.log("DONE");
