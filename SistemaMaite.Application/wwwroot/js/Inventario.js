/* =========================================================
   INVENTARIO – DataTable siguiendo el patrón de CAJAS
   ========================================================= */

let gridMovs = null;

const State = {
    productos: [],
    productoSel: null,
    stockAnterior: 0,
    existencias: [],          // existencias crudas (todas las sucursales)
    stockVarOrigen: {}        // { idVariante: cantidadDisponibleEnOrigen } para transfer
};

/* =============== Helpers de cantidad (SIEMPRE ENTEROS) =============== */
function toInt(val) {
    // usa utilidades del proyecto y convierte a entero >= 0
    const n = Number(formatearSinMiles(String(val || "0"))) || 0;
    return n < 0 ? 0 : Math.floor(n);
}
function fmtQty(n) {
    const x = Number(n || 0);
    return Math.trunc(x).toLocaleString("es-AR"); // sin decimales
}
/** YYYY-MM-DD -> DD/MM/YYYY sin Date (evita TZ) */
function formatISOForLabel(isoStr) {
    if (!isoStr || typeof isoStr !== "string" || isoStr.length < 10) return "";
    const [y, m, d] = isoStr.substring(0, 10).split("-");
    return `${d}/${m}/${y}`;
}

/* =============== Config filtros por columna DataTable =============== */
// 0 acciones | 1 Fecha | 2 Tipo | 3 Producto | 4 Talle | 5 Color | 6 Concepto
// 7 Entrada | 8 Salida | 9 Stock | 10 Sucursal
const columnConfig = [
    { index: 1, filterType: "text" },
    { index: 2, filterType: "select", items: [{ Id: "ENTRADA", Nombre: "ENTRADA" }, { Id: "SALIDA", Nombre: "SALIDA" }] },
    { index: 3, filterType: "text" },
    { index: 4, filterType: "text" },
    { index: 5, filterType: "text" },
    { index: 6, filterType: "text" },
    { index: 7, filterType: "text" },
    { index: 8, filterType: "text" },
    { index: 9, filterType: "text" },
    { index: 10, filterType: "select", fetchDataFunc: listaSucursalesFilter },
];

$(document).ready(async () => {
    await Promise.all([cargarSucursalesFiltros(), cargarProductos()]);
    bindUI();
    initFiltersToggle();
    aplicarDefaultsFiltros();
    await cargarMovimientos();
    $(window).on("resize", () => setTimeout(() => gridMovs?.columns.adjust(), 10));
});

/* ============================ UI binds ============================ */

function bindUI() {
    $("#txtBuscarProd").on("input", renderProductos);
    $("#chkSoloStock").on("change", renderProductos);
    $("#fltSucursal").on("change", renderProductos); // ← stock panel izq segun sucursal

    $("#btnAjuste").on("click", abrirModalAjuste);
    $("#btnTransfer").on("click", abrirModalTransfer);
    $("#btnExportPdf").on("click", exportarPdf);

    $("#btnBuscar").on("click", () => cargarMovimientos());
    $("#btnLimpiar").on("click", () => {
        $("#fltSucursal").val("").trigger("change");
        aplicarDefaultsFiltros();
        $("#lstProductos .product-item").removeClass("active");
        State.productoSel = null;
        cargarMovimientos();
    });

    // Variantes en modales
    $("#ajProducto").on("change", () =>
        cargarVariantesEn("#ajVariantesWrap", "#ajVariantesEmpty", $("#ajProducto").val(), "#modalAjuste", { contexto: "ajuste" })
    );

    $("#trProducto").on("change", async () => {
        await cargarVariantesEn("#trVariantesWrap", "#trVariantesEmpty", $("#trProducto").val(), "#modalTransfer", { transfer: true, mostrarStock: true, idSucursalOrigen: $("#trOrigen").val() });
        await actualizarDisponibilidadTransfer();
    });

    $("#trOrigen").on("change", actualizarDisponibilidadTransfer);
}

/* ============================ Cargas base ============================ */

async function cargarSucursalesFiltros() {
    try {
        const r = await fetch("/Sucursales/Lista", { headers: { Authorization: "Bearer " + (window.token || "") } });
        const sucs = await r.json();
        const $f = $("#fltSucursal").empty().append(`<option value="">Todas</option>`);
        sucs.forEach(s => $f.append(`<option value="${s.Id}">${s.Nombre}</option>`));

        // combos modales
        const $aj = $("#ajSucursal").empty().append(`<option value="">Seleccione</option>`);
        sucs.forEach(s => $aj.append(`<option value="${s.Id}">${s.Nombre}</option>`));
        const $o = $("#trOrigen").empty().append(`<option value="">Seleccione</option>`);
        const $d = $("#trDestino").empty().append(`<option value="">Seleccione</option>`);
        sucs.forEach(s => { $o.append(`<option value="${s.Id}">${s.Nombre}</option>`); $d.append(`<option value="${s.Id}">${s.Nombre}</option>`); });
    } catch { }
}

