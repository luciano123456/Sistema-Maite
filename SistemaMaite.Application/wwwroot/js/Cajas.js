let gridCaja;

// columnas: 1 Fecha | 2 Tipo | 3 Concepto | 4 Ingreso | 5 Egreso | 6 Sucursal | 7 Cuenta | 8 Id Mov
const columnConfig = [
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'select', fetchDataFunc: listaTiposFilter },
    { index: 3, filterType: 'text' },
    { index: 4, filterType: 'text' },
    { index: 5, filterType: 'text' },
    { index: 6, filterType: 'select', fetchDataFunc: listaSucursalesFilter },
    { index: 7, filterType: 'select', fetchDataFunc: listaCuentasFilter },
];

$(document).ready(() => {
    listaCaja();
    attachLiveValidation('#modalEdicion');

    // bloquear importe contrario según tipo
    $('#cmbTipoMov').on('change', function () {
        const tipo = this.value;
        if (tipo === 'Ingreso') {
            $('#numEgreso').val('');
        } else if (tipo === 'Egreso') {
            $('#numIngreso').val('');
        }
    });

    ['#numIngreso', '#numEgreso', '#cmbTipoMov'].forEach(sel => {
        $(sel).on('input change', () => validarReglaMontos());
    });

});

/* ========== Validación ========== */
function validarCamposCaja() {
    const suc = $('#cmbSucursal').val();
    const cta = $('#cmbCuenta').val();
    const fecha = $('#dtpFecha').val();
    const tipo = $('#cmbTipoMov').val();
    const concepto = $('#txtConcepto').val().trim();

    const ingreso = parseFloat($('#numIngreso').val());
    const egreso = parseFloat($('#numEgreso').val());
    const hayImporte = (!isNaN(ingreso) && ingreso > 0) || (!isNaN(egreso) && egreso > 0);

    const ok = suc && cta && fecha && tipo && concepto && hayImporte;

    $('#errorCampos').toggleClass('d-none', !!ok);
    return ok;
}

/* ========== Crear / Editar ========== */

function guardarCambios() {
    if (!validarCamposCaja()) return;

    const id = $('#txtId').val();

    const modelo = {
        Id: id ? parseInt(id) : 0,
        IdSucursal: Number($('#cmbSucursal').val()),
        IdCuenta: Number($('#cmbCuenta').val()),
        Fecha: $('#dtpFecha').val(),
        TipoMov: $('#cmbTipoMov').val(),
        Concepto: $('#txtConcepto').val().trim(),
        Ingreso: formatearSinMiles($('#numIngreso').val()) || 0,
        Egreso: formatearSinMiles($('#numEgreso').val()) || 0
    };

    const url = id === '' ? '/Cajas/Insertar' : '/Cajas/Actualizar';
    const method = id === '' ? 'POST' : 'PUT';

    fetch(url, {
        method,
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify(modelo)
    })
        .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
        .then(() => {
            $('#modalEdicion').modal('hide');
            exitoModal(id === '' ? 'Movimiento registrado correctamente' : 'Movimiento modificado correctamente');
            listaCaja();
        })
        .catch(err => {
            console.error('Error:', err);
            errorModal('No se pudo guardar.');
        });
}

function nuevoCaja() {
    limpiarModal('#modalEdicion', '#errorCampos');

    Promise.all([listaSucursales(), listaCuentas()]).then(() => {
        // valores por defecto
        const hoy = new Date();
        $('#dtpFecha').val(hoy.toISOString().slice(0, 10));
        $('#cmbTipoMov').val('');
        $('#numIngreso').val('');
        $('#numEgreso').val('');
        $('#txtConcepto').val('');

        $('#modalEdicion').modal('show');
        $('#btnGuardar').text('Registrar');
        $('#modalEdicionLabel').text('Nuevo Movimiento');
    });
}

async function mostrarModalCaja(modelo) {
    limpiarModal('#modalEdicion', '#errorCampos');

    await Promise.all([listaSucursales(), listaCuentas()]);

    $('#txtId').val(modelo.Id ?? 0);
    $('#cmbSucursal').val(modelo.IdSucursal ?? '').trigger('change');
    $('#cmbCuenta').val(modelo.IdCuenta ?? '').trigger('change');
    $('#dtpFecha').val((modelo.Fecha || '').toString().substring(0, 10));
    $('#cmbTipoMov').val(modelo.TipoMov ?? '');
    $('#txtConcepto').val(modelo.Concepto ?? '');
    $('#numIngreso').val(formatearMiles(modelo.Ingreso) ?? '');
    $('#numEgreso').val(formatearMiles(modelo.Egreso) ?? '');

    $('#modalEdicion').modal('show');
    $('#btnGuardar').text('Guardar');
    $('#modalEdicionLabel').text('Editar Movimiento');
}

/* ========== Listado / EditarInfo / Eliminar ========== */

