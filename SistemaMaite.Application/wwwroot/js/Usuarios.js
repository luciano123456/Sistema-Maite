// =========================
// Usuarios.js (Sucursales + validación >=1 seleccionada)
// =========================

let gridUsuarios;

// ---------- Config de filtros (header de DataTable) ----------
const columnConfig = [
    { index: 1, filterType: 'text' },      // Usuario
    { index: 2, filterType: 'text' },      // Nombre
    { index: 3, filterType: 'text' },      // Apellido
    { index: 4, filterType: 'text' },      // DNI
    { index: 5, filterType: 'text' },      // Teléfono
    { index: 6, filterType: 'text' },      // Dirección
    { index: 7, filterType: 'select', fetchDataFunc: listaRolesFilter },
    { index: 8, filterType: 'select', fetchDataFunc: listaEstadosFilter },
    { index: 9, filterType: 'text' },
];

// ---------- Catálogos (cache en memoria) ----------
const Catalogos = {
    sucursales: [],
    sucursalesMap: new Map(),
};

// ===== Estado de selección (checklist) =====
const MultiState = (window.MultiState || {});
MultiState.sucursales = MultiState.sucursales || new Set();

function getSucursalesSeleccionadas() {
    return [...MultiState.sucursales].map(Number);
}

// ---------- Render del checklist de sucursales ----------
function updateChecklistButtonLabel(btnId, map, emptyText) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    const nombres = [...MultiState.sucursales].map(id => map.get(Number(id))).filter(Boolean);
    btn.textContent = nombres.length ? nombres.join(', ') : emptyText;
    btn.title = nombres.join(', ');
}

function renderChecklist(panelId, items, stateSet, btnId, allLabel = 'Seleccionar todos') {
    const panel = document.getElementById(panelId);
    if (!panel) return;

    const selected = stateSet;
    const allChecked = items.length > 0 && items.every(it => selected.has(Number(it.Id)));

    const html = [
        `<div class="form-check">
       <input class="form-check-input" type="checkbox" id="${panelId}-all" ${allChecked ? 'checked' : ''}>
       <label class="form-check-label" for="${panelId}-all">${allLabel}</label>
     </div>
     <hr class="my-2" />`
    ];

    for (const it of items) {
        const checked = selected.has(Number(it.Id)) ? 'checked' : '';
        html.push(`
      <div class="form-check">
        <input class="form-check-input" type="checkbox" id="${panelId}-opt-${it.Id}" data-id="${it.Id}" ${checked}>
        <label class="form-check-label" for="${panelId}-opt-${it.Id}">${it.Nombre}</label>
      </div>
    `);
    }

    panel.innerHTML = html.join('');

    document.getElementById(`${panelId}-all`)?.addEventListener('change', ev => {
        selected.clear();
        if (ev.target.checked) items.forEach(it => selected.add(Number(it.Id)));
        items.forEach(it => {
            const cb = document.getElementById(`${panelId}-opt-${it.Id}`);
            if (cb) cb.checked = ev.target.checked;
        });
        updateChecklistButtonLabel(btnId, Catalogos.sucursalesMap, 'Seleccionar sucursales');
        validarCampos(); // <-- actualiza la validación general (incluye sucursales)
    });

    items.forEach(it => {
        const cb = document.getElementById(`${panelId}-opt-${it.Id}`);
        if (!cb) return;
        cb.addEventListener('change', ev => {
            const id = Number(ev.target.getAttribute('data-id'));
            if (ev.target.checked) selected.add(id); else selected.delete(id);

            const allC = items.length > 0 && items.every(x => selected.has(Number(x.Id)));
            const allBox = document.getElementById(`${panelId}-all`);
            if (allBox) allBox.checked = allC;

            updateChecklistButtonLabel(btnId, Catalogos.sucursalesMap, 'Seleccionar sucursales');
            validarCampos(); // <-- obliga a 1 sucursal
        });
    });

    updateChecklistButtonLabel(btnId, Catalogos.sucursalesMap, 'Seleccionar sucursales');
}

