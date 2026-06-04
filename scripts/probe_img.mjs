for (const ref of ["op540/1", "ap082", "k1175"]) {
  const u = `https://filtron.eu/en/catalog/search-results/product.html/${ref}_filtron.html`;
  const h = await (await fetch(u, { headers: { "User-Agent": "Mozilla/5.0" } })).text();
  console.log("\n===== " + ref + " len=" + h.length + " =====");
  const dm = [...new Set(h.match(/dm-aid--[a-f0-9-]+/g) || [])];
  console.log("dm-aids:", dm.slice(0, 10));
  const dyn = [...new Set(h.match(/\/adobe\/dynamicmedia\/[^"'\)\s]+/g) || [])].slice(0, 8);
  console.log("dynamicmedia:", dyn);
  const ld = (h.match(/application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1];
  if (ld) { const m = ld.match(/"image"\s*:\s*("[^"]+"|\[[^\]]*\])/); console.log("ld image:", m && m[1]); }
  const scene7 = [...new Set(h.match(/[a-z0-9.\-]*scene7[^"'\s]*/gi) || [])].slice(0, 5);
  console.log("scene7:", scene7);
  // toutes les URLs d'images
  const imgs = [...new Set(h.match(/https?:\/\/[^"'\s]+\.(?:png|jpg|jpeg|webp)[^"'\s]*/gi) || [])].slice(0, 10);
  console.log("img urls:", imgs);
}
