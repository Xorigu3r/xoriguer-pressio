/* XoriguerPressió · app web (PWA). Dades 100 % al telèfon (localStorage). */
(() => {
const APP_VERSIO = "1.0";
const CREDIT = "Creat per Xavier Musté";
const KEY = "xp.dades.v1", KEY_BAK = "xp.dades.v1.bak", KEY_COPIA = "xp.copia.", KEY_EXPORT = "xp.ultimaExportacio";
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = R.pad;
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const avui = () => iso(new Date());
const ara = () => { const d = new Date(); return pad(d.getHours()) + ":" + pad(d.getMinutes()); };
const uid = () => (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Date.now().toString(16) + Math.random().toString(16).slice(2));
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };

// ------------------------------------------------------------------ Dades
let S = { usuaris: [], usuari_actual: "", mesures: [] };
const ui = { tab: "mesures", tots: false, periode: 30, limit: 40 };

function normalitza(d) {
  const mesures = (d.mesures || []).map(m => ({
    id: m.id || uid(), data: m.data, hora: m.hora, usuari: m.usuari, sys: +m.sys, dia: +m.dia, pols: +m.pols, notes: m.notes || "",
  }));
  const usuaris = [...(d.usuaris || [])];
  mesures.forEach(m => { if (!usuaris.some(u => u.toLowerCase() === m.usuari.toLowerCase())) usuaris.push(m.usuari); });
  let actual = d.usuari_actual || "";
  if (!usuaris.includes(actual)) actual = usuaris[0] || "";
  return { usuaris, usuari_actual: actual, mesures };
}
function validaCopia(d) {
  if (!d || typeof d !== "object" || !Array.isArray(d.mesures)) throw new Error("El fitxer no és una còpia de seguretat vàlida.");
  for (const m of d.mesures)
    if (!m || typeof m !== "object" || ["data", "hora", "usuari", "sys", "dia", "pols"].some(k => m[k] === undefined))
      throw new Error("La còpia té mesures amb un format incorrecte.");
}
function carrega() {
  for (const k of [KEY, KEY_BAK]) {
    const t = lsGet(k); if (!t) continue;
    try { const d = JSON.parse(t); validaCopia(d); S = normalitza(d); return; } catch (e) { /* prova la següent */ }
  }
}
function desa() {
  const prev = lsGet(KEY); if (prev) lsSet(KEY_BAK, prev);
  if (!lsSet(KEY, JSON.stringify(S))) toast("No s'ha pogut desar: el telèfon no té espai o bloqueja l'emmagatzematge.");
  copiaDiaria();
}
function copiaDiaria() {
  const k = KEY_COPIA + avui();
  lsSet(k, JSON.stringify(S));
  const claus = copies();
  claus.slice(0, Math.max(0, claus.length - 14)).forEach(c => { try { localStorage.removeItem(KEY_COPIA + c); } catch (e) {} });
}
function copies() {           // dates de còpies automàtiques, de més antiga a més nova
  const r = [];
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(KEY_COPIA)) r.push(k.slice(KEY_COPIA.length)); } } catch (e) {}
  return r.sort();
}
const usuariVista = () => (ui.tots ? null : S.usuari_actual);
const mesuresVista = () => R.ordenar(usuariVista() ? S.mesures.filter(m => m.usuari === usuariVista()) : S.mesures);
function assegura(nom) { if (nom && !S.usuaris.some(u => u.toLowerCase() === nom.toLowerCase())) S.usuaris.push(nom); }

// ------------------------------------------------------------------ Utilitats UI
let toastT;
function toast(t) { const e = $("#toast"); e.textContent = t; e.classList.remove("hidden"); clearTimeout(toastT); toastT = setTimeout(() => e.classList.add("hidden"), 3400); }
function modal(html) { const m = $("#modal"); m.innerHTML = `<div class="sheet">${html}</div>`; m.classList.remove("hidden"); }
function tanca() { $("#modal").classList.add("hidden"); $("#modal").innerHTML = ""; }
$("#modal").addEventListener("click", e => { if (e.target.id === "modal") tanca(); });
const chipClasse = c => `<span class="tag" style="background:${R.COLOR[c]}">${esc(c)}</span>`;

// ------------------------------------------------------------------ Barra d'usuaris
function renderUsuaris() {
  const b = $("#userbar");
  if (S.usuaris.length === 0) { b.innerHTML = ""; return; }
  let h = S.usuaris.map(u => `<button class="chip ${!ui.tots && u === S.usuari_actual ? "on" : ""}" data-u="${esc(u)}">${esc(u)}</button>`).join("");
  if (S.usuaris.length > 1) h += `<button class="chip ${ui.tots ? "on" : ""}" data-u="__tots">Tots</button>`;
  b.innerHTML = h;
}
$("#userbar").addEventListener("click", e => {
  const c = e.target.closest("[data-u]"); if (!c) return;
  if (c.dataset.u === "__tots") ui.tots = true; else { ui.tots = false; S.usuari_actual = c.dataset.u; desa(); }
  ui.limit = 40; render();
});

