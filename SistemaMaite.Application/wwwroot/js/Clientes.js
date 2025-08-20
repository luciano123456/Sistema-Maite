let gridClientes;

const columnConfig = [
    { index: 1, filterType: 'text' },                         // Nombre
    { index: 2, filterType: 'text' },                         // Teléfono
    { index: 3, filterType: 'text' },                         // Teléfono Alternativo
    { index: 4, filterType: 'text' },                         // DNI
    { index: 5, filterType: 'text' },                         // CUIT
    { index: 6, filterType: 'select', fetchDataFunc: listaCondicionIvaFilter },
    { index: 7, filterType: 'text' },                         // Domicilio
    { index: 8, filterType: 'select', fetchDataFunc: listaProvinciasFilter },
    { index: 9, filterType: 'text' },                         // Localidad
    { index: 10, filterType: 'text' },                         // Email
    { index: 11, filterType: 'text' },                         // Código Postal
];

const Modelo_base = {
    Id: 0,
    Nombre: "",
    Telefono: "",
    TelefonoAlternativo: "",
    Dni: "",
    Cuit: "",
    IdCondicionIva: null,
    Domicilio: "",
    IdProvincia: null,
    Localidad: "",
    Email: "",
    CodigoPostal: "",
    IdListaPrecio: null
};

$(document).ready(() => {
    listaClientes();

    attachLiveValidation('#modalEdicion');
});

/* -------- Crear / Editar -------- */

function guardarCambios() {
    if (!validarCampos()) return;

    const idCliente = $("#txtId").val();
    const nuevoModelo = {
        Id: idCliente !== "" ? parseInt(idCliente) : 0,
        Nombre: $("#txtNombre").val(),
        Telefono: $("#txtTelefono").val(),
        TelefonoAlternativo: $("#txtTelefonoAlternativo").val(),
        Dni: $("#txtDni").val(),
        Cuit: $("#txtCuit").val(),
        IdCondicionIva: $("#cmbCondicionIva").val(),
        IdListaPrecio: $("#cmbListaPrecios").val(),
        Domicilio: $("#txtDomicilio").val(),
        IdProvincia: $("#cmbProvincia").val(),
        Localidad: $("#txtLocalidad").val(),
        Email: $("#txtEmail").val(),
        CodigoPostal: $("#txtCodigoPostal").val(),
       
    };

    const url = idCliente === "" ? "/Clientes/Insertar" : "/Clientes/Actualizar";
    const method = idCliente === "" ? "POST" : "PUT";

    fetch(url, {
        method,
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify(nuevoModelo)
    })
        .then(r => {
            if (!r.ok) throw new Error(r.statusText);
            return r.json();
        })
        .then(() => {
            $('#modalEdicion').modal('hide');
            exitoModal(idCliente === "" ? "Cliente registrado correctamente" : "Cliente modificado correctamente");
            listaClientes();
        })
        .catch(err => console.error('Error:', err));
}

function nuevoCliente() {
    limpiarModal('#modalEdicion', '#errorCampos');
    listaCondicionesIva();
    listaListaPrecios();
    listaProvincias();

    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Registrar");
    $("#modalEdicionLabel").text("Nuevo Cliente");
}

async function mostrarModal(modelo) {
    limpiarModal('#modalEdicion', '#errorCampos');

    // 1) Cargar todos los combos en paralelo
    await Promise.all([
        listaCondicionesIva(),
        listaListaPrecios(),
        listaProvincias()
    ]);

    // 2) Setear valores por ID en combos
    $("#cmbCondicionIva").val(modelo.IdCondicionIva ?? '').trigger('change');
    $("#cmbListaPrecios").val(modelo.IdListaPrecio ?? '').trigger('change');
    $("#cmbProvincia").val(modelo.IdProvincia ?? '').trigger('change');

    // 3) Setear el resto de campos de texto
    $("#txtId").val(modelo.Id ?? 0);
    $("#txtNombre").val(modelo.Nombre ?? '');
    $("#txtTelefono").val(modelo.Telefono ?? '');
    $("#txtTelefonoAlternativo").val(modelo.TelefonoAlternativo ?? '');
    $("#txtDni").val(modelo.Dni ?? '');
    $("#txtCuit").val(modelo.Cuit ?? '');
    $("#txtDomicilio").val(modelo.Domicilio ?? '');
    $("#txtLocalidad").val(modelo.Localidad ?? '');
    $("#txtEmail").val(modelo.Email ?? '');
    $("#txtCodigoPostal").val(modelo.CodigoPostal ?? '');

    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Guardar");
    $("#modalEdicionLabel").text("Editar Cliente");
}

