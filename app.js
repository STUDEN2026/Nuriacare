"use strict";
const KEY = "nuriaCare.v1";
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = p => p + Math.random().toString(36).slice(2, 7).toUpperCase();
const fmt = d => d ? new Date(d).toLocaleString("es", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
const fmtD = d => new Date(d).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
const nowLocal = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16);

const defaults = () => ({ patients: [], vitals: [], notes: [], activity: [], settings: { user: "Estudiante de Enfermería", center: "Centro de práctica ficticio", theme: "light" } });
let db = load();
function load() { try { return Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY))); } catch { return defaults(); } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { toast("No se pudo guardar en el navegador.", "bad"); } }
function log(t) { db.activity.unshift({ t, at: new Date().toISOString() }); db.activity = db.activity.slice(0, 30); }

const icons = {
  home: '<path d="M3 11l9-8 9 8M5 10v10h14V10"/>', users: '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6M17 4a4 4 0 010 8M22 21c0-3-2-5-4-5.5"/>',
  heart: '<path d="M3 12h4l2-5 4 10 2-5h6"/>', note: '<path d="M5 3h14v18H5zM9 8h6M9 12h6M9 16h3"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  chart: '<path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'
};
const routes = [["dash", "Panel principal", "home"], ["pac", "Pacientes", "users"], ["val", "Nueva valoración", "heart"], ["notas", "Notas de enfermería", "note"], ["hist", "Historial clínico", "clock"], ["rep", "Reportes", "chart"], ["cfg", "Configuración", "gear"]];
let route = "dash", ctx = {};

function go(r, c = {}) { route = r; ctx = c; $("#side").classList.remove("open"); render(); scrollTo(0, 0); }
function render() {
  document.documentElement.dataset.theme = db.settings.theme;
  $("#nav").innerHTML = routes.map(([k, l, i]) => `<button data-r="${k}" class="${k === route ? "on" : ""}"><svg viewBox="0 0 24 24">${icons[i]}</svg>${l}</button>`).join("");
  $("#title").textContent = routes.find(r => r[0] === route)[1];
  { const f = new Date().toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); $("#today").textContent = f.charAt(0).toUpperCase() + f.slice(1); }
  $("#userChip").textContent = db.settings.user;
  $("#view").innerHTML = views[route]();
  bind();
}
function toast(m, type = "") { const t = document.createElement("div"); t.className = "toast " + type; t.textContent = m; $("#toasts").append(t); setTimeout(() => t.remove(), 3200); }
function openModal(html) { const m = $("#modal"); m.innerHTML = `<div class="card">${html}</div>`; m.hidden = false; }
function closeModal() { $("#modal").hidden = true; }
function confirmBox(msg, fn) {
  openModal(`<h2>Confirmar acción</h2><p>${msg}</p><div class="row"><button class="btn danger" id="cOk">Confirmar</button><button class="btn ghost" id="cNo">Cancelar</button></div>`);
  $("#cOk").onclick = () => { closeModal(); fn(); }; $("#cNo").onclick = closeModal;
}
const pName = id => db.patients.find(p => p.id === id)?.name ?? "Paciente eliminado";
const empty = (t, btn) => `<div class="empty card"><p>${t}</p>${btn || ""}</div>`;

