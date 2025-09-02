// File: Application/Controllers/InventarioController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaMaite.Application.Models.ViewModels;
using SistemaMaite.BLL.Service;
using SistemaMaite.Models;

namespace SistemaMaite.Application.Controllers
{
    [Authorize]
    public class InventarioController : Controller
    {
        private readonly IInventarioService _srv;
        public InventarioController(IInventarioService srv) => _srv = srv;

        public IActionResult Index() => View();

        // ======================= Existencias =======================
        [HttpGet]
        public async Task<IActionResult> Existencias(int? idSucursal, int? idProducto, int? idVariante, string? texto)
        {
            var data = await _srv.ListarExistencias(idSucursal, idProducto, idVariante, texto);

            static string VarName(ProductosVariante? pv) =>
                $"{pv?.IdColorNavigation?.IdColorNavigation?.Nombre ?? ""} / {pv?.IdTalleNavigation?.IdTalleNavigation?.Nombre ?? ""}".Trim();

            var list = data.Select(i => new VMInventarioExistencia
            {
                IdSucursal = i.IdSucursal,
                Sucursal = i.IdSucursalNavigation?.Nombre ?? "",
                IdProducto = i.IdProducto,
                Producto = i.IdProductoNavigation?.Descripcion ?? $"Producto {i.IdProducto}",
                IdProductoVariante = (i.IdProductoVariante == 0 ? null : i.IdProductoVariante),
                Variante = (i.IdProductoVariante == 0 ? "" : VarName(i.IdProductoVarianteNavigation)),
                Cantidad = i.Cantidad
            }).ToList();

            return Ok(list);
        }

        // ======================= Movimientos =======================
        // ⚠️ AHORA admite 'flat=1' para devolver lista "plana" con saldo por fila (para DataTables).
        [HttpGet]
        public async Task<IActionResult> Movimientos(
            int? idSucursal, int? idProducto, int? idVariante,
            DateTime? desde, DateTime? hasta, string? texto, bool flat = false)
        {
            var (lista, stockAnterior) = await _srv.ListarMovimientos(idSucursal, idProducto, idVariante, desde, hasta, texto);

            if (flat)
            {
                // Orden cronológico para calcular saldo correctamente
                var ordenado = lista.OrderBy(m => m.Fecha).ThenBy(m => m.Id).ToList();
                var saldo = stockAnterior;
                var plano = new List<VMInventarioMovPlano>(ordenado.Count);

                foreach (var m in ordenado)
                {
                    var e = m.Entrada;
                    var s = m.Salida;
                    saldo += (e - s);

                    plano.Add(new VMInventarioMovPlano
                    {
                        Id = m.Id,
                        Fecha = m.Fecha,
                        Tipo = m.TipoMov ?? "",
                        Concepto = m.Concepto ?? "",
                        Entrada = e,
                        Salida = s,
                        Saldo = saldo,
                        Producto = m.IdInventarioNavigation.IdProductoNavigation.Descripcion,
                        Talle = m.IdInventarioNavigation.IdProductoVarianteNavigation.IdTalleNavigation.IdTalleNavigation.Nombre,
                        Color = m.IdInventarioNavigation.IdProductoVarianteNavigation.IdColorNavigation.IdColorNavigation.Nombre
                    });
                }

                // Lo devolvemos DESC por fecha (más reciente primero), que es como lo ve la grilla.
                plano = plano.OrderByDescending(p => p.Fecha).ThenByDescending(p => p.Id).ToList();
                return Ok(plano);
            }

            // Respuesta original (se mantiene para compatibilidad)
            var vm = new VMInventarioMovList
            {
                StockAnterior = stockAnterior,
                Movimientos = lista.Select(m => new VMInventarioMov
                {
                    Id = m.Id,
                    Fecha = m.Fecha,
                    TipoMov = m.TipoMov ?? "",
                    IdMov = m.IdMov,
                    Concepto = m.Concepto ?? "",
                    Entrada = m.Entrada,
                    Salida = m.Salida,
                    IdSucursal = m.IdSucursal,
                    Sucursal = m.IdSucursalNavigation?.Nombre ?? "",
                      Producto = m.IdInventarioNavigation.IdProductoNavigation.Descripcion,
                      Talle = m.IdInventarioNavigation.IdProductoVarianteNavigation.IdTalleNavigation.IdTalleNavigation.Nombre,
                      Color = m.IdInventarioNavigation.IdProductoVarianteNavigation.IdColorNavigation.IdColorNavigation.Nombre
                }).ToList()
            };

            return Ok(vm);
        }

