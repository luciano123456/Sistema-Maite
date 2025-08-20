const token = localStorage.getItem('JwtToken');

async function MakeAjax(options) {
    return $.ajax({
        type: options.type,
        url: options.url,
        async: options.async,
        data: options.data,
        dataType: options.dataType,
        contentType: options.contentType
    });
}


async function MakeAjaxFormData(options) {
    return $.ajax({
        type: options.type,
        url: options.url,
        async: options.async,
        data: options.data,
        dataType: false,
        contentType: false,
        isFormData: true,
        processData: false
    });
}


// Formatear el número de manera correcta
function formatNumber(number) {
    if (typeof number !== 'number' || isNaN(number)) {
        return "$ 0,00"; // Si el número no es válido, retornar un valor por defecto
    }

    // Asegurarse de que el número tenga dos decimales
    const parts = number.toFixed(2).split("."); // Dividir en parte entera y decimal

    // Formatear la parte entera con puntos como separadores de miles
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, "."); // Usar punto para miles

    // Devolver el número con la coma como separador decimal
    return "$ " + parts.join(",");
}



function mostrarModalConContador(modal, texto, tiempo) {
    $(`#${modal}Text`).text(texto);
    $(`#${modal}`).modal('show');

    setTimeout(function () {
        $(`#${modal}`).modal('hide');
    }, tiempo);
}

function exitoModal(texto) {
    mostrarModalConContador('exitoModal', texto, 1000);
}

function errorModal(texto) {
    mostrarModalConContador('ErrorModal', texto, 3000);
}

function advertenciaModal(texto) {
    mostrarModalConContador('AdvertenciaModal', texto, 3000);
}

function confirmarModal(mensaje) {
    return new Promise((resolve) => {
        const modalEl = document.getElementById('modalConfirmar');
        const mensajeEl = document.getElementById('modalConfirmarMensaje');
        const btnAceptar = document.getElementById('btnModalConfirmarAceptar');

        mensajeEl.innerText = mensaje;

        const modal = new bootstrap.Modal(modalEl, {
            backdrop: 'static',
            keyboard: false
        });

        // Flag para que no resuelva dos veces
        let resuelto = false;

        // Limpia todos los listeners anteriores
        modalEl.replaceWith(modalEl.cloneNode(true));
        // Re-obtener referencias luego de clonar
        const nuevoModalEl = document.getElementById('modalConfirmar');
        const nuevoBtnAceptar = document.getElementById('btnModalConfirmarAceptar');

        const nuevoModal = new bootstrap.Modal(nuevoModalEl, {
            backdrop: 'static',
            keyboard: false
        });

        nuevoBtnAceptar.onclick = function () {
            if (resuelto) return;
            resuelto = true;
            resolve(true);
            nuevoModal.hide();
        };

        nuevoModalEl.addEventListener('hidden.bs.modal', () => {
            if (resuelto) return;
            resuelto = true;
            resolve(false);
        }, { once: true });

        nuevoModal.show();
    });
}


const formatoMoneda = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS', // Cambia "ARS" por el código de moneda que necesites
    minimumFractionDigits: 2
});

function convertirMonedaAFloat(moneda) {
    // Eliminar el símbolo de la moneda y otros caracteres no numéricos
    const soloNumeros = moneda.replace(/[^0-9,.-]/g, '');

    // Eliminar separadores de miles y convertir la coma en punto
    const numeroFormateado = soloNumeros.replace(/\./g, '').replace(',', '.');

    // Convertir a flotante
    const numero = parseFloat(numeroFormateado);

    // Devolver el número formateado como cadena, asegurando los decimales
    return numero.toFixed(2); // Asegura siempre dos decimales en la salida
}
function convertirAMonedaDecimal(valor) {
    // Reemplazar coma por punto
    if (typeof valor === 'string') {
        valor = valor.replace(',', '.'); // Cambiar la coma por el punto
    }
    // Convertir a número flotante
    return parseFloat(valor);
}

function formatoNumero(valor) {
    // Reemplaza la coma por punto y elimina otros caracteres no numéricos (como $)
    return parseFloat(valor.replace(/[^0-9,]+/g, '').replace(',', '.')) || 0;
}

function parseDecimal(value) {
    return parseFloat(value.replace(',', '.'));
}


function formatMoneda(valor) {
    // Convertir a string, cambiar el punto decimal a coma y agregar separadores de miles
    let formateado = valor
        .toString()
        .replace('.', ',') // Cambiar punto decimal a coma
        .replace(/\B(?=(\d{3})+(?!\d))/g, "."); // Agregar separadores de miles

    // Agregar el símbolo $ al inicio
    return `$ ${formateado}`;
}


