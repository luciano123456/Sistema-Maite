// Personal.js
let gridPersonal;

const columnConfig = [
    { index: 1, filterType: 'text' },                             // Nombre
    { index: 2, filterType: 'text' },                             // Teléfono
    { index: 3, filterType: 'text' },                             // Teléfono Alternativo
    { index: 4, filterType: 'text' },                             // DNI
    { index: 5, filterType: 'text' },                             // CUIT
    { index: 6, filterType: 'select', fetchDataFunc: listaCondicionIvaFilter }, // Condición IVA
    { index: 7, filterType: 'text' },                             // Domicilio
    { index: 8, filterType: 'select', fetchDataFunc: listaProvinciasFilter },   // Provincia
    { index: 9, filterType: 'text' },                             // Localidad
    { index: 10, filterType: 'text' },                             // Email
    { index: 11, filterType: 'select', fetchDataFunc: listaBancosFilter },       // Banco
    { index: 12, filterType: 'text' },                             // Alias
    { index: 13, filterType: 'text' },                             // CBU
    { index: 14, filterType: 'select', fetchDataFunc: listaPuestosFilter },      // Puesto
    { index: 15, filterType: 'text' },                             // Fecha Ingreso
    { index: 16, filterType: 'text' },                             // Fecha Retiro
    { index: 17, filterType: 'text' },                             // Sueldo Mensual
    { index: 18, filterType: 'text' },                             // Días Laborales
    { index: 19, filterType: 'text' },                             // Valor Día
    { index: 20, filterType: 'text' },                             // Hs Laborales
    { index: 21, filterType: 'text' },                             // Valor Hora
    { index: 22, filterType: 'select', fetchDataFunc: listaSucursalesFilter }    // Sucursal
];

$(document).ready(() => {
    listaPersonal();
    attachLiveValidation('#modalEdicion'); // usa atributos required
});

/* -------- Crear / Editar -------- */

function guardarCambiosPersonal() {
    if (!validarCampos()) return;

    const id = $("#txtId").val();
    const modelo = {
        Id: id !== "" ? parseInt(id) : 0,
        Nombre: $("#txtNombre").val(),
        Telefono: $("#txtTelefono").val(),
        TelefonoAlternativo: $("#txtTelefonoAlternativo").val(),
        Dni: $("#txtDni").val(),
        Cuit: $("#txtCuit").val(),
        IdCondicionIva: valorNulo($("#cmbCondicionIva").val()),
        Domicilio: $("#txtDomicilio").val(),
        IdProvincia: valorNulo($("#cmbProvincia").val()),
        Localidad: $("#txtLocalidad").val(),
        Email: $("#txtEmail").val(),
        IdBanco: valorNulo($("#cmbBanco").val()),
        BancoAlias: $("#txtBancoAlias").val(),
        BancoCbu: $("#txtBancoCbu").val(),
        IdPuesto: valorNulo($("#cmbPuesto").val()),
        FechaIngreso: $("#dtpFechaIngreso").val() || null,
        FechaRetiro: $("#dtpFechaRetiro").val() || null,
        SueldoMensual: formatearSinMiles($("#numSueldoMensual").val()),
        DiasLaborales: numeroNulo($("#numDiasLaborales").val()),
        ValorDia: formatearSinMiles($("#numValorDia").val()),
        HsLaborales: numeroNulo($("#numHsLaborales").val()),
        ValorHora: formatearSinMiles($("#numValorHora").val()),
        IdSucursal: valorNulo($("#cmbSucursal").val())
    };

    const url = id === "" ? "/Personal/Insertar" : "/Personal/Actualizar";
    const method = id === "" ? "POST" : "PUT";

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
            exitoModal(id === "" ? "Personal registrado correctamente" : "Personal modificado correctamente");
            listaPersonal();
        })
        .catch(err => console.error('Error:', err));
}

function nuevoPersonal() {
    limpiarModal('#modalEdicion', '#errorCampos');
    document.getElementById("dtpFechaIngreso").value = moment().format('YYYY-MM-DD');
    Promise.all([
        listaCondicionesIva(),
        listaProvincias(),
        listaBancos(),
        listaPuestos(),
        listaSucursales()
    ]).then(() => {
        $('#modalEdicion').modal('show');
        $("#btnGuardarPersonal").text("Registrar");
        $("#modalEdicionLabel").text("Nuevo Personal");
    });
}