async function listaCaja() {
    let paginaActual = gridCaja != null ? gridCaja.page() : 0;

    const response = await fetch('/Cajas/Lista', {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        errorModal('Error obteniendo movimientos.');
        return;
    }

    const data = await response.json();
    await configurarDataTableCaja(data);

    if (paginaActual > 0) gridCaja.page(paginaActual).draw('page');

    calcularIngresos();
}

const editarCaja = id => {
    $('.acciones-dropdown').hide();

    fetch('/Cajas/EditarInfo?id=' + id, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    })
        .then(r => { if (!r.ok) throw new Error('Ha ocurrido un error.'); return r.json(); })
        .then(dataJson => dataJson ? mostrarModalCaja(dataJson) : (() => { throw new Error('Ha ocurrido un error.'); })())
        .catch(() => errorModal('Ha ocurrido un error.'));
};

async function eliminarCaja(id) {
    $('.acciones-dropdown').hide();
    const confirmado = await confirmarModal('¿Desea eliminar este movimiento?');
    if (!confirmado) return;

    try {
        const response = await fetch('/Cajas/Eliminar?id=' + id, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Error al eliminar el movimiento.');

        const dataJson = await response.json();
        if (dataJson.valor) {
            listaCaja();
            exitoModal('Movimiento eliminado correctamente');
        }
    } catch (error) {
        console.error('Ha ocurrido un error:', error);
        errorModal('No se pudo eliminar.');
    }
}

/* ========== DataTable ========== */

async function configurarDataTableCaja(data) {
    if (!gridCaja) {
        $('#grd_Caja thead tr').clone(true).addClass('filters').appendTo('#grd_Caja thead');

        gridCaja = $('#grd_Caja').DataTable({
            data,
            language: {
                sLengthMenu: 'Mostrar MENU registros',
                lengthMenu: 'Anzeigen von _MENU_ Einträgen',
                url: '//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json'
            },
            scrollX: '100px',
            scrollCollapse: true,
            columns: [
                { // 0: Acciones
                    data: 'Id',
                    title: '',
                    width: '1%',
                    render: function (data) {
                        return `
              <div class="acciones-menu" data-id="${data}">
                <button class='btn btn-sm btnacciones' type='button' onclick='toggleAcciones(${data})' title='Acciones'>
                  <i class='fa fa-ellipsis-v fa-lg text-white' aria-hidden='true'></i>
                </button>
                <div class="acciones-dropdown" style="display: none;">
                  <button class='btn btn-sm btneditar' type='button' onclick='editarCaja(${data})' title='Editar'>
                    <i class='fa fa-pencil-square-o fa-lg text-success' aria-hidden='true'></i> Editar
                  </button>
                  <button class='btn btn-sm btneliminar' type='button' onclick='eliminarCaja(${data})' title='Eliminar'>
                    <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i> Eliminar
                  </button>
                </div>
              </div>`;
                    },
                    orderable: false,
                    searchable: false,
                },
                {
                    data: 'Fecha',
                    title: 'Fecha',
                    render: function (data, type, row) {
                        // Mostrar y filtrar con DD/MM/YYYY
                        if (type === 'display' || type === 'filter') {
                            const s = formatearFechaParaVista(data);
                            return s || '-';
                        }
                        // Para ordenar/exportar, mantener el valor crudo
                        return data;
                    }
                },
                { data: 'TipoMov', title: 'Tipo' },                                                    // 2
                { data: 'Concepto', title: 'Concepto' },                                               // 3
                {
                    data: 'Ingreso',
                    render: function (data, type, row) {
                        if (parseFloat(data) > 0) {
                            return `<span style="color: green; font-weight: bold;">${formatNumber(data)}</span>`;
                        } else {
                            return '';
                        }
                        return data;
                    }
                },
                {
                    data: 'Egreso',
                    render: function (data, type, row) {
                        if (parseFloat(data) > 0) {
                            return `<span style="color: red; font-weight: bold;">${formatNumber(data)}</span>`;
                        } else {
                            return '';
                        }
                        return data;
                    }
                },

                { data: 'Sucursal', title: 'Sucursal' },                                               // 6 (texto del back)
                { data: 'Cuenta', title: 'Cuenta' },                                                   // 7 (texto del back)
            ],
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar Excel',
                    filename: 'Caja',
                    title: '',
                    exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8] },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: 'Caja',
                    title: '',
                    exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8] },
                    className: 'btn-exportar-pdf',
                },
                {
                    extend: 'print',
                    text: 'Imprimir',
                    title: '',
                    exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8] },
                    className: 'btn-exportar-print'
                },
                'pageLength'
            ],
            orderCellsTop: true,
            fixedHeader: true,



            initComplete: async function () {

                calcularIngresos();

                const api = this.api();

                for (const config of columnConfig) {
                    const cell = $('.filters th').eq(config.index);

                    if (config.filterType === 'select') {
                        const select = $('<select id="filter' + config.index + '"><option value="">Seleccionar</option></select>')
                            .appendTo(cell.empty())
                            .on('change', async function () {
                                const selectedText = $(this).find('option:selected').text();
                                await api.column(config.index).search(selectedText ? '^' + escapeRegex(selectedText) + '$' : '', true, false).draw();
                            });

                        const items = await config.fetchDataFunc();
                        items.forEach(item => {
                            select.append('<option value="' + item.Id + '">' + (item.Nombre ?? '') + '</option>');
                        });

                    } else if (config.filterType === 'text') {
                        const input = $('<input type="text" placeholder="Buscar..." />')
                            .appendTo(cell.empty())
                            .off('keyup change')
                            .on('keyup change', function (e) {
                                e.stopPropagation();
                                const regexr = '({search})';
                                const cursorPosition = this.selectionStart;
                                api.column(config.index)
                                    .search(this.value !== '' ? regexr.replace('{search}', '(((' + escapeRegex(this.value) + ')))') : '', this.value !== '', this.value === '')
                                    .draw();
                                $(this).focus()[0].setSelectionRange(cursorPosition, cursorPosition);
                            });
                    }
                }

                // acciones (índice 0) sin filtro
                $('.filters th').eq(0).html('');

                configurarOpcionesColumnas('#grd_Caja', '#configColumnasMenu', 'Caja_Columnas');

                setTimeout(() => gridCaja.columns.adjust(), 10);
            },
        });
    } else {
        gridCaja.clear().rows.add(data).draw();
    }
}

