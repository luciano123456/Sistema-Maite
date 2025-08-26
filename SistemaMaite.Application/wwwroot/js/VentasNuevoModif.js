/* =============== VentasNuevoModif.js (DataTables + Select2 + Variantes) =============== */
/* Requisitos:
   - jQuery 3.6+
   - Bootstrap 5.x
   - DataTables 1.13+ (+ lenguaje es-MX opcional)
   - Select2 4.1+ con theme bootstrap-5
   - moment.js
   - site.js de tu proyecto (usa `token`, modales: exitoModal/errorModal/confirmarModal, etc.)
*/

// ---------------- Estado global ----------------
let gridItems = null;
let gridPagos = null;
let isSaving = false;

const State = {
    idVenta: parseInt((document.getElementById("txtId")?.value || "0"), 10) || 0,
    clienteId: 0,
    listaPrecioId: 0,
    vendedorId: 0,
    productos: [],   // [{Id, Descripcion}]
    cuentas: [],
    clientes: [],
    vendedores: [],
    listas: [],
    items: [],       // Ítems de la venta
    pagos: [],       // Pagos de la venta
    editItemIndex: -1,
    editPagoIndex: -1
};

// ---------------- Helpers numéricos / fechas ----------------
function _fmtNumber(n) {
    const v = parseFloat(n || 0);
    return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}
function _toNumber(s) {
    return parseFloat(String(s || "0").replace(/\./g, '').replace(',', '.')) || 0;
}
function _toMiles(n) { return _fmtNumber(n); }
function hoyISO() { return moment().format('YYYY-MM-DD'); }
function formatearFechaParaVista(f) {
    const m = moment(f, [moment.ISO_8601, 'YYYY-MM-DD', 'YYYY-MM-DDTHH:mm:ss']);
    return m.isValid() ? m.format('DD/MM/YYYY') : '';
}

// ---------------- Bloqueo de botones según cliente/lista ----------------
function updateGates() {
    // leer del DOM (más robusto que depender solo de State)
    const clienteVal = document.getElementById("cmbCliente")?.value ?? "";
    const listaVal = document.getElementById("cmbListaPrecio")?.value ?? "";

    const ok = !!clienteVal && !!listaVal; // alcanza con que no estén vacíos

    const btnItem = document.querySelector('button[onclick="abrirModalItem()"]');
    const btnPago = document.querySelector('button[onclick="abrirModalPago()"]');

    [btnItem, btnPago].forEach(b => {
        if (!b) return;
        // habilitar/deshabilitar real
        b.disabled = !ok;
        b.classList.toggle('disabled', !ok);
        b.style.opacity = ok ? 1 : 0.6;
        b.style.pointerEvents = ok ? 'auto' : 'none';
    });
}


// ---------------- Select2 helper ----------------
function initSelect2Base(sel, opts = {}) {
    if (!window.jQuery || !$.fn.select2) return;
    const $el = $(sel);
    if (!$el.length) return;

    const defaultOpts = {
        theme: 'bootstrap-5',
        width: '100%',
        placeholder: 'Seleccione',
        language: {
            noResults: () => 'No hay resultados',
            searching: () => 'Buscando...'
        },
        allowClear: false
    };
    $el.select2({ ...defaultOpts, ...opts });
}
function removeEmptyOptionOnSelect(sel) {
    const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (!el) return;
    const onChange = () => {
        if (el.value && el.querySelector('option[value=""]')) {
            el.querySelector('option[value=""]').remove();
            // Para Select2: refrescar
            if ($.fn.select2 && $(el).hasClass('select2-hidden-accessible')) {
                $(el).trigger('change.select2');
            }
            el.removeEventListener('change', onChange);
        }
    };
    el.addEventListener('change', onChange);
}

// ---------------- Carga inicial ----------------
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Defaults
        const dtp = document.getElementById("dtpFecha");
        if (dtp && !dtp.value) dtp.value = hoyISO();

        // Inicializar Select2 en combos principales (cliente, vendedor, lista)
        initSelect2Base('#cmbCliente');
        initSelect2Base('#cmbVendedor');
        initSelect2Base('#cmbListaPrecio');

        removeEmptyOptionOnSelect('#cmbCliente');
        removeEmptyOptionOnSelect('#cmbVendedor');
        removeEmptyOptionOnSelect('#cmbListaPrecio');

        await Promise.all([
            cargarClientes(), cargarVendedores(), cargarListasPrecios(),
            cargarProductos(), cargarCuentas()
        ]);

        // Combos → change
        document.getElementById("cmbCliente")?.addEventListener("change", () => {
            State.clienteId = parseInt(document.getElementById("cmbCliente").value || 0);
            if (State.pagos.length) { State.pagos = []; refrescarPagos(); }
            updateGates();
        });
        document.getElementById("cmbListaPrecio")?.addEventListener("change", () => {
            State.listaPrecioId = parseInt(document.getElementById("cmbListaPrecio").value || 0);
            if (State.items.length) { State.items = []; refrescarItems(); recalcularTotales(); }
            updateGates();
        });
        document.getElementById("cmbVendedor")?.addEventListener("change", () => {
            State.vendedorId = parseInt(document.getElementById("cmbVendedor").value || 0);
        });

        // Grillas
        configurarTablaItems();
        configurarTablaPagos();

        // Editar existente
        const id = (new URLSearchParams(location.search).get("id")) || "";
        if (id) {
            State.idVenta = parseInt(id);
            await cargarVentaExistente(State.idVenta);
            document.getElementById("btnEliminarVenta")?.classList.remove("d-none");
        }
        updateGates();
    } catch (e) { console.error(e); }
});

