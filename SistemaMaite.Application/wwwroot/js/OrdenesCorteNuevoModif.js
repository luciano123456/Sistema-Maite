/* ===== OrdenesCorteNuevoModif.js — Productos como Ventas (tabla + modal) ===== */
// Requiere: jQuery, Bootstrap 5, DataTables, Select2, moment.js, jsPDF, site.js (miles, modales)

let gridProductos = null, gridInsumos = null, gridEtapas = null;
let wasSubmitOC = false, wasSubmitItem = false, wasSubmitInsumo = false, wasSubmitEtapa = false;
let isSaving = false;

const State = {
    idOC: parseInt((document.getElementById("txtId")?.value || "0"), 10) || 0,
    // cabecera
    fechaInicio: null, idEstado: 0, idPersonal: 0,
    aProducir: 0, producidas: 0, difCorte: 0, finalReal: 0, difFinal: 0,
    largo: 0, ancho: 0, capas: 0, horaIni: "", horaFin: "",
    // detalle
    items: [], pagos: [], insumos: [], etapas: [],
    // catálogos
    productos: [], personal: [], estadosOC: [], insumosCat: [], talleres: [], etapasEstados: [],
    editItemIndex: -1, editInsumoIndex: -1, editEtapaIndex: -1
};

/* ---------------- helpers ---------------- */
const _fmt = (n) => new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(n || 0));
const _num = (s) => typeof formatearSinMiles === "function" ? parseFloat(formatearSinMiles(s || 0)) : (parseFloat(String(s || "0").replace(/\./g, "").replace(",", ".")) || 0);
const _miles = (n) => typeof formatearMiles === "function" ? formatearMiles(n) : _fmt(n);
const hoyISO = () => moment().format("YYYY-MM-DD");
const fView = (f) => { const m = moment(f, [moment.ISO_8601, "YYYY-MM-DD", "YYYY-MM-DDTHH:mm:ss"]); return m.isValid() ? m.format("DD/MM/YYYY") : ""; };

/* ---------------- Select2 + feedback (igual ventas) ---------------- */

function removeEmptyOption(sel) {
    const el = document.querySelector(sel); if (!el) return;
    const fn = () => { if (el.value && el.querySelector('option[value=""]')) { el.querySelector('option[value=""]').remove(); if ($.fn.select2 && $(el).hasClass("select2-hidden-accessible")) $(el).trigger("change.select2"); el.removeEventListener("change", fn); } };
    el.addEventListener("change", fn);
}
const isS2 = (el) => !!(window.jQuery && $(el).hasClass("select2-hidden-accessible") && $(el).next(".select2").length);
const getS2Sel = (el) => $(el).next(".select2").find(".select2-selection").get(0) || null;
const fbAnchor = (el) => isS2(el) ? $(el).next(".select2").get(0) : el;
function ensureFB(el) { let fb = fbAnchor(el)?.nextElementSibling; if (!(fb && fb.classList?.contains("invalid-feedback"))) { fb = document.createElement("div"); fb.className = "invalid-feedback"; fb.style.display = "none"; fbAnchor(el)?.parentNode?.insertBefore(fb, fbAnchor(el).nextSibling); } return fb; }
function setInvalid(q, msg = "Campo obligatorio") { const el = typeof q === "string" ? document.querySelector(q) : q; if (!el) return false; let tgt = el; if (isS2(el)) { const s = getS2Sel(el); if (s) tgt = s; } tgt.classList.remove("is-valid"); tgt.classList.add("is-invalid"); const fb = ensureFB(el); if (fb) { fb.textContent = msg; fb.style.display = "block"; } return false; }
function setValid(q) { const el = typeof q === "string" ? document.querySelector(q) : q; if (!el) return true; let tgt = el; if (isS2(el)) { const s = getS2Sel(el); if (s) tgt = s; } tgt.classList.remove("is-invalid"); tgt.classList.add("is-valid"); const fb = fbAnchor(el)?.nextElementSibling; if (fb?.classList?.contains("invalid-feedback")) fb.style.display = "none"; return true; }
function clearVal(q) { const el = typeof q === "string" ? document.querySelector(q) : q; if (!el) return; let tgt = el; if (isS2(el)) { const s = getS2Sel(el); if (s) tgt = s; } tgt.classList.remove("is-invalid", "is-valid"); const fb = fbAnchor(el)?.nextElementSibling; if (fb?.classList?.contains("invalid-feedback")) fb.style.display = "none"; }
async function hideInitial() { wasSubmitOC = false;["#dtpFechaInicio", "#cmbEstado", "#cmbPersonal", "#cmbProdModal"].forEach(clearVal); document.getElementById("errorCamposOC")?.classList.add("d-none"); }