async function cargarProductos() {
    const [exis, prods] = await Promise.all([
        fetch("/Inventario/Existencias", { headers: { Authorization: "Bearer " + (window.token || "") } }).then(r => r.json()),
        fetch("/Productos/Lista", { headers: { Authorization: "Bearer " + (window.token || "") } }).then(r => r.json())
    ]);

    State.existencias = exis || [];

    // stock total (todas las sucursales) para cálculo inicial
    const mapStock = {};
    (State.existencias || []).forEach(x => {
        const id = x.IdProducto;
        mapStock[id] = (mapStock[id] || 0) + (Number(x.Cantidad) || 0);
    });

    State.productos = (prods || []).map(p => ({
        IdProducto: p.Id,
        Producto: p.Descripcion,
        Stock: Math.trunc(mapStock[p.Id] || 0)
    })).sort((a, b) => a.Producto.localeCompare(b.Producto));

    // combos modales
    const $selAj = $("#ajProducto").empty().append(`<option value="">Seleccione</option>`);
    const $selTr = $("#trProducto").empty().append(`<option value="">Seleccione</option>`);
    State.productos.forEach(p => {
        $selAj.append(`<option value="${p.IdProducto}">${p.Producto}</option>`);
        $selTr.append(`<option value="${p.IdProducto}">${p.Producto}</option>`);
    });

    if ($.fn.select2) {
        $("#ajProducto").select2({ dropdownParent: $("#modalAjuste"), width: "100%", placeholder: "Seleccione" });
        $("#trProducto").select2({ dropdownParent: $("#modalTransfer"), width: "100%", placeholder: "Seleccione" });
        $("#ajSucursal").select2({ dropdownParent: $("#modalAjuste"), width: "100%", placeholder: "Seleccione" });
        $("#trOrigen, #trDestino").select2({ dropdownParent: $("#modalTransfer"), width: "100%", placeholder: "Seleccione" });
    }

    renderProductos();
    actualizarKpiStockTotal();
}

function stockProductoParaSucursal(idProd, idSucursal) {
    // si hay sucursal, suma stock de esa sucursal; si no, suma todas
    let total = 0;
    (State.existencias || []).forEach(x => {
        if (Number(x.IdProducto) !== Number(idProd)) return;
        if (idSucursal && Number(x.IdSucursal) !== Number(idSucursal)) return;
        total += Number(x.Cantidad) || 0;
    });
    return Math.trunc(total);
}

function renderProductos() {
    const txt = ($("#txtBuscarProd").val() || "").toLowerCase();
    const solo = $("#chkSoloStock").is(":checked");
    const idSuc = $("#fltSucursal").val(); // nueva: stock por sucursal filtrada
    const cont = $("#lstProductos").empty();

    State.productos
        .map(p => ({
            ...p,
            _stockVista: stockProductoParaSucursal(p.IdProducto, idSuc || null)
        }))
        .filter(p => (!solo || p._stockVista > 0) && p.Producto.toLowerCase().includes(txt))
        .forEach(p => {
            const el = $(`
        <div class="product-item" data-id="${p.IdProducto}">
          <div class="product-name">${p.Producto}</div>
          <div class="product-stock">${fmtQty(p._stockVista)}</div>
        </div>`);
            el.on("click", async () => {
                const ya = el.hasClass("active");
                $("#lstProductos .product-item").removeClass("active");
                if (ya) State.productoSel = null;
                else { el.addClass("active"); State.productoSel = { id: p.IdProducto, nombre: p.Producto }; }
                await cargarMovimientos();
            });
            cont.append(el);
        });
}

/* ================= Filtros externos (mostrar/ocultar panel) ================= */

function initFiltersToggle() {
    const key = "Inventario_FiltrosVisibles";
    const saved = localStorage.getItem(key);
    const visible = saved === null ? true : saved === "1";
    $("#formFiltros").toggleClass("d-none", !visible);
    $("#iconFiltros").toggleClass("fa-arrow-down", !visible).toggleClass("fa-arrow-up", visible);

    $("#btnToggleFiltros").on("click", () => {
        const show = $("#formFiltros").hasClass("d-none");
        $("#formFiltros").toggleClass("d-none", !show);
        $("#iconFiltros").toggleClass("fa-arrow-down", !show).toggleClass("fa-arrow-up", show);
        localStorage.setItem(key, show ? "1" : "0");
        setTimeout(() => gridMovs?.columns.adjust(), 10);
    });
}

function aplicarDefaultsFiltros() {
    const hoy = new Date();
    const d1 = new Date(hoy);
    d1.setDate(hoy.getDate() - 30);
    const toISO = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    $("#fltDesde").val(toISO(d1));
    $("#fltHasta").val(toISO(hoy));
}

/* ============================ Movimientos ============================ */

// Fila “Stock anterior” – usa fecha 9999-12-31 para sort y queda primera si ordenamos por Fecha DESC.
function _filaStockAnterior(stockAnterior, fechaDesdeISO) {
    const fechaTxt = fechaDesdeISO ? formatISOForLabel(fechaDesdeISO) : null;
    return {
        Id: 0,
        Fecha: "9999-12-31T00:00:00",
        Tipo: "",
        Producto: "",
        Talle: "",
        Color: "",
        Concepto: fechaTxt ? `STOCK anterior al ${fechaTxt}` : "STOCK anterior",
        Entrada: 0,
        Salida: 0,
        Saldo: Math.trunc(stockAnterior),
        Sucursal: "",
        __isStock: true,
        __stockAnterior: Math.trunc(stockAnterior)
    };
}