function toggleAcciones(id) {
    const dropdown = document.querySelector(`.acciones-menu[data-id='${id}'] .acciones-dropdown`);
    const isVisible = dropdown.style.display === 'block';

    // Oculta todos los demás menús desplegables
    document.querySelectorAll('.acciones-dropdown').forEach(el => el.style.display = 'none');

    if (!isVisible) {
        // Muestra el menú
        dropdown.style.display = 'block';

        // Obtén las coordenadas del botón
        const menuButton = document.querySelector(`.acciones-menu[data-id='${id}']`);
        const rect = menuButton.getBoundingClientRect();

        // Mueve el menú al body y ajusta su posición
        const dropdownClone = dropdown.cloneNode(true);
        dropdownClone.style.position = 'fixed';
        dropdownClone.style.left = `${rect.left}px`;
        dropdownClone.style.top = `${rect.bottom}px`;
        dropdownClone.style.zIndex = '10000';
        dropdownClone.style.display = 'block';

        // Limpia menús previos si es necesario
        document.querySelectorAll('.acciones-dropdown-clone').forEach(clone => clone.remove());

        dropdownClone.classList.add('acciones-dropdown-clone');
        document.body.appendChild(dropdownClone);
    }
}



function formatearFechaParaInput(fecha) {
    const m = moment(fecha, [moment.ISO_8601, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD']);
    return m.isValid() ? m.format('YYYY-MM-DD') : '';
}

function formatearFechaParaVista(fecha) {
    const m = moment(fecha, [moment.ISO_8601, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD']);
    return m.isValid() ? m.format('DD/MM/YYYY') : '';
}


function formatearMiles(valor) {
    let num = String(valor).replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatearSinMiles(valor) {
    if (!valor) return 0;

    // Si no tiene puntos, devolvés directamente el número original
    if (!valor.includes('.')) return parseFloat(valor) || 0;

    const limpio = valor.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(limpio);
    return isNaN(num) ? 0 : num;
}




function setValorInput(selector, valor) {
    const $el = $(selector);
    if ($el.hasClass("Inputmiles")) {
        $el.val(formatearMiles(valor ?? ""));
    } else {
        $el.val(valor ?? "");
    }
}


let audioContext = null;
let audioBuffer = null;


function limpiarModal(modalSelector, errorSelector) {
    const root = document.querySelector(modalSelector);
    if (!root) return;

    root.querySelectorAll('input, select, textarea').forEach(el => {
        // Reset valor
        if (el.type === 'checkbox' || el.type === 'radio') {
            el.checked = false;
        } else if (el.tagName === 'SELECT') {
            el.selectedIndex = 0;
        } else {
            el.value = '';
        }
        // Quitar clases de validación
        el.classList.remove('is-invalid', 'is-valid');
        // Vaciar mensaje si hay invalid-feedback contiguo
        const fb = el.nextElementSibling;
        if (fb && fb.classList.contains('invalid-feedback')) {
            fb.textContent = 'Campo obligatorio';
        }
    });

    if (errorSelector) {
        const err = document.querySelector(errorSelector);
        if (err) err.classList.add('d-none');
    }
}

function validarCampoIndividual(elOrSelector) {
    const el = typeof elOrSelector === 'string' ? document.querySelector(elOrSelector) : elOrSelector;
    if (!el) return true;

    const valor = (el.value || '').trim();
    let valido = true;
    let msg = 'Campo obligatorio';

    // required
    if (el.hasAttribute('required') && valor === '') {
        valido = false;
    }

    // email
    if (valido && el.type === 'email' && valor !== '') {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        valido = re.test(valor);
        if (!valido) msg = 'Correo inválido';
    }

    // patrón custom (data-pattern="[0-9]+")
    if (valido && el.dataset.pattern && valor !== '') {
        const reCustom = new RegExp(el.dataset.pattern);
        valido = reCustom.test(valor);
        if (!valido) msg = el.dataset.patternMsg || 'Formato inválido';
    }

    // largo mínimo/máximo
    const min = el.dataset.minlength ? parseInt(el.dataset.minlength) : null;
    const max = el.dataset.maxlength ? parseInt(el.dataset.maxlength) : null;

    if (valido && min && valor.length < min) {
        valido = false; msg = `Mínimo ${min} caracteres`;
    }
    if (valido && max && valor.length > max) {
        valido = false; msg = `Máximo ${max} caracteres`;
    }

    // aplicar estilo + mensaje
    const fb = el.nextElementSibling;
    if (!valido) {
        el.classList.add('is-invalid');
        el.classList.remove('is-valid');
        if (fb && fb.classList.contains('invalid-feedback')) fb.textContent = msg;
    } else {
        el.classList.remove('is-invalid');
        if (valor !== '' || el.hasAttribute('required')) {
            el.classList.add('is-valid');
        } else {
            el.classList.remove('is-valid');
        }
        if (fb && fb.classList.contains('invalid-feedback') && fb.textContent !== 'Campo obligatorio') {
            fb.textContent = 'Campo obligatorio';
        }
    }

    return valido;
}

function verificarErroresGenerales(modalSelector, errorSelector) {
    const root = document.querySelector(modalSelector);
    if (!root) return true;

    let valido = true;
    root.querySelectorAll('input[required], select[required], textarea[required]').forEach(el => {
        if (!validarCampoIndividual(el)) valido = false;
    });

    if (errorSelector) {
        const err = document.querySelector(errorSelector);
        if (err) err.classList.toggle('d-none', valido);
    }
    return valido;
}

function attachLiveValidation(modalSelector) {
    const root = document.querySelector(modalSelector);
    if (!root) return;

    root.querySelectorAll('input, select, textarea').forEach(el => {
        el.setAttribute('autocomplete', 'off');
        el.addEventListener('input', () => validarCampoIndividual(el));
        el.addEventListener('change', () => validarCampoIndividual(el));
        el.addEventListener('blur', () => validarCampoIndividual(el));
    });
}

/**
 * Por si querés dejar todo autocomplete off sin validar.
 * @param {string} modalSelector
 */
function setAutocompleteOff(modalSelector) {
    const root = document.querySelector(modalSelector);
    if (!root) return;
    root.querySelectorAll('input, select, textarea').forEach(el => el.setAttribute('autocomplete', 'off'));
}

function setFormValues(formSelector, model) {
    const form = document.querySelector(formSelector);
    if (!form || !model) return;

    const prefixes = ['#txt', '#cmb', '#dt', '#sel', '#'];
    for (const [key, val] of Object.entries(model)) {
        let el = null;
        for (const p of prefixes) {
            el = form.querySelector(`${p}${key}`);
            if (el) break;
        }
        if (!el) continue;

        if (el.type === 'checkbox' || el.type === 'radio') {
            el.checked = !!val;
        } else {
            el.value = val ?? '';
        }
        el.classList.remove('is-invalid', 'is-valid');
    }
}

function setFormValues(formSelector, model) {
    const form = document.querySelector(formSelector);
    if (!form || !model) return;

    const prefixes = ['#txt', '#cmb', '#dt', '#sel', '#'];
    for (const [key, val] of Object.entries(model)) {
        let el = null;
        for (const p of prefixes) {
            el = form.querySelector(`${p}${key}`);
            if (el) break;
        }
        if (!el) continue;

        if (el.type === 'checkbox' || el.type === 'radio') {
            el.checked = !!val;
        } else {
            el.value = val ?? '';
        }
        el.classList.remove('is-invalid', 'is-valid');
    }
}

function llenarSelect(selectId, data, valueField = 'Id', textField = 'Nombre', conOpcionVacia = true) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = conOpcionVacia ? '<option value="">Seleccione</option>' : '';
    (data || []).forEach(it => {
        const opt = document.createElement('option');
        opt.value = it[valueField];
        opt.textContent = it[textField];
        sel.appendChild(opt);
    });
}


function configurarOpcionesColumnas(tableSelector, menuSelector, storageKey) {
    const grid = $(tableSelector).DataTable();
    const columnas = grid.settings().init().columns;
    const container = $(menuSelector);
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');

    container.empty();

    columnas.forEach((col, index) => {
        // Saltar columna de acciones si data no existe
        if (!col.data) return;

        if (col.data && col.data !== "Id") { // Solo agregar columnas que no sean "Id"

            const isChecked = saved[`col_${index}`] !== undefined ? saved[`col_${index}`] : true;
            grid.column(index).visible(isChecked);

            const nombre = (typeof col.title === 'string' && col.title.trim() !== '') ? col.title : (col.data || `Col ${index}`);

            container.append(`
            <li>
              <label class="dropdown-item">
                <input type="checkbox" class="toggle-column" data-column="${index}" ${isChecked ? 'checked' : ''}>
                ${nombre}
              </label>
            </li>
        `);
        }
    });

    container.find('.toggle-column').on('change', function () {
        const idx = parseInt($(this).data('column'), 10);
        const on = $(this).is(':checked');
        saved[`col_${idx}`] = on;
        localStorage.setItem(storageKey, JSON.stringify(saved));
        grid.column(idx).visible(on);
    });
}

function validarCampos() {
    return verificarErroresGenerales('#modalEdicion', '#errorCampos');
}

$(document).on('click', function (e) {
    // Verificar si el clic está fuera de cualquier dropdown
    if (!$(e.target).closest('.acciones-menu').length) {
        $('.acciones-dropdown').hide(); // Cerrar todos los dropdowns
    }
});


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




/* ==========================================================
   MÓDULO DE FILTROS REUTILIZABLE (FilterManager)
   ========================================================== */

const Filters = (() => {
    const isEmpty = (v) => v === undefined || v === null || v === "";
    const todayISO = () => new Date().toISOString().slice(0, 10);
    const firstOfMonthISO = () => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
    };

    class FilterManager {
        /**
         * @param {Object} cfg
         *  - form: selector del form que agrupa filtros
         *  - fields: { alias: { el, param, parse(v), default() } }
         *  - onSearch: (paramsObject) => Promise | void
         *  - debounce: ms (default 250)
         *  - buttons: { search: '#btnBuscar', clear: '#btnLimpiar', keepDefaultsOnClear: true }
         */
        constructor(cfg) {
            this.cfg = { debounce: 250, buttons: {}, ...cfg };
            this.form = $(this.cfg.form);
            this.fields = this.cfg.fields || {};
            this._debouncedTimer = null;
        }

        // Defaults de conveniencia
        static todayISO = todayISO;
        static firstOfMonthISO = firstOfMonthISO;

        // Lee los valores "raw" desde el DOM
        readRaw() {
            const out = {};
            for (const [alias, f] of Object.entries(this.fields)) {
                const $el = $(f.el);
                out[alias] = $el.length ? $el.val() : null;
            }
            return out;
        }

        // Normaliza cada valor con parse() y arma objeto { paramName: value }
        normalize(raw) {
            const params = {};
            for (const [alias, f] of Object.entries(this.fields)) {
                const rawVal = raw[alias];
                const val = typeof f.parse === "function" ? f.parse(rawVal) : rawVal;
                if (!isEmpty(val)) params[f.param] = val;
            }
            return params;
        }

        // Construye URLSearchParams con lo no vacío
        toQuery(paramsObj) {
            const usp = new URLSearchParams();
            Object.entries(paramsObj || {}).forEach(([k, v]) => {
                if (!isEmpty(v)) usp.append(k, v);
            });
            return usp;
        }

        // Aplica defaults definidos en cada field (si existe y está vacío)
        applyDefaults() {
            for (const [_, f] of Object.entries(this.fields)) {
                if (!f.default) continue;
                const $el = $(f.el);
                if (!$el.length) continue;
                const current = $el.val();
                if (isEmpty(current)) $el.val(f.default());
            }
        }

        // Limpia todos los campos; si keepDefaults=true, re-aplica defaults después
        clear(keepDefaults = true) {
            for (const [_, f] of Object.entries(this.fields)) {
                const $el = $(f.el);
                if (!$el.length) continue;
                $el.val("");
                if ($.fn.select2 && $el.hasClass("select2-hidden-accessible")) {
                    $el.val(null).trigger("change");
                }
            }
            if (keepDefaults) this.applyDefaults();
        }

        // Lee + normaliza + devuelve también el query listo
        current() {
            const raw = this.readRaw();
            const norm = this.normalize(raw);
            const query = this.toQuery(norm);
            return { raw, norm, query };
        }

        // Disparar búsqueda
        async search() {
            if (typeof this.cfg.onSearch === "function") {
                const { norm } = this.current();
                await this.cfg.onSearch(norm);
            }
        }

        // Bind de eventos de Buscar/Limpiar + Enter + (opcional) auto-search con debounce
        bind() {
            const b = this.cfg.buttons || {};

            // Botón Buscar
            if (b.search && $(b.search).length) {
                $(b.search).off("click.fm").on("click.fm", async () => {
                    await this.search();
                });
            }

            // Botón Limpiar
            if (b.clear && $(b.clear).length) {
                $(b.clear).off("click.fm").on("click.fm", async () => {
                    this.clear(b.keepDefaultsOnClear !== false);
                    await this.search();
                });
            }

            // ENTER dispara búsqueda
            this.form.off("keydown.fm").on("keydown.fm", "input,select", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    this.search();
                }
            });

            // (Opcional) auto search con debounce al cambiar filtros
            const auto = this.cfg.autoSearch;
            if (auto) {
                const trigger = () => {
                    clearTimeout(this._debouncedTimer);
                    this._debouncedTimer = setTimeout(() => this.search(), this.cfg.debounce);
                };
                this.form.off("input.fm change.fm").on("input.fm change.fm", "input,select", trigger);
            }
        }
    }

    return { FilterManager };
})();

function escapeRegex(text) {
    return (text + '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}