// Cerrar panel si clic fuera
document.addEventListener('click', (e) => {
    const panel = document.getElementById('listaSucursales');
    const btn = document.getElementById('btnSucursales');
    if (!panel || panel.classList.contains('d-none')) return;
    if (!panel.contains(e.target) && !btn.contains(e.target)) panel.classList.add('d-none');
});

// Abrir/cerrar panel (tu HTML usa esto)
function toggleChecklist(btnId, panelId) {
    const panel = document.getElementById(panelId);
    panel?.classList.toggle('d-none');
}

// ---------- Ready ----------
$(document).ready(() => {
    listaUsuarios();

    // validación live en el modal
    document.querySelectorAll("#modalEdicion input, #modalEdicion select, #modalEdicion textarea").forEach(el => {
        el.setAttribute("autocomplete", "off");
        el.addEventListener("input", () => validarCampoIndividual(el));
        el.addEventListener("change", () => validarCampoIndividual(el));
        el.addEventListener("blur", () => validarCampoIndividual(el));
    });
});

// ---------- Catálogo Sucursales ----------
function cargarSucursales() {
    return fetch("/Sucursales/Lista", {
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    })
        .then(r => r.ok ? r.json() : [])
        .then(data => {
            const norm = data.map(x => ({ Id: Number(x.Id ?? 0), Nombre: String(x.Nombre ?? '') }));
            Catalogos.sucursales = norm;
            Catalogos.sucursalesMap = new Map(norm.map(x => [x.Id, x.Nombre]));
            renderChecklist('listaSucursales', Catalogos.sucursales, MultiState.sucursales, 'btnSucursales', 'Seleccionar todos');
        });
}

// ---------- Guardar ----------
function guardarCambios() {
    if (!validarCampos()) return false;

    const idUsuario = $("#txtId").val();
    const nuevoModelo = {
        Id: idUsuario !== "" ? Number(idUsuario) : 0,
        Usuario: $("#txtUsuario").val(),
        Nombre: $("#txtNombre").val(),
        Apellido: $("#txtApellido").val(),
        DNI: $("#txtDni").val(),
        Telefono: $("#txtTelefono").val(),
        Direccion: $("#txtDireccion").val(),
        IdRol: Number($("#Roles").val() || 0),
        IdEstado: Number($("#Estados").val() || 0),
        Contrasena: idUsuario === "" ? $("#txtContrasena").val() : "",
        ContrasenaNueva: $("#txtContrasenaNueva").val(),
        CambioAdmin: 1,
        // Sucursales seleccionadas
        IdSucursales: getSucursalesSeleccionadas()
    };

    const url = idUsuario === "" ? "/Usuarios/Insertar" : "/Usuarios/Actualizar";
    const method = idUsuario === "" ? "POST" : "PUT";

    fetch(url, {
        method,
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify(nuevoModelo)
    })
        .then(response => {
            if (!response.ok) throw new Error(response.statusText);
            return response.json();
        })
        .then(dataJson => {
            let mensaje = idUsuario === "" ? "Usuario registrado correctamente" : "Usuario modificado correctamente";
            if (dataJson.valor === 'Contrasena') {
                errorModal("Contrasena incorrecta");
                return false;
            } else if (dataJson.valor === 'Usuario') {
                errorModal("El nombre de usuario ya existe.");
                return false;
            } else if (dataJson.valor === 'Error') {
                errorModal("No se pudo guardar el usuario.");
                return false;
            } else {
                $('#modalEdicion').modal('hide');
                exitoModal(mensaje);
            }
            listaUsuarios();
        })
        .catch(error => {
            console.error('Error:', error);
            errorModal("No se pudo guardar el usuario.");
        });
}

// ---------- Nuevo ----------
function nuevoUsuario() {
    limpiarModal();

    // limpiar selección de sucursales
    MultiState.sucursales.clear();

    Promise.all([listaEstados(), listaRoles(), cargarSucursales()]).then(() => {
        updateChecklistButtonLabel('btnSucursales', Catalogos.sucursalesMap, 'Seleccionar sucursales');
        validarCampos(); // para dejar estado inicial correcto
    });

    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Registrar");
    $("#modalEdicionLabel").text("Nuevo Usuario");

    document.getElementById("divContrasena").removeAttribute("hidden");
    document.getElementById("divContrasenaNueva").setAttribute("hidden", "hidden");
}