// ---------------- Fetch combos ----------------
async function cargarClientes() {
    const r = await fetch("/Clientes/Lista", { headers: { "Authorization": "Bearer " + (token || "") } });
    const d = r.ok ? await r.json() : [];
    State.clientes = d || [];
    const cmb = document.getElementById("cmbCliente");
    if (!cmb) return;
    cmb.innerHTML = `<option value="">Seleccione</option>`;
    State.clientes.forEach(x => cmb.insertAdjacentHTML("beforeend", `<option value="${x.Id}">${x.Nombre || x.Denominacion || x.RazonSocial || ("Cliente " + x.Id)}</option>`));
    if ($.fn.select2) $('#cmbCliente').trigger('change.select2');
}
async function cargarVendedores() {
    const r = await fetch("/Personal/Lista", { headers: { "Authorization": "Bearer " + (token || "") } });
    const d = r.ok ? await r.json() : [];
    State.vendedores = d || [];
    const cmb = document.getElementById("cmbVendedor");
    if (!cmb) return;
    cmb.innerHTML = `<option value="">Seleccione</option>`;
    State.vendedores.forEach(x => cmb.insertAdjacentHTML("beforeend", `<option value="${x.Id}">${x.Nombre}</option>`));
    if ($.fn.select2) $('#cmbVendedor').trigger('change.select2');
}
async function cargarListasPrecios() {
    const r = await fetch("/ListasPrecios/Lista", { headers: { "Authorization": "Bearer " + (token || "") } });
    const d = r.ok ? await r.json() : [];
    State.listas = d || [];
    const cmb = document.getElementById("cmbListaPrecio");
    if (!cmb) return;
    cmb.innerHTML = `<option value="">Seleccione</option>`;
    State.listas.forEach(x => cmb.insertAdjacentHTML("beforeend", `<option value="${x.Id}">${x.Nombre || x.Descripcion || ("Lista " + x.Id)}</option>`));
    if ($.fn.select2) $('#cmbListaPrecio').trigger('change.select2');
}
async function cargarProductos() {
    const r = await fetch("/Productos/Lista", { headers: { "Authorization": "Bearer " + (token || "") } });
    const d = r.ok ? await r.json() : [];
    State.productos = d || [];
}
async function cargarCuentas() {
    const r = await fetch("/Cuentas/Lista", { headers: { "Authorization": "Bearer " + (token || "") } });
    const d = r.ok ? await r.json() : [];
    State.cuentas = d || [];
}

// ---------------- 1 sola llamada: precio + variantes ----------------
async function obtenerProductoInfoVenta(idProducto, idListaPrecio) {
    if (!idProducto || !idListaPrecio) return { precio: 0, variantes: [] };
    try {
        const r = await fetch(`/Ventas/ProductoInfoVenta?idProducto=${idProducto}&idListaPrecio=${idListaPrecio}`, {
            headers: { "Authorization": "Bearer " + (token || "") }
        });
        if (!r.ok) throw new Error(r.statusText);
        const j = await r.json();
        return {
            precio: j?.precio ?? 0,
            variantes: (j?.variantes || []).map(v => ({
                id: v.Id,
                idProducto: v.IdProducto,
                nombre: v.Nombre || `${v.Color || ''} / ${v.Talle || ''}`.trim()
            }))
        };
    } catch (e) { console.error(e); return { precio: 0, variantes: [] }; }
}

// ---------------- Variantes (UI) ----------------
function ensureOutsideVarMsg() {
    let msg = document.getElementById('variantesMsg');
    if (!msg) {
        msg = document.createElement('div');
        msg.id = 'variantesMsg';
        msg.className = 'alert alert-secondary py-2 my-2 d-none';
        // Insertar debajo del select de producto en el modal
        const prodSel = document.getElementById('cmbItemProducto');
        if (prodSel) prodSel.closest('.col-xl-6, .col-6, .col-12')?.appendChild(msg);
    }
    return msg;
}

