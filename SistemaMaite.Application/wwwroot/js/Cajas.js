/******************************
 * CAJAS + TRANSFERENCIAS (UI)
 ******************************/

let gridCaja;
let gridTransf = null;

// Estado interno del modal de transferencias
// null => nueva transferencia
// { id, idCajaOrigen, idCajaDestino, conceptoOrigen, conceptoDestino } => edición
let editingTransfer = null;

/* ============================
   Config filtros de la tabla (header DataTable)
   ============================ */

// columnas: 1 Fecha | 2 Tipo | 3 Concepto | 4 Ingreso | 5 Egreso | 6 Sucursal | 7 Cuenta
const columnConfig = [
    { index: 1, filterType: "text" },
    { index: 2, filterType: "select", fetchDataFunc: listaTiposFilter },
    { index: 3, filterType: "text" },
    { index: 4, filterType: "text" },
    { index: 5, filterType: "text" },
    { index: 6, filterType: "select", fetchDataFunc: listaSucursalesFilter },
    { index: 7, filterType: "select", fetchDataFunc: listaCuentasFilter },
];


/* ============================
   ARRANQUE
   ============================ */

$(document).ready(() => {
    initFiltros();               // filtros + primera carga
    attachLiveValidation("#modalEdicion"); // utilidad del proyecto

    ["#numImporte", "#cmbTipoMov"].forEach((sel) => {
        $(sel).on("input change", () => validarReglaMontos());
    });
});

/* ========== Validación movimiento manual ========== */
function validarReglaMontos() {
    const el = document.getElementById("numImporte");
    const v = parseFloat(el.value);
    const ok = !isNaN(v) && v > 0;
    el.classList.toggle("is-invalid", !ok);
    if (ok) el.classList.remove("is-valid");
    return ok;
}

function validarCamposCaja() {
    const okBasicos = verificarErroresGenerales("#modalEdicion", "#errorCampos");
    const okMontos = validarReglaMontos();

    const ok = okBasicos && okMontos;
    const err = document.querySelector("#errorCampos");
    if (err) err.classList.toggle("d-none", ok);
    return ok;
}

/* ========== Crear / Editar movimiento manual ========== */

function guardarCambios() {
    if (!validarCamposCaja()) return;

    const id = $("#txtId").val();
    const modelo = {
        Id: id ? parseInt(id) : 0,
        IdSucursal: Number($("#cmbSucursal").val()),
        IdCuenta: Number($("#cmbCuenta").val()),
        Fecha: $("#dtpFecha").val(),
        TipoMov: $("#cmbTipoMov").val(),
        Concepto: $("#txtConcepto").val().trim(),
        Importe: formatearSinMiles($("#numImporte").val()) || 0,
    };

    const url = id === "" ? "/Cajas/Insertar" : "/Cajas/Actualizar";
    const method = id === "" ? "POST" : "PUT";

    fetch(url, {
        method,
        headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json;charset=utf-8",
        },
        body: JSON.stringify(modelo),
    })
        .then((r) => {
            if (!r.ok) throw new Error(r.statusText);
            return r.json();
        })
        .then(() => {
            $("#modalEdicion").modal("hide");
            exitoModal(id === "" ? "Movimiento registrado correctamente" : "Movimiento modificado correctamente");
            // recargar la lista respetando filtros actuales
            if (window._fmCaja) window._fmCaja.search(); else listaCaja();
        })
        .catch((err) => {
            console.error("Error:", err);
            errorModal("No se pudo guardar.");
        });
}

function nuevoCaja() {
    limpiarModal("#modalEdicion", "#errorCampos");

    Promise.all([listaSucursales(), listaCuentas()]).then(() => {
        const hoy = new Date();
        $("#dtpFecha").val(hoy.toISOString().slice(0, 10));
        $("#cmbTipoMov").val("");
        $("#numImporte").val("");
        $("#txtConcepto").val("");

        $("#modalEdicion").modal("show");
        $("#btnGuardar").text("Registrar");
        $("#modalEdicionLabel").text("Nuevo Movimiento");
    });
}

