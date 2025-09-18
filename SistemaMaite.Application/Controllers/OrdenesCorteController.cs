// SistemaMaite.Application/Controllers/OrdenesCorteController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaMaite.Application.Models.ViewModels;
using SistemaMaite.BLL.Service;
using SistemaMaite.Models;

namespace SistemaMaite.Application.Controllers
{
    [Authorize]
    public class OrdenesCorteController : Controller
    {
        private readonly IOrdenesCorteService _srv;
        public OrdenesCorteController(IOrdenesCorteService srv) { _srv = srv; }

        public IActionResult Index() => View();
        public IActionResult NuevoModif(int? id) { if (id.HasValue) ViewBag.Data = id.Value; return View(); }

        // -------- Listado ----------
        [HttpGet]
        public async Task<IActionResult> Lista(DateTime? fechaDesde, DateTime? fechaHasta, int? idEstado, string? texto)
        {
            var data = await _srv.Listar(fechaDesde, fechaHasta, idEstado, texto);

            var vm = data.Select(o => new VMOrdenCorte
            {
                Id = o.Id,
                IdPersonal = o.IdPersonal,
                IdEstado = o.IdEstado,
                FechaInicio = o.FechaInicio,
                FechaFinalizacion = o.FechaFinalizacion,
                CantidadProducir = o.CantidadProducir,
                CantidadProducidas = o.CantidadProducidas,
                DiferenciaCorte = o.DiferenciaCorte,
                CantidadFinalReal = o.CantidadFinalReal,
                DiferenciaFinalReal = o.DiferenciaFinalReal,
                LargoTizada = o.LargoTizada,
                AnchoTizada = o.AnchoTizada,
                CantidadCapas = o.CantidadCapas,
                HoraInicioCorte = o.HoraInicioCorte,
                HoraFinCorte = o.HoraFinCorte,
                Estado = o.IdEstadoNavigation?.Nombre ?? "",
                Producto = o.IdNavigation == null ? new VMOrdenCorteProducto() : new VMOrdenCorteProducto
                {
                    Id = o.IdNavigation.Id,
                    IdProducto = o.IdNavigation.IdProducto,
                    Cantidad = o.IdNavigation.Cantidad,
                    Producto = o.IdNavigation.OrdenCorteProductosVariantes
                        .FirstOrDefault()?.IdProductoNavigation?.Descripcion ?? "" // si querés mostrar algo
                }
            }).ToList();

            return Ok(vm);
        }

        // -------- Obtener (para edición) ----------
        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var o = await _srv.Obtener(id);
            if (o is null) return NotFound();

            var vm = new VMOrdenCorte
            {
                Id = o.Id,
                IdPersonal = o.IdPersonal,
                IdEstado = o.IdEstado,
                FechaInicio = o.FechaInicio,
                FechaFinalizacion = o.FechaFinalizacion,
                CantidadProducir = o.CantidadProducir,
                CantidadProducidas = o.CantidadProducidas,
                DiferenciaCorte = o.DiferenciaCorte,
                CantidadFinalReal = o.CantidadFinalReal,
                DiferenciaFinalReal = o.DiferenciaFinalReal,
                LargoTizada = o.LargoTizada,
                AnchoTizada = o.AnchoTizada,
                CantidadCapas = o.CantidadCapas,
                HoraInicioCorte = o.HoraInicioCorte,
                HoraFinCorte = o.HoraFinCorte,
                Estado = o.IdEstadoNavigation?.Nombre ?? "",
                Producto = o.IdNavigation == null ? new VMOrdenCorteProducto() : new VMOrdenCorteProducto
                {
                    Id = o.IdNavigation.Id,
                    IdProducto = o.IdNavigation.IdProducto,
                    Cantidad = o.IdNavigation.Cantidad,
                    Producto = o.IdNavigation.OrdenCorteProductosVariantes
                        .FirstOrDefault()?.IdProductoNavigation?.Descripcion ?? "",
                    Variantes = (o.IdNavigation.OrdenCorteProductosVariantes ?? new List<OrdenCorteProductosVariante>())
                        .Select(v => new VMOrdenCorteProductoVariante
                        {
                            Id = v.Id,
                            IdProducto = v.IdProducto,
                            IdProductoVariante = v.IdProductoVariante,
                            Cantidad = v.Cantidad,
                            Color = v.IdProductoVarianteNavigation?.IdColorNavigation?.IdColorNavigation?.Nombre ?? "",
                            Talle = v.IdProductoVarianteNavigation?.IdTalleNavigation?.IdTalleNavigation?.Nombre ?? ""
                        }).ToList()
                },
                Insumos = (o.OrdenesCorteInsumos ?? new List<OrdenesCorteInsumo>())
                    .Select(i => new VMOrdenCorteInsumo
                    {
                        Id = i.Id,
                        IdInsumo = i.IdInsumo,
                        Cantidad = i.Cantidad,
                        Insumo = i.IdInsumoNavigation?.Descripcion ?? ""
                    }).ToList()
            };

