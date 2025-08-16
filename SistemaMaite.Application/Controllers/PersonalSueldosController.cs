using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaMaite.Application.Models;
using SistemaMaite.Application.Models.ViewModels;
using SistemaMaite.BLL.Service;
using SistemaMaite.Models;
using System.Diagnostics;

namespace SistemaMaite.Application.Controllers
{
    [Authorize]
    public class PersonalSueldosController : Controller
    {
        private readonly IPersonalSueldosService _PersonalSueldosService;

        public PersonalSueldosController(IPersonalSueldosService PersonalSueldosService)
        {
            _PersonalSueldosService = PersonalSueldosService;
        }

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var PersonalSueldos = await _PersonalSueldosService.ObtenerTodos();

            var lista = PersonalSueldos.Select(c => new VMPersonalSueldo
            {
                Id = c.Id,
                IdPersonal = c.IdPersonal,
                Fecha = c.Fecha,
                Concepto = c.Concepto,
                Importe = c.Importe,
                ImporteAbonado = c.ImporteAbonado,
                Saldo = c.Saldo,
                NotaInterna = c.NotaInterna
            }).ToList();

            return Ok(lista);
        }


        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMPersonalSueldo model)
        {
            var result = new PersonalSueldo
            {
                Id = model.Id,
                IdPersonal = model.IdPersonal,
                Fecha = model.Fecha,
                Concepto = model.Concepto,
                Importe = model.Importe,
                ImporteAbonado = model.ImporteAbonado,
                Saldo = model.Saldo,
                NotaInterna = model.NotaInterna
            };

            bool respuesta = await _PersonalSueldosService.Insertar(result);

            return Ok(new { valor = respuesta });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMPersonalSueldo model)
        {
            var result = new PersonalSueldo
            {
                Id = model.Id,
                IdPersonal = model.IdPersonal,
                Fecha = model.Fecha,
                Concepto = model.Concepto,
                Importe = model.Importe,
                ImporteAbonado = model.ImporteAbonado,
                Saldo = model.Saldo,
                NotaInterna = model.NotaInterna
            };

            bool respuesta = await _PersonalSueldosService.Actualizar(result);

            return Ok(new { valor = respuesta });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _PersonalSueldosService.Eliminar(id);

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
             var result = await _PersonalSueldosService.Obtener(id);

            if (result != null)
            {
                return StatusCode(StatusCodes.Status200OK, result);
            }
            else
            {
                return StatusCode(StatusCodes.Status404NotFound);
            }
        }
        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}