const views = {
  dash() {
    const n = db.patients.length, byS = s => db.patients.filter(p => p.status === s).length;
    const stats = [["Pacientes registrados", n], ["Valoraciones realizadas", db.vitals.length], ["Notas de enfermería", db.notes.length]];
    const bars = ["Activo", "En observación", "Alta"].map(s => { const c = byS(s); return `<div class="bar"><span>${s}</span><div><i style="width:${n ? c / n * 100 : 0}%"></i></div><b>${c}</b></div>`; }).join("");
    return `<div class="card welcome"><h2>Bienvenido(a), ${esc(db.settings.user)}</h2><p>${esc(db.settings.center)}. Sistema de gestión y valoración de pacientes.</p></div><br>
    <div class="grid g3">${stats.map(([l, v]) => `<div class="card stat"><b>${v}</b><span>${l}</span></div>`).join("")}</div><br>
    <div class="grid g2"><div class="card"><h2>Distribución de pacientes</h2>${n ? bars : "<p class='empty'>Aún no hay pacientes.</p>"}</div>
    <div class="card"><h2>Actividad reciente</h2>${db.activity.length ? `<ul class="list">${db.activity.slice(0, 6).map(a => `<li><span class="tag">${fmt(a.at)}</span>${esc(a.t)}</li>`).join("")}</ul>` : "<p class='empty'>Sin actividad todavía.</p>"}</div></div><br>
    <div class="card"><h2>Accesos rápidos</h2><div class="row" style="margin-top:10px"><button class="btn" data-go="pac" data-new="1">Registrar paciente</button><button class="btn ghost" data-go="val">Nueva valoración</button><button class="btn ghost" data-go="notas">Nueva nota</button><button class="btn ghost" data-go="rep">Ver reportes</button></div></div>`;
  },
  pac() {
    const q = (ctx.q || "").toLowerCase(), st = ctx.st || "";
    const list = db.patients.filter(p => (!q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)) && (!st || p.status === st));
    const rows = list.map(p => `<tr><td>${p.id}</td><td>${esc(p.name)}</td><td>${p.age} / ${p.sex}</td><td><span class="tag ${p.status === "Alta" ? "mute" : p.status === "Activo" ? "ok" : "warn"}">${p.status}</span></td><td>${esc(p.reason)}</td>
    <td class="row"><button class="btn sm ghost" data-view="${p.id}">Ficha</button><button class="btn sm ghost" data-edit="${p.id}">Editar</button><button class="btn sm danger" data-del="${p.id}">Eliminar</button></td></tr>`).join("");
    return `<div class="row sb tools"><div class="row"><input id="q" placeholder="Buscar por nombre o ID" value="${esc(ctx.q || "")}"><select id="st"><option value="">Todos los estados</option>${["Activo", "En observación", "Alta"].map(s => `<option ${s === st ? "selected" : ""}>${s}</option>`).join("")}</select></div><button class="btn" id="newP">Registrar paciente</button></div>
    ${!db.patients.length ? empty("No hay pacientes registrados.", `<button class="btn" id="newP2">Registrar el primero</button>`) : list.length ? `<div class="card tbl"><table><tr><th>ID</th><th>Nombre</th><th>Edad / Sexo</th><th>Estado</th><th>Motivo</th><th></th></tr>${rows}</table></div>` : empty("Ningún paciente coincide con la búsqueda.")}`;
  },
  val() {
    const rows = [...db.vitals].sort((a, b) => b.at.localeCompare(a.at)).map(v => `<tr><td>${fmt(v.at)}</td><td>${esc(pName(v.pid))}</td><td>${v.pa || "—"}</td><td>${v.fc}</td><td>${v.fr}</td><td>${v.temp}</td><td>${v.spo2}</td><td><button class="btn sm ghost" data-evit="${v.id}">Editar</button> <button class="btn sm danger" data-dvit="${v.id}">Eliminar</button></td></tr>`).join("");
    return `<div class="row sb tools"><span>Registre signos vitales y medidas del paciente.</span><button class="btn" id="newV">Nueva valoración</button></div>
    ${db.vitals.length ? `<div class="card tbl"><table><tr><th>Fecha</th><th>Paciente</th><th>PA (mmHg)</th><th>FC (lpm)</th><th>FR (rpm)</th><th>Temp (°C)</th><th>SpO₂ (%)</th><th></th></tr>${rows}</table></div><p class="msg" style="color:var(--mute)">Los valores se muestran solo como registro. Esta aplicación no emite diagnósticos ni alertas clínicas.</p>` : empty("Aún no hay valoraciones.")}`;
  },
  notas() {
    const f = ctx.pid || "";
    const list = db.notes.filter(n => !f || n.pid === f).sort((a, b) => b.at.localeCompare(a.at));
    return `<div class="row sb tools"><select id="nf"><option value="">Todos los pacientes</option>${db.patients.map(p => `<option value="${p.id}" ${p.id === f ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select><button class="btn" id="newN">Nueva nota</button></div>
    ${list.length ? `<div class="grid">${list.map(n => `<div class="card"><div class="row sb"><b>${esc(pName(n.pid))}</b><span class="tag">${esc(n.type)}</span></div><p>${esc(n.text)}</p><small>${fmt(n.at)} · ${esc(n.by)}</small><div class="row" style="margin-top:8px"><button class="btn sm ghost" data-hist="${n.pid}">Ver historial</button><button class="btn sm ghost" data-en="${n.id}">Editar</button><button class="btn sm danger" data-dn="${n.id}">Eliminar</button></div></div>`).join("")}</div>` : empty("No hay notas registradas.")}`;
  },
  hist() {
    if (!db.patients.length) return empty("Registre pacientes para ver su historial.");
    const pid = ctx.pid || db.patients[0].id, p = db.patients.find(x => x.id === pid) || db.patients[0];
    const ev = [{ at: p.created, k: "Registro", h: `Ingreso: ${esc(p.reason)}`, d: `Antecedentes: ${esc(p.history || "—")}<br>Observaciones: ${esc(p.obs || "—")}` },
    ...db.vitals.filter(v => v.pid === p.id).map(v => ({ at: v.at, k: "Valoración", h: "Signos vitales", d: `PA ${v.pa || "—"} mmHg · FC ${v.fc} lpm · FR ${v.fr} rpm · T ${v.temp} °C · SpO₂ ${v.spo2}%${v.peso ? ` · ${v.peso} kg` : ""}${v.talla ? ` · ${v.talla} cm` : ""}<br>${esc(v.obs || "")}` })),
    ...db.notes.filter(n => n.pid === p.id).map(n => ({ at: n.at, k: "Nota", h: esc(n.type), d: `${esc(n.text)}<br><small>${esc(n.by)}</small>` }))].sort((a, b) => b.at.localeCompare(a.at));
    return `<div class="tools"><select id="hp">${db.patients.map(x => `<option value="${x.id}" ${x.id === p.id ? "selected" : ""}>${esc(x.name)} (${x.id})</option>`).join("")}</select></div>
    <div class="tl">${ev.map(e => `<div class="card"><div class="row sb"><b>${e.h}</b><span class="tag">${e.k}</span></div><small>${fmt(e.at)}</small><p>${e.d}</p></div>`).join("")}</div>`;
  },
  rep() {
    const byT = {}; db.notes.forEach(n => byT[n.type] = (byT[n.type] || 0) + 1);
    const rows = db.patients.map(p => `<tr><td>${p.id}</td><td>${esc(p.name)}</td><td>${p.status}</td><td>${db.vitals.filter(v => v.pid === p.id).length}</td><td>${db.notes.filter(n => n.pid === p.id).length}</td></tr>`).join("");
    return `<div class="row sb tools noprint"><span>Reporte generado con los registros guardados.</span><div class="row"><button class="btn" id="print">Imprimir / guardar PDF</button><button class="btn ghost" id="csv">Exportar CSV</button></div></div>
    <div class="card"><h2>${esc(db.settings.center)}</h2><p>Reporte de demostración · ${fmt(new Date())} · Elaborado por ${esc(db.settings.user)}</p>
    <div class="grid g3"><div class="stat"><b>${db.patients.length}</b><span>Pacientes</span></div><div class="stat"><b>${db.vitals.length}</b><span>Valoraciones</span></div><div class="stat"><b>${db.notes.length}</b><span>Notas</span></div></div><br>
    ${db.patients.length ? `<div class="tbl"><table><tr><th>ID</th><th>Paciente</th><th>Estado</th><th>Valoraciones</th><th>Notas</th></tr>${rows}</table></div>` : "<p class='empty'>No hay datos para reportar.</p>"}
    <h2 style="margin-top:16px">Notas por tipo</h2><p>${Object.entries(byT).map(([k, v]) => `${esc(k)}: ${v}`).join(" · ") || "Sin notas."}</p><small>Documento académico. No sustituye registros clínicos oficiales.</small></div>`;
  },
  cfg() {
    const s = db.settings;
    return `<div class="grid g2"><form class="card form" id="cfgF"><h2 class="full">Perfil y apariencia</h2>
    <label class="full">Usuario demostrativo<input name="user" value="${esc(s.user)}" required></label><label class="full">Centro de práctica ficticio<input name="center" value="${esc(s.center)}" required></label>
    <label class="full">Tema<select name="theme"><option value="light" ${s.theme === "light" ? "selected" : ""}>Claro</option><option value="dark" ${s.theme === "dark" ? "selected" : ""}>Oscuro</option></select></label><button class="btn full">Guardar cambios</button></form>
    <div class="card"><h2>Datos</h2><p>Cargue pacientes, valoraciones y notas ficticias para la demostración, o borre todo.</p><div class="row"><button class="btn" id="seed">Cargar datos de demostración</button><button class="btn danger" id="reset">Restablecer datos</button></div>
    <h2 style="margin-top:18px">Acerca de</h2><p>NURIA Care v1.0. Proyecto académico de Informática 1, Universidad Hispanoamericana de Panamá. Los datos se guardan solo en este navegador (localStorage). No genera diagnósticos ni recomendaciones terapéuticas.</p></div></div>`;
  }
};

function field(l, n, v = "", o = {}) {
  return `<label class="${o.full ? "full" : ""}">${l}${o.area ? `<textarea name="${n}" rows="3">${esc(v)}</textarea>` : o.sel ? `<select name="${n}">${o.sel.map(x => { const [a, b] = Array.isArray(x) ? x : [x, x]; return `<option value="${a}" ${a === v ? "selected" : ""}>${b}</option>`; }).join("")}</select>` : `<input name="${n}" type="${o.type || "text"}" value="${esc(v)}" ${o.step ? `step="${o.step}"` : ""} ${o.ph ? `placeholder="${o.ph}"` : ""}>`}<span class="msg"></span></label>`;
}
function form(title, fields, onSave) {
  openModal(`<h2>${title}</h2><br><form class="form" id="mf" novalidate>${fields}<div class="full row"><button class="btn">Guardar</button><button type="button" class="btn ghost" id="mx">Cancelar</button></div></form>`);
  $("#mx").onclick = closeModal;
  $("#mf").onsubmit = e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); let ok = true;
    const rules = e.target._rules || {};
    e.target.querySelectorAll("label").forEach(l => { l.classList.remove("err"); l.querySelector(".msg").textContent = ""; });
    for (const [k, f] of Object.entries(window._rules || {})) { const m = f(d[k], d); if (m) { ok = false; const l = e.target.elements[k].closest("label"); l.classList.add("err"); l.querySelector(".msg").textContent = m; } }
    if (ok) { onSave(d); closeModal(); } else toast("Revise los campos marcados.", "warn");
  };
}
const req = v => (!v || !String(v).trim()) ? "Campo obligatorio." : "";
const range = (lo, hi, u, optional) => v => { if (optional && v === "") return ""; const n = Number(v); return v === "" || isNaN(n) ? "Ingrese un número." : (n < lo || n > hi) ? `Valor entre ${lo} y ${hi} ${u}.` : ""; };

function patientForm(id) {
  const p = db.patients.find(x => x.id === id) || {};
  window._rules = { name: req, age: range(0, 120, "años"), reason: req };
  form(id ? "Editar paciente" : "Registrar paciente",
    field("Nombre completo (ficticio)", "name", p.name, { full: 1 }) + field("Edad (años)", "age", p.age, { type: "number" }) + field("Sexo", "sex", p.sex || "F", { sel: ["F", "M", "Otro"] }) +
    field("Estado", "status", p.status || "Activo", { sel: ["Activo", "En observación", "Alta"] }) + field("Motivo de atención", "reason", p.reason, { full: 1 }) +
    field("Antecedentes (ejemplo)", "history", p.history, { full: 1, area: 1 }) + field("Observaciones generales", "obs", p.obs, { full: 1, area: 1 }),
    d => { d.age = +d.age; if (id) Object.assign(p, d); else db.patients.push({ id: uid("P-"), created: new Date().toISOString(), ...d }); log(`${id ? "Paciente editado" : "Paciente registrado"}: ${d.name}`); save(); toast("Paciente guardado."); render(); });
}
function patientOpts() { return db.patients.map(p => [p.id, `${p.name} (${p.id})`]); }
function needPatients() { if (!db.patients.length) { toast("Registre primero un paciente.", "warn"); go("pac"); return true; } }
function vitalForm(id) {
  if (needPatients()) return; const v = db.vitals.find(x => x.id === id) || {};
  window._rules = { pid: req, at: req, pa: x => x && !/^\d{2,3}\/\d{2,3}$/.test(x) ? "Formato 120/80." : "", fc: range(20, 250, "lpm"), fr: range(4, 80, "rpm"), temp: range(30, 45, "°C"), spo2: range(50, 100, "%"), peso: range(0.5, 400, "kg", 1), talla: range(30, 250, "cm", 1) };
  form(id ? "Editar valoración" : "Nueva valoración",
    field("Paciente", "pid", v.pid, { sel: patientOpts(), full: 1 }) + field("Fecha y hora", "at", v.at || nowLocal(), { type: "datetime-local", full: 1 }) + field("Presión arterial (mmHg)", "pa", v.pa, { ph: "120/80" }) +
    field("Frecuencia cardíaca (lpm)", "fc", v.fc, { type: "number" }) + field("Frecuencia respiratoria (rpm)", "fr", v.fr, { type: "number" }) + field("Temperatura (°C)", "temp", v.temp, { type: "number", step: "0.1" }) +
    field("Saturación de oxígeno (%)", "spo2", v.spo2, { type: "number" }) + field("Peso (kg)", "peso", v.peso, { type: "number", step: "0.1" }) + field("Talla (cm)", "talla", v.talla, { type: "number" }) + field("Observaciones", "obs", v.obs, { full: 1, area: 1 }),
    d => { if (id) Object.assign(v, d); else db.vitals.push({ id: uid("V-"), ...d }); log(`Valoración ${id ? "editada" : "registrada"}: ${pName(d.pid)}`); save(); toast("Valoración guardada."); render(); });
}
const types = ["Ingreso", "Evolución", "Procedimiento", "Observación"];
function noteForm(id) {
  if (needPatients()) return; const n = db.notes.find(x => x.id === id) || {};
  window._rules = { pid: req, at: req, text: req };
  form(id ? "Editar nota" : "Nueva nota de enfermería",
    field("Paciente", "pid", n.pid || ctx.pid, { sel: patientOpts(), full: 1 }) + field("Fecha y hora", "at", n.at || nowLocal(), { type: "datetime-local" }) + field("Tipo de nota", "type", n.type, { sel: types }) +
    field("Descripción", "text", n.text, { full: 1, area: 1 }) + `<p class="full"><small>Responsable: ${esc(n.by || db.settings.user)}</small></p>`,
    d => { if (id) Object.assign(n, d); else db.notes.push({ id: uid("N-"), by: db.settings.user, ...d }); log(`Nota ${id ? "editada" : "registrada"}: ${pName(d.pid)}`); save(); toast("Nota guardada."); render(); });
}
function viewPatient(id) {
  const p = db.patients.find(x => x.id === id);
  openModal(`<h2>${esc(p.name)}</h2><p><span class="tag">${p.id}</span> <span class="tag">${p.status}</span></p><p>${p.age} años · Sexo ${p.sex} · Registro: ${fmtD(p.created)}</p><p><b>Motivo:</b> ${esc(p.reason)}</p><p><b>Antecedentes:</b> ${esc(p.history || "—")}</p><p><b>Observaciones:</b> ${esc(p.obs || "—")}</p>
  <div class="row"><button class="btn" id="vh">Ver historial</button><button class="btn ghost" id="vx">Cerrar</button></div>`);
  $("#vh").onclick = () => { closeModal(); go("hist", { pid: id }); }; $("#vx").onclick = closeModal;
}
function seed() {
  const t = Date.now(), h = n => new Date(t - n * 36e5 - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
  const P = [["Ana Lucía Morales", 34, "F", "Activo", "Control posoperatorio", "Sin antecedentes de relevancia (ejemplo)."], ["Carlos Ernesto Vega", 62, "M", "En observación", "Control de presión arterial", "Hipertensión referida (ejemplo)."], ["María Isabel Castro", 8, "F", "Activo", "Control pediátrico", "Esquema de vacunación al día (ejemplo)."], ["José Manuel Rojas", 71, "M", "Alta", "Curación de herida", "Diabetes tipo 2 referida (ejemplo)."]];
  P.forEach((x, i) => { const id = "P-DEMO" + (i + 1); db.patients.push({ id, created: new Date(t - (i + 3) * 864e5).toISOString(), name: x[0], age: x[1], sex: x[2], status: x[3], reason: x[4], history: x[5], obs: "Registro demostrativo." });
    db.vitals.push({ id: "V-D" + i, pid: id, at: h(5 + i * 3), pa: ["118/76", "130/84", "100/65", "126/80"][i], fc: [72, 80, 90, 76][i], fr: [16, 18, 22, 17][i], temp: [36.6, 36.8, 36.5, 36.7][i], spo2: [98, 96, 99, 97][i], peso: [64, 82, 26, 78][i], talla: [165, 172, 125, 168][i], obs: "Valoración de ejemplo." });
    db.notes.push({ id: "N-D" + i, pid: id, at: h(4 + i * 3), type: types[i], text: "Nota de ejemplo para la demostración del sistema. Paciente colaborador, sin eventos que reportar.", by: db.settings.user }); });
  log("Datos de demostración cargados"); save(); toast("Datos de demostración cargados."); render();
}

function bind() {
  const on = (s, f) => { const e = $(s, $("#view")); if (e) e.onclick = f; };
  $("#view").querySelectorAll("[data-go]").forEach(b => b.onclick = () => { go(b.dataset.go); if (b.dataset.new) patientForm(); });
  $("#view").querySelectorAll("[data-view]").forEach(b => b.onclick = () => viewPatient(b.dataset.view));
  $("#view").querySelectorAll("[data-edit]").forEach(b => b.onclick = () => patientForm(b.dataset.edit));
  $("#view").querySelectorAll("[data-del]").forEach(b => b.onclick = () => confirmBox("Se eliminará el paciente junto con sus valoraciones y notas.", () => { const id = b.dataset.del; db.patients = db.patients.filter(p => p.id !== id); db.vitals = db.vitals.filter(v => v.pid !== id); db.notes = db.notes.filter(n => n.pid !== id); log("Paciente eliminado"); save(); toast("Paciente eliminado.", "warn"); render(); }));
  $("#view").querySelectorAll("[data-evit]").forEach(b => b.onclick = () => vitalForm(b.dataset.evit));
  $("#view").querySelectorAll("[data-dvit]").forEach(b => b.onclick = () => confirmBox("¿Eliminar esta valoración?", () => { db.vitals = db.vitals.filter(v => v.id !== b.dataset.dvit); save(); toast("Valoración eliminada.", "warn"); render(); }));
  $("#view").querySelectorAll("[data-en]").forEach(b => b.onclick = () => noteForm(b.dataset.en));
  $("#view").querySelectorAll("[data-dn]").forEach(b => b.onclick = () => confirmBox("¿Eliminar esta nota?", () => { db.notes = db.notes.filter(n => n.id !== b.dataset.dn); save(); toast("Nota eliminada.", "warn"); render(); }));
  $("#view").querySelectorAll("[data-hist]").forEach(b => b.onclick = () => go("hist", { pid: b.dataset.hist }));
  on("#newP", () => patientForm()); on("#newP2", () => patientForm()); on("#newV", () => vitalForm()); on("#newN", () => noteForm());
  const q = $("#q"); if (q) { q.oninput = () => { ctx.q = q.value; const pos = q.selectionStart; $("#view").innerHTML = views.pac(); bind(); const n = $("#q"); n.focus(); n.setSelectionRange(pos, pos); }; $("#st").onchange = e => { ctx.st = e.target.value; render(); }; }
  if ($("#nf")) $("#nf").onchange = e => { ctx.pid = e.target.value; render(); };
  if ($("#hp")) $("#hp").onchange = e => { ctx.pid = e.target.value; render(); };
  on("#print", () => print());
  on("#csv", () => { const r = [["ID", "Paciente", "Estado", "Valoraciones", "Notas"], ...db.patients.map(p => [p.id, p.name, p.status, db.vitals.filter(v => v.pid === p.id).length, db.notes.filter(n => n.pid === p.id).length])]; const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + r.map(x => x.map(c => `"${c}"`).join(",")).join("\n")], { type: "text/csv" })); a.download = "reporte_nuria_care.csv"; a.click(); toast("Reporte exportado."); });
  on("#seed", () => db.patients.some(p => p.id.startsWith("P-DEMO")) ? toast("Los datos de demostración ya están cargados.", "warn") : seed());
  on("#reset", () => confirmBox("Se borrarán todos los registros y la configuración.", () => { db = defaults(); save(); toast("Datos restablecidos.", "warn"); render(); }));
  const c = $("#cfgF"); if (c) c.onsubmit = e => { e.preventDefault(); const d = Object.fromEntries(new FormData(c)); if (!d.user.trim() || !d.center.trim()) return toast("Complete los campos obligatorios.", "warn"); Object.assign(db.settings, d); save(); toast("Configuración guardada."); render(); };
}
$("#nav").onclick = e => { const b = e.target.closest("button"); if (b) go(b.dataset.r); };
$("#menuBtn").onclick = () => $("#side").classList.toggle("open");
$("#modal").onclick = e => { if (e.target.id === "modal") closeModal(); };
document.onkeydown = e => { if (e.key === "Escape") closeModal(); };
let firstVisit = false;
try { firstVisit = localStorage.getItem(KEY) === null; } catch { firstVisit = false; }
if (firstVisit) seed(); else render();