            return Ok(vm);
        }

        // --------- Insertar ----------
        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMOrdenCorte vm)
        {
            var orden = MapOrden(vm);
            var (prod, vars) = MapProducto(vm.Producto);
            var insumos = MapInsumos(vm);

            var ok = await _srv.InsertarConDetalles(orden, prod, vars, insumos);
            return Ok(new { valor = ok });
        }

        // --------- Actualizar ----------
        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMOrdenCorte vm)
        {
            var orden = MapOrden(vm);
            var (prod, vars) = MapProducto(vm.Producto);
            var insumos = MapInsumos(vm);

            var ok = await _srv.ActualizarConDetalles(orden, prod, vars, insumos);
            return Ok(new { valor = ok });
        }

        // --------- Eliminar ----------
        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            var ok = await _srv.Eliminar(id);
            return Ok(new { valor = ok });
        }

        // --------- Catálogo estados (para combos) ----------
        [HttpGet]
        public async Task<IActionResult> Estados()
        {
            var list = await _srv.ObtenerEstados();
            return Ok(list.Select(e => new { e.Id, e.Nombre }));
        }

        // ------------- mappers privados -------------
        private static OrdenesCorte MapOrden(VMOrdenCorte vm) => new OrdenesCorte
        {
            Id = vm.Id,
            IdPersonal = vm.IdPersonal,
            IdEstado = vm.IdEstado,
            FechaInicio = vm.FechaInicio,
            FechaFinalizacion = vm.FechaFinalizacion,
            CantidadProducir = vm.CantidadProducir,
            CantidadProducidas = vm.CantidadProducidas,
            DiferenciaCorte = vm.DiferenciaCorte,
            CantidadFinalReal = vm.CantidadFinalReal,
            DiferenciaFinalReal = vm.DiferenciaFinalReal,
            LargoTizada = vm.LargoTizada,
            AnchoTizada = vm.AnchoTizada,
            CantidadCapas = vm.CantidadCapas,
            HoraInicioCorte = vm.HoraInicioCorte,
            HoraFinCorte = vm.HoraFinCorte
        };

        private static (OrdenesCorteProducto prod, List<OrdenCorteProductosVariante> vars)
            MapProducto(VMOrdenCorteProducto vm)
        {
            var prod = new OrdenesCorteProducto
            {
                Id = vm.Id,
                IdProducto = vm.IdProducto,
                Cantidad = vm.Cantidad
            };

            var vars = new List<OrdenCorteProductosVariante>();
            foreach (var v in vm.Variantes ?? new())
            {
                vars.Add(new OrdenCorteProductosVariante
                {
                    Id = v.Id,
                    IdProducto = v.IdProducto,
                    IdProductoVariante = v.IdProductoVariante,
                    Cantidad = v.Cantidad
                });
            }
            return (prod, vars);
        }

        private static List<OrdenesCorteInsumo> MapInsumos(VMOrdenCorte vm)
        {
            var list = new List<OrdenesCorteInsumo>();
            foreach (var i in vm.Insumos ?? new())
            {
                list.Add(new OrdenesCorteInsumo
                {
                    Id = i.Id,
                    IdInsumo = i.IdInsumo,
                    Cantidad = i.Cantidad
                });
            }
            return list;
        }
    }
}