async function mostrarModalCaja(modelo) {
    limpiarModal("#modalEdicion", "#errorCampos");
    await Promise.all([listaSucursales(), listaCuentas()]);

    $("#txtId").val(modelo.Id ?? 0);
    $("#cmbSucursal").val(modelo.IdSucursal ?? "").trigger("change");
    $("#cmbCuenta").val(modelo.IdCuenta ?? "").trigger("change");
    $("#dtpFecha").val((modelo.Fecha || "").toString().substring(0, 10));
    $("#cmbTipoMov").val(modelo.TipoMov ?? "");
    $("#txtConcepto").val(modelo.Concepto ?? "");
    $("#numImporte").val(formatearMiles(modelo.Importe) ?? "");

    const btnDel = document.getElementById("btnEliminarMov");
    if (btnDel) {
        if (modelo.PuedeEliminar) btnDel.classList.remove("d-none");
        else btnDel.classList.add("d-none");
    }

    $("#modalEdicion").modal("show");
    $("#btnGuardar").text("Guardar");
    $("#modalEdicionLabel").text("Ver movimiento");
}

/* ========== Lista principal (DataTable) ========== */

async function listaCaja(filtros = {}) {
    let paginaActual = gridCaja != null ? gridCaja.page() : 0;

    // build querystring (sólo params con valor)
    const qs = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
        if (v !== '' && v != null) qs.append(k, v);
    });

    const resp = await fetch('/Cajas/Lista' + (qs.toString() ? `?${qs}` : ''), {
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    });
    if (!resp.ok) { errorModal('Error obteniendo movimientos.'); return; }

    const json = await resp.json();

    // Soportar tanto el formato nuevo {SaldoAnterior, Movimientos}
    // como el viejo [ ... ] para no romper nada si el back aún no está.
    let rows = Array.isArray(json) ? json : (json.Movimientos ?? json.movimientos ?? []);
    const saldoAnterior = Number(json.SaldoAnterior ?? json.saldoAnterior ?? 0);

    // fechaDesde para el texto (toma del objeto de filtros o del form si no lo pasaron)
    const fDesde = filtros.FechaDesde || filtros.desde || document.getElementById('fltDesde')?.value || '';

    // 👇 fila "virtual" de saldo (no afecta totales porque Ingreso/Egreso = 0)
    const saldoRow = {
        Id: 0,
        Fecha: '',
        TipoMov: '',
        Concepto: fDesde
            ? `Saldo anterior al ${formatearFechaParaVista(fDesde)}`
            : `Saldo anterior`,
        Ingreso: 0,
        Egreso: 0,
        Sucursal: '',
        Cuenta: '',
        __isSaldo: true,
        __saldoAnterior: saldoAnterior
    };

    // prepend
    rows = [saldoRow, ...rows];

    await configurarDataTableCaja(rows);

    if (paginaActual > 0) gridCaja.page(paginaActual).draw('page');
    calcularIngresos();
}