// ------------------------------------------------------------------ Formulari de mesura
function formHTML(p, m) {
  m = m || { data: avui(), hora: ara(), usuari: S.usuari_actual, sys: "", dia: "", pols: "", notes: "" };
  const sel = S.usuaris.length > 1
    ? `<div><label class="f" for="${p}u">Usuari</label><select id="${p}u">${S.usuaris.map(u => `<option ${u === m.usuari ? "selected" : ""}>${esc(u)}</option>`).join("")}</select></div>` : "";
  return `
  <div class="dh"><div><label class="f" for="${p}d">Data</label><input id="${p}d" type="date" value="${m.data}"></div>
  <div><label class="f" for="${p}h">Hora</label><input id="${p}h" type="time" value="${m.hora}"></div>
  <button class="btn sec small" id="${p}ara" type="button">Ara</button></div>
  <div class="grid3" style="margin-top:8px">
    <div><label class="f" for="${p}s">SYS (alta)</label><input class="big" id="${p}s" inputmode="numeric" maxlength="3" value="${m.sys}" placeholder="120"></div>
    <div><label class="f" for="${p}di">DIA (baixa)</label><input class="big" id="${p}di" inputmode="numeric" maxlength="3" value="${m.dia}" placeholder="80"></div>
    <div><label class="f" for="${p}p">Pols /min</label><input class="big" id="${p}p" inputmode="numeric" maxlength="3" value="${m.pols}" placeholder="70"></div>
  </div>
  <div class="stack" style="margin-top:8px">${sel}
  <div><label class="f" for="${p}n">Notes</label><input id="${p}n" value="${esc(m.notes)}" placeholder="opcional"></div></div>
  <div class="preview" id="${p}pre">—</div><div class="err" id="${p}err"></div>`;
}
function ligaForm(p) {
  const g = id => $("#" + p + id);
  const prev = () => {
    const s = parseInt(g("s").value, 10), d = parseInt(g("di").value, 10), box = g("pre");
    if (!(s >= 60 && s <= 260 && d >= 30 && d <= 160)) { box.style.background = ""; box.textContent = "—"; return; }
    const c = R.classificar(s, d);
    box.style.background = R.COLOR[c];
    box.innerHTML = `${esc(c)}<span class="t">${R.alLlindar(s, d) ? "Arriba al llindar domiciliari 135/85" : "Per sota del llindar domiciliari 135/85"}</span>`;
  };
  ["s", "di", "p"].forEach(i => g(i).addEventListener("input", () => { g(i).value = g(i).value.replace(/\D/g, ""); prev(); g("err").textContent = ""; }));
  g("s").addEventListener("input", () => { if (g("s").value.length >= 3) g("di").focus(); });
  g("ara").addEventListener("click", () => { g("d").value = avui(); g("h").value = ara(); });
  prev();
}
function llegeixForm(p) {
  const g = id => $("#" + p + id);
  const data = R.parseData(g("d").value), hora = R.parseHora(g("h").value);
  const sys = R.parseEnter(g("s").value, "sys"), dia = R.parseEnter(g("di").value, "dia"), pols = R.parseEnter(g("p").value, "pols");
  const usuari = g("u") ? g("u").value : S.usuari_actual;
  return { data, hora, usuari, sys, dia, pols, notes: g("n").value.trim() };
}
function validaSemantica(m, ignoraId) {
  if (m.sys <= m.dia && !confirm(`SYS (${m.sys}) és igual o menor que DIA (${m.dia}). Segur que són correctes?`)) return false;
  const rep = S.mesures.some(x => x.id !== ignoraId && R.clau(x) === R.clau(m));
  if (rep && !confirm("Ja existeix una mesura idèntica (mateixa data, hora i valors). Vols afegir-la igualment?")) return false;
  return true;
}

