function s7Name(ref) {
  const m = ref.toUpperCase().match(/^([A-Z]+)\s*(.+)$/);
  return m ? m[1] + "_" + m[2].replace(/\//g, ".") : ref.toUpperCase();
}
const suffixes = ["-1", "", "-filter-with-box", "-2", "-filter", "-packshot", "-3", "-box"];
const refs = ["OP540/1", "OP526", "OP643/3", "OE640/5", "OE688/1", "AP082", "AP139/5", "AR201",
  "AM454/1", "K1175", "K1321", "PE973/9", "PP839", "PS974/1", "PM800/2", "OP592/5"];

for (const ref of refs) {
  const name = s7Name(ref);
  const hits = [];
  for (const sfx of suffixes) {
    const u = `https://s7g10.scene7.com/is/image/mannhummel/${name}${sfx}?qlt=82&wid=200`;
    try {
      const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (r.status === 200 && (r.headers.get("content-type") || "").startsWith("image")) hits.push(sfx === "" ? "(base)" : sfx);
    } catch { /* ignore */ }
  }
  console.log(`${ref.padEnd(10)} -> ${hits.join(", ") || "AUCUN"}`);
}