async function configurarDataTableCaja(data) {
    if (!gridCaja) {
        // fila de filtros en thead
        $("#grd_Caja thead tr").clone(true).addClass("filters").appendTo("#grd_Caja thead");

        gridCaja = $("#grd_Caja").DataTable({
            data,
            language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
            scrollX: true,
            scrollCollapse: true,
            columns: [
                {
                    data: "Id",
                    title: "",
                    width: "1%",
                    render: (data) => `
            <div class="acciones-menu" data-id="${data}">
              <button class='btn btn-sm btnacciones' type='button' onclick='toggleAcciones(${data})' title='Acciones'>
                <i class='fa fa-ellipsis-v fa-lg text-white'></i>
              </button>
              <div class="acciones-dropdown" style="display:none;">
                <button class='btn btn-sm btneditar' type='button' onclick='verMovimiento(${data})' title='Ver movimiento'>
                  <i class='fa fa-eye fa-lg text-info'></i> Ver movimiento
                </button>
              </div>
            </div>`,
                    orderable: false,
                    searchable: false,
                },
                {
                    data: "Fecha",
                    title: "Fecha",
                    render: function (data, type, row) {
                        // Fila sintética de saldo
                        if (row.__isSaldo) {
                            if (type === "display" || type === "filter") {
                                const montoNum = Number(row.__saldoAnterior || 0);
                                const badgeCls = montoNum < 0 ? "bg-danger" : "bg-success";
                                return `
          <div class="saldo-anterior-chip">
            <span class="badge ${badgeCls} me-2">Saldo anterior</span>
          </div>`;
                            }
                            // para ordenar/exportar
                            return "";
                        }

                        // Filas normales
                        if (type === "display" || type === "filter") return formatearFechaParaVista(data) || "-";
                        return data; // ordenar/exportar
                    }
                },
                { data: "TipoMov", title: "Tipo" },
                {
                    data: "Concepto",
                    title: "Concepto",
                    render: function (data, type, row) {
                        if (!row.__isSaldo) return data ?? "";

                        // Fila de “Saldo anterior”: color según signo
                        const montoNum = Number(row.__saldoAnterior || 0);
                        const txtCls = montoNum < 0 ? "text-danger" : "text-success";
                        const montoFmt = formatNumber(montoNum);
                        const label = row.Concepto || "Saldo anterior";

                        return `
      <div class="saldo-anterior-chip">
        <span class="ms-1 fw-bold ${txtCls}">${label}:</span>
        <span class="ms-1 fw-bold ${txtCls}">${montoFmt}</span>
      </div>`;
                    }
                },
                {
                    data: "Ingreso",
                    title: "Ingreso",
                    className: "text-center",
                    render: (data) => {
                        const v = parseFloat(data);
                        return v > 0 ? `<span style="color:green;font-weight:bold;">${formatNumber(v)}</span>` : "";
                    },
                },
                {
                    data: "Egreso",
                    title: "Egreso",
                    className: "text-center",
                    render: (data) => {
                        const v = parseFloat(data);
                        return v > 0 ? `<span style="color:red;font-weight:bold;">${formatNumber(v)}</span>` : "";
                    },
                },
                { data: "Sucursal", title: "Sucursal" },
                { data: "Cuenta", title: "Cuenta" },
            ],
            dom: "Bfrtip",
            buttons: [
                {
                    extend: "excelHtml5",
                    text: "Exportar Excel",
                    filename: "Caja",
                    title: "",
                    exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] }, // sin acciones
                    className: "btn-exportar-excel",
                },
                {
                    extend: "pdfHtml5",
                    text: "Exportar PDF",
                    filename: "Caja",
                    title: "",
                    exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] },
                    className: "btn-exportar-pdf",
                },
                {
                    extend: "print",
                    text: "Imprimir",
                    title: "",
                    exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] },
                    className: "btn-exportar-print",
                },
                "pageLength",
            ],
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: async function () {
                const api = this.api();

                // Filtros por columna (header de DataTable)
                for (const config of columnConfig) {
                    const cell = $(".filters th").eq(config.index);

                    if (config.filterType === "select") {
                        const select = $(`<select id="filter${config.index}"><option value="">Seleccionar</option></select>`)
                            .appendTo(cell.empty())
                            .on("change", async function () {
                                const val = this.value; // '' si es el placeholder
                                if (val === "") {
                                    // limpiar filtro
                                    await api.column(config.index).search("").draw();
                                    return;
                                }

                                // si la columna muestra el texto
                                const selectedText = $(this).find("option:selected").text();
                                await api
                                    .column(config.index)
                                    .search("^" + escapeRegex(selectedText) + "$", true, false)
                                    .draw();
                            });

                        const items = await config.fetchDataFunc();
                        items.forEach((item) => select.append(`<option value="${item.Id}">${item.Nombre ?? ""}</option>`));
                    } else if (config.filterType === "text") {
                        $('<input type="text" placeholder="Buscar..." />')
                            .appendTo(cell.empty())
                            .off("keyup change")
                            .on("keyup change", function (e) {
                                e.stopPropagation();
                                const regexr = "({search})";
                                const cursorPosition = this.selectionStart;
                                api
                                    .column(config.index)
                                    .search(this.value !== "" ? regexr.replace("{search}", "(((" + escapeRegex(this.value) + ")))") : "", this.value !== "", this.value === "")
                                    .draw();
                                $(this).focus()[0].setSelectionRange(cursorPosition, cursorPosition);
                            });
                    }
                }

                // sin filtro para acciones
                $(".filters th").eq(0).html("");

                configurarOpcionesColumnas("#grd_Caja", "#configColumnasMenu", "Caja_Columnas");

                // totales al iniciar y en cada draw (busca/ordena/pagina)
                calcularIngresos();
                api.on("draw", () => calcularIngresos());

                setTimeout(() => gridCaja.columns.adjust(), 10);
            },
        });
    } else {
        gridCaja.clear().rows.add(data).draw();
    }
}

/* ========== Cargas para selects (con token) ========== */

async function listaSucursales() {
    const res = await fetch("/Sucursales/Lista", {
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    });
    const data = await res.json();
    llenarSelect("cmbSucursal", data);
}

async function listaCuentas() {
    const res = await fetch("/Cuentas/Lista", {
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    });
    const data = await res.json();
    llenarSelect("cmbCuenta", data);
}

/* ========== Filtros (header DataTable) helpers ========== */