// ------------------------------------------------------------------ Pestanya Mesures
function taulaMitjanes(mit) {
  const f = (k, nom) => { const v = mit[k]; return `<tr><td>${nom}</td>${v ? `<td>${v[0]}</td><td>${v[1]}</td><td>${v[2]}</td><td class="n">${v[3]}</td>` : `<td>–</td><td>–</td><td>–</td><td class="n">0</td>`}</tr>`; };
  return `<table class="mit"><tr><th></th><th>SYS</th><th>DIA</th><th>Pols</th><th>n</th></tr>${f("total", "Total")}${f("set_dies", "Últims 7 dies")}${R.FRANGES.map(([k, n]) => f(k, n)).join("")}</table>`;
}
function veredicteHTML(mit) {
  const v = R.veredicte(mit);
  return `<div class="verd" style="background:${v ? R.COLOR[v.classe] : "var(--soft)"}${v ? "" : ";color:var(--muted)"}">${esc(R.textVeredicte(v))}</div>`;
}
function vMesures() {
  if (!S.usuaris.length) return "";
  const ms = mesuresVista(), mit = R.mitjanes(ms), n135 = ms.filter(m => R.alLlindar(m.sys, m.dia)).length;
  const ord = [...ms].reverse(), mostra = ord.slice(0, ui.limit);
  const files = mostra.map(m => {
    const c = R.classificar(m.sys, m.dia);
    return `<button class="item" data-id="${m.id}">
      <div class="d"><b>${R.dataCat(m.data).slice(0, 5)}</b>${m.hora}</div>
      <div class="v">${m.sys}/${m.dia}</div>
      <div class="p ${R.polsAvis(m.pols) ? "w" : ""}">♥ ${m.pols}</div>
      <div style="margin-left:auto;text-align:right">${chipClasse(c)}${R.alLlindar(m.sys, m.dia) ? '<span class="lim" style="display:block;margin:4px 0 0;width:max-content;margin-left:auto">≥135/85</span>' : ""}${ui.tots ? `<span class="who">${esc(m.usuari)}</span>` : ""}</div>
    </button>`;
  }).join("");
  return `
  <section class="card"><h2>Nova mesura${ui.tots ? "" : ` <small>${esc(S.usuari_actual)}</small>`}</h2>${formHTML("n")}
    <div class="acts"><button class="btn" id="nAfegeix">Afegir mesura</button><button class="btn sec" id="nNet">Netejar</button></div></section>
  <section class="card"><h2>Mitjanes <small>${n135} de ${ms.length} arriben a 135/85</small></h2>${taulaMitjanes(mit)}${veredicteHTML(mit)}</section>
  <section class="card"><h2>Historial <small>${ms.length} mesures</small></h2>
    ${ms.length ? files : '<div class="empty">Encara no hi ha mesures. Afegeix la primera a dalt.</div>'}
    ${ord.length > ui.limit ? `<button class="btn sec" id="mesLlista" style="margin-top:10px">Mostrar-ne més</button>` : ""}</section>`;
}
function liga_mesures() {
  if (!S.usuaris.length) return;
  ligaForm("n");
  $("#nNet").onclick = () => { render(); };
  $("#nAfegeix").onclick = () => {
    try {
      const m = llegeixForm("n");
      if (!validaSemantica(m)) return;
      S.mesures.push({ id: uid(), ...m }); assegura(m.usuari); desa();
      toast(`Mesura desada: ${m.sys}/${m.dia} · ${R.classificar(m.sys, m.dia)}`);
      render();
    } catch (e) { $("#nerr").textContent = e.message; }
  };
  const mes = $("#mesLlista"); if (mes) mes.onclick = () => { ui.limit += 60; render(); };
  document.querySelectorAll(".item[data-id]").forEach(b => b.onclick = () => edita(b.dataset.id));
}
function edita(id) {
  const m = S.mesures.find(x => x.id === id); if (!m) return;
  modal(`<h3>Editar mesura</h3>${formHTML("e", m)}
    <div class="acts"><button class="btn" id="eOk">Desar</button><button class="btn sec" id="eNo">Cancel·lar</button></div>
    <button class="btn red" id="eDel" style="margin-top:8px">Esborrar mesura</button>`);
  ligaForm("e");
  $("#eNo").onclick = tanca;
  $("#eOk").onclick = () => {
    try {
      const n = llegeixForm("e"); if (!validaSemantica(n, id)) return;
      Object.assign(m, n); assegura(n.usuari); desa(); tanca(); toast("Mesura actualitzada"); render();
    } catch (e) { $("#eerr").textContent = e.message; }
  };
  $("#eDel").onclick = () => {
    if (!confirm(`Esborrar la mesura del ${R.dataCat(m.data)} a les ${m.hora} (${m.sys}/${m.dia})?`)) return;
    S.mesures = S.mesures.filter(x => x.id !== id); desa(); tanca(); toast("Mesura esborrada"); render();
  };
}