/* ---------------- Init ---------------- */
document.addEventListener("DOMContentLoaded", async () => {
    const dtp = document.getElementById("dtpFechaInicio"); if (dtp && !dtp.value) dtp.value = hoyISO();

    ["#cmbEstado", "#cmbPersonal", "#cmbProdModal", "#cmbInsumo", "#cmbTaller", "#cmbEtEstado"].forEach(s => { initSelect2(s); removeEmptyOption(s); });

    // live revalidation
    const wire = (id) => { const el = document.getElementById(id); if (!el) return; const apply = () => { if (!wasSubmitOC) { clearVal(el); return; } el.value ? setValid(el) : setInvalid(el); document.getElementById("errorCamposOC")?.classList.toggle("d-none", camposValidos()); };["change", "input"].forEach(e => el.addEventListener(e, apply)); if ($.fn.select2) $(el).on("select2:select select2:clear", apply); };
    ["dtpFechaInicio", "cmbEstado", "cmbPersonal"].forEach(wire);

    await Promise.all([loadEstados(), loadPersonal(), loadProductos(), loadInsumos(), loadTalleres(), loadEtapasEstados()]);

    configTablaProductos();
    configTablaInsumos();
    configTablaEtapas();

    if (State.idOC) { await cargarOC(State.idOC); document.getElementById("btnEliminarOC")?.classList.remove("d-none"); }

    await hideInitial();
});

/* ---------------- Catálogos ---------------- */
async function loadEstados() { const r = await fetch("/OrdenesCorteEstados/Lista", { headers: { Authorization: "Bearer " + (token || "") } }); State.estadosOC = r.ok ? await r.json() : []; const cmb = document.getElementById("cmbEstado"); cmb.innerHTML = `<option value="">Seleccione</option>` + State.estadosOC.map(x => `<option value="${x.Id}">${x.Nombre}</option>`).join(""); if ($.fn.select2) $("#cmbEstado").trigger("change.select2"); }
async function loadPersonal() { const r = await fetch("/Personal/Lista", { headers: { Authorization: "Bearer " + (token || "") } }); State.personal = r.ok ? await r.json() : []; const cmb = document.getElementById("cmbPersonal"); cmb.innerHTML = `<option value="">Seleccione</option>` + State.personal.map(x => `<option value="${x.Id}">${x.Nombre}</option>`).join(""); if ($.fn.select2) $("#cmbPersonal").trigger("change.select2"); }
async function loadProductos() { const r = await fetch("/Productos/Lista", { headers: { Authorization: "Bearer " + (token || "") } }); State.productos = r.ok ? await r.json() : []; }
async function loadInsumos() { const r = await fetch("/Insumos/Lista", { headers: { Authorization: "Bearer " + (token || "") } }); State.insumosCat = r.ok ? await r.json() : []; }
async function loadTalleres() { const r = await fetch("/Talleres/Lista", { headers: { Authorization: "Bearer " + (token || "") } }); State.talleres = r.ok ? await r.json() : []; }
async function loadEtapasEstados() { const r = await fetch("/OrdenesCorteEtapasEstados/Lista", { headers: { Authorization: "Bearer " + (token || "") } }); State.etapasEstados = r.ok ? await r.json() : []; }

/* ---------------- Variantes (mismo endpoint que Ventas) ---------------- */
async function obtenerVariantesProducto(idProducto) {
    if (!idProducto) return [];
    try {
        const r = await fetch(`/Ventas/ProductoInfoVenta?idProducto=${idProducto}&idListaPrecio=0`, { headers: { Authorization: "Bearer " + (token || "") } });
        if (!r.ok) throw new Error(r.statusText);
        const j = await r.json();
        return (j?.variantes || []).map(v => ({ id: v.Id, idProducto: v.IdProducto, nombre: v.Nombre || `${v.Color || ""} / ${v.Talle || ""}`.trim() }));
    } catch (e) { console.error("variantes:", e); return []; }
}