async function mostrarModalPersonal(modelo) {
    limpiarModal('#modalEdicion', '#errorCampos');

    await Promise.all([
        listaCondicionesIva(),
        listaProvincias(),
        listaBancos(),
        listaPuestos(),
        listaSucursales()
    ]);

    $("#cmbCondicionIva").val(modelo.IdCondicionIva ?? '').trigger('change');
    $("#cmbProvincia").val(modelo.IdProvincia ?? '').trigger('change');
    $("#cmbBanco").val(modelo.IdBanco ?? '').trigger('change');
    $("#cmbPuesto").val(modelo.IdPuesto ?? '').trigger('change');
    $("#cmbSucursal").val(modelo.IdSucursal ?? '').trigger('change');

    setValorInput("#txtId", modelo.Id ?? 0);
    setValorInput("#txtNombre", modelo.Nombre);
    setValorInput("#txtTelefono", modelo.Telefono);
    setValorInput("#txtTelefonoAlternativo", modelo.TelefonoAlternativo);
    setValorInput("#txtDni", modelo.Dni);
    setValorInput("#txtCuit", modelo.Cuit);
    setValorInput("#txtDomicilio", modelo.Domicilio);
    setValorInput("#txtLocalidad", modelo.Localidad);
    setValorInput("#txtEmail", modelo.Email);
    setValorInput("#txtBancoAlias", modelo.BancoAlias);
    setValorInput("#txtBancoCbu", modelo.BancoCbu);

    $("#dtpFechaIngreso").val(modelo.FechaIngreso ? String(modelo.FechaIngreso).substring(0, 10) : '');
    $("#dtpFechaRetiro").val(modelo.FechaRetiro ? String(modelo.FechaRetiro).substring(0, 10) : '');

    // ⬇️ Estos inputs poneles class="inputMiles" en el HTML si querés que se formateen
    setValorInput("#numSueldoMensual", modelo.SueldoMensual);
    setValorInput("#numDiasLaborales", modelo.DiasLaborales);
    setValorInput("#numValorDia", modelo.ValorDia);
    setValorInput("#numHsLaborales", modelo.HsLaborales);
    setValorInput("#numValorHora", modelo.ValorHora);

    $('#modalEdicion').modal('show');
    $("#btnGuardarPersonal").text("Guardar");
    $("#modalEdicionLabel").text("Editar Personal");
}
/* -------- Listado / EditarInfo / Eliminar -------- */

async function listaPersonal() {
    let paginaActual = gridPersonal != null ? gridPersonal.page() : 0;

    const response = await fetch("/Personal/Lista", {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) throw new Error(`Error en la solicitud: ${response.statusText}`);

    const data = await response.json();
    await configurarDataTablePersonal(data);

    if (paginaActual > 0) gridPersonal.page(paginaActual).draw('page');
}

const editarPersonal = id => {
    $('.acciones-dropdown').hide();

    fetch("/Personal/EditarInfo?id=" + id, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    })
        .then(r => { if (!r.ok) throw new Error("Ha ocurrido un error."); return r.json(); })
        .then(dataJson => dataJson ? mostrarModalPersonal(dataJson) : (() => { throw new Error("Ha ocurrido un error."); })())
        .catch(() => errorModal("Ha ocurrido un error."));
};