// ------------------------------------------------------------------ Gràfic (SVG)
function chartSVG(ms, dies) {
  const pts = R.mitjanesPerDia(ms, dies);
  if (!pts.length) return '<p class="empty">Encara no hi ha dades per dibuixar.</p>';
  const W = 340, H = 240, L = 32, Rm = 10, T = 12, B = 26, vals = [];
  pts.forEach(([, m]) => { if (m) vals.push(m[0], m[1], m[2]); });
  let lo = Math.min(...vals, 60), hi = Math.max(...vals, 140);
  lo = Math.floor((lo - 5) / 10) * 10; hi = Math.ceil((hi + 5) / 10) * 10;
  const pw = W - L - Rm, ph = H - T - B;
  const x = i => (pts.length === 1 ? L + pw / 2 : L + i * pw / (pts.length - 1));
  const y = v => T + (hi - v) * ph / (hi - lo);
  const pas = hi - lo > 110 ? 20 : 10;
  let g = "";
  for (let v = Math.ceil(lo / pas) * pas; v <= hi; v += pas) g += `<line class="gl" x1="${L}" x2="${W - Rm}" y1="${y(v)}" y2="${y(v)}"/><text class="tx" x="${L - 5}" y="${y(v) + 3}" text-anchor="end">${v}</text>`;
  g += `<line x1="${L}" x2="${W - Rm}" y1="${y(135)}" y2="${y(135)}" stroke="var(--sys)" stroke-dasharray="5 4" stroke-width="1.2"/>`;
  g += `<line x1="${L}" x2="${W - Rm}" y1="${y(85)}" y2="${y(85)}" stroke="var(--dia)" stroke-dasharray="5 4" stroke-width="1.2"/>`;
  const serie = (k, col, w) => {
    let d = "", dots = "", obert = false;
    pts.forEach(([, m], i) => {
      if (!m) { obert = false; return; }
      d += `${obert ? "L" : "M"}${x(i).toFixed(1)} ${y(m[k]).toFixed(1)} `; obert = true;
      dots += `<circle cx="${x(i).toFixed(1)}" cy="${y(m[k]).toFixed(1)}" r="${pts.length <= 16 ? 3.4 : 2}" fill="${col}"/>`;
    });
    return `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>${dots}`;
  };
  g += serie(2, "var(--pols)", 1.6) + serie(1, "var(--dia)", 2.4) + serie(0, "var(--sys)", 2.4);
  const nx = Math.min(5, pts.length);
  for (let k = 0; k < nx; k++) {
    const i = nx === 1 ? 0 : Math.round(k * (pts.length - 1) / (nx - 1)), d = R.dataCat(pts[i][0]).slice(0, 5);
    g += `<text class="tx" x="${x(i)}" y="${H - 8}" text-anchor="${k === 0 && nx > 1 ? "start" : k === nx - 1 && nx > 1 ? "end" : "middle"}">${d}</text>`;
  }
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gràfic de la mitjana diària">${g}</svg>
  <div class="legend"><span><i style="background:var(--sys)"></i>SYS</span><span><i style="background:var(--dia)"></i>DIA</span><span><i style="background:var(--pols)"></i>Pols</span><span class="muted">- - llindar 135 / 85</span></div>`;
}
function vGrafics() {
  const ms = mesuresVista(), P = [[7, "7 dies"], [30, "30 dies"], [90, "90 dies"], [3650, "Tot"]];
  return `<section class="card"><h2>Mitjana diària <small>${ui.tots ? "tots els usuaris" : esc(S.usuari_actual)}</small></h2>
    <div class="seg">${P.map(([d, n]) => `<button data-p="${d}" class="${ui.periode === d ? "on" : ""}">${n}</button>`).join("")}</div>
    ${chartSVG(ms, ui.periode)}</section>`;
}
function liga_grafics() {
  document.querySelectorAll(".seg [data-p]").forEach(b => b.onclick = () => { ui.periode = +b.dataset.p; render(); });
}

// ------------------------------------------------------------------ Guia
function vGuia() {
  const pantalla = [
    ["SYS (mmHg)", "Pressió sistòlica, la 'alta': pressió quan el cor batega i expulsa sang."],
    ["DIA (mmHg)", "Pressió diastòlica, la 'baixa': pressió entre batecs, quan el cor es relaxa."],
    ["PULSE /min", "Pulsacions per minut en repòs. Normal en adults: 60–100."],
    ["Barra amb 135 i 85", "Les marques 135 (SYS) i 85 (DIA) són els llindars per a mesures fetes a casa. Si la lectura arriba a la marca o la supera, és el límit alt per a mesures domiciliàries."],
    ["Símbol OK (cercle)", "Guia de col·locació del braçalet: indica que estava ben posat. Si no surt, repeteix la mesura ajustant-lo."],
    ["Icona de persona + A/B", "Usuari actiu de la màquina (A o B). Cada usuari té la seva memòria."],
    ["IntelliSense", "Inflat automàtic: el braçalet s'infla només fins al nivell necessari."],
    ["Cor irregular / figura en moviment", "Cor irregular: batec irregular detectat. Figura en moviment: hi ha hagut moviment durant la mesura; repeteix-la. Consulta el manual del teu model."],
  ];
  const important = [
    "Una sola mesura no diagnostica res. El diagnòstic d'hipertensió es basa en la mitjana de moltes mesures (p. ex. 7 dies, matí i vespre).",
    "A casa, el límit habitual és 135/85. La classificació de la taula és la de consulta; per això hi ha també l'avís del llindar domiciliari.",
    "Aquesta eina no substitueix el metge. Si les mesures són repetidament altes, o tens símptomes (mal de cap intens, mareig, dolor al pit), consulta'l.",
    "Per mesurar bé: seure 5 min en repòs, esquena recolzada, braç a l'altura del cor, sense cafè/tabac/exercici 30 min abans, fer 2 mesures amb 1–2 min de diferència.",
    "Mitjana de 7 dies: és el criteri que compta a casa. Es recomanen almenys 12 mesures en 7 dies (matí i vespre). Amb menys mesures, el veredicte és orientatiu.",
    "El pols es marca en groc si és >100 o <50 en repòs. Un valor aïllat no és preocupant (esforç, estrès, cafè…); si es repeteix, consulta-ho.",
  ];
  return `
  <section class="card"><h2>Classificació</h2>${R.CLASSES.map(([n, c, r]) => `<div class="cls"><b style="background:${c}">${n}</b><span>${r}</span></div>`).join("")}
    <p class="sub" style="margin:10px 0 0">Societat Europea de Cardiologia/Hipertensió (mesura de consulta). Llindar domiciliari: 135/85.</p></section>
  <section class="card"><h2>Important</h2><ul class="pl">${important.map(t => `<li>${t}</li>`).join("")}</ul></section>
  <section class="card"><h2>La pantalla de la màquina (Omron M3)</h2><dl>${pantalla.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join("")}</dl></section>
  <section class="card"><h2>Sobre l'app</h2><p class="sub" style="margin:0">XoriguerPressió v${APP_VERSIO} · ${CREDIT}<br>Les dades es guarden només en aquest telèfon. Fes còpies de seguretat des de la pestanya Dades.</p></section>`;
}