async function cargarMovimientos() {
    try {
        const par = new URLSearchParams();
        const desde = $("#fltDesde").val();
        const hasta = $("#fltHasta").val();
        const idSuc = $("#fltSucursal").val();

        if (idSuc) par.set("idSucursal", idSuc);
        if (State.productoSel?.id) par.set("idProducto", State.productoSel.id);
        if (desde) par.set("desde", desde);
        if (hasta) par.set("hasta", hasta);

        const r = await fetch(`/Inventario/Movimientos?${par.toString()}`, {
            headers: { Authorization: "Bearer " + (window.token || "") }
        });
        if (!r.ok) throw new Error(await r.text());
        const json = await r.json();

        const lista = json?.Movimientos || json?.movimientos || [];
        const stockAnterior = Math.trunc(Number(json?.StockAnterior || json?.stockAnterior || 0));
        State.stockAnterior = stockAnterior;

        let rows = (lista || []).map(m => ({
            Id: m.Id,
            Fecha: m.Fecha,
            Tipo: m.TipoMov || m.Tipo || "",
            Producto: m.Producto || (State.productoSel?.nombre || ""),
            Talle: m.Talle || "",
            Color: m.Color || "",
            Concepto: m.Concepto || "",
            Entrada: Math.trunc(Number(m.Entrada || 0)),
            Salida: Math.trunc(Number(m.Salida || 0)),
            Saldo: 0, // lo calculamos abajo
            Sucursal: m.Sucursal || m.IdSucursalNavigation?.Nombre || "",
            IdProducto: m.IdProducto ?? null,
            IdVariante: m.IdProductoVariante ?? m.IdVariante ?? null
        }));

        // saldo acumulado
        const saldoInicial = State.productoSel?.id ? stockAnterior : 0;
        const asc = rows.slice().sort((a, b) => {
            const d = new Date(a.Fecha) - new Date(b.Fecha);
            return d !== 0 ? d : (a.Id || 0) - (b.Id || 0);
        });

        const keyFor = (r) => `${State.productoSel?.id || r.IdProducto || r.Producto}||GLOBAL`;
        const saldosPorClave = new Map();
        const saldoPorId = new Map();

        asc.forEach(r => {
            const k = keyFor(r);
            if (!saldosPorClave.has(k)) saldosPorClave.set(k, saldoInicial);
            const s = Math.trunc(saldosPorClave.get(k) + (r.Entrada || 0) - (r.Salida || 0));
            saldosPorClave.set(k, s);
            saldoPorId.set(r.Id, s);
        });

        rows = rows.map(r => ({ ...r, Saldo: saldoPorId.get(r.Id) ?? r.Saldo }));

        if (State.productoSel?.id) rows = [_filaStockAnterior(stockAnterior, desde), ...rows];

        rows.sort((a, b) => {
            const d = new Date(b.Fecha) - new Date(a.Fecha);
            return d !== 0 ? d : (b.Id || 0) - (a.Id || 0);
        });

        await configurarTablaMov(rows);
        actualizarKPIsDesdeTabla();
        setTimeout(() => gridMovs?.columns.adjust(), 10);
    } catch (e) {
        console.error("cargarMovimientos()", e);
        errorModal("No se pudieron cargar los movimientos.");
    }
}

/* ============================ DataTable ============================ */

