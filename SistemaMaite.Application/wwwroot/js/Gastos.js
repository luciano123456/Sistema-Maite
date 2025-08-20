let gridGastos;

const columnConfig = [
    { index: 1, filterType: 'text' },                          // Fecha (texto o yyyy-mm-dd)
    { index: 2, filterType: 'text' },                          // Concepto
    { index: 3, filterType: 'text' },                          // Importe
    { index: 4, filterType: 'select', fetchDataFunc: listaSucursalesFilter },
    { index: 5, filterType: 'select', fetchDataFunc: listaGastosCategoriasFilter },
    { index: 6, filterType: 'select', fetchDataFunc: listaCuentasFilter },
];

const Modelo_base = {
    Id: 0,
    IdSucursal: null,
    IdCategoria: null,
    Fecha: null,
    Concepto: "",
    IdCuenta: null,
    Importe: 0
};

$(document).ready(() => {
    listaGastos();
    attachLiveValidation('#modalEdicion'); // reutiliza tu helper
});

/* -------- Crear / Editar -------- */

function guardarCambios() {
    if (!validarCampos()) return;

    const id = $("#txtId").val();
    const modelo = {
        Id: id !== "" ? parseInt(id) : 0,
        Fecha: $("#dtpFecha").val(),
        Concepto: $("#txtConcepto").val(),
        Importe: formatearSinMiles($("#txtImporte").val() || 0),
        IdSucursal: $("#cmbSucursal").val() ? parseInt($("#cmbSucursal").val()) : null,
        IdCategoria: $("#cmbCategoria").val() ? parseInt($("#cmbCategoria").val()) : null,
        IdCuenta: $("#cmbCuenta").val() ? parseInt($("#cmbCuenta").val()) : null,
    };

    const url = id === "" ? "/Gastos/Insertar" : "/Gastos/Actualizar";
    const method = id === "" ? "POST" : "PUT";

    fetch(url, {
        method,
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify(modelo)
    })
        .then(r => {
            if (!r.ok) throw new Error(r.statusText);
            return r.json();
        })
        .then(resp => {
            $('#modalEdicion').modal('hide');
            exitoModal(id === "" ? "Gasto registrado correctamente" : "Gasto modificado correctamente");
            listaGastos();
        })
        .catch(err => console.error('Error:', err));
}

function nuevoGasto() {
    limpiarModal('#modalEdicion', '#errorCampos');

    const hoy = new Date();
    $("#dtpFecha").val(hoy.toISOString().slice(0, 10));

    Promise.all([
       
        listaSucursales(),
        listaGastosCategorias(),
        listaCuentas(),
    ]).then(() => {
        $('#modalEdicion').modal('show');
        $("#btnGuardar").text("Registrar");
        $("#modalEdicionLabel").text("Nuevo Gasto");
    });
}

async function mostrarModal(modelo) {
    limpiarModal('#modalEdicion', '#errorCampos');

    await Promise.all([
        listaSucursales(),
        listaGastosCategorias(),
        listaCuentas(),
    ]);

    $("#cmbSucursal").val(modelo.IdSucursal ?? '').trigger('change');
    $("#cmbCategoria").val(modelo.IdCategoria ?? '').trigger('change');
    $("#cmbCuenta").val(modelo.IdCuenta ?? '').trigger('change');

    $("#txtId").val(modelo.Id ?? 0);
    // fecha a yyyy-MM-dd por si viene en ISO
    const fecha = modelo.Fecha ? new Date(modelo.Fecha) : null;
    $("#dtpFecha").val(fecha ? fecha.toISOString().substring(0, 10) : '');
    $("#txtConcepto").val(modelo.Concepto ?? '');
    $("#txtImporte").val(formatearMiles(modelo.Importe) ?? 0);

    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Guardar");
    $("#modalEdicionLabel").text("Editar Gasto");
}

/* -------- Listado / EditarInfo / Eliminar -------- */