// ------------------------------------------------------------------ Dades i còpies
async function baixa(nom, text, mime) {
  const blob = new Blob([text], { type: mime });
  try {
    const f = new File([blob], nom, { type: mime });
    if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: nom }); return true; }
  } catch (e) { if (e && e.name === "AbortError") return false; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nom;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return true;
}
function csvText(ms) {
  const q = s => { s = String(s ?? ""); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const r = ["Data;Hora;Usuari;SYS;DIA;Pols;Classificacio;Llindar_135_85;Notes"];
  R.ordenar(ms).forEach(m => r.push([R.dataCat(m.data), m.hora, m.usuari, m.sys, m.dia, m.pols, R.classificar(m.sys, m.dia), R.alLlindar(m.sys, m.dia) ? "SÍ" : "NO", m.notes || ""].map(q).join(";")));
  return "﻿" + r.join("\r\n") + "\r\n";
}
function parseCSV(t) {
  t = t.replace(/^﻿/, "");
  const delim = (t.split(";").length >= t.split(",").length) ? ";" : ",";
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === delim) { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(cur); cur = ""; if (row.some(x => x.trim())) rows.push(row); row = []; }
    else cur += c;
  }
  row.push(cur); if (row.some(x => x.trim())) rows.push(row);
  return rows;
}
function csvAMesures(t) {
  const rows = parseCSV(t), out = [], errors = [];
  if (!rows.length) return { out, errors: ["Fitxer buit."] };
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\(.*?\)/g, "").trim().split(/[\s_]/)[0];
  const cap = rows[0].map(norm), idx = k => cap.findIndex(c => c === k || (k === "notes" && c.startsWith("nota")));
  const I = { data: idx("data"), hora: idx("hora"), usuari: idx("usuari"), sys: idx("sys"), dia: idx("dia"), pols: idx("pols"), notes: idx("notes") };
  if (I.data < 0 || I.hora < 0 || I.sys < 0 || I.dia < 0 || I.pols < 0) return { out, errors: ["No trobo les columnes Data, Hora, SYS, DIA i Pols a la primera fila."] };
  rows.slice(1).forEach((r, n) => {
    try {
      out.push({ data: R.parseData(r[I.data]), hora: R.parseHora(r[I.hora]), usuari: (I.usuari >= 0 && r[I.usuari].trim()) || S.usuari_actual || "Jo",
        sys: R.parseEnter(r[I.sys], "sys"), dia: R.parseEnter(r[I.dia], "dia"), pols: R.parseEnter(r[I.pols], "pols"), notes: I.notes >= 0 ? (r[I.notes] || "").trim() : "" });
    } catch (e) { errors.push(`Fila ${n + 2}: ${e.message}`); }
  });
  return { out, errors };
}
function afegeixMoltes(noves) {
  const ex = new Set(S.mesures.map(R.clau)); let a = 0, d = 0;
  noves.forEach(m => { if (ex.has(R.clau(m))) { d++; return; } S.mesures.push({ id: uid(), ...m }); assegura(m.usuari); ex.add(R.clau(m)); a++; });
  if (!S.usuari_actual && S.usuaris.length) S.usuari_actual = S.usuaris[0];
  desa(); return [a, d];
}
function vDades() {
  const cp = copies().reverse();
  return `
  <section class="card"><h2>Usuaris</h2>
    ${S.usuaris.map(u => `<div class="urow"><span>${esc(u)} <small class="muted">· ${S.mesures.filter(m => m.usuari === u).length}</small></span><button class="btn sec small" data-ren="${esc(u)}">Canviar nom</button></div>`).join("")}
    <button class="btn sec" id="uNou" style="margin-top:10px">+ Afegir usuari</button></section>
  <section class="card"><h2>Informe per al metge</h2><p class="sub" style="margin:0 0 10px">Genera un PDF amb mitjanes, gràfic i taula de mesures.</p>
    <button class="btn" id="infBtn">Crear informe PDF…</button></section>
  <section class="card"><h2>Còpia de seguretat</h2><div class="stack">
    <button class="btn" id="bJson">Desar còpia (.json)</button>
    <button class="btn sec" id="bCsv">Exportar a Excel (.csv)</button>
    <label class="btn sec" for="fImp" style="cursor:pointer">Importar còpia o CSV…</label>
    <input type="file" id="fImp" accept=".json,.csv,application/json,text/csv" class="hidden">
    <div id="xoriguer-actualitza" data-classe="btn sec"></div></div>
    <p class="sub" style="margin:10px 0 0">El .json és el mateix format que el programa d'escriptori (Documents\\XoriguerPressio\\dades.json): pots passar dades en tots dos sentits. El .csv s'obre amb Excel i el programa d'escriptori també el pot importar.</p></section>
  <section class="card"><h2>Còpies automàtiques <small>${cp.length}</small></h2>
    ${cp.length ? cp.map(c => `<div class="urow"><span>${R.dataCat(c)}</span><button class="btn sec small" data-rest="${c}">Restaurar</button></div>`).join("") : '<p class="sub" style="margin:0">Encara no n\'hi ha. Es fa una còpia cada dia que desis dades (en queden 14).</p>'}
    <p class="sub" style="margin:10px 0 0">Aquestes còpies viuen al mateix telèfon: no et protegeixen si el perds o s'esborren les dades del navegador. Desa de tant en tant una còpia .json fora.</p></section>`;
}
function liga_dades() {
  document.querySelectorAll("[data-ren]").forEach(b => b.onclick = () => {
    const vell = b.dataset.ren, nou = (prompt("Nou nom per a l'usuari:", vell) || "").trim();
    if (!nou || nou === vell) return;
    if (nou.toLowerCase() !== vell.toLowerCase() && S.usuaris.some(u => u.toLowerCase() === nou.toLowerCase())) return toast(`Ja existeix l'usuari '${nou}'.`);
    S.usuaris = S.usuaris.map(u => (u === vell ? nou : u)); S.mesures.forEach(m => { if (m.usuari === vell) m.usuari = nou; });
    if (S.usuari_actual === vell) S.usuari_actual = nou; desa(); render();
  });
  $("#uNou").onclick = () => {
    const nom = (prompt("Nom del nou usuari:") || "").trim(); if (!nom) return;
    if (S.usuaris.some(u => u.toLowerCase() === nom.toLowerCase())) return toast(`Ja existeix l'usuari '${nom}'.`);
    S.usuaris.push(nom); S.usuari_actual = nom; ui.tots = false; desa(); render();
  };
  $("#infBtn").onclick = demanaPeriode;
  $("#bJson").onclick = async () => { if (await baixa(`dades_${avui().replace(/-/g, "")}.json`, JSON.stringify(S, null, 1), "application/json")) { lsSet(KEY_EXPORT, avui()); renderAvis(); toast("Còpia desada"); } };
  $("#bCsv").onclick = async () => { if (!S.mesures.length) return toast("No hi ha mesures per exportar."); if (await baixa(`mesures_${avui().replace(/-/g, "")}.csv`, csvText(mesuresVista()), "text/csv")) toast("Fitxer creat"); };
  $("#fImp").onchange = async e => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    const t = await f.text();
    try {
      if (/\.json$/i.test(f.name) || t.trim().startsWith("{")) {
        const d = JSON.parse(t); validaCopia(d);
        modal(`<h3>Importar còpia</h3><p>Conté <b>${d.mesures.length}</b> mesures. Què en vols fer?</p>
          <div class="stack"><button class="btn" id="iAfegeix">Afegir-les a les meves dades</button>
          <button class="btn red" id="iSubst">Substituir totes les meves dades</button>
          <button class="btn sec" id="iNo">Cancel·lar</button></div>`);
        $("#iNo").onclick = tanca;
        $("#iAfegeix").onclick = () => { const [a, dup] = afegeixMoltes(normalitza(d).mesures); tanca(); toast(`${a} mesures afegides${dup ? `, ${dup} duplicades ignorades` : ""}.`); render(); };
        $("#iSubst").onclick = () => {
          if (!confirm("Les dades actuals es substituiran (abans en guardo una còpia automàtica). Continuar?")) return;
          lsSet(KEY_COPIA + "abans_" + Date.now(), JSON.stringify(S)); S = normalitza(d); desa(); tanca(); toast("Còpia restaurada"); render();
        };
      } else {
        const { out, errors } = csvAMesures(t);
        if (!out.length) return toast(errors[0] || "No he trobat cap mesura per importar.");
        const [a, dup] = afegeixMoltes(out);
        toast(`${a} mesures importades${dup ? `, ${dup} duplicades` : ""}${errors.length ? `, ${errors.length} files amb errors` : ""}.`); render();
      }
    } catch (err) { toast(err instanceof SyntaxError ? "El fitxer no és una còpia vàlida." : err.message); }
  };
  document.querySelectorAll("[data-rest]").forEach(b => b.onclick = () => {
    const c = b.dataset.rest, t = lsGet(KEY_COPIA + c); if (!t) return;
    try {
      const d = JSON.parse(t); validaCopia(d);
      if (!confirm(`Restaurar la còpia del ${R.dataCat(c)} (${d.mesures.length} mesures)? Abans es guarda l'estat actual.`)) return;
      lsSet(KEY_COPIA + "abans_" + Date.now(), JSON.stringify(S)); S = normalitza(d); desa(); toast("Còpia restaurada"); render();
    } catch (e) { toast("Aquesta còpia no es pot llegir."); }
  });
}