// ---------- Editar ----------
async function mostrarModal(modelo) {
    limpiarModal();

    const campos = ["Id", "Usuario", "Nombre", "Apellido", "Dni", "Telefono", "Direccion", "Contrasena", "ContrasenaNueva"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val(modelo[campo]);
    });

    MultiState.sucursales.clear();

    await Promise.all([listaEstados(), listaRoles(), cargarSucursales()]);

    $("#Roles").val(modelo.IdRol ?? "").trigger('change');
    $("#Estados").val(modelo.IdEstado ?? "").trigger('change');

    const idsSucursales =
        (Array.isArray(modelo.IdSucursales) && modelo.IdSucursales.map(Number)) ||
        (Array.isArray(modelo.UsuariosSucursales) && modelo.UsuariosSucursales.map(s => Number(s.IdSucursal))) ||
        [];

    idsSucursales.forEach(id => MultiState.sucursales.add(Number(id)));
    renderChecklist('listaSucursales', Catalogos.sucursales, MultiState.sucursales, 'btnSucursales', 'Seleccionar todos');

    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Guardar");
    $("#modalEdicionLabel").text("Editar Usuario");

    document.getElementById("divContrasena").setAttribute("hidden", "hidden");
    document.getElementById("divContrasenaNueva").removeAttribute("hidden");

    validarCampos(); // valida sucursales ya cargadas
}

// ---------- Listado / EditarInfo / Eliminar ----------
async function listaUsuarios() {
    let paginaActual = gridUsuarios != null ? gridUsuarios.page() : 0;
    const url = `/Usuarios/Lista`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) throw new Error(`Error en la solicitud: ${response.statusText}`);

    const data = await response.json();
    await configurarDataTable(data);

    if (paginaActual > 0) gridUsuarios.page(paginaActual).draw('page');
}

const editarUsuario = id => {
    $('.acciones-dropdown').hide();

    fetch("/Usuarios/EditarInfo?id=" + id, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            if (!response.ok) throw new Error("Ha ocurrido un error.");
            return response.json();
        })
        .then(dataJson => dataJson ? mostrarModal(dataJson) : (() => { throw new Error("Ha ocurrido un error."); })())
        .catch(() => errorModal("Ha ocurrido un error."));
};