        // ======================= Ajuste MANUAL (back original) =======================
        [HttpPost]
        public async Task<IActionResult> Ajuste([FromBody] VMAjusteInventario vm)
        {
            var ok = await _srv.AjusteManual(
                vm.IdSucursal,
                vm.IdProducto,
                vm.IdProductoVariante,
                vm.Fecha,
                vm.Concepto,
                vm.Tipo,
                vm.Cantidad
            );

            return Ok(new { valor = ok });
        }

        // ======================= NUEVO: RegistrarMovimiento (para front) =======================
        // POST /Inventario/RegistrarMovimiento
        // Acepta payload simple con variantes opcionales (distribuye y crea N movimientos)
        [HttpPost]
        [Route("Inventario/RegistrarMovimiento")]
        public async Task<IActionResult> RegistrarMovimiento([FromBody] VMAjusteInventarioFront vm)
        {
            if (vm is null || vm.IdSucursal <= 0 || vm.IdProducto <= 0 || string.IsNullOrWhiteSpace(vm.Tipo))
                return BadRequest(new { ok = false, mensaje = "Parámetros inválidos." });

            // Si hay variantes, las aplicamos una por una; si no, usamos Cantidad a nivel item.
            if (vm.Variantes != null && vm.Variantes.Count > 0)
            {
                foreach (var v in vm.Variantes)
                {
                    if (v.IdProductoVariante <= 0 || v.Cantidad <= 0)
                        continue;

                    var okVar = await _srv.AjusteManual(
                        vm.IdSucursal,
                        vm.IdProducto,
                        v.IdProductoVariante,
                        vm.Fecha,
                        vm.Nota ?? $"AJUSTE MANUAL ({vm.Tipo})",
                        vm.Tipo,
                        v.Cantidad
                    );

                    if (!okVar) return Ok(new { valor = false, mensaje = "No se pudo registrar el ajuste para una variante." });
                }

                return Ok(new { valor = true });
            }
            else
            {
                var cantidad = vm.Cantidad ?? 0m;
                if (cantidad <= 0m) return BadRequest(new { ok = false, mensaje = "Cantidad inválida." });

                var ok = await _srv.AjusteManual(
                    vm.IdSucursal,
                    vm.IdProducto,
                    null,
                    vm.Fecha,
                    vm.Nota ?? $"AJUSTE MANUAL ({vm.Tipo})",
                    vm.Tipo,
                    cantidad
                );

                return Ok(new { valor = ok });
            }
        }

        // ======================= Transferencias =======================
        [HttpGet]
        public async Task<IActionResult> ObtenerTransferencia(int id)
        {
            var t = await _srv.ObtenerTransferencia(id);
            if (t is null) return NotFound();

            static string VarName(ProductosVariante? pv) =>
                $"{pv?.IdColorNavigation?.IdColorNavigation?.Nombre ?? ""} / {pv?.IdTalleNavigation?.IdTalleNavigation?.Nombre ?? ""}".Trim();

            var vm = new VMInvTransferencia
            {
                Id = t.Id,
                IdSucursalOrigen = t.IdSucursalOrigen,
                IdSucursalDestino = t.IdSucursalDestino,
                Origen = t.IdSucursalOrigenNavigation?.Nombre ?? "",
                Destino = t.IdSucursalDestinoNavigation?.Nombre ?? "",
                Fecha = t.Fecha,
                Notas = t.Notas,
                Productos = (t.InventarioTransfSucursalesProductos ?? new List<InventarioTransfSucursalesProducto>())
                    .Select(p => new VMInvTransfProducto
                    {
                        Id = p.Id,
                        IdProducto = p.IdProducto,
                        Producto = p.IdProductoNavigation?.Descripcion ?? $"Producto {p.IdProducto}",
                        Variantes = (p.InventarioTransfSucursalesProductosVariantes ?? new List<InventarioTransfSucursalesProductosVariante>())
                            .Select(v => new VMInvTransfVariante
                            {
                                Id = v.Id,
                                IdProducto = v.IdProducto,
                                IdProductoVariante = v.IdProductoVariante,
                                Variante = VarName(v.IdProductoVarianteNavigation),
                                Cantidad = v.Cantidad
                            }).ToList()
                    }).ToList()
            };

            return Ok(vm);
        }

        [HttpPost]
        public async Task<IActionResult> CrearTransferencia([FromBody] VMInvTransferencia vm)
        {
            var (cab, prods, vars) = MapTransf(vm);
            var ok = await _srv.CrearTransferencia(cab, prods, vars);
            return Ok(new { valor = ok });
        }