// ------------------------------------------------------------------ Informe imprimible
function demanaPeriode() {
  const ms = mesuresVista();
  if (!ms.length) return toast("No hi ha mesures per a l'informe.");
  const ult = ms[ms.length - 1].data, prim = ms[0].data;
  modal(`<h3>Informe PDF</h3><div class="seg" id="iSeg"><button data-d="7">7 dies</button><button data-d="30" class="on">30 dies</button><button data-d="0">Tot</button><button data-d="-1">Dates</button></div>
    <div class="grid hidden" id="iDates"><div><label class="f">Des de</label><input type="date" id="iDe" value="${prim}"></div><div><label class="f">Fins a</label><input type="date" id="iFi" value="${ult}"></div></div>
    <p class="sub">A la pantalla següent tria <b>Compartir / Imprimir → Desar com a PDF</b>.</p>
    <div class="acts"><button class="btn" id="iOk">Crear informe</button><button class="btn sec" id="iNo">Cancel·lar</button></div><div class="err" id="iErr"></div>`);
  let sel = 30;
  $("#iSeg").onclick = e => { const b = e.target.closest("[data-d]"); if (!b) return; sel = +b.dataset.d; document.querySelectorAll("#iSeg button").forEach(x => x.classList.toggle("on", x === b)); $("#iDates").classList.toggle("hidden", sel !== -1); };
  $("#iNo").onclick = tanca;
  $("#iOk").onclick = () => {
    let de = null, fi = null, et;
    if (sel > 0) { de = R.addDays(ult, -(sel - 1)); fi = ult; et = `Últims ${sel} dies`; }
    else if (sel === 0) et = "Tot l'historial";
    else { de = $("#iDe").value; fi = $("#iFi").value; if (!de || !fi || de > fi) { $("#iErr").textContent = "Revisa les dates: la inicial ha de ser anterior o igual a la final."; return; } et = "Període triat"; }
    const sub = R.filtrar(ms, de, fi); if (!sub.length) { $("#iErr").textContent = "No hi ha mesures en aquest període."; return; }
    tanca(); imprimeix(sub, et);
  };
}
function imprimeix(ms, etiqueta) {
  const mit = R.mitjanes(ms), v = R.veredicte(mit), nom = ui.tots ? "" : S.usuari_actual;
  const f = (k, n) => { const x = mit[k]; return `<tr><td style="text-align:left">${n}</td>${x ? `<td>${x[0]}</td><td>${x[1]}</td><td>${x[2]}</td><td>${x[3]}</td>` : "<td>-</td><td>-</td><td>-</td><td>0</td>"}</tr>`; };
  const filesT = [...ms].reverse().map(m => { const c = R.classificar(m.sys, m.dia);
    return `<tr><td>${R.dataCat(m.data)}</td><td>${m.hora}</td>${ui.tots ? `<td>${esc(m.usuari)}</td>` : ""}<td>${m.sys}</td><td>${m.dia}</td><td${R.polsAvis(m.pols) ? ' style="background:#FFEB9C"' : ""}>${m.pols}</td><td style="background:${R.COLOR[c]}">${c}</td><td>${R.alLlindar(m.sys, m.dia) ? "SÍ" : "NO"}</td><td style="text-align:left">${esc(m.notes)}</td></tr>`; }).join("");
  const dates = ms.map(m => m.data).sort();
  $("#report").innerHTML = `<div class="head"><img src="icons/logo-informe.png" alt=""><div><h1>Control de pressió arterial${nom ? " — " + esc(nom) : ""}</h1>
    <div class="muted">${etiqueta} · Mesures del ${R.dataCat(dates[0])} al ${R.dataCat(dates[dates.length - 1])} · ${ms.length} mesures · Generat el ${R.dataCat(avui())} amb XoriguerPressió</div></div></div>
    <table><tr><th style="text-align:left">Mitjana</th><th>SYS</th><th>DIA</th><th>Pols</th><th>Mesures</th></tr>${f("total", "Total")}${f("set_dies", "Últims 7 dies")}${R.FRANGES.map(([k, n]) => f(k, n)).join("")}</table>
    <div class="verd" style="background:${v ? R.COLOR[v.classe] : "#f2f2f2"}">${esc(R.textVeredicte(v))}</div>
    <div style="max-width:620px;margin:12px 0">${chartSVG(ms, 3650)}</div>
    <table><tr><th>Data</th><th>Hora</th>${ui.tots ? "<th>Usuari</th>" : ""}<th>SYS</th><th>DIA</th><th>Pols</th><th>Classificació</th><th>135/85</th><th>Notes</th></tr>${filesT}</table>
    <div class="foot">Classificació segons la Societat Europea de Cardiologia/Hipertensió (mesura de consulta). A casa, el límit habitual és 135/85 (columna 135/85). Una sola mesura no diagnostica res: aquest document no substitueix el criteri mèdic.</div>`;
  const abans = document.title; document.title = `Pressio_${nom || "tots"}_${avui()}`;
  setTimeout(() => { window.print(); setTimeout(() => (document.title = abans), 500); }, 250);
}