async function configurarTablaMov(data) {
    const sel = "#grd_Movs";

    if (!$(sel + " thead tr.filters").length) {
        $(sel + " thead tr").clone(true).addClass("filters").appendTo(sel + " thead");
    }

    if (!gridMovs) {
        gridMovs = $(sel).DataTable({
            data,
            language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
            scrollX: true,
            scrollCollapse: true,
            columnDefs: [
                { targets: [0, 2, 3, 4, 5, 6, 7, 8, 9, 10], orderable: false }
            ],
            order: [[1, "desc"]],
            columns: [
                { data: "Id", title: "", width: "1%", orderable: false, searchable: false, render: () => "" },
                {
                    data: "Fecha", title: "Fecha", className: "text-center",
                    render: function (data, type, row) {
                        if (row.__isStock) {
                            if (type === "display" || type === "filter") {
                                const v = Number(row.__stockAnterior || 0);
                                const badge = v < 0 ? "bg-danger" : "bg-success";
                                return `<div class="saldo-anterior-chip text-center"><span class="badge ${badge}">Stock anterior</span></div>`;
                            }
                            return data;
                        }
                        if (type === "display" || type === "filter") return formatearFechaParaVista(data);
                        return data;
                    }
                },
                { data: "Tipo", title: "Tipo", className: "text-center" },
                { data: "Producto", title: "Producto", className: "text-center" },
                { data: "Talle", title: "Talle", className: "text-center" },
                { data: "Color", title: "Color", className: "text-center" },
                {
                    data: "Concepto", title: "Concepto", className: "text-center",
                    render: function (data, type, row) {
                        if (!row.__isStock) return data || "";
                        const m = Number(row.__stockAnterior || 0);
                        const cls = m < 0 ? "text-danger" : "text-success";
                        return `<div class="saldo-anterior-chip text-center">
                          <span class="fw-bold ${cls}">${row.Concepto}</span>
                          <span class="fw-bold ${cls}">${fmtQty(m)}</span>
                        </div>`;
                    }
                },
                { data: "Entrada", title: "Entrada", className: "text-center", render: v => { const n = Number(v) || 0; return n > 0 ? `<span style="font-weight:700;color:#28a745;">${fmtQty(n)}</span>` : ""; } },
                { data: "Salida", title: "Salida", className: "text-center", render: v => { const n = Number(v) || 0; return n > 0 ? `<span style="font-weight:700;color:#E32709;">${fmtQty(n)}</span>` : ""; } },
                { data: "Saldo", title: "Stock", className: "text-center", render: v => `<span style="font-weight:700;">${fmtQty(v)}</span>` },
                { data: "Sucursal", title: "Sucursal", className: "text-center" }
            ],
            dom: "Bfrtip",
            buttons: ["pageLength"],
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: async function () {
                const api = this.api();

                for (const config of columnConfig) {
                    const cell = $(".filters th").eq(config.index);

                    if (config.filterType === "select") {
                        const $sel = $(`<select><option value="">Seleccionar</option></select>`)
                            .appendTo(cell.empty())
                            .on("change", function () {
                                const val = this.value;
                                if (val === "") { api.column(config.index).search("").draw(); return; }
                                const text = $(this).find("option:selected").text();
                                api.column(config.index).search("^" + escapeRegex(text) + "$", true, false).draw();
                            });

                        let items = config.items || [];
                        if (!items.length && typeof config.fetchDataFunc === "function") {
                            try { items = await config.fetchDataFunc(); } catch { }
                        }
                        (items || []).forEach(it => $sel.append(`<option value="${it.Id}">${it.Nombre || ""}</option>`));
                    } else {
                        $('<input type="text" placeholder="Buscar..." />')
                            .appendTo(cell.empty())
                            .off("keyup change")
                            .on("keyup change", function (e) {
                                e.stopPropagation();
                                const regexr = "({search})";
                                const cursorPosition = this.selectionStart ?? 0;
                                api
                                    .column(config.index)
                                    .search(this.value !== "" ? regexr.replace("{search}", "(((" + escapeRegex(this.value) + ")))") : "", this.value !== "", this.value === "")
                                    .draw();
                                $(this).focus()[0].setSelectionRange(cursorPosition, cursorPosition);
                            });
                    }
                }
                $(".filters th").eq(0).html("");

                configurarOpcionesColumnas("#grd_Movs", "#configColumnasMenu", "Inventario_Columnas");

                api.on("draw", actualizarKPIsDesdeTabla);

                setTimeout(() => gridMovs.columns.adjust(), 10);
                setTimeout(() => gridMovs.columns.adjust(), 100);
            }
        });
    } else {
        gridMovs.clear().rows.add(data).draw();
        setTimeout(() => gridMovs.columns.adjust(), 10);
    }
}

/* ============================ KPIs ============================ */

function actualizarKpiStockTotal() {
    const tot = (State.productos || []).reduce((a, p) => a + (Number(p.Stock) || 0), 0);
    $("#kpiStockTotal").text(fmtQty(tot));
}

function actualizarKPIsDesdeTabla() {
    if (!gridMovs) return;
    const rows = gridMovs.rows({ search: "applied" }).data().toArray().filter(r => !r.__isStock);

    // sumas de unidades
    const unidadesEntrada = rows.reduce((a, r) => a + (Number(r.Entrada) || 0), 0);
    const unidadesSalida = rows.reduce((a, r) => a + (Number(r.Salida) || 0), 0);

    // cantidad de filas por tipo
    const cantMovs = rows.length;
    const cantEntradas = rows.filter(r => (Number(r.Entrada) || 0) > 0).length;
    const cantSalidas = rows.filter(r => (Number(r.Salida) || 0) > 0).length;

    // pinta KPIs (ajusta IDs según tu HTML)
    $("#kpiMovimientos").text(cantMovs.toLocaleString("es-AR"));
    $("#kpiEntradas").text(unidadesEntrada.toLocaleString("es-AR"));  // si decides mantener “unidades”
    $("#kpiSalidas").text(unidadesSalida.toLocaleString("es-AR"));

    // si quieres contadores separados:
    $("#kpiEntradasCnt").text(cantEntradas.toLocaleString("es-AR"));
    $("#kpiSalidasCnt").text(cantSalidas.toLocaleString("es-AR"));
}

/* ============================ Exportar PDF ============================ */