async function listaGastos() {
    let paginaActual = gridGastos != null ? gridGastos.page() : 0;

    const response = await fetch("/Gastos/Lista", {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Error en la solicitud: ${response.statusText}`);
    }

    const data = await response.json();
    await configurarDataTableGastos(data);

    if (paginaActual > 0) {
        gridGastos.page(paginaActual).draw('page');
    }
}

const editarGasto = id => {
    $('.acciones-dropdown').hide();

    fetch("/Gastos/EditarInfo?id=" + id, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    })
        .then(r => {
            if (!r.ok) throw new Error("Ha ocurrido un error.");
            return r.json();
        })
        .then(dataJson => dataJson ? mostrarModal(dataJson) : (() => { throw new Error("Ha ocurrido un error."); })())
        .catch(() => errorModal("Ha ocurrido un error."));
};

async function eliminarGasto(id) {
    $('.acciones-dropdown').hide();
    const confirmado = await confirmarModal("¿Desea eliminar este gasto?");
    if (!confirmado) return;

    try {
        const response = await fetch("/Gastos/Eliminar?id=" + id, {
            method: "DELETE",
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error("Error al eliminar el Gasto.");

        const dataJson = await response.json();
        if (dataJson.valor) {
            listaGastos();
            exitoModal("Gasto eliminado correctamente");
        }
    } catch (error) {
        console.error("Ha ocurrido un error:", error);
    }
}

/* -------- DataTable -------- */

async function configurarDataTableGastos(data) {
    if (!gridGastos) {
        $('#grd_Gastos thead tr').clone(true).addClass('filters').appendTo('#grd_Gastos thead');

        gridGastos = $('#grd_Gastos').DataTable({
            data,
            language: {
                sLengthMenu: "Mostrar MENU registros",
                lengthMenu: "Anzeigen von _MENU_ Einträgen",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            scrollX: "100px",
            scrollCollapse: true,
            columns: [
                {   // 0: Acciones
                    data: "Id",
                    title: '',
                    width: "1%",
                    render: function (data) {
                        return `
                <div class="acciones-menu" data-id="${data}">
                    <button class='btn btn-sm btnacciones' type='button' onclick='toggleAcciones(${data})' title='Acciones'>
                        <i class='fa fa-ellipsis-v fa-lg text-white' aria-hidden='true'></i>
                    </button>
                    <div class="acciones-dropdown" style="display: none;">
                        <button class='btn btn-sm btneditar' type='button' onclick='editarGasto(${data})' title='Editar'>
                            <i class='fa fa-pencil-square-o fa-lg text-success' aria-hidden='true'></i> Editar
                        </button>
                        <button class='btn btn-sm btneliminar' type='button' onclick='eliminarGasto(${data})' title='Eliminar'>
                            <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i> Eliminar
                        </button>
                    </div>
                </div>`;
                    },
                    orderable: false,
                    searchable: false,
                },
                { data: "Fecha", render: (f) => formatearFechaParaVista(f) },
                { data: 'Concepto' },     // 2
                { data: "Importe", render: (f) => formatNumber(f) },
                { data: 'Sucursal' },     // 4 (string del back)
                { data: 'Categoria' },    // 5 (string del back)
                { data: 'Cuenta' },       // 6 (string del back)
            ],
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar Excel',
                    filename: 'Reporte Gastos',
                    title: '',
                    exportOptions: { columns: [...Array(7).keys()].map(i => i + 1) },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: 'Reporte Gastos',
                    title: '',
                    exportOptions: { columns: [...Array(7).keys()].map(i => i + 1) },
                    className: 'btn-exportar-pdf',
                },
                {
                    extend: 'print',
                    text: 'Imprimir',
                    title: '',
                    exportOptions: { columns: [...Array(7).keys()].map(i => i + 1) },
                    className: 'btn-exportar-print'
                },
                'pageLength'
            ],
            orderCellsTop: true,
            fixedHeader: true,

            initComplete: async function () {
                const api = this.api();

                // Filtros por columna
                for (const config of columnConfig) {
                    const cell = $('.filters th').eq(config.index);

                    if (config.filterType === "select") {
                        const select = $(`<select id="filter${config.index}"><option value="">Seleccionar</option></select>`)
                            .appendTo(cell.empty())
                            .on("change", async function () {
                                const val = this.value;
                                if (val === "") {
                                    await api.column(config.index).search("").draw();
                                    return;
                                }
                                const selectedText = $(this).find("option:selected").text();
                                await api
                                    .column(config.index)
                                    .search("^" + escapeRegex(selectedText) + "$", true, false)
                                    .draw();
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

                // La celda de acciones (índice 0) no lleva filtro
                $('.filters th').eq(0).html('');

                // Configuración de columnas (dropdown)
                configurarOpcionesColumnas('#grd_Gastos', '#configColumnasMenu', 'Gastos_Columnas');

                setTimeout(() => gridGastos.columns.adjust(), 10);
            },
        });
    } else {
        gridGastos.clear().rows.add(data).draw();
    }
}

/* -------- Cargas para selects (con token) -------- */
// Estas rutas asumidas: ajustá a tus controladores reales si usan otros nombres

async function listaSucursales() {
    const res = await fetch("/Sucursales/Lista", {
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }
    });
    const data = await res.json();
    llenarSelect("cmbSucursal", data);
}

async function listaGastosCategorias() {
    const res = await fetch("/GastosCategorias/Lista", {
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }
    });
    const data = await res.json();
    llenarSelect("cmbCategoria", data);
}

async function listaCuentas() {
    const res = await fetch("/Cuentas/Lista", {
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }
    });
    const data = await res.json();
    llenarSelect("cmbCuenta", data);
}


/* -------- Filtros (selects del header) -------- */

async function listaSucursalesFilter() {
    const response = await fetch("/Sucursales/Lista", {
        method: "GET",
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }
    });
    if (!response.ok) throw new Error("Error cargando Sucursales");
    const data = await response.json();
    return data.map(item => ({ Id: item.Id, Nombre: item.Nombre }));
}

async function listaGastosCategoriasFilter() {
    const response = await fetch("/GastosCategorias/Lista", {
        method: "GET",
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }
    });
    if (!response.ok) throw new Error("Error cargando Categorías");
    const data = await response.json();
    return data.map(item => ({ Id: item.Id, Nombre: item.Nombre ?? item.Descripcion ?? "" }));
}

async function listaCuentasFilter() {
    const response = await fetch("/Cuentas/Lista", {
        method: "GET",
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }
    });
    if (!response.ok) throw new Error("Error cargando Cuentas");
    const data = await response.json();
    return data.map(item => ({ Id: item.Id, Nombre: item.Nombre ?? item.Descripcion ?? "" }));
}


/* -------- Helpers específicos -------- */

function validarCampos() {
    let ok = true;
    const req = ['#dtpFecha', '#txtConcepto', '#txtImporte', '#cmbSucursal', '#cmbCategoria', '#cmbCuenta'];
    req.forEach(sel => {
        const el = document.querySelector(sel);
        if (!el) return;
        const val = el.value;
        const invalido = (val === null || val === '');
        el.classList.toggle('is-invalid', invalido);
        if (invalido) ok = false;
    });

    const importe = parseFloat($("#txtImporte").val() || 0);
    if (isNaN(importe) || importe <= 0) {
        $("#txtImporte").addClass('is-invalid');
        ok = false;
    }

    document.querySelector('#errorCampos').classList.toggle('d-none', ok);
    return ok;
}
