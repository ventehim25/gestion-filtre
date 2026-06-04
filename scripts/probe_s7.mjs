function s7name(ref) {
  const m = ref.toUpperCase().match(/^([A-Z]+)\s*(.+)$/);
  return m ? m[1] + "_" + m[2].replace(/\//g, ".") : ref.toUpperCase();
}
const refs = ["OP540/1", "AP082", "K1175", "PE973/9", "OE640/5", "PP839", "AP139/5", "OE688/1", "K1321", "AR201", "AM454/1"];
for (const ref of refs) {
  const name = s7name(ref);
  for (const suffix of ["", "-1"]) {
    const u = `https://s7g10.scene7.com/is/image/mannhummel/${name}${suffix}?qlt=82&wid=300`;
    try {
      const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0" } });
      const ct = r.headers.get("content-type");
      const cl = r.headers.get("content-length");
      console.log(`${ref} -> ${name}${suffix} | ${r.status} ${ct} len=${cl}`);
    } catch (e) { console.log(`${ref}${suffix} ERR ${e.message}`); }
  }
}