/* ========== Cargas para selects (con token) ========== */

async function listaSucursales() {
    const res = await fetch('/Sucursales/Lista', {
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    llenarSelect('cmbSucursal', data);
}

async function listaCuentas() {
    const res = await fetch('/Cuentas/Lista', {
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    llenarSelect('cmbCuenta', data);
}

/* ========== Filtros (header) ========== */

async function listaSucursalesFilter() {
    const response = await fetch('/Sucursales/Lista', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Error cargando Sucursales');
    const data = await response.json();
    return data.map(item => ({ Id: item.Id, Nombre: item.Nombre }));
}

async function listaCuentasFilter() {
    const response = await fetch('/Cuentas/Lista', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Error cargando Cuentas');
    const data = await response.json();
    return data.map(item => ({ Id: item.Id, Nombre: item.Nombre }));
}

async function listaTiposFilter() {
    // opciones fijas para el filtro de "Tipo"
    return [{ Id: 1, Nombre: 'Ingreso' }, { Id: 2, Nombre: 'Egreso' }];
}

/* ========== Helpers ========== */

function escapeRegex(text) {
    return (text + '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


function validarReglaMontos() {
    const ingresoEl = document.getElementById('numIngreso');
    const egresoEl = document.getElementById('numEgreso');

    const ingreso = parseFloat(ingresoEl.value);
    const egreso = parseFloat(egresoEl.value);
    const hayImporte = (!isNaN(ingreso) && ingreso > 0) || (!isNaN(egreso) && egreso > 0);

    // si no hay ninguno, marcamos ambos como inválidos (mensaje ya está en el div)
    [ingresoEl, egresoEl].forEach(el => {
        if (!hayImporte) {
            el.classList.add('is-invalid');
        } else {
            el.classList.remove('is-invalid');
            el.classList.remove('is-valid'); // no los “pintamos” de válido porque no son required
        }
    });

    return hayImporte;
}

function validarCamposCaja() {
    // Valida todos los required del modal y muestra per-campo “Campo obligatorio”
    const okBasicos = verificarErroresGenerales('#modalEdicion', '#errorCampos');

    // Valida la regla: al menos un importe (Ingreso o Egreso)
    const okMontos = validarReglaMontos();

    // Mostrar/ocultar cartel general
    const ok = okBasicos && okMontos;
    const err = document.querySelector('#errorCampos');
    if (err) err.classList.toggle('d-none', ok);

    return ok;
}


async function calcularIngresos() {
    let data = gridCaja.rows().data(); // 👈 TODOS los datos, no solo la página actual


    let totalIngreso = 0;
    let totalEgreso = 0;

    for (let i = 0; i < data.length; i++) {
        totalIngreso += parseFloat(data[i].Ingreso) || 0;
        totalEgreso += parseFloat(data[i].Egreso) || 0;
    }

    const totalSaldo = totalIngreso - totalEgreso;

    document.getElementById("txtTotalIngreso").value = formatNumber(totalIngreso);
    document.getElementById("txtTotalEgreso").value = formatNumber(totalEgreso);
    document.getElementById("txtTotalSaldo").value = formatNumber(totalSaldo);

    const inputSaldo = document.getElementById("txtTotalSaldo");

    inputSaldo.style.fontWeight = "bold"; // 👈 negrita

    if (totalSaldo >= 0) {
        inputSaldo.classList.remove("text-danger");
        inputSaldo.classList.add("text-success");
    } else {
        inputSaldo.classList.remove("text-success");
        inputSaldo.classList.add("text-danger");
    }

}