// Renderiza la sección de variantes. Si no hay variantes, oculta la sección y muestra mensaje arriba.
function renderVariantesUI(variantes, existentes = []) {
    const wrap = document.getElementById("variantesWrap");
    const empty = document.getElementById("variantesEmpty");
    const container = document.getElementById("variantesContainer");

    if (!wrap || !container) return;

    // limpiar
    wrap.innerHTML = "";
    // por defecto mostramos la sección (debajo) si hay producto
    container.style.display = "block";

    // SIN variantes -> mostramos banner full width y salimos
    if (!Array.isArray(variantes) || variantes.length === 0) {
        if (empty) {
            empty.hidden = false;
            // estilo lindo
            empty.classList.add("alert-ghost");
            empty.innerHTML = `<i class="fa fa-info-circle"></i>
        <span>Este producto no tiene variantes disponibles.</span>`;
        }
        return;
    }

    // HAY variantes -> ocultar aviso vacío y dibujar filas
    if (empty) empty.hidden = true;

    // cantidades pre-cargadas (modo edición)
    const cantidades = new Map();
    (existentes || []).forEach(v => {
        cantidades.set(v.idProductoVariante || v.id, parseFloat(v.cantidad || 0));
    });

    // encabezado "Color/Talle – Cant."
    const head = document.createElement("div");
    head.className = "var-row";
    head.innerHTML = `
    <div class="text-muted fw-bold">Color / Talle</div>
    <div class="text-muted fw-bold text-center">Cant.</div>`;
    wrap.appendChild(head);

    // filas
    variantes.forEach(v => {
        const row = document.createElement("div");
        row.className = "var-row";
        row.dataset.idVar = v.id;

        const cant = cantidades.get(v.id) || 0;
        row.innerHTML = `
      <div class="var-name">${v.nombre || "-"}</div>
      <div class="var-input">
        <input type="number" min="0" step="1"
               class="form-control form-control-sm var-qty" value="${cant}">
      </div>`;
        row.querySelector(".var-qty").addEventListener("input", onVariantInputsChanged);
        wrap.appendChild(row);
    });

    onVariantInputsChanged();
}

// Lee variantes del DOM
function leerVariantesDesdeUI() {
    const wrap = document.getElementById("variantesWrap"); if (!wrap) return [];
    const rows = [...wrap.querySelectorAll(".var-row[data-id-var]")];
    const res = []; rows.forEach(r => {
        const idVar = parseInt(r.dataset.idVar, 10);
        const nombre = r.querySelector(".var-name")?.textContent?.trim() || "";
        const cantidad = _toNumber(r.querySelector(".var-qty")?.value);
        if (idVar && cantidad > 0) res.push({ idProductoVariante: idVar, nombre, cantidad });
    });
    return res;
}

// Bloqueo/Desbloqueo de cantidad por variantes
function lockQtyByVariants(sum) {
    const qtyInput = document.getElementById("txtItemCant");
    const hint = document.getElementById("qtyLockHint");
    if (qtyInput) {
        qtyInput.value = _toMiles(sum);
        qtyInput.disabled = true;
        qtyInput.classList.add("bg-disabled");
    }
    if (hint) {
        hint.hidden = false;
        hint.textContent = `Cant. bloqueada por variantes`;
    }
}
function unlockQtyByVariants() {
    const qtyInput = document.getElementById("txtItemCant");
    const hint = document.getElementById("qtyLockHint");
    if (qtyInput) {
        qtyInput.disabled = false;
        qtyInput.classList.remove("bg-disabled");
    }
    if (hint) hint.hidden = true;
}

// Al modificar inputs de variantes, recalcular preview (cantidad + subtotal)
function onVariantInputsChanged() {
    const sumVars = leerVariantesDesdeUI().reduce((a, v) => a + (parseFloat(v.cantidad) || 0), 0);
    if (sumVars > 0) lockQtyByVariants(sumVars);
    else unlockQtyByVariants();
    recalcularSubtotalModal();
}

// ---------------- Cargar Venta existente ----------------
async function cargarVentaExistente(id) {
    const r = await fetch(`/Ventas/EditarInfo?id=${id}`, {
        headers: { "Authorization": "Bearer " + (token || ""), "Content-Type": "application/json" }
    });
    if (!r.ok) { errorModal?.("No se pudo cargar la venta."); return; }
    const v = await r.json();

    // Cabecera
    document.getElementById("dtpFecha").value = moment(v.Fecha).format("YYYY-MM-DD");
    document.getElementById("cmbCliente").value = v.IdCliente || "";
    document.getElementById("cmbVendedor").value = v.IdVendedor || "";
    document.getElementById("cmbListaPrecio").value = v.IdListaPrecio || "";
    if ($.fn.select2) {
        $('#cmbCliente, #cmbVendedor, #cmbListaPrecio').trigger('change.select2');
    }
    State.clienteId = v.IdCliente || 0;
    State.vendedorId = v.IdVendedor || 0;
    State.listaPrecioId = v.IdListaPrecio || 0;
    document.getElementById("txtNota").value = v.NotaInterna || "";
    document.getElementById("txtNotaCliente").value = v.NotaCliente || "";

    // Items (+ variantes)
    State.items = (v.Productos || []).map(i => {
        const variantes = (i.Variantes || []).map(vr => ({
            id: vr.Id || 0,
            idProductoVariante: vr.IdProductoVariante,
            nombre: vr.Variante || "",
            cantidad: parseFloat(vr.Cantidad || 0)
        }));
        return {
            id: i.Id || 0,
            idProducto: i.IdProducto,
            productoNombre: i.Producto || "",
            cantidad: parseFloat(i.Cantidad || 0),
            precioUnitario: parseFloat(i.PrecioUnitario || 0),
            porcDesc: parseFloat(i.PorcDescuento || 0),
            porcIva: parseFloat(i.PorcIva || 0),
            base: parseFloat(i.Cantidad || 0) * parseFloat(i.PrecioUnitario || 0),
            descImporte: parseFloat(i.DescuentoTotal || 0),
            ivaImporte: parseFloat(i.IvaTotal || 0),
            subtotal: parseFloat(i.Subtotal || 0),
            variantes
        };
    });
    refrescarItems();

    // Pagos
    State.pagos = (v.Pagos || []).map(p => ({
        id: p.Id || 0,
        fecha: moment(p.Fecha).format("YYYY-MM-DD"),
        idCuenta: p.IdCuenta,
        cuentaNombre: p.Cuenta || "",
        importe: parseFloat(p.Importe || 0),
        nota: p.NotaInterna || ""
    }));
    refrescarPagos();

    recalcularTotales();
    updateGates();
}

