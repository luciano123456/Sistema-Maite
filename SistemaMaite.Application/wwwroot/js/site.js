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

function formatNumber(valor) {
    const num = Number(valor);
    return isNaN(num) ? "" : `$ ${num.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
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

function aplicarFormatoMoneda(input, callback) {
    input.addEventListener("blur", function () {
        let rawValue = this.value.trim();

        // Eliminar cualquier símbolo no numérico, excepto , y .
        rawValue = rawValue.replace(/[^\d.,-]/g, '');

        // Reemplazar separadores (puntos por nada, comas por punto)
        let parsedValue = parseFloat(rawValue.replace(/\./g, '').replace(',', '.'));

        // Validamos valor antes de formatear
        if (!isNaN(parsedValue)) {
            this.value = formatNumber(parsedValue);
        }

        // Callback opcional
        if (typeof callback === 'function') {
            callback();
        }
    });

    input.addEventListener("focus", function () {
        let cleanValue = this.value.replace(/[^\d.,-]/g, '');
        let parsed = parseFloat(cleanValue.replace(/\./g, '').replace(',', '.'));
        this.value = isNaN(parsed) ? "" : parsed;
    });
}


const formatoMoneda = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS', // Cambia "ARS" por el código de moneda que necesites
    minimumFractionDigits: 2
});

function convertirMonedaAfloat(valor) {
    if (!valor) return 0;

    // Eliminar cualquier carácter que no sea número, punto, coma o signo menos
    valor = valor.replace(/[^\d.,-]/g, '');

    // Reemplazar separadores (puntos de mil a nada, coma decimal a punto)
    valor = valor.replace(/\./g, '').replace(',', '.');

    return parseFloat(valor);
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

function formatearMoneda(valor) {
    const numero = Number(valor.toString().replace(/\./g, "").replace(",", "."));
    if (isNaN(numero)) return "";
    return `$ ${numero.toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}


function formatMoneda(valor) {
    // Convertir a string, cambiar el punto decimal a coma y agregar separadores de miles
    let formateado = valor
        .toString()
        .replace('.', ',') // Cambiar punto decimal a coma
        .replace(/\B(?=(\d{3})+(?!\d))/g, "."); // Agregar separadores de miles

    // Agregar el símbolo $ al inicio
    return `$${formateado}`;
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