async function eliminarUsuario(id) {
    $('.acciones-dropdown').hide();
    const confirmado = await confirmarModal("¿Desea eliminar este usuario?");
    if (!confirmado) return;

    try {
        const response = await fetch("/Usuarios/Eliminar?id=" + id, {
            method: "DELETE",
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error("Error al eliminar el Usuario.");

        const dataJson = await response.json();
        if (dataJson.valor) {
            listaUsuarios();
            exitoModal("Usuario eliminado correctamente");
        }
    } catch (error) {
        console.error("Ha ocurrido un error:", error);
    }
}

// ---------- DataTable ----------
async function configurarDataTable(data) {
    if (!gridUsuarios) {
        $('#grd_Usuarios thead tr').clone(true).addClass('filters').appendTo('#grd_Usuarios thead');
        gridUsuarios = $('#grd_Usuarios').DataTable({
            data,
            language: {
                sLengthMenu: "Mostrar MENU registros",
                lengthMenu: "Anzeigen von _MENU_ Einträgen",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            scrollX: "100px",
            scrollCollapse: true,
            columns: [
                {
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
                  <button class='btn btn-sm btneditar' type='button' onclick='editarUsuario(${data})' title='Editar'>
                    <i class='fa fa-pencil-square-o fa-lg text-success' aria-hidden='true'></i> Editar
                  </button>
                  <button class='btn btn-sm btneliminar' type='button' onclick='eliminarUsuario(${data})' title='Eliminar'>
                    <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i> Eliminar
                  </button>
                </div>
              </div>`;
                    },
                    orderable: false,
                    searchable: false,
                },
                { data: 'Usuario', title: 'Usuario' },
                { data: 'Nombre', title: 'Nombre' },
                { data: 'Apellido', title: 'Apellido' },
                { data: 'Dni', title: 'DNI' },
                { data: 'Telefono', title: 'Teléfono' },
                { data: 'Direccion', title: 'Dirección' },
                { data: 'Rol', title: 'Rol' },
                {
                    data: 'Estado',
                    title: 'Estado',
                    render: (data) => data === "Bloqueado" ? `<span style="color: red">${data}</span>` : data
                }
            ],
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar Excel',
                    filename: 'Reporte Usuarios',
                    title: '',
                    exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8] },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: 'Reporte Usuarios',
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
                const api = this.api();

                for (const config of columnConfig) {
                    const cell = $('.filters th').eq(config.index);
                    if (config.filterType === 'select') {
                        const select = $(`<select id="filter${config.index}"><option value="">Seleccionar</option></select>`)
                            .appendTo(cell.empty())
                            .on('change', async function () {
                                const selectedText = $(this).find('option:selected').text();
                                await api.column(config.index).search(this.value ? '^' + escapeRegex(selectedText) + '$' : '', true, false).draw();
                            });
                        const data = await config.fetchDataFunc();
                        data.forEach(item => select.append(`<option value="${item.Id}">${item.Nombre}</option>`));
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

                $('.filters th').eq(0).html('');

                configurarOpcionesColumnas();

                setTimeout(() => gridUsuarios.columns.adjust(), 10);

                $('body').on('mouseenter', '#grd_Usuarios .fa-map-marker', function () {
                    $(this).css('cursor', 'pointer');
                });
                $('body').on('click', '#grd_Usuarios .fa-map-marker', function () {
                    const locationText = $(this).parent().text().trim().replace(' ', ' ');
                    const url = 'https://www.google.com/maps?q=' + encodeURIComponent(locationText);
                    window.open(url, '_blank');
                });
            },
        });
    } else {
        gridUsuarios.clear().rows.add(data).draw();
    }
}

// ---------- Combos: Roles / Estados ----------
async function listaRoles() {
    const url = `/Roles/Lista`;
    const response = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await response.json();

    const sel = document.getElementById("Roles");
    if (sel) {
        sel.innerHTML = '';
        data.forEach(x => {
            const opt = document.createElement("option");
            opt.value = x.Id;
            opt.text = x.Nombre;
            sel.appendChild(opt);
        });
    }
}

async function listaEstados() {
    const url = `/EstadosUsuarios/Lista`;
    const response = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await response.json();

    const sel = document.getElementById("Estados");
    if (sel) {
        sel.innerHTML = '';
        data.forEach(x => {
            const opt = document.createElement("option");
            opt.value = x.Id;
            opt.text = x.Nombre;
            sel.appendChild(opt);
        });
    }
}

async function listaEstadosFilter() {
    const url = `/EstadosUsuarios/Lista`;
    const response = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await response.json();
    return data.map(estado => ({ Id: estado.Id, Nombre: estado.Nombre }));
}

async function listaRolesFilter() {
    const url = `/Roles/Lista`;
    const response = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await response.json();
    return data.map(rol => ({ Id: rol.Id, Nombre: rol.Nombre }));
}

// ---------- Configurar columnas visibles ----------
function configurarOpcionesColumnas() {
    const grid = $('#grd_Usuarios').DataTable();
    const columnas = grid.settings().init().columns;
    const container = $('#configColumnasMenu');
    const storageKey = `Usuarios_Columnas`;

    const savedConfig = JSON.parse(localStorage.getItem(storageKey) || '{}');
    container.empty();

    columnas.forEach((col, index) => {
        if (col.data && col.data !== "Id") {
            const isChecked = savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;
            grid.column(index).visible(isChecked);

            const columnName = col.title || col.data;

            container.append(`
        <li>
          <label class="dropdown-item">
            <input type="checkbox" class="toggle-column" data-column="${index}" ${isChecked ? 'checked' : ''}>
            ${columnName}
          </label>
        </li>
      `);
        }
    });

    $('.toggle-column').on('change', function () {
        const columnIdx = parseInt($(this).data('column'), 10);
        const isChecked = $(this).is(':checked');
        savedConfig[`col_${columnIdx}`] = isChecked;
        localStorage.setItem(storageKey, JSON.stringify(savedConfig));
        grid.column(columnIdx).visible(isChecked);
    });
}

// ---------- Dropdown acciones ----------
function toggleAcciones(id) {
    const $dropdown = $(`.acciones-menu[data-id="${id}"] .acciones-dropdown`);
    if ($dropdown.is(":visible")) $dropdown.hide();
    else { $('.acciones-dropdown').hide(); $dropdown.show(); }
}
$(document).on('click', function (e) {
    if (!$(e.target).closest('.acciones-menu').length) $('.acciones-dropdown').hide();
});

// ---------- Limpieza/Validación ----------
function limpiarModal() {
    const formulario = document.querySelector("#modalEdicion");
    if (!formulario) return;

    formulario.querySelectorAll("input, select, textarea").forEach(el => {
        if (el.tagName === "SELECT") el.selectedIndex = 0;
        else el.value = "";
        el.classList.remove("is-invalid", "is-valid");
    });

    // limpiar checklist sucursales
    MultiState.sucursales.clear();
    const panel = document.getElementById('listaSucursales');
    if (panel) panel.innerHTML = '';
    const btn = document.getElementById('btnSucursales');
    if (btn) { btn.textContent = 'Seleccionar sucursales'; btn.title = ''; btn.classList.remove('is-invalid'); }

    const errorMsg = document.getElementById("errorCampos");
    if (errorMsg) errorMsg.classList.add("d-none");
}

function validarCampoIndividual(el) {
    const tag = el.tagName.toLowerCase();
    const id = el.id;
    const valor = el.value ? el.value.trim() : "";
    const feedback = el.nextElementSibling;

    if (id !== "txtNombre" && id !== "txtContrasena" && id !== "txtUsuario") return;

    if (tag === "input" || tag === "select" || tag === "textarea") {
        if (feedback && feedback.classList.contains("invalid-feedback")) {
            feedback.textContent = "Campo obligatorio";
        }
        if (valor === "" || valor === "Seleccionar") {
            el.classList.remove("is-valid");
            el.classList.add("is-invalid");
        } else {
            el.classList.remove("is-invalid");
            el.classList.add("is-valid");
        }
    }
    verificarErroresGenerales();
}

function verificarErroresGenerales() {
    const errorMsg = document.getElementById("errorCampos");
    const hayInvalidos = document.querySelectorAll("#modalEdicion .is-invalid").length > 0;
    if (!errorMsg) return;
    if (!hayInvalidos) errorMsg.classList.add("d-none");
}

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// VALIDACIÓN GENERAL: exige al menos 1 sucursal seleccionada
// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
function validarCampos() {
    const campos = ["#txtNombre", "#txtUsuario", "#txtContrasena"];
    let valido = true;

    // Valida inputs básicos
    campos.forEach(selector => {
        const campo = document.querySelector(selector);
        const valor = campo?.value?.trim();
        const feedback = campo?.nextElementSibling;

        // En edición, txtContrasena puede estar oculto: lo ignoro si está hidden
        const isHidden = campo && campo.closest('#divContrasena') && campo.closest('#divContrasena').hasAttribute('hidden');

        if (!campo || isHidden) return;

        if (!valor || valor === "Seleccionar") {
            campo.classList.add("is-invalid");
            campo.classList.remove("is-valid");
            if (feedback) feedback.textContent = "Campo obligatorio";
            valido = false;
        } else {
            campo.classList.remove("is-invalid");
            campo.classList.add("is-valid");
        }
    });

    // ✔️ Validar sucursales (al menos 1)
    const sucursalesOk = MultiState.sucursales.size > 0;
    const btnSuc = document.getElementById('btnSucursales');
    if (btnSuc) btnSuc.classList.toggle('is-invalid', !sucursalesOk);
    if (!sucursalesOk) valido = false;

    // Mensaje general
    const error = document.getElementById("errorCampos");
    if (error) {
        if (!valido) {
            // Si falla por sucursales, priorizo ese mensaje
            error.textContent = sucursalesOk ? "Debes completar los campos obligatorios." : "Seleccioná al menos una sucursal.";
            error.classList.remove("d-none");
        } else {
            error.classList.add("d-none");
        }
    }
    return valido;
}

// ---------- Helper ----------
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}