/* ---------------- Productos - Modal + tabla ---------------- */
function abrirModalProducto() {
    State.editItemIndex = -1; wasSubmitItem = false;
    const cmb = document.getElementById("cmbProdModal");
    cmb.innerHTML = `<option value="">Seleccione</option>` + State.productos.map(p => `<option value="${p.Id}">${p.Descripcion}</option>`).join("");
    if ($.fn.select2) $("#cmbProdModal").val("").trigger("change.select2");

    document.getElementById("txtProdCantModal").value = "1";
    document.getElementById("variantesWrap").innerHTML = "";
    document.getElementById("variantesContainer").style.display = "none";
    document.getElementById("variantesEmpty").hidden = true;
    clearVal("#cmbProdModal"); clearVal("#txtProdCantModal"); document.getElementById("errorCamposItem")?.classList.add("d-none");

    // load variantes on change
    cmb.onchange = async () => {
        const idProd = parseInt(cmb.value || 0, 10);
        const cont = document.getElementById("variantesContainer"); const empty = document.getElementById("variantesEmpty");
        const wrap = document.getElementById("variantesWrap");
        wrap.innerHTML = ""; cont.style.display = "none"; empty.hidden = true;
        if (!idProd) return;
        const vars = await obtenerVariantesProducto(idProd);
        cont.style.display = "block";
        if (vars.length === 0) { empty.hidden = false; return; }
        // header
        const head = document.createElement("div"); head.className = "var-row";
        head.innerHTML = `<div class="text-muted fw-bold">Color / Talle</div><div class="text-muted fw-bold text-center">Cant.</div>`;
        wrap.appendChild(head);
        vars.forEach(v => {
            const row = document.createElement("div"); row.className = "var-row"; row.dataset.idVar = v.id;
            row.innerHTML = `<div class="var-name">${v.nombre || "-"}</div><div><input type="number" min="0" step="1" class="form-control form-control-sm var-qty" value="0"></div>`;
            row.querySelector(".var-qty").addEventListener("input", onVarChange);
            wrap.appendChild(row);
        });
    };

    new bootstrap.Modal(document.getElementById("modalProducto")).show();
}
function onVarChange() {
    const sum = leerVariantesDesdeUI().reduce((a, v) => a + _num(v.cantidad), 0);
    const qty = document.getElementById("txtProdCantModal"); const hint = document.getElementById("qtyLockHint");
    if (sum > 0) { qty.value = _miles(sum); qty.disabled = true; qty.classList.add("bg-disabled"); hint.hidden = false; }
    else { qty.disabled = false; qty.classList.remove("bg-disabled"); hint.hidden = true; }
}
function leerVariantesDesdeUI() {
    const wrap = document.getElementById("variantesWrap"); if (!wrap) return [];
    return [...wrap.querySelectorAll(".var-row[data-id-var]")].map(r => {
        const id = parseInt(r.dataset.idVar, 10);
        const nombre = r.querySelector(".var-name")?.textContent?.trim() || "";
        const cantidad = _num(r.querySelector(".var-qty")?.value);
        if (id && cantidad > 0) return { idProductoVariante: id, nombre, cantidad };
        return null;
    }).filter(Boolean);
}
function validarItem() {
    const id = parseInt(document.getElementById("cmbProdModal").value || 0, 10);
    const cant = _num(document.getElementById("txtProdCantModal").value);
    let ok = true;
    ok = (id ? setValid("#cmbProdModal") : setInvalid("#cmbProdModal")) && ok;
    const sumVars = leerVariantesDesdeUI().reduce((a, v) => a + _num(v.cantidad), 0);
    ok = ((sumVars > 0 || cant > 0) ? setValid("#txtProdCantModal") : setInvalid("#txtProdCantModal")) && ok;
    document.getElementById("errorCamposItem")?.classList.toggle("d-none", ok);
    return ok;
}
function guardarProducto() {
    wasSubmitItem = true; if (!validarItem()) return;
    const id = parseInt(document.getElementById("cmbProdModal").value, 10);
    const prod = State.productos.find(p => p.Id === id);
    const variantes = leerVariantesDesdeUI();
    const sumVars = variantes.reduce((a, v) => a + _num(v.cantidad), 0);
    const cantBase = _num(document.getElementById("txtProdCantModal").value);
    const cantidad = sumVars > 0 ? sumVars : cantBase;

    const row = { id: 0, idProducto: id, productoNombre: prod?.Descripcion || ("Producto " + id), cantidad, variantes };
    if (State.editItemIndex >= 0) State.items[State.editItemIndex] = { ...State.items[State.editItemIndex], ...row };
    else State.items.push(row);

    refreshProductos();
    bootstrap.Modal.getInstance(document.getElementById("modalProducto"))?.hide();
}
function editarProducto(idx) {
    const it = State.items[idx]; if (!it) return;
    State.editItemIndex = idx; wasSubmitItem = false;

    const cmb = document.getElementById("cmbProdModal");
    cmb.innerHTML = `<option value="">Seleccione</option>` + State.productos.map(p => `<option value="${p.Id}">${p.Descripcion}</option>`).join("");
    $("#cmbProdModal").val(String(it.idProducto)); if ($.fn.select2) $("#cmbProdModal").trigger("change.select2");
    document.getElementById("txtProdCantModal").value = _miles(it.cantidad);

    // cargar variantes
    (async () => {
        const vars = await obtenerVariantesProducto(it.idProducto);
        const cont = document.getElementById("variantesContainer"); const empty = document.getElementById("variantesEmpty");
        const wrap = document.getElementById("variantesWrap");
        wrap.innerHTML = ""; cont.style.display = "block"; empty.hidden = true;
        if (vars.length === 0) { empty.hidden = false; }
        const cantidades = new Map((it.variantes || []).map(v => [v.idProductoVariante, _num(v.cantidad)]));
        const head = document.createElement("div"); head.className = "var-row"; head.innerHTML = `<div class="text-muted fw-bold">Color / Talle</div><div class="text-muted fw-bold text-center">Cant.</div>`;
        wrap.appendChild(head);
        vars.forEach(v => {
            const row = document.createElement("div"); row.className = "var-row"; row.dataset.idVar = v.id;
            row.innerHTML = `<div class="var-name">${v.nombre || "-"}</div><div><input type="number" min="0" step="1" class="form-control form-control-sm var-qty" value="${cantidades.get(v.id) || 0}"></div>`;
            row.querySelector(".var-qty").addEventListener("input", onVarChange);
            wrap.appendChild(row);
        });
        onVarChange();
    })();

    clearVal("#cmbProdModal"); clearVal("#txtProdCantModal"); document.getElementById("errorCamposItem")?.classList.add("d-none");
    new bootstrap.Modal(document.getElementById("modalProducto")).show();
}
async function eliminarProducto(idx) {
    const ok = await confirmarModal("¿Eliminar el producto de la orden?"); if (!ok) return;
    State.items.splice(idx, 1); refreshProductos();
}
function renderChipsVariantes(variantes, rowIndex) {
    if (!Array.isArray(variantes) || variantes.length === 0) return '<span class="text-muted">—</span>';
    return variantes.map((v, i) => `
    <span class="var-chip" title="${v.nombre}">
      <span class="chip-label">${v.nombre} <span class="qty">×${_fmt(v.cantidad)}</span></span>
      <button class="chip-x" onclick="quitarVar(${rowIndex},${i});return false;">×</button>
    </span>`).join("");
}
window.quitarVar = function (rowIndex, varIndex) {
    const it = State.items[rowIndex]; if (!it) return;
    it.variantes.splice(varIndex, 1);
    const sum = it.variantes.reduce((a, v) => a + _num(v.cantidad), 0);
    if (sum > 0) it.cantidad = sum;
    refreshProductos();
};
function configTablaProductos() {
    if (gridProductos) return;
    gridProductos = $("#grd_Productos").DataTable({
        data: [], language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
        columns: [
            {
                data: null, orderable: false, width: "60px", className: "text-center",
                render: (_, _2, _3, meta) => `
          <button class="btn btn-link p-0 me-2 text-success" title="Editar" onclick="editarProducto(${meta.row})"><i class="fa fa-pencil"></i></button>
          <button class="btn btn-link p-0 text-danger" title="Eliminar" onclick="eliminarProducto(${meta.row})"><i class="fa fa-trash"></i></button>`
            },
            { data: "productoNombre", title: "Producto" },
            { data: "variantes", title: "Variantes", className: "text-center", render: (v, _t, _r, meta) => renderChipsVariantes(v, meta.row) },
            { data: "cantidad", title: "Cantidad", className: "text-end", render: v => _fmt(v) }
        ],
        order: [[1, "asc"]], dom: "t", pageLength: 1000,
        createdRow: function (row) { $("td", row).eq(2).css({ "white-space": "normal" }); }
    });
}
function refreshProductos() { if (!gridProductos) return; gridProductos.clear().rows.add(State.items).draw(); }