// ---------------- DataTables: Items ----------------
function renderChipsVariantes(variantes, rowIndex) {
    if (!Array.isArray(variantes) || variantes.length === 0) return '<span class="text-muted">—</span>';
    return variantes.map((v, i) => `
      <span class="var-chip" title="${v.nombre}">
        <span class="chip-label">${v.nombre} <span class="qty">×${_fmtNumber(v.cantidad)}</span></span>
        <button class="chip-x" title="Quitar" onclick="quitarVarDesdeGrid(${rowIndex}, ${i});return false;">×</button>
      </span>`).join("");
}
function recalcItemDerived(it) {
    const base = (parseFloat(it.cantidad) || 0) * (parseFloat(it.precioUnitario) || 0);
    const descImporte = base * ((parseFloat(it.porcDesc) || 0) / 100);
    const baseCd = base - descImporte;
    const ivaImporte = baseCd * ((parseFloat(it.porcIva) || 0) / 100);
    const subtotal = baseCd + ivaImporte;
    it.base = base; it.descImporte = descImporte; it.ivaImporte = ivaImporte; it.subtotal = subtotal;
}
window.quitarVarDesdeGrid = function (rowIndex, varIndex) {
    const it = State.items[rowIndex]; if (!it || !Array.isArray(it.variantes)) return;
    it.variantes.splice(varIndex, 1);
    const sum = it.variantes.reduce((a, v) => a + (parseFloat(v.cantidad) || 0), 0);
    if (sum > 0) it.cantidad = sum;
    recalcItemDerived(it);
    refrescarItems(); recalcularTotales();
};

function configurarTablaItems() {
    if (gridItems) return;
    gridItems = $('#grd_Items').DataTable({
        data: [],
        language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
        scrollX: true,
        columns: [
            {
                data: null, orderable: false, width: "60px", className: "text-center",
                render: (_, __, ___, meta) => `
                    <button class="btn btn-link p-0 me-2 text-success" title="Editar" onclick="editarItem(${meta.row})"><i class="fa fa-pencil"></i></button>
                    <button class="btn btn-link p-0 text-danger" title="Eliminar" onclick="eliminarItem(${meta.row})"><i class="fa fa-trash"></i></button>`
            },
            { data: "productoNombre", title: "Producto" },
            { data: "variantes", title: "Variantes", className: "text-center", render: (v, _t, _r, meta) => renderChipsVariantes(v, meta.row) },
            { data: "cantidad", className: "text-end", title: "Cant", render: v => _fmtNumber(v) },
            { data: "precioUnitario", className: "text-end", title: "P.Unit", render: v => `$ ${_fmtNumber(v)}` },
            { data: "porcDesc", className: "text-end", title: "Desc%", render: v => `${_fmtNumber(v)} %` },
            { data: "porcIva", className: "text-end", title: "IVA%", render: v => `${_fmtNumber(v)} %` },
            { data: "subtotal", className: "text-end", title: "Subtotal", render: v => `$ ${_fmtNumber(v)}` },
        ],
        order: [[1, "asc"]],
        dom: 't',
        pageLength: 1000,
        createdRow: function (row, data, dataIndex) {
            // Permitir wrap en la columna de variantes
            const chipsCell = $('td', row).eq(2);
            chipsCell.css({ 'white-space': 'normal' });
        }
    });
}
function refrescarItems() { if (!gridItems) return; gridItems.clear().rows.add(State.items).draw(); }