function exportarPdf() {
    if (!gridMovs) { errorModal("No hay datos para exportar."); return; }
    const rows = gridMovs.rows({ search: 'applied' }).data().toArray().filter(r => !r.__isStock);
    if (!rows.length) { errorModal("No hay datos para exportar."); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    const title = `Inventario - ${State.productoSel?.nombre || "Todos"}`;

    doc.setFontSize(14); doc.text(title, 14, 16);
    const body = rows.map(r => [
        (r.Fecha ? formatearFechaParaVista(r.Fecha) : "-"),
        r.Tipo || "", r.Producto || "", r.Talle || "", r.Color || "",
        r.Concepto || "",
        fmtQty(r.Entrada || 0),
        fmtQty(r.Salida || 0),
        fmtQty(r.Saldo || 0),
        r.Sucursal || ""
    ]);

    doc.autoTable({
        startY: 22,
        head: [["Fecha", "Tipo", "Producto", "Talle", "Color", "Concepto", "Entrada", "Salida", "Stock", "Sucursal"]],
        body
    });
    doc.save("Inventario.pdf");
}

/* ============================ Modales (Ajuste / Transfer) ============================ */
// ---------- AJUSTE ----------
function abrirModalAjuste() {
    resetModalAjuste();  

    $("#ajFecha").val(new Date().toISOString().slice(0, 10));

    // ✅ el value debe ser "Entrada" (no "ENTRADA")
    $("#ajTipo").val("Entrada");

    // Cantidad SIEMPRE readonly (se calcula con variantes)
    $("#ajCantidad").val("0").prop("readonly", true).addClass("form-control-plaintext");

    $("#ajNota").val("AJUSTE MANUAL (...)");
    $("#ajProducto").val(State.productoSel?.id || "").trigger("change");
    $("#ajVariantesWrap").empty();
    $("#ajVariantesEmpty").addClass("d-none");

    // ✅ tomar sucursal del filtro para que coincida el stock
    const sucFiltro = $("#fltSucursal").val();
    if (sucFiltro) $("#ajSucursal").val(sucFiltro).trigger("change");

    const pid = $("#ajProducto").val();
    const suc = $("#ajSucursal").val();
    if (pid && suc) {
        cargarVariantesEn("#ajVariantesWrap", "#ajVariantesEmpty", pid, "#modalAjuste",
            { contexto: "ajuste", mostrarStock: true, idSucursalOrigen: suc });
    }

    $("#ajProducto, #ajSucursal").off("change.aj").on("change.aj", () => {
        const p = $("#ajProducto").val();
        const s = $("#ajSucursal").val();
        $("#ajVariantesWrap").empty(); $("#ajVariantesEmpty").addClass("d-none");
        if (p && s) {
            cargarVariantesEn("#ajVariantesWrap", "#ajVariantesEmpty", p, "#modalAjuste",
                { contexto: "ajuste", mostrarStock: true, idSucursalOrigen: s });
        }
        validarLimiteCantidadGeneral();   // tope general
        $(".var-qty").trigger("input");   // revalidar variantes si hay
    });

    $("#ajTipo").off("change.aj").on("change.aj", () => {
        validarLimiteCantidadGeneral();
        $(".var-qty").trigger("input");   // recapea si pasaste a Salida
    });

    $("#btnGuardarAjuste").off("click").on("click", guardarAjuste);
    $("#modalAjuste").modal("show");

    setTimeout(() => validarLimiteCantidadGeneral(), 0);
}

async function guardarAjuste() {
    if (!validarAjuste()) return;

    // ✅ normalizar casing del tipo (lo que se envía al back)
    const rawTipo = ($("#ajTipo").val() || "").trim().toLowerCase();
    const tipo = rawTipo === "salida" ? "Salida" : "Entrada";

    // ✅ SIEMPRE cantidades positivas; el back decide Entrada/Salida con 'Tipo'
    let vars = leerVariantes("#ajVariantesWrap").map(x => ({ ...x, Cantidad: toInt(x.Cantidad) }));
    let cantidadGeneral = toInt($("#ajCantidad").val());

    const payload = {
        IdSucursal: Number($("#ajSucursal").val()),
        IdProducto: Number($("#ajProducto").val()),
        Fecha: $("#ajFecha").val(),
        Tipo: tipo,                                 // "Entrada" | "Salida"
        Nota: ($("#ajNota").val() || "").trim(),
        Variantes: vars.length ? vars : null,       // [{ IdProductoVariante, Cantidad }]
        Cantidad: vars.length ? null : cantidadGeneral
    };

    try {
        const r = await fetch("/Inventario/RegistrarMovimiento", {
            method: "POST",
            headers: { Authorization: "Bearer " + (window.token || ""), "Content-Type": "application/json;charset=utf-8" },
            body: JSON.stringify(payload)
        });
        if (!r.ok) throw new Error(await r.text());
        const j = await r.json();
        if (!j?.valor) throw new Error("No se pudo guardar.");

        $("#modalAjuste").modal("hide");
        exitoModal("Ajuste registrado correctamente.");
        await Promise.all([cargarProductos(), cargarMovimientos()]);
    } catch (e) {
        console.error(e);
        errorModal("No se pudo guardar el ajuste.");
    }
}

function validarAjuste() {
    let ok = true;
    ["#ajFecha", "#ajSucursal", "#ajProducto", "#ajTipo"].forEach(sel => {
        const v = $(sel).val();
        if (!v) { $(sel).addClass("is-invalid"); ok = false; } else $(sel).removeClass("is-invalid");
    });

    // Si no hay variantes, cantidad general debe ser > 0 (aunque readonly, por si acaso)
    const vars = leerVariantes("#ajVariantesWrap");
    if (!vars.length) {
        const q = toInt($("#ajCantidad").val());
        if (!(q > 0)) { $("#ajCantidad").addClass("is-invalid"); ok = false; } else $("#ajCantidad").removeClass("is-invalid");
    } else {
        $("#ajCantidad").removeClass("is-invalid");
    }

    $("#errorAjuste").toggleClass("d-none", ok);
    return ok;
}

// ---------- TRANSFERENCIA ----------
function _valOrFirst(selector) {
    const $sel = $(selector);
    let v = $sel.val();
    if (v == null || v === "") {
        const first = $sel.find("option[value!='']").first().val();
        if (first != null) {
            $sel.val(first).trigger("change");
            v = first;
        }
    }
    return v;
}

function abrirModalTransfer() {
    resetModalTransfer();     

    $("#trFecha").val(new Date().toISOString().slice(0, 10));
    $("#trProducto").val(State.productoSel?.id || "").trigger("change");
    $("#trVariantesWrap").empty();
    $("#trVariantesEmpty").addClass("d-none");

    // Selecciona (o fuerza) una sucursal de origen
    const sucOrigen = _valOrFirst("#trOrigen");
    const pid = $("#trProducto").val();

    // Carga inicial de variantes + stock y aplica CAP al ser contexto "transfer"
    if (pid) {
        cargarVariantesEn(
            "#trVariantesWrap",
            "#trVariantesEmpty",
            pid,
            "#modalTransfer",
            { contexto: "transfer", mostrarStock: true, idSucursalOrigen: sucOrigen }
        ).then(() => {
            actualizarDisponibilidadTransfer();
            // dispare validación/capea por si había un valor en memoria
            $("#trVariantesWrap .var-qty").trigger("input");
        });
    }

    // Si cambia Producto u Origen → recargar variantes con el mismo contexto y revalidar
    $("#trProducto, #trOrigen").off("change.inv").on("change.inv", () => {
        const p = $("#trProducto").val();
        const s = _valOrFirst("#trOrigen");
        if (!p) {
            $("#trVariantesWrap").empty();
            $("#trVariantesEmpty").removeClass("d-none");
            return;
        }
        cargarVariantesEn(
            "#trVariantesWrap",
            "#trVariantesEmpty",
            p,
            "#modalTransfer",
            { contexto: "transfer", mostrarStock: true, idSucursalOrigen: s }
        ).then(() => {
            actualizarDisponibilidadTransfer();
            $("#trVariantesWrap .var-qty").trigger("input");
        });
    });

    $("#btnGuardarTransfer").off("click").on("click", guardarTransfer);
    $("#modalTransfer").modal("show");

    // Validación inicial aunque no toquen nada
    setTimeout(() => {
        actualizarDisponibilidadTransfer();
        $("#trVariantesWrap .var-qty").trigger("input");
    }, 0);
}

async function guardarTransfer() {
    let ok = true;
    ["#trFecha", "#trOrigen", "#trDestino", "#trProducto"].forEach(sel => {
        const v = $(sel).val();
        if (!v) { $(sel).addClass("is-invalid"); ok = false; } else $(sel).removeClass("is-invalid");
    });

    ok = validarCantidadesTransfer() && ok;

    $("#errorTransfer").toggleClass("d-none", ok);
    if (!ok) return;

    const vars = leerVariantes("#trVariantesWrap");
    if (!vars.length) {
        $("#errorTransfer").removeClass("d-none").text("Ingresá cantidades por variante.");
        return;
    }

    const payload = {
        Fecha: $("#trFecha").val(),
        IdSucursalOrigen: Number($("#trOrigen").val()),
        IdSucursalDestino: Number($("#trDestino").val()),
        IdProducto: Number($("#trProducto").val()),
        Nota: ($("#trNota").val() || "").trim(),
        Variantes: vars
    };

    try {
        const r = await fetch("/Inventario/Transferir", {
            method: "POST",
            headers: { Authorization: "Bearer " + (window.token || ""), "Content-Type": "application/json;charset=utf-8" },
            body: JSON.stringify(payload)
        });
        if (!r.ok) throw new Error(await r.text());
        await Promise.all([cargarProductos(), cargarMovimientos()]);
        $("#modalTransfer").modal("hide");
        exitoModal("Transferencia registrada.");
    } catch (e) {
        console.error(e);
        errorModal("No se pudo guardar la transferencia.");
    }
}

/* ===== Transfer – disponibilidad por variante (origen) ===== */

async function actualizarDisponibilidadTransfer() {
    const idProd = Number($("#trProducto").val() || 0);
    const idSuc = Number($("#trOrigen").val() || 0);
    if (!idProd || !idSuc) {
        State.stockVarOrigen = {};
        $(".var-help .var-disp").text("-");
        validarCantidadesTransfer();
        return;
    }

    // mapa de disponibilidad por variante en ORIGEN usando State.existencias
    const map = {};
    (State.existencias || [])
        .filter(x => Number(x.IdProducto) === idProd && Number(x.IdSucursal) === idSuc)
        .forEach(x => {
            const idVar = Number(x.IdProductoVariante || x.IdVariante || 0);
            if (!idVar) return;
            map[idVar] = (map[idVar] || 0) + Math.trunc(Number(x.Cantidad) || 0);
        });
    State.stockVarOrigen = map;

    // pintar ayudas y capear valores si superan stock
    $("#trVariantesWrap .var-qty").each(function () {
        const idVar = Number($(this).data("id") || 0);
        const disp = Math.trunc(State.stockVarOrigen[idVar] || 0);
        const $row = $(this).closest(".var-row");
        $row.find(".var-help .var-disp").text(fmtQty(disp));

        let v = toInt($(this).val());
        if (v > disp) { v = disp; $(this).val(fmtQty(v)); }
    });

    validarCantidadesTransfer();
}

function validarCantidadesTransfer() {
    let ok = true;
    $("#trVariantesWrap .var-qty").each(function () {
        const idVar = Number($(this).data("id") || 0);
        const disp = Math.trunc(State.stockVarOrigen[idVar] || 0);

        let q = toInt($(this).val());
        if (q > disp) q = disp;

        // Normalizo y reflejo
        $(this).val(q ? fmtQty(q) : "0");

        const $help = $(this).closest(".var-row").find(".var-help");
        $help.removeClass("text-danger").addClass("text-muted");

        if (q > disp) {
            $(this).addClass("is-invalid");
            $help.removeClass("text-muted").addClass("text-danger");
            ok = false;
        } else {
            $(this).removeClass("is-invalid");
        }
    });

    if (!ok) {
        $("#errorTransfer").removeClass("d-none").text("No hay stock suficiente en la sucursal de origen para una o más variantes.");
    } else {
        $("#errorTransfer").addClass("d-none").text("");
    }
    return ok;
}

/* ============================ Variantes (UI comunes) ============================ */

// wrapperSel: contenedor de filas
// emptySel:   cartel "sin variantes"
// idProducto: producto seleccionado
// modalSel:   modal padre (para select2)
// opts:       { mostrarStock: bool, idSucursalOrigen: number, contexto: 'ajuste' | 'transfer' }
async function cargarVariantesEn(wrapperSel, emptySel, idProducto, modalSel, opts = {}) {
    const { mostrarStock = false, idSucursalOrigen = null, contexto = null } = opts;

    try {
        if (!idProducto) {
            $(wrapperSel).empty();
            $(emptySel).removeClass("d-none");
            return;
        }

        // 1) Variantes del producto
        const rVar = await fetch(`/Ventas/VariantesPorProducto?idProducto=${idProducto}`, {
            headers: { Authorization: "Bearer " + (window.token || "") }
        });
        const data = await rVar.json();
        const listVariantes = (data || []).map(v => ({
            id: v.Id,
            nombre: v.Nombre || `${v.Color} / ${v.Talle}`
        }));

        // 2) Stock por variante (si corresponde)
        let stockPorVar = {}, stockTotal = 0;
        if (mostrarStock && idSucursalOrigen) {
            const { porVar, total } = await obtenerExistenciasProducto(idSucursalOrigen, idProducto);
            stockPorVar = porVar; stockTotal = Math.trunc(total || 0);
        }

        const wrap = $(wrapperSel).empty();
        if (!listVariantes.length) { $(emptySel).removeClass("d-none"); return; }
        $(emptySel).addClass("d-none");

        // 3) Filas – input a la derecha y “Stock: …” debajo
        listVariantes.forEach(v => {
            const stockVar = Math.trunc(stockPorVar[v.id] || 0);
            const row = $(`
                <div class="var-row d-flex align-items-center justify-content-between">
                    <div class="var-name">${v.nombre}</div>
                    <div class="var-cant d-flex flex-column align-items-end" style="min-width:110px">
                        <input type="text"
                               class="form-control Inputmiles var-qty"
                               data-id="${v.id}"
                               value="0"
                               style="width: 100px; text-align:right;">
                        <small class="text-muted mt-1 stock-chip var-help">
                            Stock: <span class="var-disp" data-stock="${v.id}">${fmtQty(stockVar)}</span>
                        </small>
                    </div>
                </div>
            `);
            wrap.append(row);
        });

        // 4) Eventos: normalizar enteros, capear por stock cuando corresponda y sumar
        const $cantGeneral = $("#ajCantidad");

        const onInput = () => {
            $(".var-qty").each(function () {
                // sólo enteros
                let v = toInt($(this).val());
                const idVar = Number($(this).data("id"));

                // Capear según contexto:
                // - Transfer: SIEMPRE capea al stock de origen
                // - Ajuste SALIDA: capea al stock
                // - Ajuste ENTRADA: no capea
                if (contexto === "transfer" || ($("#ajTipo").val() === "SALIDA" && contexto === "ajuste")) {
                    const max = Math.trunc(stockPorVar[idVar] || 0);
                    if (v > max) v = max;
                }
                $(this).val(v ? fmtQty(v) : "0");
            });

            // Suma total variantes → actualiza cantidad general (readonly)
            let suma = 0;
            $(".var-qty").each(function () { suma += toInt($(this).val()); });
            $cantGeneral.val(fmtQty(suma)).prop("readonly", true).addClass("form-control-plaintext");

            // Verificar tope general (sólo ajuste salida sin variantes, queda igual por consistencia)
            validarLimiteCantidadGeneral(stockTotal);
        };

        $(".var-qty").off("input").on("input", onInput);
        // set inicial
        onInput();

    } catch (e) {
        console.error(e);
    }
}

function leerVariantes(wrapperSel) {
    const arr = [];
    $(wrapperSel).find(".var-qty").each(function () {
        const id = Number($(this).data("id") || 0);
        const q = toInt($(this).val());
        if (id > 0 && q > 0) arr.push({ IdProductoVariante: id, Cantidad: q });
    });
    return arr;
}

/* ============================ Helpers de back ============================ */

async function listaSucursalesFilter() {
    const r = await fetch("/Sucursales/Lista", { headers: { Authorization: "Bearer " + (window.token || "") } });
    const sucs = await r.json();
    return sucs.map(x => ({ Id: x.Id, Nombre: x.Nombre }));
}

async function obtenerExistenciasProducto(idSucursal, idProducto) {
    const url = `/Inventario/Existencias?idSucursal=${idSucursal}&idProducto=${idProducto}`;
    const r = await fetch(url, { headers: { Authorization: "Bearer " + (window.token || "") } });
    const data = await r.json();

    const porVar = {}; // { idVar: cantidad }
    let total = 0;

    (data || []).forEach(x => {
        const q = Math.trunc(Number(x.Cantidad || 0));
        total += q;
        if (x.IdProductoVariante != null) {
            porVar[x.IdProductoVariante] = (porVar[x.IdProductoVariante] || 0) + q;
        }
    });

    return { porVar, total: Math.trunc(total) };
}

/* ============================ Lógica de tope general (Ajuste) ============================ */

function validarLimiteCantidadGeneral(stockTotalForzado) {
    if (!$("#modalAjuste").is(":visible")) return;

    const tipo = ($("#ajTipo").val() || "").toUpperCase();
    const pid = $("#ajProducto").val();
    const suc = $("#ajSucursal").val();
    const $cant = $("#ajCantidad");

    // si hay variantes (>0), la cantidad general es suma readonly (ya seteada)
    const sumaVar = $(".var-qty").toArray().reduce((a, el) => a + toInt($(el).val()), 0);
    if (sumaVar > 0) { $cant.removeClass("is-invalid"); return; }

    if (tipo !== "SALIDA") {
        $("#ajProducto, #ajSucursal").removeClass("is-invalid");
        $("#errorAjuste").addClass("d-none").text("Debes completar los campos obligatorios.");
        $cant.removeClass("is-invalid");
        return;
    }

    if (!pid || !suc) {
        if (!pid) $("#ajProducto").addClass("is-invalid"); else $("#ajProducto").removeClass("is-invalid");
        if (!suc) $("#ajSucursal").addClass("is-invalid"); else $("#ajSucursal").removeClass("is-invalid");
        $("#errorAjuste").removeClass("d-none")
            .text("Para SALIDA elegí Producto y Sucursal para validar stock disponible.");
        return;
    } else {
        $("#ajProducto, #ajSucursal").removeClass("is-invalid");
        $("#errorAjuste").addClass("d-none").text("Debes completar los campos obligatorios.");
    }

    (async () => {
        let stockTotal = typeof stockTotalForzado === "number" ? Math.trunc(stockTotalForzado) : 0;
        if (stockTotalForzado == null) {
            const r = await obtenerExistenciasProducto(suc, pid);
            stockTotal = Math.trunc(r.total || 0);
        }

        let v = toInt($cant.val());
        if (v > stockTotal) {
            v = stockTotal;
            $cant.val(fmtQty(v)).addClass("is-invalid");
        } else {
            $cant.removeClass("is-invalid");
        }
    })();
}


function resetModalAjuste() {
    limpiarModal('#modalAjuste', '#errorAjuste');

    // defaults seguros
    $('#ajFecha').val(new Date().toISOString().slice(0, 10));
    $('#ajTipo').val('Entrada');         // valor “humano” que usás
    $('#ajCantidad').val('0').prop('readonly', true).addClass('form-control-plaintext'); // siempre suma variantes
    $('#ajNota').val('AJUSTE MANUAL (...)');

    // combos en blanco
    $('#ajSucursal').val('').trigger('change');
    $('#ajProducto').val('').trigger('change');

    // variantes vacías
    $('#ajVariantesWrap').empty();
    $('#ajVariantesEmpty').removeClass('d-none');
}

function resetModalTransfer() {
    limpiarModal('#modalTransfer', '#errorTransfer');

    $('#trFecha').val(new Date().toISOString().slice(0, 10));
    $('#trNota').val('');

    // combos en blanco
    $('#trOrigen').val('').trigger('change');
    $('#trDestino').val('').trigger('change');
    $('#trProducto').val('').trigger('change');

    // variantes vacías
    $('#trVariantesWrap').empty();
    $('#trVariantesEmpty').removeClass('d-none');
}