/* ---------------- Insumos ---------------- */
function configTablaInsumos() {
    if (gridInsumos) return;
    gridInsumos = $("#grd_Insumos").DataTable({
        data: [], language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
        columns: [
            {
                data: null, orderable: false, width: "60px", className: "text-center",
                render: (_, _2, _3, meta) => `
          <button class="btn btn-link p-0 me-2 text-success" title="Editar" onclick="editarInsumo(${meta.row})"><i class="fa fa-pencil"></i></button>
          <button class="btn btn-link p-0 text-danger" title="Eliminar" onclick="eliminarInsumo(${meta.row})"><i class="fa fa-trash"></i></button>`
            },
            { data: "nombre", title: "Insumo" },
            { data: "cantidad", title: "Cantidad", className: "text-end", render: v => _fmt(v) }
        ],
        order: [[1, "asc"]], dom: "t", pageLength: 1000
    });
}
function refreshInsumos() { if (!gridInsumos) return; gridInsumos.clear().rows.add(State.insumos).draw(); }

function abrirModalInsumo() {
    State.editInsumoIndex = -1; wasSubmitInsumo = false;
    const cmb = document.getElementById("cmbInsumo");
    cmb.innerHTML = `<option value="">Seleccione</option>` + (State.insumosCat || []).map(i => `<option value="${i.Id}">${i.Descripcion || i.Nombre || ("Insumo " + i.Id)}</option>`).join("");
    if ($.fn.select2) $("#cmbInsumo").val("").trigger("change.select2");
    document.getElementById("txtInsumoCant").value = "";
    clearVal("#cmbInsumo"); clearVal("#txtInsumoCant"); document.getElementById("errorCamposInsumo")?.classList.add("d-none");
    new bootstrap.Modal(document.getElementById("modalInsumo")).show();
}
function validarInsumo() {
    const id = parseInt(document.getElementById("cmbInsumo").value || 0, 10);
    const c = _num(document.getElementById("txtInsumoCant").value);
    let ok = true;
    ok = (id ? setValid("#cmbInsumo") : setInvalid("#cmbInsumo")) && ok;
    ok = (c > 0 ? setValid("#txtInsumoCant") : setInvalid("#txtInsumoCant")) && ok;
    document.getElementById("errorCamposInsumo")?.classList.toggle("d-none", ok);
    return ok;
}
function guardarInsumo() {
    wasSubmitInsumo = true; if (!validarInsumo()) return;
    const id = parseInt(document.getElementById("cmbInsumo").value, 10);
    const nombre = document.getElementById("cmbInsumo").selectedOptions[0]?.textContent || "";
    const cantidad = _num(document.getElementById("txtInsumoCant").value);
    const row = { idInsumo: id, nombre, cantidad };
    if (State.editInsumoIndex >= 0) State.insumos[State.editInsumoIndex] = { ...State.insumos[State.editInsumoIndex], ...row };
    else State.insumos.push(row);
    refreshInsumos(); bootstrap.Modal.getInstance(document.getElementById("modalInsumo"))?.hide();
}
function editarInsumo(i) {
    const it = State.insumos[i]; if (!it) return;
    State.editInsumoIndex = i; wasSubmitInsumo = false;
    const cmb = document.getElementById("cmbInsumo");
    cmb.innerHTML = `<option value="">Seleccione</option>` + (State.insumosCat || []).map(x => `<option value="${x.Id}">${x.Descripcion || x.Nombre || ("Insumo " + x.Id)}</option>`).join("");
    $("#cmbInsumo").val(String(it.idInsumo)); if ($.fn.select2) $("#cmbInsumo").trigger("change.select2");
    document.getElementById("txtInsumoCant").value = _miles(it.cantidad);
    clearVal("#cmbInsumo"); clearVal("#txtInsumoCant"); document.getElementById("errorCamposInsumo")?.classList.add("d-none");
    new bootstrap.Modal(document.getElementById("modalInsumo")).show();
}
async function eliminarInsumo(i) { const ok = await confirmarModal("¿Eliminar insumo?"); if (!ok) return; State.insumos.splice(i, 1); refreshInsumos(); }