// ---------------- DataTables: Pagos ----------------
function configurarTablaPagos() {
    if (gridPagos) return;
    gridPagos = $('#grd_Pagos').DataTable({
        data: [],
        language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
        scrollX: true,
        columns: [
            {
                data: null, orderable: false, width: "60px", className: "text-center",
                render: (_, __, ___, meta) => `
                    <button class="btn btn-link p-0 me-2 text-success" title="Editar" onclick="editarPago(${meta.row})"><i class="fa fa-pencil"></i></button>
                    <button class="btn btn-link p-0 text-danger" title="Eliminar" onclick="eliminarPago(${meta.row})"><i class="fa fa-trash"></i></button>`
            },
            { data: "fecha", render: f => formatearFechaParaVista(f), title: "Fecha" },
            { data: "cuentaNombre", title: "Cuenta" },
            { data: "importe", className: "text-end", title: "Importe", render: v => `$ ${_fmtNumber(v)}` },
            { data: "nota", title: "Nota" }
        ],
        order: [[1, "desc"]],
        dom: 't',
        pageLength: 1000
    });
}
function refrescarPagos() { if (!gridPagos) return; gridPagos.clear().rows.add(State.pagos).draw(); }

// ---------------- Modal Producto ----------------
window.abrirModalItem = async function () {
    if (!(State.clienteId && State.listaPrecioId)) return;
    State.editItemIndex = -1;

    // Reset producto
    const cmbHtml = `<option value="">Seleccione</option>` + State.productos.map(p => `<option value="${p.Id}">${p.Descripcion}</option>`).join("");
    const cmb = document.getElementById("cmbItemProducto");
    cmb.innerHTML = cmbHtml;

    // Select2 para producto
    initSelect2Base('#cmbItemProducto', { dropdownParent: $('#modalItem') });
    removeEmptyOptionOnSelect('#cmbItemProducto');

    // Reset campos
    document.getElementById("txtItemCant").value = "1";
    document.getElementById("txtItemPrecio").value = "";
    document.getElementById("txtItemDesc").value = "0";
    document.getElementById("txtItemIva").value = "21";
    document.getElementById("txtItemSubtotal").value = "$ 0,00";
    setItemInputsEnabled(false);

    // Variante: sección oculta y msg arriba
    renderVariantesUI([]);

    attachItemEvents();

    new bootstrap.Modal(document.getElementById('modalItem')).show();
};

function setItemInputsEnabled(enabled) {
    ["txtItemCant", "txtItemPrecio", "txtItemDesc", "txtItemIva"].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.disabled = !enabled;
        el.classList.toggle("disabled", !enabled);
        el.style.opacity = enabled ? 1 : .7;
    });
}

function attachItemEvents() {
    const cmb = document.getElementById("cmbItemProducto");
    const container = document.getElementById("variantesContainer");
    const empty = document.getElementById("variantesEmpty");

    const changeProducto = async () => {
        const idProd = parseInt(cmb.value || 0, 10);
        if (!idProd) {
            // sin selección -> oculto toda la sección
            if (container) container.style.display = "none";
            document.getElementById("txtItemPrecio").value = "";
            document.getElementById("txtItemSubtotal").value = "$ 0,00";
            setItemInputsEnabled(false);
            return;
        }

        // precio + variantes en una sola llamada
        const { precio, variantes } = await obtenerProductoInfoVenta(idProd, State.listaPrecioId);

        document.getElementById("txtItemPrecio").value = _toMiles(precio || 0);
        setItemInputsEnabled(true);
        recalcularSubtotalModal();

        // si no hay variantes, mostramos banner lindo; si hay, lista editable
        renderVariantesUI(variantes);

        // por si alguien dejó visible el aviso anteriormente
        if (empty && (!variantes || variantes.length > 0)) empty.hidden = true;
    };

    cmb.onchange = changeProducto;

    // live subtotal
    ["txtItemCant", "txtItemPrecio", "txtItemDesc", "txtItemIva"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.oninput = recalcularSubtotalModal;
    });
}

function recalcularSubtotalModal() {
    const sumVars = leerVariantesDesdeUI().reduce((a, v) => a + (parseFloat(v.cantidad) || 0), 0);
    const qty = sumVars > 0 ? sumVars : _toNumber(document.getElementById("txtItemCant").value);
    const precio = _toNumber(document.getElementById("txtItemPrecio").value);
    const desc = _toNumber(document.getElementById("txtItemDesc").value);
    const iva = _toNumber(document.getElementById("txtItemIva").value);

    const base = qty * precio;
    const descImporte = base * (desc / 100);
    const baseCd = base - descImporte;
    const ivaImporte = baseCd * (iva / 100);
    const subtotal = baseCd + ivaImporte;
    document.getElementById("txtItemSubtotal").value = `$ ${_fmtNumber(subtotal)}`;
}

