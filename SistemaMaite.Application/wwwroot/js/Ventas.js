let gridVentas;

const columnConfigVentas = [
    { index: 1, filterType: 'text' }, // Fecha
    { index: 2, filterType: 'select', fetchDataFunc: listaClientesFilter },
    { index: 3, filterType: 'select', fetchDataFunc: listaVendedoresFilter },
    { index: 4, filterType: 'text' }, // Subtotal
    { index: 5, filterType: 'text' }, // Descuentos
    { index: 6, filterType: 'text' }, // IVA
    { index: 7, filterType: 'text' }, // Total
];

$(document).ready(() => initFiltrosVentas());

function nuevaVenta() { window.location.href = "/Ventas/NuevoModif"; }
const editarVenta = id => { $('.acciones-dropdown').hide(); window.location.href = "/Ventas/NuevoModif?id=" + id; };

async function eliminarVenta(id) {
    $('.acciones-dropdown').hide();
    const ok = await confirmarModal("¿Desea eliminar esta venta?");
    if (!ok) return;
    const r = await fetch("/Ventas/Eliminar?id=" + id, {
        method: "DELETE",
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    });
    if (!r.ok) { errorModal("Error al eliminar"); return; }
    const json = await r.json();
    if (json.valor) { listarVentas(window._fmVentas?.currentParams || {}); exitoModal("Venta eliminada"); }
}

async function listarVentas(params = {}) {
    let paginaActual = gridVentas ? gridVentas.page() : 0;
    const qs = new URLSearchParams(params).toString();
    const r = await fetch("/Ventas/Lista" + (qs ? ("?" + qs) : ""), { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await r.json();
    await configurarDataTableVentas(data);
    if (paginaActual > 0) gridVentas.page(paginaActual).draw('page');
    calcularTotalesVentas();
}

async function configurarDataTableVentas(data) {
    if (!gridVentas) {
        $('#grd_Ventas thead tr').clone(true).addClass('filters').appendTo('#grd_Ventas thead');
        gridVentas = $('#grd_Ventas').DataTable({
            data,
            language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
            scrollX: true,
            columns: [
                {
                    data: "Id", width: "1%", orderable: false, searchable: false,
                    render: id => `
            <div class="acciones-menu" data-id="${id}">
              <button class='btn btn-sm btnacciones' type='button' onclick='toggleAcciones(${id})' title='Acciones'>
                <i class='fa fa-ellipsis-v fa-lg text-white'></i>
              </button>
              <div class="acciones-dropdown" style="display:none;">
                <button class='btn btn-sm btneditar' type='button' onclick='editarVenta(${id})'><i class='fa fa-pencil-square-o fa-lg text-success'></i> Abrir</button>
                <button class='btn btn-sm btneliminar' type='button' onclick='eliminarVenta(${id})'><i class='fa fa-trash-o fa-lg text-danger'></i> Eliminar</button>
              </div>
            </div>`
                },
                { data: "Fecha", render: f => formatearFechaParaVista(f) },
                { data: "Cliente" },
                { data: "Vendedor" },
                { data: "Subtotal", render: n => formatNumber(n) },
                { data: "Descuentos", render: n => formatNumber(n) },
                { data: "TotalIva", render: n => formatNumber(n) },
                { data: "ImporteTotal", render: n => formatNumber(n) },
            ],
            dom: 'Bfrtip',
            buttons: [
                { extend: 'excelHtml5', text: 'Exportar Excel', filename: 'Reporte Ventas', title: '', exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] } },
                'pageLength'
            ],
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: async function () {
                const api = this.api();
                for (const c of columnConfigVentas) {
                    const cell = $('.filters th').eq(c.index);
                    if (c.filterType === "select") {
                        const sel = $(`<select id="filter${c.index}"><option value="">Seleccionar</option></select>`)
                            .appendTo(cell.empty())
                            .on('change', async function () {
                                const val = this.value;
                                if (val === "") { await api.column(c.index).search("").draw(); return; }
                                const txt = $(this).find("option:selected").text();
                                await api.column(c.index).search("^" + escapeRegex(txt) + "$", true, false).draw();
                            });
                        const items = await c.fetchDataFunc();
                        items.forEach(i => sel.append(`<option value="${i.Id}">${i.Nombre}</option>`));
                    } else {
                        const input = $(`<input type="text" placeholder="Buscar..." />`)
                            .appendTo(cell.empty())
                            .on('keyup change', function (e) {
                                e.stopPropagation();
                                const regexr = '({search})';
                                const cur = this.selectionStart;
                                api.column(c.index).search(this.value !== '' ? regexr.replace('{search}', '(((' + escapeRegex(this.value) + ')))') : '', this.value !== '', this.value === '').draw();
                                $(this).focus()[0].setSelectionRange(cur, cur);
                            });
                    }
                }
                $('.filters th').eq(0).html('');
                configurarOpcionesColumnas('#grd_Ventas', '#configColumnasMenu', 'Ventas_Columnas');
                setTimeout(() => gridVentas.columns.adjust(), 10);
            }
        });
    } else {
        gridVentas.clear().rows.add(data).draw();
    }
}
function calcularTotalesVentas() {
    if (!gridVentas) return;
    const rows = gridVentas.rows({ search: 'applied' }).data().toArray();
    const total = rows.reduce((a, r) => a + (parseFloat(r.ImporteTotal) || 0), 0);
    $("#txtTotalVentas").val(formatNumber(total));
}