/* ---------------- Etapas ---------------- */
function configTablaEtapas() {
    if (gridEtapas) return;
    gridEtapas = $("#grd_Etapas").DataTable({
        data: [], language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
        columns: [
            {
                data: null, orderable: false, width: "60px", className: "text-center",
                render: (_, _2, _3, meta) => `
          <button class="btn btn-link p-0 me-2 text-success" title="Editar" onclick="editarEtapa(${meta.row})"><i class="fa fa-pencil"></i></button>
          <button class="btn btn-link p-0 text-danger" title="Eliminar" onclick="eliminarEtapa(${meta.row})"><i class="fa fa-trash"></i></button>`
            },
            { data: "tallerNombre", title: "Taller" },
            { data: "fechaEntrada", title: "Entrada", render: f => fView(f) },
            { data: "fechaSalidaAprox", title: "Salida aprox.", render: f => fView(f) },
            { data: "fechaSalidaReal", title: "Salida real", render: f => fView(f) },
            { data: "aProducir", title: "A prod.", className: "text-end", render: v => _fmt(v) },
            { data: "producidas", title: "Prod.", className: "text-end", render: v => _fmt(v) },
            { data: "diferencias", title: "Δ", className: "text-end", render: v => _fmt(v) },
            { data: "estadoNombre", title: "Estado" },
            { data: "nota", title: "Nota" }
        ],
        order: [[2, "desc"]], dom: "t", pageLength: 1000
    });
}
function refreshEtapas() { if (!gridEtapas) return; gridEtapas.clear().rows.add(State.etapas).draw(); }

