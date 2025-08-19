using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaMaite.Application.Models.ViewModels;
using SistemaMaite.BLL.Service;
using SistemaMaite.Models;

namespace SistemaMaite.Application.Controllers
{
    [Authorize]
    public class CajasController : Controller
    {
        private readonly ICajasService _CajaService;

        public CajasController(ICajasService CajaService)
        {
            _CajaService = CajaService;
        }

        // Vista (si navegás con fetch/JWT desde el front)
        [AllowAnonymous]
        public IActionResult Index() => View();

        // GET: /Caja/Lista
        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var cajas = await _CajaService.ObtenerTodos();

            var lista = cajas.Select(c => new VMCaja
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

                Cuenta = c.IdCuentaNavigation.Nombre,
                Sucursal = c.IdSucursalNavigation.Nombre
            }).ToList();

            return Ok(lista);
        }

        // POST: /Caja/Insertar
        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMCaja model)
        {
            if (model == null) return BadRequest("Modelo inválido.");

            var entidad = new Caja
            {
                IdSucursal = model.IdSucursal,
                IdCuenta = model.IdCuenta,
                Fecha = model.Fecha,
                TipoMov = model.TipoMov,
                IdMov = model.IdMov,
                Concepto = model.Concepto,
                Ingreso = model.Ingreso,
                Egreso = model.Egreso
            };

            var ok = await _CajaService.Insertar(entidad);
            return Ok(new { valor = ok });
        }

        // PUT: /Caja/Actualizar
        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMCaja model)
        {
            if (model == null || model.Id <= 0) return BadRequest("Modelo inválido.");

            var cajaDb = await _CajaService.Obtener(model.Id);
            if (cajaDb == null) return NotFound(new { mensaje = "Caja no encontrada" });

            cajaDb.IdSucursal = model.IdSucursal;
            cajaDb.IdCuenta = model.IdCuenta;
            cajaDb.Fecha = model.Fecha;
            cajaDb.TipoMov = model.TipoMov;
            cajaDb.IdMov = model.IdMov;
            cajaDb.Concepto = model.Concepto;
            cajaDb.Ingreso = model.Ingreso;
            cajaDb.Egreso = model.Egreso;

            var ok = await _CajaService.Actualizar(cajaDb);
            return Ok(new { valor = ok });
        }

        // DELETE: /Caja/Eliminar?id=123
        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            if (id <= 0) return BadRequest(new { mensaje = "Id inválido" });

            var ok = await _CajaService.Eliminar(id);
            return Ok(new { valor = ok });
        }

        // GET: /Caja/EditarInfo?id=123
        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            if (id <= 0) return BadRequest(new { mensaje = "Id inválido" });

            var c = await _CajaService.Obtener(id);
            if (c == null) return NotFound();

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

                Cuenta = c.IdCuentaNavigation.Nombre,
                Sucursal = c.IdSucursalNavigation.Nombre
            };

            return Ok(vm);
        }

        public IActionResult Privacy() => View();
    }
}
