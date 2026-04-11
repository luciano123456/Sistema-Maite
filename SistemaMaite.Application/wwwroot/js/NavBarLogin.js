/* =========================================================
   NAVBAR LOGIN - COMPLETO
   - Menú dinámico por rol
   - Respeta secciones reales de Home
   - Incluye Configuraciones completas
   - Reutiliza abrirConfiguracion / editar / eliminar / guardar
========================================================= */

(function (window, document, $) {
    "use strict";

    /* =========================================================
       ESTADO GLOBAL CONFIGURACIONES
    ========================================================= */
    let nombreConfiguracion = "";
    let controllerConfiguracion = "";
    let comboNombre = null;
    let comboController = null;
    let lblComboNombre = "";
    let listaVacia = false;

  
    let vieneDeModalConfiguraciones = false;
    window.esModoAtajo = false;


    /* =========================================================
       INIT
    ========================================================= */
    document.addEventListener("DOMContentLoaded", function () {
        inicializarNavbarLogin();
    });

    function inicializarNavbarLogin() {
        const userSession = JSON.parse(localStorage.getItem("userSession"));
        if (!userSession) return;

        const rol = normalizarRol(userSession.Rol || "");
        const nombreCompleto = `${userSession.Nombre || ""} ${userSession.Apellido || ""}`.trim();

        const userNameEl = document.getElementById("userName");
        if (userNameEl) {
            userNameEl.innerHTML = `<i class="fa fa-user"></i> ${nombreCompleto || "Usuario"}`;
        }

        const seccionesVisibles = buildMenuByRol(rol);
        renderMenu(seccionesVisibles);
        marcarActivoSegunRuta();
    }

    /* =========================================================
       HELPERS
    ========================================================= */
    function normalizarRol(valor) {
        return String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase();
    }

    function esAdministracion(rol) {
        return rol === "Administracion";
    }

    function makeLinkItem(text, url) {
        return {
            type: "link",
            text,
            url
        };
    }

    function makeActionItem(text, action) {
        return {
            type: "action",
            text,
            action
        };
    }

    function cerrarDropdownsBootstrap() {
        document.querySelectorAll(".dropdown-menu.show").forEach(menu => {
            menu.classList.remove("show");
        });

        document.querySelectorAll('[data-bs-toggle="dropdown"][aria-expanded="true"]').forEach(toggle => {
            toggle.setAttribute("aria-expanded", "false");
        });
    }

    /* =========================================================
       CATÁLOGO REAL DEL SISTEMA
    ========================================================= */
    const MENU_CATALOG = [

        // =========================================
        // 🏭 PRODUCCIÓN
        // =========================================
        {
            id: "produccion",
            title: "Producción",
            icon: "fa-industry",
            roles: ["Administracion", "produccion"],
            items: [
                makeLinkItem("Órdenes de Corte", "/OrdenesCorte"),
                makeLinkItem("➕ Nueva Orden de Corte", "/OrdenesCorte/NuevoModif"), // 🔥 clave
                makeLinkItem("Talleres", "/Talleres")
            ]
        },

        // =========================================
        // 📦 INVENTARIO (OPERATIVO)
        // =========================================
        {
            id: "inventario",
            title: "Inventario",
            icon: "fa-boxes",
            roles: ["Administracion"],
            items: [
                makeLinkItem("Historial", "/Inventario"),
                makeLinkItem("Compras", "/Compras")
            ]
        },

        // =========================================
        // 📋 LISTAS (MAESTROS)
        // =========================================
        {
            id: "listas",
            title: "Listas",
            icon: "fa-list",
            roles: ["Administracion"],
            items: [
                makeLinkItem("Productos", "/Productos"),
                makeLinkItem("Insumos", "/Insumos"),
                makeLinkItem("Clientes", "/Clientes"),
                makeLinkItem("Proveedores", "/Proveedores"),
                makeLinkItem("Personal", "/Personal")
            ]
        },

        // =========================================
        // 💰 VENTAS
        // =========================================
        {
            id: "ventas",
            title: "Ventas",
            icon: "fa-shopping-cart",
            roles: ["Administracion", "ventas"],
            items: [
                makeLinkItem("Historial", "/Ventas"),
                makeLinkItem("➕ Nueva Venta", "/Ventas/NuevoModif"), // 🔥 clave
            ]
        },

        // =========================================
        // 💳 CUENTAS CORRIENTES (SEPARADO 🔥)
        // =========================================
        {
            id: "cuentas_corrientes",
            title: "Cuentas Corrientes",
            icon: "fa-wallet",
            roles: ["Administracion"],
            items: [
                makeLinkItem("Clientes", "/CuentasCorrientes"),
                makeLinkItem("Proveedores", "/CuentasCorrientesProveedores"),
                makeLinkItem("Talleres", "/CuentasCorrientesTalleres")
            ]
        },

        // =========================================
        // 💸 FINANZAS
        // =========================================
        {
            id: "finanzas",
            title: "Finanzas",
            icon: "fa-credit-card",
            roles: ["Administracion", "finanzas"],
            items: [
                makeLinkItem("Cajas", "/Cajas"),
                makeLinkItem("Gastos", "/Gastos")
            ]
        },

        // =========================================
        // 👤 PERSONAL (SEPARADO MÁS LIMPIO)
        // =========================================
        {
            id: "personal",
            title: "Personal",
            icon: "fa-users",
            roles: ["Administracion"],
            items: [
                makeLinkItem("Empleados", "/Personal"),
                makeLinkItem("Sueldos", "/PersonalSueldos"),
                makeLinkItem("➕ Nuevo Pago", "/PersonalSueldos/NuevoModif"), // 🔥 clave
            ]
        },

        // =========================================
        // ⚙️ CONFIGURACIONES
        // =========================================
        {
            id: "configuraciones",
            title: "Configuraciones",
            icon: "fa-cogs",
            roles: ["Administracion"],
            items: [
                makeActionItem("Listas de Precios", () => abrirConfiguracion("Lista de Precios", "ListasPrecios")),
                makeActionItem("Roles", () => abrirConfiguracion("Rol", "Roles")),
                makeActionItem("Sucursales", () => abrirConfiguracion("Sucursal", "Sucursales")),
                makeActionItem("Cuentas", () => abrirConfiguracion("Cuenta", "Cuentas")),
                makeActionItem("Bancos", () => abrirConfiguracion("Banco", "Bancos")),
                makeActionItem("Colores", () => abrirConfiguracion("Color", "Colores")),
                makeActionItem("Personal Puestos", () => abrirConfiguracion("Personal Puesto", "PersonalPuestos")),
                makeActionItem("Gastos Categorías", () => abrirConfiguracion("Gastos Categorias", "GastosCategorias")),
                makeActionItem("Productos Categorías", () => abrirConfiguracion("Productos Categorias", "ProductosCategoria")),
                makeActionItem("Insumos Categorías", () => abrirConfiguracion("Insumos Categorias", "InsumosCategoria")),
                makeActionItem("Estados Órdenes de Corte", () => abrirConfiguracion("Estados Ordenes de Corte", "OrdenesCorteEstados")),
                makeActionItem("Etapas Estados Órdenes de Corte", () => abrirConfiguracion("Etapas Estados Ordenes de Corte", "OrdenesCorteEtapasEstados"))
            ]
        },

        // =========================================
        // 🧩 EXTRAS
        // =========================================
        {
            id: "extras",
            title: "Extras",
            icon: "fa-puzzle-piece",
            roles: ["Administracion"],
            items: [
                makeLinkItem("Usuarios", "/Usuarios"),
                makeActionItem("Análisis de datos", () => {
                    if (window.errorModal) errorModal("Análisis de datos aún no disponible");
                    else alert("Análisis de datos aún no disponible");
                })
            ]
        }
    ];

    /* =========================================================
       FILTRO POR ROL
    ========================================================= */
    function buildMenuByRol(rol) {
        if (esAdministracion(rol)) {
            return MENU_CATALOG;
        }

        return MENU_CATALOG.filter(section =>
            section.roles.some(r => normalizarRol(r) === rol)
        );
    }

    /* =========================================================
       RENDER MENU
    ========================================================= */
    function renderMenu(menu) {
        const container = document.getElementById("menuDinamico");
        if (!container) return;

        container.innerHTML = "";

        menu.forEach(section => {
            const li = document.createElement("li");
            li.className = "nav-item dropdown nav-section-dropdown";

            const a = document.createElement("a");
            a.className = "nav-link dropdown-toggle d-flex align-items-center gap-2";
            a.href = "#";
            a.setAttribute("data-bs-toggle", "dropdown");
            a.setAttribute("aria-expanded", "false");
            a.innerHTML = `
                <i class="fa ${section.icon}"></i>
                <span>${section.title}</span>
            `;

            const ul = document.createElement("ul");
            ul.className = "dropdown-menu";

            section.items.forEach(item => {
                const liItem = document.createElement("li");

                if (item.type === "link") {
                    const link = document.createElement("a");
                    link.className = "dropdown-item";
                    link.href = item.url;
                    link.textContent = item.text;
                    liItem.appendChild(link);
                }
                else if (item.type === "action") {
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = "dropdown-item";
                    btn.textContent = item.text;
                    btn.addEventListener("click", function (e) {
                        e.preventDefault();
                        e.stopPropagation();

                        try {
                            item.action();
                        } finally {
                            cerrarDropdownsBootstrap();
                        }
                    });

                    liItem.appendChild(btn);
                }

                ul.appendChild(liItem);
            });

            li.appendChild(a);
            li.appendChild(ul);
            container.appendChild(li);
        });
    }

    function marcarActivoSegunRuta() {
        const actual = window.location.pathname.toLowerCase();

        let mejorMatch = null;
        let mejorLongitud = 0;

        document.querySelectorAll("#menuDinamico .dropdown-item[href]").forEach(a => {
            const href = (a.getAttribute("href") || "").toLowerCase();
            if (!href || href === "#") return;

            // match exacto o por prefijo
            if (actual === href || actual.startsWith(href + "/")) {
                if (href.length > mejorLongitud) {
                    mejorMatch = a;
                    mejorLongitud = href.length;
                }
            }
        });

        // limpiar todos
        document.querySelectorAll("#menuDinamico .dropdown-item").forEach(a => {
            a.classList.remove("active");
        });

        document.querySelectorAll("#menuDinamico .nav-link").forEach(a => {
            a.classList.remove("active");
        });

        // aplicar solo al mejor
        if (mejorMatch) {
            mejorMatch.classList.add("active");

            const parent = mejorMatch.closest(".nav-item.dropdown");
            parent?.querySelector(".nav-link")?.classList.add("active");
        }
    }

    /* =========================================================
       CONFIGURACIONES - COMPLETO
    ========================================================= */

    async function listaConfiguracion() {
        const url = `/${controllerConfiguracion}/Lista`;
        const response = await fetch(url, {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error('Error al cargar configuraciones');

        const data = await response.json();
        return data.map(configuracion => ({
            Id: configuracion.Id,
            Nombre: configuracion.Nombre,
            NombreCombo: configuracion.NombreCombo
        }));
    }
    async function abrirConfiguracion(
        _nombreConfiguracion,
        _controllerConfiguracion,
        _comboNombre = null,
        _comboController = null,
        _lblComboNombre,
        esAtajo = false
    ) {
        try {

            nombreConfiguracion = _nombreConfiguracion;
            controllerConfiguracion = _controllerConfiguracion;
            comboNombre = _comboNombre;
            comboController = _comboController;
            lblComboNombre = _lblComboNombre;

            window.esModoAtajo = esAtajo; // 🔥 CLAVE

            const result = await llenarConfiguraciones();

            if (!result) {
                await errorModal("Ha ocurrido un error al cargar la lista");
                return;
            }

            //$('#ModalEdicionConfiguraciones').modal('hide');
            const modal = new bootstrap.Modal(document.getElementById('modalConfiguracion'));
            modal.show();
            cancelarModificarConfiguracion();

            // 🔥 MODO ATAJO
            if (esAtajo) {

                // ocultar eliminar
                document.querySelectorAll(".rp-icon-btn.danger").forEach(btn => {
                    btn.style.display = "none";
                });

                // abrir directamente en "nuevo"
                agregarConfiguracion();

            } else {

                // mostrar eliminar normal
                document.querySelectorAll(".rp-icon-btn.danger").forEach(btn => {
                    btn.style.display = "";
                });
            }

            $('#txtNombreConfiguracion').off('input').on('input', validarCamposConfiguracion);
            $('#cmbConfiguracion').off('change').on('change', validarCamposConfiguracion);
            $('#txtBuscarConfiguracion').off('input').on('input', filtrarConfiguraciones);

            document.getElementById("modalConfiguracionLabel").innerText =
                "Configuracion de " + nombreConfiguracion;

            const buscador = document.getElementById("txtBuscarConfiguracion");
            if (buscador) buscador.value = "";

        } catch (ex) {
            errorModal("Ha ocurrido un error al cargar la lista");
        }
    }
    async function editarConfiguracion(id) {
        fetch("/" + controllerConfiguracion + "/EditarInfo?id=" + id, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token // 👈 tu token aquí
            }
        })
            .then(response => {
                if (!response.ok) throw new Error("Ha ocurrido un error.");
                return response.json();
            })
            .then(dataJson => {
                if (dataJson !== null) {

                    document.getElementById("btnRegistrarModificarConfiguracion").textContent = "Modificar";
                    document.getElementById("agregarConfiguracion").setAttribute("hidden", "hidden");
                    document.getElementById("txtNombreConfiguracion").value = dataJson.Nombre;
                    document.getElementById("txtIdConfiguracion").value = dataJson.Id;

                    document.getElementById("contenedorNombreConfiguracion").removeAttribute("hidden");

                    if (comboNombre != null) {
                        document.getElementById("lblConfiguracionCombo").innerText = lblComboNombre;
                        document.getElementById("cmbConfiguracion").value = dataJson.IdCombo;
                    }

                    validarCamposConfiguracion();
                } else {
                    throw new Error("Ha ocurrido un error.");
                }
            })
            .catch(error => {
                errorModal("Ha ocurrido un error.");
            });
    }
    async function llenarConfiguraciones() {

        try {

            let ocultarEliminar = window.esModoAtajo || false;

            const buscador = document.getElementById("txtBuscarConfiguracion");
            if (buscador) {
                buscador.value = "";
            }

            let configuraciones = await listaConfiguracion();

            if (comboNombre != null) {
                llenarComboConfiguracion();
                document.getElementById("divConfiguracionCombo").removeAttribute("hidden", "");
            } else {
                document.getElementById("divConfiguracionCombo").setAttribute("hidden", "hidden");
            }


            document.getElementById("lblListaVacia").innerText = "";
            document.getElementById("lblListaVacia").setAttribute("hidden", "hidden");

            $("#configuracion-list").empty();

            if (configuraciones.length == 0) {
                document.getElementById("lblListaVacia").innerText = `La lista de ${nombreConfiguracion} esta vacia.`;

                document.getElementById("lblListaVacia").style.color = 'red';
                document.getElementById("lblListaVacia").removeAttribute("hidden");
                listaVacia = true;

            } else {

                listaVacia = false;
                configuraciones.forEach((configuracion, index) => {

                    let nombreConfig = configuracion.Nombre;

                    if (configuracion.NombreCombo != null) {
                        nombreConfig += " - " + configuracion.NombreCombo;
                    }

                    var indexado = configuracion.Id
                    $("#configuracion-list").append(`
    <div class="rp-list-item" data-texto="${escapeHtml(nombreConfig).toLowerCase()}">
        <div class="rp-item-left">
            <div class="rp-item-icon">
                <i class="fa fa-tag"></i>
            </div>
            <div class="rp-item-text">${nombreConfig}</div>
        </div>

        <div class="rp-list-actions">
            <button class="rp-icon-btn"
                onclick="editarConfiguracion(${indexado})">
                <i class="fa fa-pencil"></i>
            </button>

          ${ocultarEliminar ? "" : `
<button class="rp-icon-btn danger"
    onclick="eliminarConfiguracion(${indexado})">
    <i class="fa fa-trash"></i>
</button>
`}
        </div>
    </div>
`);

                });


            }
            return true;
        } catch (ex) {
            return false;

        }
    }
    async function eliminarConfiguracion(id) {


        let resultado = await confirmarModal("¿Desea eliminar el/la" + nombreConfiguracion + "?");
        if (!resultado) return;

        if (resultado) {
            try {
                const response = await fetch("/" + controllerConfiguracion + "/Eliminar?id=" + id, {
                    method: "DELETE",
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error("Error al eliminar " + nombreConfiguracion);
                }

                const dataJson = await response.json();

                if (dataJson.valor) {
                    llenarConfiguraciones()

                    if (dataJson.valor) {
                        await llenarConfiguraciones();

                        exitoModal(nombreConfiguracion + " eliminada correctamente");

                        document.dispatchEvent(new CustomEvent("configuracionActualizada", {
                            detail: {
                                tipo: controllerConfiguracion,
                                nuevoId: null,
                                accion: "eliminar"
                            }
                        }));
                    }
                }
            } catch (error) {
                console.error("Ha ocurrido un error:", error);
            }
        }
    }
    async function llenarComboConfiguracion() {
        const res = await fetch(`/${comboController}/Lista`, {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });
        if (!res.ok) throw new Error('Error al cargar combo');

        const data = await res.json();
        llenarSelect("cmbConfiguracion", data);
    }
    function validarCamposConfiguracion() {
        const nombre = $("#txtNombreConfiguracion").val();
        const combo = $("#cmbConfiguracion").val();

        const camposValidos = nombre !== "";
        const selectValido = combo !== "";

        // estilos
        $("#lblNombreConfiguracion").css("color", camposValidos ? "" : "red");
        $("#txtNombreConfiguracion").css("border-color", camposValidos ? "" : "red");
        $("#cmbConfiguracion").css("border-color", selectValido ? "" : "red");

        // lógica de validación
        if (comboNombre != null) {
            return camposValidos && selectValido;
        } else {
            return camposValidos;
        }
    }
    function guardarCambiosConfiguracion() {
        if (validarCamposConfiguracion()) {
            const idConfiguracion = $("#txtIdConfiguracion").val();
            const idCombo = $("#cmbConfiguracion").val();
            const nuevoModelo = {
                "Id": idConfiguracion !== "" ? idConfiguracion : 0,
                "IdCombo": comboNombre !== "" ? idCombo : 0,
                "Nombre": $("#txtNombreConfiguracion").val(),
            };

            const url = idConfiguracion === "" ? "/" + controllerConfiguracion + "/Insertar" : "/" + controllerConfiguracion + "/Actualizar";
            const method = idConfiguracion === "" ? "POST" : "PUT";

            fetch(url, {
                method: method,
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(nuevoModelo)
            })
                .then(response => {
                    if (!response.ok) throw new Error(response.statusText);
                    return response.json();
                })
                .then(async dataJson => {

                    const esNuevo = idConfiguracion === "";

                    const mensaje = esNuevo
                        ? nombreConfiguracion + " registrado/a correctamente"
                        : nombreConfiguracion + " modificado/a correctamente";

                    cancelarModificarConfiguracion();

                    const ok = await llenarConfiguraciones();

                    if (!ok) {
                        errorModal("Error recargando la lista");
                        return;
                    }

                    exitoModal(mensaje);

                    const nuevoId = dataJson?.id ?? null;

                    document.dispatchEvent(new CustomEvent("configuracionActualizada", {
                        detail: {
                            tipo: controllerConfiguracion,
                            nuevoId: nuevoId,
                            accion: esNuevo ? "insertar" : "actualizar"
                        }
                    }));


                    // 🔥🔥🔥 CLAVE
                    if (window.esModoAtajo) {
                        setTimeout(() => {
                            const modalEl = document.getElementById('modalConfiguracion');

                            let modal = bootstrap.Modal.getInstance(modalEl);

                            if (!modal) {
                                modal = new bootstrap.Modal(modalEl);
                            }

                            modal.hide();
                        }, 300);
                    }

                })
                .catch(error => {
                    console.error('Error:', error);
                });
        } else {
            errorModal('Debes completar los campos requeridos');
        }
    }
    function cancelarModificarConfiguracion() {
        document.getElementById("txtNombreConfiguracion").value = "";
        document.getElementById("txtIdConfiguracion").value = "";
        document.getElementById("contenedorNombreConfiguracion").setAttribute("hidden", "hidden");
        document.getElementById("agregarConfiguracion").removeAttribute("hidden");

        if (listaVacia == true) {
            document.getElementById("lblListaVacia").innerText = `La lista de ${nombreConfiguracion} esta vacia.`;
            document.getElementById("lblListaVacia").style.color = 'red';
            document.getElementById("lblListaVacia").removeAttribute("hidden");
        }
    }
    function agregarConfiguracion() {
        document.getElementById("txtNombreConfiguracion").value = "";
        document.getElementById("txtIdConfiguracion").value = "";
        document.getElementById("contenedorNombreConfiguracion").removeAttribute("hidden");
        document.getElementById("agregarConfiguracion").setAttribute("hidden", "hidden");
        document.getElementById("lblListaVacia").innerText = "";
        document.getElementById("lblListaVacia").setAttribute("hidden", "hidden");
        document.getElementById("btnRegistrarModificarConfiguracion").textContent = "Agregar";

        $('#lblNombreConfiguracion').css('color', 'red');
        $('#txtNombreConfiguracion').css('border-color', 'red');

        if (comboNombre != null) {
            document.getElementById("lblConfiguracionCombo").innerText = lblComboNombre;
            document.getElementById("cmbConfiguracion").value = "";
            $('#cmbConfiguracion').css('border-color', 'red');
        }
    }
    function abrirConfiguraciones() {
        vieneDeModalConfiguraciones = true;

        $('#ModalEdicionConfiguraciones').modal('show');
        $("#btnGuardarConfiguracion").text("Aceptar");
        $("#modalEdicionLabel").text("Configuraciones");
    }

    function filtrarConfiguraciones() {
        const input = document.getElementById("txtBuscarConfiguracion");
        const lista = document.getElementById("configuracion-list");

        if (!input || !lista) return;

        const texto = input.value.trim().toLowerCase();
        const items = lista.querySelectorAll(".rp-list-item");

        let visibles = 0;

        items.forEach(item => {
            const textoItem = (item.getAttribute("data-texto") || "").toLowerCase();
            const coincide = textoItem.includes(texto);

            item.style.display = coincide ? "" : "none";

            if (coincide) visibles++;
        });

        const lblListaVacia = document.getElementById("lblListaVacia");

        if (items.length > 0 && visibles === 0) {
            lblListaVacia.innerText = `No se encontraron resultados para "${input.value}".`;
            lblListaVacia.style.color = 'red';
            lblListaVacia.removeAttribute("hidden");
        } else if (listaVacia === true) {
            lblListaVacia.innerText = `La lista de ${nombreConfiguracion} esta vacia.`;
            lblListaVacia.style.color = 'red';
            lblListaVacia.removeAttribute("hidden");
        } else {
            lblListaVacia.innerText = "";
            lblListaVacia.setAttribute("hidden", "hidden");
        }
    }

    /* =========================================================
       USER
    ========================================================= */
    function abrirConfiguracionUser() {
        window.location.href = '/Usuarios/Configuracion';
    }

    /* =========================================================
       HELPERS MODALES
    ========================================================= */
    function mostrarExito(msg) {
        if (typeof window.exitoModal === "function") return window.exitoModal(msg);
        alert(msg);
    }

    function mostrarError(msg) {
        if (typeof window.errorModal === "function") return window.errorModal(msg);
        alert(msg);
    }

    function confirmarAccion(msg) {
        if (typeof window.confirmarModal === "function") return window.confirmarModal(msg);
        return Promise.resolve(confirm(msg));
    }

    function escapeHtml(s) {
        return String(s ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function escapeJs(s) {
        return String(s ?? "").replaceAll("\\", "\\\\").replaceAll("'", "\\'");
    }

    /* =========================================================
       EXPONER GLOBALES
    ========================================================= */
    window.abrirConfiguracion = abrirConfiguracion;
    window.editarConfiguracion = editarConfiguracion;
    window.eliminarConfiguracion = eliminarConfiguracion;
    window.guardarCambiosConfiguracion = guardarCambiosConfiguracion;
    window.cancelarModificarConfiguracion = cancelarModificarConfiguracion;
    window.agregarConfiguracion = agregarConfiguracion;
    window.abrirConfiguraciones = abrirConfiguraciones;
    window.abrirConfiguracionUser = abrirConfiguracionUser;


})(window, document, window.jQuery);