function abrirModalEtapa() {
    State.editEtapaIndex = -1; wasSubmitEtapa = false;
    const cmbT = document.getElementById("cmbTaller"); cmbT.innerHTML = `<option value="">Seleccione</option>` + (State.talleres || []).map(t => `<option value="${t.Id}">${t.Nombre}</option>`).join("");
    const cmbE = document.getElementById("cmbEtEstado"); cmbE.innerHTML = `<option value="">Seleccione</option>` + (State.etapasEstados || []).map(e => `<option value="${e.Id}">${e.Nombre}</option>`).join("");
    ["#cmbTaller", "#cmbEtEstado"].forEach(s => { if ($.fn.select2) $(s).val("").trigger("change.select2"); });
    ["dtpEtEntrada", "dtpEtSalidaAprox", "dtpEtSalidaReal"].forEach(id => document.getElementById(id).value = "");
    ["txtEtAP", "txtEtP", "txtEtDif", "txtEtNota"].forEach(id => document.getElementById(id).value = id === "txtEtNota" ? "" : "0");
    ["#cmbTaller", "#cmbEtEstado", "#dtpEtEntrada", "#dtpEtSalidaAprox"].forEach(clearVal);
    document.getElementById("errorCamposEtapa")?.classList.add("d-none");
    new bootstrap.Modal(document.getElementById("modalEtapa")).show();
}
function validarEtapa() {
    const t = parseInt(document.getElementById("cmbTaller").value || 0, 10);
    const e = parseInt(document.getElementById("cmbEtEstado").value || 0, 10);
    const f1 = document.getElementById("dtpEtEntrada").value;
    const f2 = document.getElementById("dtpEtSalidaAprox").value;
    let ok = true;
    ok = (t ? setValid("#cmbTaller") : setInvalid("#cmbTaller")) && ok;
    ok = (e ? setValid("#cmbEtEstado") : setInvalid("#cmbEtEstado")) && ok;
    ok = (f1 ? setValid("#dtpEtEntrada") : setInvalid("#dtpEtEntrada")) && ok;
    ok = (f2 ? setValid("#dtpEtSalidaAprox") : setInvalid("#dtpEtSalidaAprox")) && ok;
    document.getElementById("errorCamposEtapa")?.classList.toggle("d-none", ok);
    return ok;
}
function guardarEtapa() {
    wasSubmitEtapa = true; if (!validarEtapa()) return;
    const row = {
        id: 0,
        idTaller: parseInt(document.getElementById("cmbTaller").value, 10),
        tallerNombre: document.getElementById("cmbTaller").selectedOptions[0]?.textContent || "",
        fechaEntrada: document.getElementById("dtpEtEntrada").value || null,
        fechaSalidaAprox: document.getElementById("dtpEtSalidaAprox").value || null,
        fechaSalidaReal: document.getElementById("dtpEtSalidaReal").value || null,
        aProducir: _num(document.getElementById("txtEtAP").value),
        producidas: _num(document.getElementById("txtEtP").value),
        diferencias: _num(document.getElementById("txtEtDif").value),
        idEstado: parseInt(document.getElementById("cmbEtEstado").value || 0, 10),
        estadoNombre: document.getElementById("cmbEtEstado").selectedOptions[0]?.textContent || "",
        nota: (document.getElementById("txtEtNota").value || "").trim()
    };
    if (State.editEtapaIndex >= 0) State.etapas[State.editEtapaIndex] = { ...State.etapas[State.editEtapaIndex], ...row };
    else State.etapas.push(row);
    refreshEtapas(); bootstrap.Modal.getInstance(document.getElementById("modalEtapa"))?.hide();
}
function editarEtapa(i) {
    const it = State.etapas[i]; if (!it) return; State.editEtapaIndex = i; wasSubmitEtapa = false;
    const cmbT = document.getElementById("cmbTaller"); cmbT.innerHTML = `<option value="">Seleccione</option>` + (State.talleres || []).map(t => `<option value="${t.Id}">${t.Nombre}</option>`).join("");
    const cmbE = document.getElementById("cmbEtEstado"); cmbE.innerHTML = `<option value="">Seleccione</option>` + (State.etapasEstados || []).map(e => `<option value="${e.Id}">${e.Nombre}</option>`).join("");
    $("#cmbTaller").val(String(it.idTaller)); $("#cmbEtEstado").val(String(it.idEstado)); if ($.fn.select2) { $("#cmbTaller").trigger("change.select2"); $("#cmbEtEstado").trigger("change.select2"); }
    document.getElementById("dtpEtEntrada").value = it.fechaEntrada ? moment(it.fechaEntrada).format("YYYY-MM-DD") : "";
    document.getElementById("dtpEtSalidaAprox").value = it.fechaSalidaAprox ? moment(it.fechaSalidaAprox).format("YYYY-MM-DD") : "";
    document.getElementById("dtpEtSalidaReal").value = it.fechaSalidaReal ? moment(it.fechaSalidaReal).format("YYYY-MM-DD") : "";
    document.getElementById("txtEtAP").value = _miles(it.aProducir);
    document.getElementById("txtEtP").value = _miles(it.producidas);
    document.getElementById("txtEtDif").value = _miles(it.diferencias);
    document.getElementById("txtEtNota").value = it.nota || "";
    ["#cmbTaller", "#cmbEtEstado", "#dtpEtEntrada", "#dtpEtSalidaAprox"].forEach(clearVal);
    document.getElementById("errorCamposEtapa")?.classList.add("d-none");
    new bootstrap.Modal(document.getElementById("modalEtapa")).show();
}
async function eliminarEtapa(i) { const ok = await confirmarModal("¿Eliminar etapa?"); if (!ok) return; State.etapas.splice(i, 1); refreshEtapas(); }

