/* Lògica pura (mateixes regles que el programa d'escriptori XoriguerPressió) */
const R = (() => {
  const LLINDAR_SYS = 135, LLINDAR_DIA = 85;
  const LIMITS = { sys: [60, 260], dia: [30, 160], pols: [30, 220] };
  const POLS_MAX = 100, POLS_MIN = 50;
  const MIN_SET_DIES = 12;
  const FRANGES = [["mati", "Matí (6–14 h)"], ["tarda", "Tarda (14–21 h)"], ["nit", "Nit (21–6 h)"]];
  const CLASSES = [
    ["Òptima", "#C6EFCE", "SYS < 120 i DIA < 80"],
    ["Normal", "#E2EFDA", "SYS 120–129 i/o DIA 80–84"],
    ["Normal-alta", "#FFEB9C", "SYS 130–139 i/o DIA 85–89"],
    ["Hipertensió grau 1", "#F8CBAD", "SYS 140–159 i/o DIA 90–99"],
    ["Hipertensió grau 2", "#F4B084", "SYS 160–179 i/o DIA 100–109"],
    ["Hipertensió grau 3", "#FF7C80", "SYS ≥ 180 i/o DIA ≥ 110"],
  ];
  const COLOR = Object.fromEntries(CLASSES.map(c => [c[0], c[1]]));

  const pad = n => String(n).padStart(2, "0");
  const round = x => Math.floor(x + 0.5);              // com Excel: la meitat cap amunt

  function parseData(t) {                              // -> 'AAAA-MM-DD'
    t = String(t).trim();
    let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/), d, mo, y;
    if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else if ((m = t.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})$/))) {
      d = +m[1]; mo = +m[2]; y = +m[3]; if (m[3].length === 2) y += 2000;
    } else throw new Error("Data no vàlida. Escriu-la com dd/mm/aaaa (p. ex. 25/10/2026).");
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d)
      throw new Error("Data no vàlida. Escriu-la com dd/mm/aaaa (p. ex. 25/10/2026).");
    return `${y}-${pad(mo)}-${pad(d)}`;
  }
  function parseHora(t) {                              // -> 'HH:MM'
    t = String(t).trim().replace(/[.h ]/g, ":").replace(/:+/g, ":");
    const p = t.split(":"), h = parseInt(p[0], 10), mi = parseInt(p[1], 10);
    if (!(h >= 0 && h <= 23 && mi >= 0 && mi <= 59) || p.length > 3 || /\D/.test(p[0]) || /\D/.test(p[1] || "x"))
      throw new Error("Hora no vàlida. Escriu-la com HH:MM (p. ex. 22:44).");
    return `${pad(h)}:${pad(mi)}`;
  }
  function parseEnter(t, camp) {
    const s = String(t).trim();
    if (!/^-?\d+$/.test(s)) throw new Error(`${camp.toUpperCase()} ha de ser un número enter.`);
    const v = +s, [lo, hi] = LIMITS[camp];
    if (v < lo || v > hi) throw new Error(`${camp.toUpperCase()} fora de rang (${lo}–${hi}). Revisa el valor.`);
    return v;
  }
  const dataCat = iso => iso.split("-").reverse().join("/");
  const addDays = (iso, n) => {
    const [y, m, d] = iso.split("-").map(Number), t = new Date(Date.UTC(y, m - 1, d + n));
    return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
  };
  const diffDies = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

  function classificar(s, d) {
    if (s >= 180 || d >= 110) return "Hipertensió grau 3";
    if (s >= 160 || d >= 100) return "Hipertensió grau 2";
    if (s >= 140 || d >= 90) return "Hipertensió grau 1";
    if (s >= 130 || d >= 85) return "Normal-alta";
    if (s >= 120 || d >= 80) return "Normal";
    return "Òptima";
  }
  const alLlindar = (s, d) => s >= LLINDAR_SYS || d >= LLINDAR_DIA;
  const polsAvis = p => p > POLS_MAX || p < POLS_MIN;
  const franja = hora => { const h = +hora.split(":")[0]; return h >= 6 && h < 14 ? "mati" : h >= 14 && h < 21 ? "tarda" : "nit"; };

  function _mit(ms) {
    if (!ms.length) return null;
    const n = ms.length, sum = k => ms.reduce((a, m) => a + m[k], 0);
    return [round(sum("sys") / n), round(sum("dia") / n), round(sum("pols") / n), n];
  }
  function mitjanes(ms) {
    const res = { total: _mit(ms) };
    if (ms.length) {
      const ultima = ms.reduce((a, m) => (m.data > a ? m.data : a), "0000");
      const lim = addDays(ultima, -6);
      res.set_dies = _mit(ms.filter(m => m.data >= lim));
    } else res.set_dies = null;
    FRANGES.forEach(([k]) => (res[k] = _mit(ms.filter(m => franja(m.hora) === k))));
    return res;
  }
  function mitjanesPerDia(ms, dies = 30) {
    if (!ms.length) return [];
    const dates = ms.map(m => m.data).sort(), fi = dates[dates.length - 1];
    let ini = dates[0]; const lim = addDays(fi, -(dies - 1)); if (ini < lim) ini = lim;
    const per = {}; ms.forEach(m => (per[m.data] = per[m.data] || []).push(m));
    const out = []; for (let d = ini; d <= fi; d = addDays(d, 1)) out.push([d, _mit(per[d] || [])]);
    return out;
  }
  const ordenar = ms => [...ms].sort((a, b) => (a.data + a.hora < b.data + b.hora ? -1 : a.data + a.hora > b.data + b.hora ? 1 : 0));
  const filtrar = (ms, d, f) => ms.filter(m => (!d || m.data >= d) && (!f || m.data <= f));

  function veredicte(mit) {
    const v = mit.set_dies; if (!v) return null;
    const [s, d, p, n] = v;
    return { sys: s, dia: d, pols: p, n, classe: classificar(s, d), llindar: alLlindar(s, d), suficient: n >= MIN_SET_DIES };
  }
  function textVeredicte(v) {
    if (!v) return "Mitjana de 7 dies: sense dades.";
    let t = `Mitjana de 7 dies: ${v.sys}/${v.dia} → ${v.classe}. ` +
      (v.llindar ? "Arriba al llindar domiciliari 135/85." : "Per sota del llindar domiciliari 135/85.");
    if (!v.suficient) t += ` (Només ${v.n} mesures; es recomanen ≥${MIN_SET_DIES} en 7 dies: valor orientatiu.)`;
    return t;
  }
  const clau = m => [m.usuari, m.data, m.hora, m.sys, m.dia, m.pols].join("|");

  return { LLINDAR_SYS, LLINDAR_DIA, LIMITS, FRANGES, CLASSES, COLOR, MIN_SET_DIES, pad, parseData, parseHora, parseEnter,
    dataCat, addDays, diffDies, classificar, alLlindar, polsAvis, franja, mitjanes, mitjanesPerDia, ordenar, filtrar,
    veredicte, textVeredicte, clau };
})();
if (typeof module !== "undefined") module.exports = R;