// ------------------------------------------------------------------ Avisos
function renderAvis() {
  const n = $("#notice"); let h = "";
  const ult = lsGet(KEY_EXPORT);
  if (S.mesures.length >= 5 && (!ult || R.diffDies(ult, avui()) > 14))
    h = `<div class="banner"><span>${ult ? `Fa més de 14 dies de l'última còpia.` : "Encara no has desat cap còpia fora del telèfon."} Una còpia .json et protegeix si perds el mòbil.</span><button id="avisCopia">Fer còpia</button></div>`;
  n.innerHTML = h;
  const b = $("#avisCopia"); if (b) b.onclick = () => { ui.tab = "dades"; render(); window.scrollTo(0, 0); };
}

// ------------------------------------------------------------------ Render principal
function render() {
  renderUsuaris(); renderAvis();
  document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === ui.tab));
  const v = $("#view");
  if (!S.usuaris.length && ui.tab !== "guia") {
    v.innerHTML = `<section class="card"><h2>Benvingut!</h2><p class="sub">Com vols anomenar l'usuari? Més endavant en pots afegir més.</p>
      <label class="f" for="bNom">Nom</label><input id="bNom" autocomplete="off" placeholder="p. ex. Xavi"><div class="err" id="bErr"></div>
      <button class="btn" id="bOk" style="margin-top:10px">Començar</button></section>`;
    $("#bOk").onclick = () => { const n = $("#bNom").value.trim(); if (!n) { $("#bErr").textContent = "Escriu un nom."; return; } S.usuaris = [n]; S.usuari_actual = n; desa(); render(); };
    return;
  }
  v.innerHTML = ui.tab === "mesures" ? vMesures() : ui.tab === "grafics" ? vGrafics() : ui.tab === "guia" ? vGuia() : vDades();
  if (ui.tab === "mesures") liga_mesures(); else if (ui.tab === "grafics") liga_grafics(); else if (ui.tab === "dades") liga_dades();
}
$("#tabs").addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (!b) return; ui.tab = b.dataset.tab; render(); window.scrollTo(0, 0); });

carrega();
render();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
window.__xp = { get S() { return S; }, R };   // per a proves
})();