/* ---------------- Cargar OC existente ---------------- */
async function cargarOC(id) {
    const r = await fetch(`/OrdenesCorte/EditarInfo?id=${id}`, { headers: { Authorization: "Bearer " + (token || ""), "Content-Type": "application/json" } }); if (!r.ok) { errorModal?.("No se pudo cargar la orden."); return; }
    const o = await r.json();

    document.getElementById("dtpFechaInicio").value = o.FechaInicio ? moment(o.FechaInicio).format("YYYY-MM-DD") : hoyISO();
    $("#cmbEstado").val(String(o.IdEstado || "")); if ($.fn.select2) $("#cmbEstado").trigger("change.select2");
    $("#cmbPersonal").val(String(o.IdPersonal || "")); if ($.fn.select2) $("#cmbPersonal").trigger("change.select2");

    document.getElementById("txtCantAProducir").value = _miles(o.CantidadProducir || 0);
    document.getElementById("txtCantProducidas").value = _miles(o.CantidadProducidas || 0);
    document.getElementById("txtDifCorte").value = _miles(o.DiferenciaCorte || 0);
    document.getElementById("txtCantFinalReal").value = _miles(o.CantidadFinalReal || 0);
    document.getElementById("txtDifFinalReal").value = _miles(o.DiferenciaFinalReal || 0);
    document.getElementById("txtLargo").value = _miles(o.LargoTizada || 0);
    document.getElementById("txtAncho").value = _miles(o.AnchoTizada || 0);
    document.getElementById("txtCapas").value = _miles(o.CantidadCapas || 0);

    document.getElementById("txtHoraIni").value = o.HoraInicioCorte ? moment(o.HoraInicioCorte).format("HH:mm") : "";
    document.getElementById("txtHoraFin").value = o.HoraFinCorte ? moment(o.HoraFinCorte).format("HH:mm") : "";

    // Productos (1..n)
    State.items = (o.Productos || []).map(p => ({
        id: p.Id || 0,
        idProducto: p.IdProducto,
        productoNombre: p.Producto || p.ProductoNombre || "",
        cantidad: parseFloat(p.Cantidad || 0),
        variantes: (p.Variantes || []).map(v => ({ id: v.Id || 0, idProductoVariante: v.IdProductoVariante, nombre: v.Variante || "", cantidad: parseFloat(v.Cantidad || 0) }))
    }));
    refreshProductos();

    // Insumos
    State.insumos = (o.Insumos || []).map(i => ({ id: i.Id || 0, idInsumo: i.IdInsumo, nombre: i.Insumo || "", cantidad: parseFloat(i.Cantidad || 0) }));
    refreshInsumos();

    // Etapas
    State.etapas = (o.Etapas || []).map(e => ({
        id: e.Id || 0, idTaller: e.IdTaller, tallerNombre: e.Taller || "",
        fechaEntrada: e.FechaEntrada, fechaSalidaAprox: e.FechaSalidaAproximada, fechaSalidaReal: e.FechaSalidaReal,
        aProducir: parseFloat(e.CantidadProducir || 0), producidas: parseFloat(e.CantidadProducidas || 0), diferencias: parseFloat(e.Diferencias || 0),
        idEstado: e.IdEstado, estadoNombre: e.Estado || "", nota: e.NotaInterna || ""
    }));
    refreshEtapas();
}

/* ---------------- Guardar / Eliminar ---------------- */
function camposValidos() {
    let ok = true;
    ok = (document.getElementById("dtpFechaInicio").value ? setValid("#dtpFechaInicio") : setInvalid("#dtpFechaInicio")) && ok;
    ok = (parseInt(document.getElementById("cmbEstado").value || 0, 10) ? setValid("#cmbEstado") : setInvalid("#cmbEstado")) && ok;
    ok = (parseInt(document.getElementById("cmbPersonal").value || 0, 10) ? setValid("#cmbPersonal") : setInvalid("#cmbPersonal")) && ok;
    return ok;
}
function updateBanner() { const ok = camposValidos(); document.getElementById("errorCamposOC")?.classList.toggle("d-none", ok); return ok; }