async function initFiltrosVentas() {
    try {
        const [clientes, vendedores] = await Promise.all([
            fetch('/Clientes/Lista', { headers: { 'Authorization': 'Bearer ' + token } }).then(r => r.json()),
            fetch('/Personal/Lista', { headers: { 'Authorization': 'Bearer ' + token } }).then(r => r.json())
        ]);
        const $c = $('#fltCliente').empty().append('<option value="">Todos</option>');
        clientes.forEach(x => $c.append(`<option value="${x.Id}">${x.Nombre}</option>`));
        const $v = $('#fltVendedor').empty().append('<option value="">Todos</option>');
        vendedores.forEach(x => $v.append(`<option value="${x.Id}">${x.Nombre}</option>`));
    } catch { }

    window._fmVentas = new Filters.FilterManager({
        form: '#formFiltros',
        debounce: 300,
        buttons: { search: '#btnBuscar', clear: '#btnLimpiar', keepDefaultsOnClear: true },
        fields: {
            desde: { el: '#fltDesde', param: 'fechaDesde', default: Filters.FilterManager.firstOfMonthISO },
            hasta: { el: '#fltHasta', param: 'fechaHasta', default: Filters.FilterManager.todayISO },
            cliente: { el: '#fltCliente', param: 'idCliente', parse: v => v ? Number(v) : null },
            vendedor: { el: '#fltVendedor', param: 'idVendedor', parse: v => v ? Number(v) : null },
            estado: { el: '#fltEstado', param: 'estado', parse: v => v || null },
            texto: { el: '#fltTexto', param: 'texto', parse: v => (v || '').trim() || null }
        },
        onSearch: async (p) => { window._fmVentas.currentParams = p; await listarVentas(p); }
    });
    window._fmVentas.applyDefaults();
    window._fmVentas.bind();
    await window._fmVentas.search();

    FiltersUI.init({ storageKey: 'Ventas_FiltrosVisibles', panelSelector: '#formFiltros', buttonSelector: '#btnToggleFiltros', iconSelector: '#iconFiltros', defaultVisible: true });
}

/* helpers selects columna */
async function listaClientesFilter() { const r = await fetch('/Clientes/Lista', { headers: { 'Authorization': 'Bearer ' + token } }); const d = await r.json(); return d.map(x => ({ Id: x.Id, Nombre: x.Nombre })); }
async function listaVendedoresFilter() { const r = await fetch('/Personal/Lista', { headers: { 'Authorization': 'Bearer ' + token } }); const d = await r.json(); return d.map(x => ({ Id: x.Id, Nombre: x.Nombre })); }

/* dropdown acciones */
function toggleAcciones(id) {
    const $dd = $(`.acciones-menu[data-id="${id}"] .acciones-dropdown`);
    if ($dd.is(":visible")) $dd.hide(); else { $('.acciones-dropdown').hide(); $dd.show(); }
}
$(document).on('click', e => { if (!$(e.target).closest('.acciones-menu').length) $('.acciones-dropdown').hide(); });
