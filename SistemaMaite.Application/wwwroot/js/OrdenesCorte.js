﻿// ============================== OrdenesCorte.Index.js ==============================
let gridOC;

const columnConfigOC = [
    { index: 1, filterType: 'text' },                                  // Fecha
    { index: 2, filterType: 'select', fetchDataFunc: listaEstadosFilter }, // Estado
    { index: 3, filterType: 'text' },                                  // A producir
    { index: 4, filterType: 'text' },                                  // Producidas
    { index: 5, filterType: 'text' },                                  // Diferencia
    { index: 6, filterType: 'text' },                                  // Capas
    { index: 7, filterType: 'text' },                                  // Largo
    { index: 8, filterType: 'text' },                                  // Ancho
    { index: 9, filterType: 'text' },                                  // Inicio Corte
    { index: 10, filterType: 'text' },                                 // Fin Corte
];

$(document).ready(() => {
    initFiltrosOC();
});

/* ---------------- Navegación / Acciones ---------------- */
function nuevaOC() { window.location.href = "/OrdenesCorte/NuevoModif"; }

const editarOC = (id) => {
    $('.acciones-dropdown').hide();
    window.location.href = "/OrdenesCorte/NuevoModif?id=" + id;
};

async function eliminarOC(id) {
    $('.acciones-dropdown').hide();
    const ok = await confirmarModal("¿Desea eliminar esta orden de corte?");
    if (!ok) return;

    try {
        const r = await fetch("/OrdenesCorte/Eliminar?id=" + id, {
            method: "DELETE",
            headers: { 'Authorization': 'Bearer ' + (window.token || ''), 'Content-Type': 'application/json' }
        });
        if (!r.ok) throw new Error("Error al eliminar");

        const json = await r.json();
        if (json?.valor) {
            await listarOC(window._fmOC?.currentParams || {});
            exitoModal?.("Orden eliminada");
        } else {
            errorModal?.("No se pudo eliminar");
        }
    } catch (e) {
        console.error(e);
        errorModal?.("Error al eliminar");
    }
}

/* ---------------- Listado ---------------- */
async function listarOC(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const paginaActual = gridOC ? gridOC.page() : 0;

    const r = await fetch("/OrdenesCorte/Lista" + (qs ? ("?" + qs) : ""), {
        headers: { 'Authorization': 'Bearer ' + (window.token || ''), 'Content-Type': 'application/json' }
    });
    if (!r.ok) throw new Error("Error cargando órdenes de corte");
    const data = await r.json();

    await configurarDataTableOC(data);

    if (paginaActual > 0) gridOC.page(paginaActual).draw('page');
    calcularTotalesOC();
}

async function configurarDataTableOC(data) {
    if (!gridOC) {
        // Clonar fila de filtros (igual que Ventas)
        $('#grd_OC thead tr').clone(true).addClass('filters').appendTo('#grd_OC thead');

        gridOC = $('#grd_OC').DataTable({
            data,
            language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
            scrollX: true,
            scrollCollapse: true,
            columns: [
                {
                    data: "Id", title: "", width: "1%", orderable: false, searchable: false,
                    render: (id) => `
                        <div class="acciones-menu" data-id="${id}">
                            <button class='btn btn-sm btnacciones' type='button' onclick='toggleAcciones(${id})' title='Acciones'>
                                <i class='fa fa-ellipsis-v fa-lg text-white'></i>
                            </button>
                            <div class="acciones-dropdown" style="display:none;">
                                <button class='btn btn-sm btneditar' type='button' onclick='editarOC(${id})'>
                                    <i class='fa fa-pencil-square-o fa-lg text-success'></i> Abrir
                                </button>
                                <button class='btn btn-sm btneliminar' type='button' onclick='eliminarOC(${id})'>
                                    <i class='fa fa-trash-o fa-lg text-danger'></i> Eliminar
                                </button>
                            </div>
                        </div>`
                },
                { data: "FechaInicio", title: "Fecha", render: f => formatearFechaParaVista(f) },
                { data: "Estado", title: "Estado" }, // <- string que arma el Controller (Estado = OrdenesCorteEstado.Nombre)
                { data: "CantidadProducir", title: "A producir", className: "text-end", render: n => formatNumber(n) },
                { data: "CantidadProducidas", title: "Producidas", className: "text-end", render: n => formatNumber(n) },
                { data: "DiferenciaCorte", title: "Diferencia", className: "text-end", render: n => formatNumber(n) },
                { data: "CantidadCapas", title: "Capas", className: "text-end", render: n => formatNumber(n) },
                { data: "LargoTizada", title: "Largo", className: "text-end", render: n => formatNumber(n) },
                { data: "AnchoTizada", title: "Ancho", className: "text-end", render: n => formatNumber(n) },
                { data: "HoraInicioCorte", title: "Inicio Corte", render: f => f ? formatearFechaParaVista(f) : "" },
                { data: "HoraFinCorte", title: "Fin Corte", render: f => f ? formatearFechaParaVista(f) : "" },
            ],
            dom: 'Bfrtip',
            buttons: [
                { extend: 'excelHtml5', text: 'Exportar Excel', filename: 'Ordenes de Corte', title: '', exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }, className: 'btn-exportar-excel' },
                'pageLength'
            ],
            order: [[1, "desc"], [0, "desc"]],
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: async function () {
                const api = this.api();

                // Filtros por columna (igual Ventas)
                for (const cfg of columnConfigOC) {
                    const $cell = $('.filters th').eq(cfg.index);

                    if (cfg.filterType === "select") {
                        const $sel = $(`<select id="filter${cfg.index}" class="form-select form-select-sm">
                                            <option value="">Seleccionar</option>
                                        </select>`)
                            .appendTo($cell.empty())
                            .on("change", async function () {
                                const val = this.value;
                                if (val === "") {
                                    await api.column(cfg.index).search("").draw();
                                    return;
                                }
                                const txt = $(this).find("option:selected").text();
                                await api
                                    .column(cfg.index)
                                    .search("^" + escapeRegex(txt) + "$", true, false)
                                    .draw();
                            });

                        const items = await cfg.fetchDataFunc();
                        items.forEach(i => $sel.append(`<option value="${i.Id}">${i.Nombre}</option>`));
                    } else {
                        const $input = $(`<input type="text" class="form-control form-control-sm" placeholder="Buscar..." />`)
                            .appendTo($cell.empty())
                            .on('keyup change', function (e) {
                                e.stopPropagation();
                                const regexr = '({search})';
                                const cur = this.selectionStart || 0;
                                api.column(cfg.index)
                                    .search(this.value !== '' ? regexr.replace('{search}', '(((' + escapeRegex(this.value) + ')))') : '', this.value !== '', this.value === '')
                                    .draw();
                                $(this).focus()[0].setSelectionRange(cur, cur);
                            });
                    }
                }
                // La primera celda (acciones) sin filtro
                $('.filters th').eq(0).html('');

                // Configuración del menú de columnas (misma función utilitaria que en Ventas)
                if (typeof configurarOpcionesColumnas === "function") {
                    configurarOpcionesColumnas('#grd_OC', '#configColumnasMenuOC', 'OC_Columnas');
                }

                setTimeout(() => gridOC?.columns.adjust(), 10);
                $('#grd_OC').on('draw.dt', calcularTotalesOC);
            }
        });
    } else {
        gridOC.clear().rows.add(data).draw();
    }
}