        [HttpPut]
        public async Task<IActionResult> ActualizarTransferencia([FromBody] VMInvTransferencia vm)
        {
            var (cab, prods, vars) = MapTransf(vm);
            var ok = await _srv.ActualizarTransferencia(cab, prods, vars);
            return Ok(new { valor = ok });
        }

        [HttpDelete]
        public async Task<IActionResult> EliminarTransferencia(int id)
        {
            var ok = await _srv.EliminarTransferencia(id);
            return Ok(new { valor = ok });
        }

        [HttpGet]
        public async Task<IActionResult> HistorialTransferencias(int? idOrigen, int? idDestino, DateTime? desde, DateTime? hasta, string? texto)
        {
            var list = await _srv.HistorialTransferencias(idOrigen, idDestino, desde, hasta, texto);

            var vm = list.Select(t => new VMInvTransferencia
            {
                Id = t.Id,
                IdSucursalOrigen = t.IdSucursalOrigen,
                IdSucursalDestino = t.IdSucursalDestino,
                Origen = t.IdSucursalOrigenNavigation?.Nombre ?? "",
                Destino = t.IdSucursalDestinoNavigation?.Nombre ?? "",
                Fecha = t.Fecha,
                Notas = t.Notas
                // detalle no necesario en historial
            }).ToList();

            return Ok(vm);
        }

        // ======================= NUEVO: Transferir (para front) =======================
        // POST /Inventario/Transferir  (atajo: un producto + variantes)
        [HttpPost]
        [Route("Inventario/Transferir")]
        public async Task<IActionResult> Transferir([FromBody] VMTransferFront vm)
        {
            if (vm is null || vm.IdSucursalOrigen <= 0 || vm.IdSucursalDestino <= 0 || vm.IdSucursalDestino == vm.IdSucursalOrigen || vm.IdProducto <= 0)
                return BadRequest(new { ok = false, mensaje = "Parámetros inválidos." });

            if (vm.Variantes == null || vm.Variantes.Count == 0)
                return BadRequest(new { ok = false, mensaje = "Debes informar variantes con cantidades." });

            var cab = new InventarioTransfSucursal
            {
                Id = 0,
                IdSucursalOrigen = vm.IdSucursalOrigen,
                IdSucursalDestino = vm.IdSucursalDestino,
                Fecha = vm.Fecha,
                Notas = vm.Nota
            };

            var prod = new InventarioTransfSucursalesProducto
            {
                Id = 0,
                IdProducto = vm.IdProducto
                // IdTransfSucursal lo setea repo
            };

            var vars = vm.Variantes.Select(v => new InventarioTransfSucursalesProductosVariante
            {
                Id = 0,
                IdProducto = vm.IdProducto,
                IdProductoVariante = v.IdProductoVariante,
                Cantidad = v.Cantidad
                // IdTransfSucursalProducto lo setea repo
            }).ToList();

            // El repositorio espera listas
            var ok = await _srv.CrearTransferencia(
                cab,
                new List<InventarioTransfSucursalesProducto> { prod },
                vars
            );

            return Ok(new { valor = ok });
        }

        // --------- mappers privados (VM -> entidades dominio) ---------
        private static (InventarioTransfSucursal cab,
                        List<InventarioTransfSucursalesProducto> prods,
                        List<InventarioTransfSucursalesProductosVariante> vars)
            MapTransf(VMInvTransferencia vm)
        {
            var cab = new InventarioTransfSucursal
            {
                Id = vm.Id,
                IdSucursalOrigen = vm.IdSucursalOrigen,
                IdSucursalDestino = vm.IdSucursalDestino,
                Fecha = vm.Fecha,
                Notas = vm.Notas
            };

            var prods = new List<InventarioTransfSucursalesProducto>();
            var vars = new List<InventarioTransfSucursalesProductosVariante>();

            foreach (var p in vm.Productos ?? new())
            {
                prods.Add(new InventarioTransfSucursalesProducto
                {
                    Id = p.Id,
                    IdTransfSucursal = vm.Id,
                    IdProducto = p.IdProducto
                });

                foreach (var v in p.Variantes ?? new())
                {
                    vars.Add(new InventarioTransfSucursalesProductosVariante
                    {
                        Id = v.Id,
                        IdProducto = v.IdProducto,
                        IdProductoVariante = v.IdProductoVariante,
                        Cantidad = v.Cantidad
                        // IdTransfSucursalProducto lo resuelve el repo
                    });
                }
            }

            return (cab, prods, vars);
        }
    }
}
