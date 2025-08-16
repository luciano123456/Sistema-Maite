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
    public class SucursalesController : Controller
    {
        private readonly ISucursalesService _SucursalesService;

        public SucursalesController(ISucursalesService SucursalesService)
        {
            _SucursalesService = SucursalesService;
        }

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var Sucursales = await _SucursalesService.ObtenerTodos();

            var lista = Sucursales.Select(c => new VMGenericModel
            {
                Id = c.Id,
                Nombre = c.Nombre,
            }).ToList();

            return Ok(lista);
        }


        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMGenericModel model)
        {
            var result = new Sucursal
            {
                Id = model.Id,
                Nombre = model.Nombre,
            };

            bool respuesta = await _SucursalesService.Insertar(result);

            return Ok(new { valor = respuesta });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMGenericModel model)
        {
            var result = new Sucursal
            {
                Id = model.Id,
                Nombre = model.Nombre,
            };

            bool respuesta = await _SucursalesService.Actualizar(result);

            return Ok(new { valor = respuesta });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _SucursalesService.Eliminar(id);

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
             var result = await _SucursalesService.Obtener(id);

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