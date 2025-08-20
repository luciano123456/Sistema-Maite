using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaMaite.Application.Models.ViewModels;
using SistemaMaite.BLL.Service;
using SistemaMaite.Models;

namespace SistemaMaite.Application.Controllers
{
    [Authorize]
    public class CajasController : Controller
    {
        private readonly ICajasService _CajaService;

        public CajasController(ICajasService CajaService) => _CajaService = CajaService;

        [AllowAnonymous]
        public IActionResult Index() => View();

        private static bool EsTransferenciaPorConcepto(string? concepto) =>
            !string.IsNullOrWhiteSpace(concepto) &&
            concepto.IndexOf("Transferencia", StringComparison.OrdinalIgnoreCase) >= 0;

        // Helper: a partir de TipoMov + Importe retorna (Ingreso, Egreso)
        private static (decimal ingreso, decimal egreso) PartirImporte(string? tipoMov, decimal? importeDelFront, decimal ingresoVm, decimal egresoVm)
        {
            var tipo = (tipoMov ?? "").Trim();
            var importe = (importeDelFront ?? 0m);

            // Back-compat: si no vino Importe, usamos los campos viejos
            if (importe <= 0)
                importe = tipo.Equals("Ingreso", StringComparison.OrdinalIgnoreCase) ? ingresoVm : egresoVm;

            if (importe < 0) importe = Math.Abs(importe); // por las dudas

            if (tipo.Equals("Ingreso", StringComparison.OrdinalIgnoreCase))
                return (importe, 0m);

            // default: Egreso
            return (0m, importe);
        }

  

        // GET: /Caja/Lista
        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var query = await _CajaService.ObtenerTodos(); // IQueryable<Caja>

            // Materializá primero
            var cajas = await query
                .Include(c => c.IdCuentaNavigation)
                .Include(c => c.IdSucursalNavigation)
                .ToListAsync();

            var lista = cajas.Select(c =>
            {
                var esTransf = c.Concepto != null && c.Concepto.Contains("Transferencia");
                var puedeEliminar = (c.IdMov == null) || esTransf;

                return new VMCaja
                {
                    Id = c.Id,
                    IdSucursal = c.IdSucursal,
                    IdCuenta = c.IdCuenta,
                    Fecha = c.Fecha,
                    TipoMov = c.TipoMov,
                    IdMov = c.IdMov,
                    Concepto = c.Concepto,
                    Importe = c.Ingreso > 0 ? c.Ingreso : c.Egreso,
                    Egreso = c.Egreso,
                    Ingreso = c.Ingreso,
                    Cuenta = c.IdCuentaNavigation.Nombre,
                    Sucursal = c.IdSucursalNavigation.Nombre,
                    EsTransferencia = esTransf,
                    PuedeEliminar = puedeEliminar
                };
            }).ToList();

            return Ok(lista);
        }

        // POST: /Cajas/Insertar
        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMCaja model)
        {
            if (model is null) return BadRequest("Modelo inválido.");
            if (string.IsNullOrWhiteSpace(model.TipoMov)) return BadRequest("Tipo de movimiento requerido.");

            var (ing, egr) = PartirImporte(model.TipoMov, model.Importe, model.Ingreso, model.Egreso);
            if (ing <= 0 && egr <= 0) return BadRequest("El importe debe ser mayor a 0.");

            var entidad = new Caja
            {
                IdSucursal = model.IdSucursal,
                IdCuenta = model.IdCuenta,
                Fecha = model.Fecha,
                TipoMov = model.TipoMov,          // "Ingreso" | "Egreso"
                IdMov = model.IdMov,
                Concepto = model.Concepto,
                Ingreso = ing,
                Egreso = egr
            };

            var ok = await _CajaService.Insertar(entidad);
            return Ok(new { valor = ok });
        }

        // PUT: /Cajas/Actualizar
        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMCaja model)
        {
            if (model == null || model.Id <= 0) return BadRequest("Modelo inválido.");
            if (string.IsNullOrWhiteSpace(model.TipoMov)) return BadRequest("Tipo de movimiento requerido.");

            var (ing, egr) = PartirImporte(model.TipoMov, model.Importe, model.Ingreso, model.Egreso);
            if (ing <= 0 && egr <= 0) return BadRequest("El importe debe ser mayor a 0.");

            // Entidad “plana” (sin navegaciones) para evitar pisar FKs
            var entidad = new Caja
            {
                Id = model.Id,
                IdSucursal = model.IdSucursal,
                IdCuenta = model.IdCuenta,
                Fecha = model.Fecha,
                TipoMov = model.TipoMov,
                IdMov = model.IdMov,
                Concepto = model.Concepto,
                Ingreso = ing,
                Egreso = egr
            };

            var ok = await _CajaService.Actualizar(entidad);
            return Ok(new { valor = ok });
        }

        // DELETE: /Cajas/Eliminar?id=123
        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            if (id <= 0) return BadRequest(new { mensaje = "Id inválido" });

            var caja = await _CajaService.Obtener(id);
            if (caja == null) return NotFound(new { mensaje = "Movimiento no encontrado" });

            if (EsTransferenciaPorConcepto(caja.Concepto))
                return BadRequest(new { mensaje = "Este movimiento pertenece a una transferencia. Eliminá la transferencia desde su modal." });

            var ok = await _CajaService.Eliminar(id);
            return Ok(new { valor = ok });
        }

        // GET: /Cajas/EditarInfo?id=123
        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            if (id <= 0) return BadRequest(new { mensaje = "Id inválido" });

            var c = await _CajaService.Obtener(id);
            if (c == null) return NotFound();

            var esTransf = EsTransferenciaPorConcepto(c.Concepto);
            var puedeEliminar = c.IdMov == null;

            var vm = new VMCaja
            {
                Id = c.Id,
                IdSucursal = c.IdSucursal,
                IdCuenta = c.IdCuenta,
                Fecha = c.Fecha,
                TipoMov = c.TipoMov,
                IdMov = c.IdMov,
                Concepto = c.Concepto,
                Ingreso = c.Ingreso,
                Egreso = c.Egreso,
                Importe = c.Ingreso > 0 ? c.Ingreso : c.Egreso, // 👈 para el input único en el modal

                Cuenta = c.IdCuentaNavigation?.Nombre,
                Sucursal = c.IdSucursalNavigation?.Nombre,
                EsTransferencia = esTransf,
                PuedeEliminar = puedeEliminar
            };

            return Ok(vm);
        }

        public IActionResult Privacy() => View();
    }
}