async function eliminarPersonal(id) {
    $('.acciones-dropdown').hide();
    const confirmado = await confirmarModal("¿Desea eliminar este registro?");
    if (!confirmado) return;

    try {
        const response = await fetch("/Personal/Eliminar?id=" + id, {
            method: "DELETE",
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error("Error al eliminar el Personal.");

        const dataJson = await response.json();
        if (dataJson.valor) {
            listaPersonal();
            exitoModal("Personal eliminado correctamente");
        }
    } catch (error) {
        console.error("Ha ocurrido un error:", error);
    }
}

/* -------- DataTable -------- */

async function configurarDataTablePersonal(data) {
    if (!gridPersonal) {
        $('#grd_Personal thead tr').clone(true).addClass('filters').appendTo('#grd_Personal thead');

        gridPersonal = $('#grd_Personal').DataTable({
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
                  <button class='btn btn-sm btneditar' type='button' onclick='editarPersonal(${data})' title='Editar'>
                    <i class='fa fa-pencil-square-o fa-lg text-success' aria-hidden='true'></i> Editar
                  </button>
                  <button class='btn btn-sm btneliminar' type='button' onclick='eliminarPersonal(${data})' title='Eliminar'>
                    <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i> Eliminar
                  </button>
                </div>
              </div>`;
                    },
                    orderable: false,
                    searchable: false,
                },
                { data: 'Nombre' },           // 1
                { data: 'Telefono' },         // 2
                { data: 'TelefonoAlternativo' }, // 3
                { data: 'Dni' },              // 4
                { data: 'Cuit' },             // 5
                { data: 'CondicionIva' },     // 6 (string del back)
                { data: 'Domicilio' },        // 7
                { data: 'Provincia' },        // 8 (string del back)
                { data: 'Localidad' },        // 9
                { data: 'Email' },            // 10
                { data: 'Banco' },            // 11 (si en back devolvés texto; si no, mapear)
                { data: 'BancoAlias' },       // 12
                { data: 'BancoCbu' },         // 13
                { data: 'Puesto' },           // 14 (texto del back)
                {
                    data: 'FechaIngreso',
                    title: 'Fecha de Ingreso',
                    render: f => f ? formatearFechaParaVista(f) : "-"
                },
                {
                    data: 'FechaRetiro',
                    title: 'Fecha de Retiro',
                    render: f => f ? formatearFechaParaVista(f) : "-"
                },
                { data: 'SueldoMensual' },    // 17
                { data: 'DiasLaborales' },    // 18
                { data: 'ValorDia' },         // 19
                { data: 'HsLaborales' },      // 20
                { data: 'ValorHora' },        // 21
                { data: 'Sucursal' }          // 22 (texto del back)
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

                // La celda de acciones (índice 0) no lleva filtro
                $('.filters th').eq(0).html('');

                // Configuración de columnas (dropdown)
                configurarOpcionesColumnas('#grd_Personal', '#configColumnasMenu', 'Personal_Columnas');

                setTimeout(() => gridPersonal.columns.adjust(), 10);
            },
        });
    } else {
        gridPersonal.clear().rows.add(data).draw();
    }
}

/* -------- Cargas para selects del modal -------- */

async function listaCondicionesIva() {
    const res = await fetch("/CondicionesIva/Lista", { headers: { 'Content-Type': 'application/json' } });
    const data = await res.json();
    llenarSelect("cmbCondicionIva", data);
}
async function listaProvincias() {
    const res = await fetch("/Provincias/Lista", { headers: { 'Content-Type': 'application/json' } });
    const data = await res.json();
    llenarSelect("cmbProvincia", data);
}
async function listaBancos() {
    const res = await fetch("/Bancos/Lista", { headers: { 'Content-Type': 'application/json' } });
    const data = await res.json();
    llenarSelect("cmbBanco", data);
}
async function listaPuestos() {
    const res = await fetch("/PersonalPuestos/Lista", { headers: { 'Content-Type': 'application/json' } });
    const data = await res.json();
    llenarSelect("cmbPuesto", data);
}
async function listaSucursales() {
    const res = await fetch("/Sucursales/Lista", { headers: { 'Content-Type': 'application/json' } });
    const data = await res.json();
    llenarSelect("cmbSucursal", data);
}

/* -------- Filtros (selects del header) -------- */

async function listaCondicionIvaFilter() {
    const response = await fetch('/CondicionesIva/Lista', { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    if (!response.ok) throw new Error('Error cargando Condición IVA');
    const data = await response.json();
    return data.map(item => ({ Id: item.Id, Nombre: item.Nombre ?? item.Descripcion ?? '' }));
}
async function listaProvinciasFilter() {
    const response = await fetch('/Provincias/Lista', { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    if (!response.ok) throw new Error('Error cargando Provincias');
    const data = await response.json();
    return data.map(item => ({ Id: item.Id, Nombre: item.Nombre }));
}
async function listaBancosFilter() {
    const response = await fetch('/Bancos/Lista', { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    if (!response.ok) throw new Error('Error cargando Bancos');
    const data = await response.json();
    return data.map(item => ({ Id: item.Id, Nombre: item.Nombre }));
}
async function listaPuestosFilter() {
    const response = await fetch('/PersonalPuestos/Lista', { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    if (!response.ok) throw new Error('Error cargando Puestos');
    const data = await response.json();
    return data.map(item => ({ Id: item.Id, Nombre: item.Nombre }));
}
async function listaSucursalesFilter() {
    const response = await fetch('/Sucursales/Lista', { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    if (!response.ok) throw new Error('Error cargando Sucursales');
    const data = await response.json();
    return data.map(item => ({ Id: item.Id, Nombre: item.Nombre }));
}

/* -------- Helpers -------- */

function valorNulo(v) {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
}

function numeroNulo(v) {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
}

function escapeRegex(text) {
    return (text + '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Agregar listener a todos los inputs con class="miles"
document.querySelectorAll("input.Inputmiles").forEach(input => {
    input.addEventListener("input", function () {
        const cursorPos = input.selectionStart;
        const originalLength = input.value.length;

        // limpiar todo lo que no sea número
        const soloNumeros = input.value.replace(/\D/g, "");
        if (soloNumeros === "") {
            input.value = "";
            return;
        }

        // aplicar formateo
        const formateado = formatearMiles(soloNumeros);

        input.value = formateado;

        // restaurar posición del cursor
        const newLength = formateado.length;
        input.setSelectionRange(
            cursorPos + (newLength - originalLength),
            cursorPos + (newLength - originalLength)
        );
    });

});

const sm = document.getElementById("numSueldoMensual");
const dl = document.getElementById("numDiasLaborales");
const vd = document.getElementById("numValorDia");
const hl = document.getElementById("numHsLaborales");
const vh = document.getElementById("numValorHora");

// --- funciones para cada campo ---

// Sueldo mensual → Valor Día y Valor Hora
function calcularDesdeSueldo() {
    let sueldo = formatearSinMiles(sm.value);
    let dias = formatearSinMiles(dl.value);
    let horas = formatearSinMiles(hl.value);

    if (sueldo > 0 && dias > 0) {
        let valorDia = sueldo / dias;
        vd.value = formatearMiles(Math.round(valorDia)); // miles enteros
        if (horas > 0) {
            let valorHora = valorDia / horas;
            vh.value = formatearMiles(Math.round(valorHora));
        }
    }
}

// Días laborales → recalcular Valor Día y Valor Hora
function calcularDesdeDias() {
    let sueldo = formatearSinMiles(sm.value);
    let dias = formatearSinMiles(dl.value);
    let horas = formatearSinMiles(hl.value);

    if (sueldo > 0 && dias > 0) {
        let valorDia = sueldo / dias;
        vd.value = formatearMiles(Math.round(valorDia));
        if (horas > 0) {
            let valorHora = valorDia / horas;
            vh.value = formatearMiles(Math.round(valorHora));
        }
    }
}

// Valor Día → recalcular Sueldo Mensual y Valor Hora
function calcularDesdeValorDia() {
    let valorDia = formatearSinMiles(vd.value);
    let dias = formatearSinMiles(dl.value);
    let horas = formatearSinMiles(hl.value);

    if (valorDia > 0 && dias > 0) {
        sm.value = formatearMiles(Math.round(valorDia * dias));
        if (horas > 0) {
            vh.value = formatearMiles(Math.round(valorDia / horas));
        }
    }
}

// Horas laborales → recalcular Valor Hora
function calcularDesdeHoras() {
    let valorDia = formatearSinMiles(vd.value);
    let horas = formatearSinMiles(hl.value);

    if (valorDia > 0 && horas > 0) {
        vh.value = formatearMiles(Math.round(valorDia / horas));
    }
}

// Valor Hora → recalcular Valor Día y Sueldo Mensual
function calcularDesdeValorHora() {
    let valorHora = formatearSinMiles(vh.value);
    let horas = formatearSinMiles(hl.value);
    let dias = formatearSinMiles(dl.value);

    if (valorHora > 0 && horas > 0) {
        let valorDia = valorHora * horas;
        vd.value = formatearMiles(Math.round(valorDia));
        if (dias > 0) {
            sm.value = formatearMiles(Math.round(valorDia * dias));
        }
    }
}

// --- listeners ---
sm.addEventListener("input", calcularDesdeSueldo);
dl.addEventListener("input", calcularDesdeDias);
vd.addEventListener("input", calcularDesdeValorDia);
hl.addEventListener("input", calcularDesdeHoras);
vh.addEventListener("input", calcularDesdeValorHora);