/* -------- Listado / EditarInfo / Eliminar -------- */

async function listaClientes() {
    let paginaActual = gridClientes != null ? gridClientes.page() : 0;
    const url = "/Clientes/Lista";

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Error en la solicitud: ${ response.statusText }`);
    }

    const data = await response.json();
    await configurarDataTableClientes(data);

    if (paginaActual > 0) {
        gridClientes.page(paginaActual).draw('page');
    }
}


const editarCliente = id => {
    $('.acciones-dropdown').hide();

    fetch("/Clientes/EditarInfo?id=" + id, {
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

async function eliminarCliente(id) {
    $('.acciones-dropdown').hide();
    const confirmado = await confirmarModal("¿Desea eliminar este cliente?");
    if (!confirmado) return;

    try {
        const response = await fetch("/Clientes/Eliminar?id=" + id, {
            method: "DELETE",
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error("Error al eliminar el Cliente.");

        const dataJson = await response.json();
        if (dataJson.valor) {
            listaClientes();
            exitoModal("Cliente eliminado correctamente");
        }
    } catch (error) {
        console.error("Ha ocurrido un error:", error);
    }
}

/* -------- DataTable (idéntico a Usuarios, adaptado) -------- */

async function configurarDataTableClientes(data) {
    if (!gridClientes) {
        $('#grd_Clientes thead tr').clone(true).addClass('filters').appendTo('#grd_Clientes thead');

        gridClientes = $('#grd_Clientes').DataTable({
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
                        <button class='btn btn-sm btneditar' type='button' onclick='editarCliente(${data})' title='Editar'>
                            <i class='fa fa-pencil-square-o fa-lg text-success' aria-hidden='true'></i> Editar
                        </button>
                        <button class='btn btn-sm btneliminar' type='button' onclick='eliminarCliente(${data})' title='Eliminar'>
                            <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i> Eliminar
                        </button>
                    </div>
                </div>`;
                    },
                    orderable: false,
                    searchable: false,
                },
                { data: 'Nombre' },              // 1
                { data: 'Telefono' },            // 2
                { data: 'TelefonoAlternativo' }, // 3
                { data: 'Dni' },                 // 4
                { data: 'Cuit' },                // 5
                { data: 'CondicionIva' },        // 6 (string del back)
                { data: 'Domicilio' },           // 7
                { data: 'Provincia' },           // 8 (string del back)
                { data: 'Localidad' },           // 9
                { data: 'Email' },               // 10
                { data: 'CodigoPostal' }         // 11
            ],
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar Excel',
                    filename: 'Reporte Personal',
                    title: '',
                    exportOptions: { columns: [...Array(22).keys()].map(i => i + 1) },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: 'Reporte Personal',
                    title: '',
                    exportOptions: { columns: [...Array(22).keys()].map(i => i + 1) },
                    className: 'btn-exportar-pdf',
                },
                {
                    extend: 'print',
                    text: 'Imprimir',
                    title: '',
                    exportOptions: { columns: [...Array(22).keys()].map(i => i + 1) },
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
                configurarOpcionesColumnas('#grd_Clientes', '#configColumnasMenu', 'Clientes_Columnas');

                setTimeout(() => gridClientes.columns.adjust(), 10);
            },
        });
    } else {
        gridClientes.clear().rows.add(data).draw();
    }
}

/* -------- Cargas para selects (con token) -------- */
async function listaCondicionesIva() {
    const res = await fetch("/CondicionesIva/Lista", {
        headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
        }
    });
    const data = await res.json();
    llenarSelect("cmbCondicionIva", data);
}

async function listaProvincias() {
    const res = await fetch("/Provincias/Lista", {
        headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
        }
    });
    const data = await res.json();
    llenarSelect("cmbProvincia", data);
}

async function listaListaPrecios() {
    const res = await fetch("/ListasPrecios/Lista", {
        headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
        }
    });
    const data = await res.json();
    llenarSelect("cmbListaPrecios", data);
}

/* -------- Filtros (selects del header) -------- */
async function listaCondicionIvaFilter() {
    const response = await fetch("/CondicionesIva/Lista", {
        method: "GET",
        headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
        }
    });
    if (!response.ok) throw new Error("Error cargando Condición IVA");
    const data = await response.json();
    return data.map(item => ({ Id: item.Id, Nombre: item.Nombre ?? item.Descripcion ?? "" }));
}

async function listaProvinciasFilter() {
    const response = await fetch("/Provincias/Lista", {
        method: "GET",
        headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
        }
    });
    if (!response.ok) throw new Error("Error cargando Provincias");
    const data = await response.json();
    return data.map(item => ({ Id: item.Id, Nombre: item.Nombre }));
}