// Guardar item (desde modal)
window.guardarItem = function () {
    const idProd = parseInt(document.getElementById("cmbItemProducto").value || 0);
    const cantBase = _toNumber(document.getElementById("txtItemCant").value);
    const precio = _toNumber(document.getElementById("txtItemPrecio").value);
    const desc = _toNumber(document.getElementById("txtItemDesc").value);
    const iva = _toNumber(document.getElementById("txtItemIva").value);

    const variantesSel = leerVariantesDesdeUI();
    const sumVars = variantesSel.reduce((a, v) => a + (parseFloat(v.cantidad) || 0), 0);
    const cantidadFinal = sumVars > 0 ? sumVars : cantBase;

    const errorEl = document.getElementById("errorCamposItem") || document.getElementById("errorCamposVenta");
    const okCampos = idProd && precio >= 0 && cantidadFinal > 0;
    if (!okCampos) { errorEl?.classList.remove("d-none"); return; }
    errorEl?.classList.add("d-none");

    const prod = State.productos.find(p => p.Id === idProd);
    const base = cantidadFinal * precio;
    const descImporte = base * (desc / 100);
    const baseCd = base - descImporte;
    const ivaImporte = baseCd * (iva / 100);
    const subtotal = baseCd + ivaImporte;

    const row = {
        id: 0, idProducto: idProd, productoNombre: prod?.Descripcion || (`Producto ${idProd}`),
        cantidad: cantidadFinal, precioUnitario: precio, porcDesc: desc, porcIva: iva,
        base, descImporte, ivaImporte, subtotal,
        variantes: variantesSel
    };

    if (State.editItemIndex >= 0) { State.items[State.editItemIndex] = { ...State.items[State.editItemIndex], ...row }; }
    else State.items.push(row);

    State.editItemIndex = -1;
    refrescarItems(); recalcularTotales();
    bootstrap.Modal.getInstance(document.getElementById('modalItem'))?.hide();
};

window.editarItem = async function (idx) {
    const it = State.items[idx]; if (!it) return;
    State.editItemIndex = idx;

    // Select producto
    const cmb = document.getElementById("cmbItemProducto");
    cmb.innerHTML = `<option value="">Seleccione</option>` + State.productos.map(p => `<option value="${p.Id}">${p.Descripcion}</option>`).join("");
    initSelect2Base('#cmbItemProducto', { dropdownParent: $('#modalItem') });
    removeEmptyOptionOnSelect('#cmbItemProducto');

    // Valores
    document.getElementById("cmbItemProducto").value = it.idProducto;
    if ($.fn.select2) $('#cmbItemProducto').trigger('change.select2');
    document.getElementById("txtItemCant").value = _toMiles(it.cantidad);
    document.getElementById("txtItemPrecio").value = _toMiles(it.precioUnitario);
    document.getElementById("txtItemDesc").value = _toMiles(it.porcDesc);
    document.getElementById("txtItemIva").value = _toMiles(it.porcIva);
    setItemInputsEnabled(true);
    attachItemEvents();
    recalcularSubtotalModal();

    const info = await obtenerProductoInfoVenta(it.idProducto, State.listaPrecioId);
    renderVariantesUI(info.variantes || [], it.variantes || []);

    new bootstrap.Modal(document.getElementById('modalItem')).show();
};

window.eliminarItem = async function (idx) {
    const ok = await confirmarModal("¿Eliminar el producto?");
    if (!ok) return;

    State.items.splice(idx, 1);
    refrescarItems();
    recalcularTotales();
};
// ---------------- Modal Pago ----------------
window.abrirModalPago = function () {
    if (!(State.clienteId && State.listaPrecioId)) return;
    State.editPagoIndex = -1;

    // Botón = Registrar
    setPagoActionButton('crear');

    // Defaults
    document.getElementById("dtpPagoFecha").value = hoyISO();

    const cmb = document.getElementById("cmbCuenta");
    cmb.innerHTML = `<option value="">Seleccione</option>` +
        State.cuentas.map(c => `<option value="${c.Id}">${c.Nombre || c.Descripcion || ("Cuenta " + c.Id)}</option>`).join("");

    // Select2
    initSelect2Base('#cmbCuenta', { dropdownParent: $('#modalPago') });
    removeEmptyOptionOnSelect('#cmbCuenta');

    document.getElementById("txtPagoImporte").value = "";
    document.getElementById("txtPagoNota").value = "";
    document.getElementById("errorCamposPago")?.classList.add("d-none");

    new bootstrap.Modal(document.getElementById('modalPago')).show();
};

window.guardarPago = function () {
    const fecha = document.getElementById("dtpPagoFecha").value;
    const idCuenta = parseInt(document.getElementById("cmbCuenta").value || 0, 10);
    const cuentaNombre = document.getElementById("cmbCuenta").selectedOptions[0]?.textContent || "";
    const importe = _toNumber(document.getElementById("txtPagoImporte").value);
    const nota = (document.getElementById("txtPagoNota").value || "").trim();

    const errorEl = document.getElementById("errorCamposPago");
    const ok = (fecha && idCuenta && importe > 0);
    errorEl?.classList.toggle("d-none", ok);
    if (!ok) return;

    // Totales para validación
    const tot = calcularTotalesInterno();

    // Suma pagada actual (excluyendo el que edito, si corresponde)
    const pagadoExcl = State.pagos.reduce((acc, p, i) => {
        if (State.editPagoIndex >= 0 && i === State.editPagoIndex) return acc; // excluyo pago editado
        return acc + (parseFloat(p.importe) || 0);
    }, 0);

    // Validar contra total
    if ((pagadoExcl + importe) - tot.total > 1e-6) {
        errorModal?.(`El pago supera el total de la venta ($${_fmtNumber(tot.total)}).`);
        return;
    }

    const row = { id: 0, fecha, idCuenta, cuentaNombre, importe, nota };

    if (State.editPagoIndex >= 0) {
        // EDITAR
        State.pagos[State.editPagoIndex] = { ...State.pagos[State.editPagoIndex], ...row };
        State.editPagoIndex = -1;
    } else {
        // CREAR
        State.pagos.push(row);
    }

    // Refrescar grilla + totales
    refrescarPagos();
    recalcularTotales();   // <— importante para Abonado / Restante

    // Cerrar modal
    bootstrap.Modal.getInstance(document.getElementById('modalPago'))?.hide();
};