/* ---------------- Totales KPIs ---------------- */
function calcularTotalesOC() {
    if (!gridOC) return;

    const rows = gridOC.rows({ search: 'applied' }).data().toArray();

    let cant = rows.length;
    let plan = 0, prod = 0, dif = 0;

    for (const r of rows) {
        plan += parseFloat(r.CantidadProducir) || 0;
        prod += parseFloat(r.CantidadProducidas) || 0;
        dif += parseFloat(r.DiferenciaCorte) || 0;
    }

    $("#kpiCantOC").text(cant.toLocaleString("es-AR"));
    $("#kpiPlan").text(formatNumber(plan));
    $("#kpiProd").text(formatNumber(prod));
    $("#kpiDif").text(formatNumber(dif));
}

/* ---------------- Panel de filtros superior ---------------- */
async function initFiltrosOC() {
    // cargar Estados para el combo del panel
    try {
        const estados = await fetch('/OrdenesCorteEstados/Lista', {
            headers: { 'Authorization': 'Bearer ' + (window.token || '') }
        }).then(r => r.json());

        if ($('#fltEstado').length) {
            const $e = $('#fltEstado').empty().append('<option value="">Todos</option>');
            (estados || []).forEach(x => $e.append(`<option value="${x.Id}">${x.Nombre}</option>`));
        }
    } catch (e) { console.warn("No se pudieron cargar estados", e); }

    // FilterManager (como Ventas)
    window._fmOC = new Filters.FilterManager({
        form: '#formFiltros',
        debounce: 300,
        buttons: {
            search: '#btnBuscar',
            clear: '#btnLimpiar',
            keepDefaultsOnClear: true
        },
        fields: {
            desde: { el: '#fltDesde', param: 'desde', parse: v => v || null, default: Filters.FilterManager.firstOfMonthISO },
            hasta: { el: '#fltHasta', param: 'hasta', parse: v => v || null, default: Filters.FilterManager.todayISO },
            estado: { el: '#fltEstado', param: 'idEstado', parse: v => v ? Number(v) : null },
            texto: { el: '#fltTexto', param: 'texto', parse: v => (v || '').trim() || null }
        },
        onSearch: async (params) => {
            window._fmOC.currentParams = params;
            await listarOC(params);
        }
    });

    window._fmOC.applyDefaults();
    window._fmOC.bind();
    await window._fmOC.search();

    // Toggle panel (igual que Ventas)
    if (typeof FiltersUI !== "undefined") {
        FiltersUI.init({
            storageKey: 'OC_FiltrosVisibles',
            panelSelector: '#formFiltros',
            buttonSelector: '#btnToggleFiltros',
            iconSelector: '#iconFiltros',
            defaultVisible: true
        });
    }
}

/* ---------------- Helpers para filtros por columna ---------------- */
async function listaEstadosFilter() {
    const r = await fetch('/OrdenesCorteEstados/Lista', {
        headers: { 'Authorization': 'Bearer ' + (window.token || ''), 'Content-Type': 'application/json' }
    });
    const d = await r.json();
    return (d || []).map(x => ({ Id: x.Id, Nombre: x.Nombre }));
}

/* ---------------- Dropdown acciones (igual Ventas) ---------------- */
function toggleAcciones(id) {
    const $dd = $(`.acciones-menu[data-id="${id}"] .acciones-dropdown`);
    if ($dd.is(":visible")) $dd.hide();
    else { $('.acciones-dropdown').hide(); $dd.show(); }
}
$(document).on('click', function (e) {
    if (!$(e.target).closest('.acciones-menu').length) $('.acciones-dropdown').hide();
});

/* ---------------- Util: escapeRegex (fallback) ---------------- */
function escapeRegex(text) {
    if ($.fn?.dataTable?.util?.escapeRegex) return $.fn.dataTable.util.escapeRegex(text);
    return String(text).replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
}
// =================================================================