async function guardarOC() {
    if (isSaving) return;
    wasSubmitOC = true; if (!updateBanner()) return;
    if ((State.items || []).length === 0) { return errorModal?.("Agregá al menos un producto."); }

    const payload = {
        Id: State.idOC || 0,
        FechaInicio: document.getElementById("dtpFechaInicio").value,
        IdEstado: parseInt(document.getElementById("cmbEstado").value || 0, 10),
        IdPersonal: parseInt(document.getElementById("cmbPersonal").value || 0, 10),
        CantidadProducir: _num(document.getElementById("txtCantAProducir").value),
        CantidadProducidas: _num(document.getElementById("txtCantProducidas").value),
        DiferenciaCorte: _num(document.getElementById("txtDifCorte").value),
        CantidadFinalReal: _num(document.getElementById("txtCantFinalReal").value),
        DiferenciaFinalReal: _num(document.getElementById("txtDifFinalReal").value),
        LargoTizada: _num(document.getElementById("txtLargo").value),
        AnchoTizada: _num(document.getElementById("txtAncho").value),
        CantidadCapas: _num(document.getElementById("txtCapas").value),
        HoraInicioCorte: document.getElementById("txtHoraIni").value ? `${document.getElementById("dtpFechaInicio").value}T${document.getElementById("txtHoraIni").value}:00` : null,
        HoraFinCorte: document.getElementById("txtHoraFin").value ? `${document.getElementById("dtpFechaInicio").value}T${document.getElementById("txtHoraFin").value}:00` : null,

        Productos: (State.items || []).map(i => ({
            Id: i.id || 0,
            IdProducto: i.idProducto,
            Cantidad: i.cantidad,
            Variantes: (i.variantes || []).map(v => ({ Id: v.id || 0, IdProducto: i.idProducto, IdProductoVariante: v.idProductoVariante, Cantidad: v.cantidad }))
        })),
        Insumos: (State.insumos || []).map(x => ({ Id: x.id || 0, IdInsumo: x.idInsumo, Cantidad: x.cantidad })),
        Etapas: (State.etapas || []).map(e => ({
            Id: e.id || 0, IdTaller: e.idTaller, FechaEntrada: e.fechaEntrada, FechaSalidaAproximada: e.fechaSalidaAprox, FechaSalidaReal: e.fechaSalidaReal,
            CantidadProducir: e.aProducir, CantidadProducidas: e.producidas, Diferencias: e.diferencias, IdEstado: e.idEstado, NotaInterna: e.nota
        }))
    };

    const url = State.idOC ? "/OrdenesCorte/Actualizar" : "/OrdenesCorte/Insertar";
    const method = State.idOC ? "PUT" : "POST";

    try {
        isSaving = true;
        const res = await fetch(url, { method, headers: { Authorization: "Bearer " + (token || ""), "Content-Type": "application/json;charset=utf-8" }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(res.statusText);
        const j = await res.json();
        if (j === true || j?.valor === true || j?.valor === "OK") { exitoModal?.(State.idOC ? "Orden actualizada" : "Orden registrada"); volverIndexOC(); }
        else { errorModal?.("No se pudo guardar la orden."); }
    } catch (e) { console.error(e); errorModal?.("Error al guardar la orden."); }
    finally { isSaving = false; }
}

async function eliminarOC() {
    if (!State.idOC) return;
    const ok = await confirmarModal("¿Eliminar esta orden de corte?"); if (!ok) return;
    try {
        const r = await fetch(`/OrdenesCorte/Eliminar?id=${State.idOC}`, { method: "DELETE", headers: { Authorization: "Bearer " + (token || "") } });
        const j = await r.json();
        if (!r.ok || !j?.valor) throw new Error("No se pudo eliminar");
        exitoModal("Eliminada correctamente"); volverIndexOC();
    } catch (e) { console.error(e); errorModal?.("Error al eliminar"); }
}

window.volverIndexOC = function () { window.location.href = "/OrdenesCorte/Index"; };

/* ---------------- Exportación PDF (resumen simple) ---------------- */
async function exportarOCPdf() {
    if (!(State.items || []).length) return errorModal?.("Agregá al menos un producto para exportar.");
    const { jsPDF } = window.jspdf || {}; if (!jsPDF || !window.jspdf?.jsPDF?.API?.autoTable) { return errorModal?.("Falta jsPDF/autoTable."); }
    const doc = new jsPDF({ unit: "pt", format: "a4" }); const W = doc.internal.pageSize.getWidth(); const pad = 40;

    doc.setFont("helvetica", "bold"); doc.setFontSize(18);
    doc.text("Orden de Corte", pad, 50);
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    doc.text(`Fecha inicio: ${fView(document.getElementById("dtpFechaInicio").value)}`, pad, 70);
    doc.text(`Estado: ${document.getElementById("cmbEstado").selectedOptions[0]?.text || "—"}`, pad, 86);
    doc.text(`Responsable: ${document.getElementById("cmbPersonal").selectedOptions[0]?.text || "—"}`, pad, 102);

    // Productos
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text("Productos", pad, 132);
    const body = (State.items || []).map(it => {
        const vars = (it.variantes || []).map(v => `- ${v.nombre} × ${_fmt(v.cantidad)}`).join("\n");
        const prod = it.productoNombre || `Producto ${it.idProducto}`;
        return [vars ? `${prod}\n${vars}` : prod, _fmt(it.cantidad)];
    });
    doc.autoTable({ startY: 140, head: [["Producto / Variantes", "Cantidad"]], body, margin: { left: pad, right: pad }, styles: { fontSize: 10, cellPadding: 6, overflow: "linebreak" }, headStyles: { fillColor: [28, 39, 54], textColor: [255, 255, 255] }, columnStyles: { 1: { halign: "right", cellWidth: 100 } } });

    // Insumos
    let y = doc.lastAutoTable.finalY + 18;
    doc.setFont("helvetica", "bold"); doc.text("Insumos", pad, y); y += 8;
    const bodyIns = (State.insumos || []).map(i => [i.nombre, _fmt(i.cantidad)]);
    doc.autoTable({ startY: y, head: [["Insumo", "Cantidad"]], body: bodyIns, margin: { left: pad, right: pad }, styles: { fontSize: 10, cellPadding: 6 }, headStyles: { fillColor: [46, 125, 50], textColor: [255, 255, 255] }, columnStyles: { 1: { halign: "right", cellWidth: 100 } } });

    // Etapas
    y = doc.lastAutoTable.finalY + 18;
    doc.setFont("helvetica", "bold"); doc.text("Etapas", pad, y); y += 8;
    const bodyEt = (State.etapas || []).map(e => [e.tallerNombre || "—", fView(e.fechaEntrada), fView(e.fechaSalidaAprox), fView(e.fechaSalidaReal), _fmt(e.aProducir), _fmt(e.producidas), _fmt(e.diferencias), e.estadoNombre || "—", e.nota || ""]);
    doc.autoTable({ startY: y, head: [["Taller", "Entrada", "Salida aprox.", "Salida real", "A prod.", "Prod.", "Δ", "Estado", "Nota"]], body: bodyEt, margin: { left: pad, right: pad }, styles: { fontSize: 9, cellPadding: 5 }, headStyles: { fillColor: [255, 179, 0], textColor: [0, 0, 0] }, columnStyles: { 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" } } });

    doc.save(`OrdenCorte_${document.getElementById("dtpFechaInicio").value}.pdf`);
}