window.editarPago = function (idx) {
    const p = State.pagos[idx];
    if (!p) return;
    State.editPagoIndex = idx;

    // Botón = Guardar
    setPagoActionButton('editar');

    document.getElementById("dtpPagoFecha").value = p.fecha;

    const cmb = document.getElementById("cmbCuenta");
    cmb.innerHTML = `<option value="">Seleccione</option>` +
        State.cuentas.map(c => `<option value="${c.Id}">${c.Nombre || c.Descripcion || ("Cuenta " + c.Id)}</option>`).join("");

    initSelect2Base('#cmbCuenta', { dropdownParent: $('#modalPago') });
    removeEmptyOptionOnSelect('#cmbCuenta');

    document.getElementById("cmbCuenta").value = p.idCuenta;
    if ($.fn.select2) $('#cmbCuenta').trigger('change.select2');

    document.getElementById("txtPagoImporte").value = _toMiles(p.importe);
    document.getElementById("txtPagoNota").value = p.nota || "";
    document.getElementById("errorCamposPago")?.classList.add("d-none");

    new bootstrap.Modal(document.getElementById('modalPago')).show();
};

window.eliminarPago = async function (idx) {
    const ok = await confirmarModal("¿Eliminar este pago?");
    if (!ok) return;

    State.pagos.splice(idx, 1);
    refrescarPagos();
    recalcularTotales();
};

// ---------------- Totales / Guardar / Eliminar ----------------
function calcularTotalesInterno() {
    let sub = 0, desc = 0, iva = 0;
    for (const it of State.items) {
        sub += it.base;
        desc += it.descImporte;
        iva += it.ivaImporte;
    }
    const total = sub - desc + iva;
    return { sub, desc, iva, total };
}
function recalcularTotales() {
    const t = calcularTotalesInterno();

    // Totales de ítems
    document.getElementById("statSub").textContent = `$ ${_fmtNumber(t.sub)}`;
    document.getElementById("statDesc").textContent = `$ ${_fmtNumber(t.desc)}`;
    document.getElementById("statIva").textContent = `$ ${_fmtNumber(t.iva)}`;
    document.getElementById("statTotal").textContent = `$ ${_fmtNumber(t.total)}`;

    // Pagado y Restante
    const abonado = (State.pagos || []).reduce((a, p) => a + (parseFloat(p.importe) || 0), 0);
    const restante = Math.max(t.total - abonado, 0);

    const elAb = document.getElementById("statAbonado");
    const elRs = document.getElementById("statRestante");

    if (elAb) elAb.textContent = `$ ${_fmtNumber(abonado)}`;
    if (elRs) elRs.textContent = `$ ${_fmtNumber(restante)}`;

    // opcional: si restante es 0, pintarlo en verde
    if (elRs) {
        elRs.classList.toggle('text-success', restante <= 0.000001);
        elRs.classList.toggle('text-warning', restante > 0.000001);
    }
}