async function listaSucursalesFilter() {
    const response = await fetch("/Sucursales/Lista", {
        method: "GET",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error("Error cargando Sucursales");
    const data = await response.json();
    return data.map((item) => ({ Id: item.Id, Nombre: item.Nombre }));
}

async function listaCuentasFilter() {
    const response = await fetch("/Cuentas/Lista", {
        method: "GET",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error("Error cargando Cuentas");
    const data = await response.json();
    return data.map((item) => ({ Id: item.Id, Nombre: item.Nombre }));
}

async function listaTiposFilter() {
    return [
        { Id: 1, Nombre: "Ingreso" },
        { Id: 2, Nombre: "Egreso" },
    ];
}

function escapeRegex(text) {
    return (text + "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ========== Totales (respetan lo filtrado) ========== */

async function calcularIngresos() {
    if (!gridCaja) return;
    const data = gridCaja.rows({ search: "applied" }).data().toArray()
        .filter(r => !r.__isSaldo);

    let totalIngreso = 0, totalEgreso = 0;
    for (const r of data) {
        totalIngreso += parseFloat(r.Ingreso) || 0;
        totalEgreso += parseFloat(r.Egreso) || 0;
    }
    const totalSaldo = totalIngreso - totalEgreso;

    document.getElementById("txtTotalIngreso").value = formatNumber(totalIngreso);
    document.getElementById("txtTotalEgreso").value = formatNumber(totalEgreso);
    document.getElementById("txtTotalSaldo").value = formatNumber(totalSaldo);

    const inputSaldo = document.getElementById("txtTotalSaldo");
    inputSaldo.style.fontWeight = "bold";
    inputSaldo.classList.toggle("text-success", totalSaldo >= 0);
    inputSaldo.classList.toggle("text-danger", totalSaldo < 0);
}

/* ======================================================
   TRANSFERENCIAS – MODAL #modalTransfer (alta/edición)
   ====================================================== */

// --- helpers visuales del modal ---
function setPrimaryBtnText(texto) {
    const $btn = $("#modalTransfer .modal-footer .btn.btn-primary");
    if ($btn.length) $btn.html(`<i class="bi bi-arrow-right-circle me-1"></i> ${texto}`);
}

function ensureDeleteBtn(show, idTransf) {
    const $footer = $("#modalTransfer .modal-footer");
    let $btn = $("#btnEliminarTransf");

    if (!show) {
        if ($btn.length) $btn.remove();
        return;
    }
    if (!$btn.length) {
        $btn = $(`
      <button type="button" id="btnEliminarTransf" class="btn btn-danger me-auto">
        <i class="fa fa-trash"></i> Eliminar transferencia
      </button>`);
        $footer.prepend($btn);
    }
    $btn.off("click").on("click", async () => {
        eliminarTransferencia(idTransf, { closeModal: true });
    });
}

// check verde/rojo del input-group con bloqueo de error
function toggleCheck(selector, show, isError = false, lock = false) {
    const $ind = $(selector).closest('.input-group').find('.valid-indicator');
    if (!$ind.length) return;

    if (lock) $ind.addClass('force-error'); else $ind.removeClass('force-error');

    if ($ind.hasClass('force-error')) {
        $ind.removeClass('d-none bg-success').addClass('text-white bg-danger');
        return;
    }

    $ind.removeClass('d-none bg-success bg-danger text-white');
    if (!show) { $ind.addClass('d-none'); return; }
    $ind.addClass('text-white').addClass(isError ? 'bg-danger' : 'bg-success');
}

// invalid para select2
function markSelect2Invalid(sel, invalid) {
    if ($.fn.select2 && $(sel).hasClass('select2-hidden-accessible')) {
        $(sel).next('.select2-container')
            .find('.select2-selection')
            .toggleClass('is-invalid', !!invalid);
    }
}
function _anchorFor($el) {
    if ($.fn.select2 && $el.hasClass('select2-hidden-accessible')) {
        return $el.next('.select2-container');
    }
    const $ig = $el.closest('.input-group');
    return $ig.length ? $ig : $el;
}
function showInvalid(sel, msg) {
    const $el = $(sel);
    $el.addClass('is-invalid');
    markSelect2Invalid(sel, true);

    const $anc = _anchorFor($el);
    $anc.nextAll('.invalid-feedback.auto-feedback').remove();

    $('<div class="invalid-feedback auto-feedback d-block"></div>')
        .text(msg || 'Campo obligatorio')
        .insertAfter($anc)
        .removeClass('d-none')
        .addClass('d-block');
}
function clearInvalid(sel) {
    const $el = $(sel);
    $el.removeClass('is-invalid');
    markSelect2Invalid(sel, false);

    const $ancMain = _anchorFor($el);
    const $ancAlt1 = $el;
    const $ancAlt2 = $el.closest('.input-group');

    [$ancMain, $ancAlt1, $ancAlt2].forEach($a => {
        if ($a && $a.length) {
            $a.nextAll('.invalid-feedback.auto-feedback').addClass('d-none').removeClass('d-block');
        }
    });
}

// limpia todos los errores del modal
function resetTransferValidationUI() {
    $('#errorTransf').addClass('d-none').text('');
    $('#formNuevaTransferencia .is-invalid').removeClass('is-invalid');
    markSelect2Invalid('#cmbSucursalTransf', false);
    markSelect2Invalid('#cmbCuentaOrigen', false);
    markSelect2Invalid('#cmbCuentaDestino', false);
    $('#modalTransfer .invalid-feedback.auto-feedback').remove();
    toggleCheck('#cmbCuentaOrigen', false);
    toggleCheck('#cmbCuentaDestino', false);
}

// Requeridos + igualdad. Devuelve true si ambos son válidos y distintos.
function evaluarCuentasIgualesYMarcar() {
    const o = $('#cmbCuentaOrigen').val();
    const d = $('#cmbCuentaDestino').val();

    $('#errorTransf').addClass('d-none').text('');
    let ok = true;

    if (!o) {
        showInvalid('#cmbCuentaOrigen', 'Campo obligatorio');
        toggleCheck('#cmbCuentaOrigen', false, false, false);
        ok = false;
    } else {
        clearInvalid('#cmbCuentaOrigen');
    }

    if (!d) {
        showInvalid('#cmbCuentaDestino', 'Campo obligatorio');
        toggleCheck('#cmbCuentaDestino', false, false, false);
        ok = false;
    } else {
        clearInvalid('#cmbCuentaDestino');
    }

    if (!o || !d) return ok;

    if (o === d) {
        showInvalid('#cmbCuentaOrigen', 'Cuenta origen y destino no pueden ser iguales.');
        showInvalid('#cmbCuentaDestino', 'Cuenta origen y destino no pueden ser iguales.');
        toggleCheck('#cmbCuentaOrigen', true, true, true);
        toggleCheck('#cmbCuentaDestino', true, true, true);
        $('#errorTransf').text('Origen y destino no pueden ser la misma cuenta.').removeClass('d-none');
        return false;
    }

    toggleCheck('#cmbCuentaOrigen', true, false, false);
    toggleCheck('#cmbCuentaDestino', true, false, false);
    return true;
}

/** Abrir en modo “Nueva transferencia” */
function abrirModalTransfer() {
    const modalEl = document.getElementById("modalTransfer");
    if (!modalEl) { console.error("No se encontró #modalTransfer"); return; }

    editingTransfer = null; // ALTA
    limpiarModal("#modalTransfer", "#errorTransf");
    resetTransferValidationUI();
    attachLiveValidation("#modalTransfer");

    $("#modalTransferLabel").text("Transferencia entre cuentas");
    setPrimaryBtnText("Transferir");
    ensureDeleteBtn(false);

    $("#dtpFechaTransf").val(new Date().toISOString().slice(0, 10));
    $("#numImporteTransf").val("");
    $("#txtNotaTransf").val("");

    Promise.all([listaSucursalesTransf(), listaCuentasTransf()]).then(() => {
        if ($.fn.select2) {
            $("#cmbSucursalTransf, #cmbCuentaOrigen, #cmbCuentaDestino").select2({
                dropdownParent: $("#modalTransfer"),
                width: "100%",
                placeholder: "Seleccione",
            });
        }

        $("#cmbSucursalTransf, #cmbCuentaOrigen, #cmbCuentaDestino").val("").trigger("change");
        resetTransferValidationUI();

        $('#cmbCuentaOrigen, #cmbCuentaDestino')
            .off('change.eq')
            .on('change.eq', function () {
                const okPar = evaluarCuentasIgualesYMarcar();
                if (okPar && $('#cmbCuentaOrigen').val() && $('#cmbCuentaDestino').val()) {
                    cargarHistorialTransferencias();
                }
            });

        if ($.fn.DataTable.isDataTable("#grd_TransfHist")) {
            $("#grd_TransfHist").DataTable().clear().destroy();
            $("#grd_TransfHist tbody").empty();
            gridTransf = null;
        }

        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    });
}

/* ======================
   Cargas de combos modal
   ====================== */

async function listaSucursalesTransf() {
    const res = await fetch("/Sucursales/Lista", {
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    });
    const data = await res.json();
    llenarSelect("cmbSucursalTransf", data);
}

async function listaCuentasTransf() {
    const res = await fetch("/Cuentas/Lista", {
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    });
    const data = await res.json();
    llenarSelect("cmbCuentaOrigen", data);
    llenarSelect("cmbCuentaDestino", data);
}

/* ======================
   Validación y guardar
   ====================== */

function validarTransferenciaModal() {
    resetTransferValidationUI();

    let ok = true;
    const reqs = [
        ["#dtpFechaTransf", "Campo obligatorio"],
        ["#cmbSucursalTransf", "Campo obligatorio"],
        ["#cmbCuentaOrigen", "Campo obligatorio"],
        ["#cmbCuentaDestino", "Campo obligatorio"],
        ["#numImporteTransf", "El importe es obligatorio"],
    ];
    reqs.forEach(([sel, msg]) => {
        const val = $(sel).val();
        if (val === null || val === "" || (sel === "#numImporteTransf" && !formatearSinMiles(val))) {
            showInvalid(sel, msg);
            ok = false;
        } else {
            clearInvalid(sel);
        }
    });

    const imp = Number(formatearSinMiles($("#numImporteTransf").val()));
    if (!(imp > 0)) {
        showInvalid("#numImporteTransf", "El importe debe ser mayor a 0.");
        ok = false;
    }

    ok = evaluarCuentasIgualesYMarcar() && ok;

    if (!ok) $("#errorTransf").text("Debes completar los campos requeridos.").removeClass("d-none");
    else $("#errorTransf").addClass("d-none").text("");

    return ok;
}

async function guardarTransferencia() {
    if (!validarTransferenciaModal()) return;

    const payloadBase = {
        Fecha: $("#dtpFechaTransf").val(),
        IdCuentaOrigen: Number($("#cmbCuentaOrigen").val()),
        ImporteOrigen: formatearSinMiles($("#numImporteTransf").val()),
        IdCuentaDestino: Number($("#cmbCuentaDestino").val()),
        ImporteDestino: formatearSinMiles($("#numImporteTransf").val()),
        NotaInterna: $("#txtNotaTransf").val().trim(),
    };

    try {
        if (!editingTransfer) {
            // ALTA
            const vm = { ...payloadBase, IdSucursal: Number($("#cmbSucursalTransf").val()) };
            const r = await fetch("/TransferenciasCajas/Crear", {
                method: "POST",
                headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
                body: JSON.stringify(vm),
            });
            if (!r.ok) throw new Error(await r.text());
            await r.json();
            exitoModal("Transferencia registrada");
        } else {
            // EDICIÓN
            const vmUpd = {
                Id: editingTransfer.id,
                IdCajaOrigen: editingTransfer.idCajaOrigen,
                IdCajaDestino: editingTransfer.idCajaDestino,
                Fecha: payloadBase.Fecha,
                IdCuentaOrigen: payloadBase.IdCuentaOrigen,
                ImporteOrigen: payloadBase.ImporteOrigen,
                ConceptoOrigen: editingTransfer.conceptoOrigen ?? "Transferencia entre cuentas",
                IdCuentaDestino: payloadBase.IdCuentaDestino,
                ImporteDestino: payloadBase.ImporteDestino,
                ConceptoDestino: editingTransfer.conceptoDestino ?? "Transferencia entre cuentas",
                NotaInterna: payloadBase.NotaInterna,
            };
            const r = await fetch("/TransferenciasCajas/Actualizar", {
                method: "PUT",
                headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
                body: JSON.stringify(vmUpd),
            });
            if (!r.ok) throw new Error(await r.text());
            exitoModal("Transferencia actualizada correctamente.");
        }

        $("#modalTransfer").modal("hide");
        editingTransfer = null;

        if (window._fmCaja) window._fmCaja.search();
        else {
            await listaCaja();
            calcularIngresos();
            cargarHistorialTransferencias();
        }
    } catch (e) {
        console.error(e);
        errorModal("No se pudo guardar la transferencia.");
    }
}

/* ======================
   Historial + eliminar
   ====================== */

async function cargarHistorialTransferencias() {
    const o = $("#cmbCuentaOrigen").val();
    const d = $("#cmbCuentaDestino").val();
    if (!o || !d) return;

    const url = `/TransferenciasCajas/Historial?idCuentaOrigen=${o}&idCuentaDestino=${d}`;
    const r = await fetch(url, { headers: { Authorization: "Bearer " + token } });
    if (!r.ok) return;
    const data = await r.json();

    if (!gridTransf) {
        gridTransf = $("#grd_TransfHist").DataTable({
            data,
            paging: true,
            searching: false,
            info: false,
            columns: [
                { data: "Fecha", render: (f) => formatearFechaParaVista(f) },
                { data: "CuentaOrigen" },
                { data: "ImporteOrigen", render: (x) => formatNumber(x) },
                { data: "CuentaDestino" },
                { data: "ImporteDestino", render: (x) => formatNumber(x) },
                { data: "NotaInterna" },
                {
                    data: "Id",
                    orderable: false,
                    render: (id) =>
                        `<button type="button" class="btn btn-sm btn-danger" onclick="eliminarTransferencia(${id})">
               <i class="fa fa-trash"></i>
             </button>`,
                },
            ],
            order: [[0, "desc"]],
        });
    } else {
        gridTransf.clear().rows.add(data).draw();
    }
}

async function eliminarTransferencia(id, opts = {}) {
    if (!(await confirmarModal("¿Eliminar esta transferencia? Se revertirán los asientos."))) return;
    const { closeModal = false } = opts;
    try {
        const r = await fetch("/TransferenciasCajas/Eliminar?id=" + id, {
            method: "DELETE",
            headers: { Authorization: "Bearer " + token },
        });
        if (!r.ok) throw new Error(await r.text());
        const j = await r.json();
        if (j.valor) {
            exitoModal("Transferencia eliminada");
            await cargarHistorialTransferencias();
            if (window._fmCaja) await window._fmCaja.search(); else await listaCaja();
            calcularIngresos();
            if (closeModal) {
                $("#modalTransfer").modal("hide");
                editingTransfer = null;
            }
        }
    } catch (e) {
        console.error(e);
        errorModal("No se pudo eliminar la transferencia.");
    }
}

// Evitar submit por Enter en modal
$("#formNuevaTransferencia").on("submit", (e) => e.preventDefault());

/* ======================
   Entradas desde la lista
   ====================== */

const verMovimiento = (id) => {
    $(".acciones-dropdown").hide();

    const row = gridCaja.rows().data().toArray().find((r) => r.Id === id);
    if (row?.EsTransferencia) {
        editarTransferenciaDesdeMovimiento(id);
        return;
    }

    fetch("/Cajas/EditarInfo?id=" + id, {
        method: "GET",
        headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
        },
    })
        .then((r) => {
            if (!r.ok) throw new Error("Ha ocurrido un error.");
            return r.json();
        })
        .then((dataJson) => (dataJson ? mostrarModalCaja(dataJson) : (() => { throw new Error("Ha ocurrido un error."); })()))
        .catch(() => errorModal("Ha ocurrido un error."));
};

async function editarTransferenciaDesdeMovimiento(idCaja) {
    try {
        const modalEl = document.getElementById("modalTransfer");
        if (!modalEl) return;

        await Promise.all([listaSucursalesTransf(), listaCuentasTransf()]);

        const r = await fetch("/TransferenciasCajas/PorCaja?idCaja=" + idCaja, {
            headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        });
        if (!r.ok) throw new Error("No se pudo obtener la transferencia.");
        const vm = await r.json();

        editingTransfer = {
            id: vm.Id,
            idCajaOrigen: vm.IdCajaOrigen,
            idCajaDestino: vm.IdCajaDestino,
            conceptoOrigen: vm.ConceptoOrigen,
            conceptoDestino: vm.ConceptoDestino,
        };

        limpiarModal("#modalTransfer", "#errorTransf");
        resetTransferValidationUI();
        attachLiveValidation("#modalTransfer");

        $("#dtpFechaTransf").val((vm.Fecha || "").toString().substring(0, 10));
        $("#cmbCuentaOrigen").val(vm.IdCuentaOrigen).trigger("change");
        $("#cmbCuentaDestino").val(vm.IdCuentaDestino).trigger("change");
        toggleCheck("#cmbCuentaOrigen", true, false);
        toggleCheck("#cmbCuentaDestino", true, false);

        $("#numImporteTransf").val(formatearMiles(vm.ImporteDestino));
        $("#txtNotaTransf").val(vm.NotaInterna || "");

        if (vm.IdCajaOrigen) {
            const rCaja = await fetch("/Cajas/EditarInfo?id=" + vm.IdCajaOrigen, {
                headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
            });
            if (rCaja.ok) {
                const caja = await rCaja.json();
                if (caja?.IdSucursal) $("#cmbSucursalTransf").val(caja.IdSucursal).trigger("change");
            }
        }

        $("#modalTransferLabel").text("Editar transferencia");
        setPrimaryBtnText("Guardar cambios");
        ensureDeleteBtn(true, vm.Id);

        if ($.fn.select2) {
            $("#cmbSucursalTransf, #cmbCuentaOrigen, #cmbCuentaDestino").select2({
                dropdownParent: $("#modalTransfer"),
                width: "100%",
                placeholder: "Seleccione",
            });
        }

        $('#cmbCuentaOrigen, #cmbCuentaDestino')
            .off('change.eq')
            .on('change.eq', function () {
                const okPar = evaluarCuentasIgualesYMarcar();
                if (okPar && $('#cmbCuentaOrigen').val() && $('#cmbCuentaDestino').val()) {
                    cargarHistorialTransferencias();
                }
            });
        await cargarHistorialTransferencias();
        evaluarCuentasIgualesYMarcar();

        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    } catch (e) {
        console.error(e);
        errorModal("No se pudo abrir la transferencia.");
    }
}

/* ===========================
   Eliminar movimiento manual
   =========================== */

async function eliminarCajaDesdeModal() {
    const id = Number($("#txtId").val() || 0);
    if (!id) return;

    const ok = await confirmarModal("¿Eliminar este movimiento?");
    if (!ok) return;

    try {
        const r = await fetch("/Cajas/Eliminar?id=" + id, {
            method: "DELETE",
            headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        });
        const j = await r.json();
        if (!r.ok || !j.valor) throw new Error(j.mensaje || "No se pudo eliminar.");
        $("#modalEdicion").modal("hide");
        exitoModal("Movimiento eliminado.");
        if (window._fmCaja) window._fmCaja.search(); else { await listaCaja(); calcularIngresos(); }
    } catch (e) {
        console.error(e);
        errorModal(e.message || "No se pudo eliminar.");
    }
}

/* ==========================================================
   Inicialización de filtros superiores (formulario externo)
   ========================================================== */

async function initFiltros() {
    // Cargar combos (Sucursales/Cuentas) del panel superior si existen
    try {
        const [sucs, ctas] = await Promise.all([
            fetch('/Sucursales/Lista', { headers: { 'Authorization': 'Bearer ' + token } }).then(r => r.json()),
            fetch('/Cuentas/Lista', { headers: { 'Authorization': 'Bearer ' + token } }).then(r => r.json())
        ]);
        if ($('#fltSucursal').length) {
            const $s = $('#fltSucursal').empty().append('<option value="">Todas</option>');
            sucs.forEach(x => $s.append(`<option value="${x.Id}">${x.Nombre}</option>`));
        }
        if ($('#fltCuenta').length) {
            const $c = $('#fltCuenta').empty().append('<option value="">Todas</option>');
            ctas.forEach(x => $c.append(`<option value="${x.Id}">${x.Nombre}</option>`));
        }
    } catch { /* ignora fallos de combos */ }

    // Crear FilterManager reutilizable
    window._fmCaja = new Filters.FilterManager({
        form: '#formFiltros',                           // agrupador de filtros
        debounce: 300,
        buttons: {
            search: '#btnBuscar',
            clear: '#btnLimpiar',
            keepDefaultsOnClear: true,                    // limpia pero mantiene fechas por default
        },
        fields: {
            // alias             // selector                 // nombre de parámetro en backend
            desde: { el: '#fltDesde', param: 'fechaDesde', parse: v => v || null, default: Filters.FilterManager.firstOfMonthISO },
            hasta: { el: '#fltHasta', param: 'fechaHasta', parse: v => v || null, default: Filters.FilterManager.todayISO },
            tipo: { el: '#fltTipo', param: 'tipo', parse: v => v || null },
            idSucursal: { el: '#fltSucursal', param: 'idSucursal', parse: v => v ? Number(v) : null },
            idCuenta: { el: '#fltCuenta', param: 'idCuenta', parse: v => v ? Number(v) : null },
            concepto: { el: '#fltConcepto', param: 'concepto', parse: v => (v || '').trim() || null },
        },
        onSearch: async (params) => {
            // params ya viene normalizado y sin vacíos
            await listaCaja(params);
        },
        // autoSearch: true, // si querés que busque solo al cambiar filtros, descomentar
    });

    // aplicar defaults (fechas) y bindear eventos
    window._fmCaja.applyDefaults();
    window._fmCaja.bind();

    // primera carga respetando defaults
    await window._fmCaja.search();
}


document.addEventListener('DOMContentLoaded', () => {
    FiltersUI.init({
        storageKey: 'Cajas_FiltrosVisibles',
        panelSelector: '#formFiltros',
        headerFiltersSelector: '#grd_Caja thead tr.filters',
        buttonSelector: '#btnToggleFiltros',
        iconSelector: '#iconFiltros',
        defaultVisible: true
    });
});