window.guardarVenta = async function () {
    if (isSaving) return;
    const fecha = document.getElementById("dtpFecha").value;
    const idCliente = parseInt(document.getElementById("cmbCliente").value || 0);
    const idVendedor = parseInt(document.getElementById("cmbVendedor").value || 0);
    const idListaPrecio = parseInt(document.getElementById("cmbListaPrecio").value || 0);
    const notaInterna = (document.getElementById("txtNota").value || "").trim();
    const notaCliente = (document.getElementById("txtNotaCliente").value || "").trim();

    const mark = (sel, bad) => document.querySelector(sel)?.classList.toggle("is-invalid", bad);
    mark("#dtpFecha", !fecha);
    mark("#cmbCliente", !idCliente);
    mark("#cmbVendedor", !idVendedor);
    mark("#cmbListaPrecio", !idListaPrecio);

    if (!(fecha && idCliente && idVendedor && idListaPrecio)) {
        document.getElementById("errorCamposVenta")?.classList.remove("d-none");
        return;
    } else {
        document.getElementById("errorCamposVenta")?.classList.add("d-none");
    }

    if (State.items.length === 0) {
        errorModal?.("Agregá al menos un producto.");
        return;
    }

    const tot = calcularTotalesInterno();
    const payload = {
        Id: State.idVenta || 0,
        Fecha: fecha,
        IdCliente: idCliente,
        IdVendedor: idVendedor,
        IdListaPrecio: idListaPrecio,
        Subtotal: tot.sub,
        Descuentos: tot.desc,
        TotalIva: tot.iva,
        ImporteTotal: tot.total,
        NotaInterna: notaInterna,
        NotaCliente: notaCliente,
        Productos: State.items.map(i => ({
            Id: i.id || 0,
            IdProducto: i.idProducto,
            PrecioUnitario: i.precioUnitario,
            PorcDescuento: i.porcDesc,
            DescuentoUnit: i.precioUnitario * (i.porcDesc / 100),
            DescuentoTotal: i.descImporte,
            PrecioUnitCdesc: i.precioUnitario * (1 - i.porcDesc / 100),
            PorcIva: i.porcIva,
            IvaUnit: (i.precioUnitario * (1 - i.porcDesc / 100)) * (i.porcIva / 100),
            IvaTotal: i.ivaImporte,
            PrecioUnitFinal: i.precioUnitario * (1 - i.porcDesc / 100) * (1 + i.porcIva / 100),
            Cantidad: i.cantidad,
            Subtotal: i.subtotal,
            Variantes: (i.variantes || []).map(v => ({
                Id: 0,
                IdProducto: i.idProducto,
                IdProductoVariante: v.idProductoVariante,
                Cantidad: v.cantidad
            }))
        })),
        Pagos: State.pagos.map(p => ({
            Id: p.id || 0,
            Fecha: p.fecha,
            IdCuenta: p.idCuenta,
            Importe: p.importe,
            NotaInterna: p.nota
        }))
    };

    const url = State.idVenta ? "/Ventas/Actualizar" : "/Ventas/Insertar";
    const method = State.idVenta ? "PUT" : "POST";

    try {
        isSaving = true;
        const res = await fetch(url, {
            method,
            headers: {
                "Authorization": "Bearer " + (token || ""),
                "Content-Type": "application/json;charset=utf-8"
            },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(res.statusText);
        const r = await res.json();
        if ((r === true) || (r?.valor === true) || (r?.valor === "OK")) {
            exitoModal?.(State.idVenta ? "Venta actualizada" : "Venta registrada");
            volverIndex();
        } else {
            errorModal?.("No se pudo guardar la venta.");
        }
    } catch (e) {
        console.error(e);
        errorModal?.("Error al guardar la venta.");
    } finally {
        isSaving = false;
    }
};

window.eliminarVenta = async function () {
    if (!State.idVenta) return;

    const ok = await confirmarModal("¿Eliminar esta venta?");
    if (!ok) return;

    try {
        const r = await fetch(`/Ventas/Eliminar?id=${State.idVenta}`, {
            method: "DELETE",
            headers: { "Authorization": "Bearer " + (token || "") }
        });
        const j = await r.json();
        if (!r.ok || !j?.valor) throw new Error(j?.mensaje || "No se pudo eliminar.");

        exitoModal("Eliminado correctamente");
        volverIndex();
    } catch (e) {
        console.error(e);
        errorModal(e?.message || "Error al eliminar");
    }
};
window.volverIndex = function () { window.location.href = "/Ventas/Index"; };

// Cliente
$("#cmbCliente")
    .on("change select2:select select2:clear", () => {
        // guardo por compatibilidad, pero el gate ahora lee del DOM
        const v = $("#cmbCliente").val();
        State.clienteId = v ? (isFinite(+v) ? +v : v) : 0;

        // si cambia cliente, vaciamos pagos
        if (State.pagos.length) {
            State.pagos = [];
            refrescarPagos();
        }
        updateGates();
    });

// Lista de precios
$("#cmbListaPrecio")
    .on("change select2:select select2:clear", () => {
        const v = $("#cmbListaPrecio").val();
        State.listaPrecioId = v ? (isFinite(+v) ? +v : v) : 0;

        // si cambia lista, vaciamos items
        if (State.items.length) {
            State.items = [];
            refrescarItems();
            recalcularTotales();
        }
        updateGates();
    });

// Vendedor (no condiciona el gate de ítems)
$("#cmbVendedor")
    .on("change select2:select select2:clear", () => {
        const v = $("#cmbVendedor").val();
        State.vendedorId = v ? (isFinite(+v) ? +v : v) : 0;
    });

// Llamada inicial
updateGates();

function setPagoActionButton(mode /* 'crear' | 'editar' */) {
    const btn = document.getElementById('btnGuardarPago')
        || document.querySelector('#modalPago .modal-footer .btn.btn-success');

    if (!btn) return;

    const icon = '<i class="fa fa-check me-1"></i>';
    if (mode === 'editar') {
        btn.innerHTML = icon + 'Guardar';
        btn.classList.remove('btn-success');
        btn.classList.add('btn-primary');
    } else {
        btn.innerHTML = icon + 'Registrar';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-success');
    }
}


/* ============= FIN ============= */
