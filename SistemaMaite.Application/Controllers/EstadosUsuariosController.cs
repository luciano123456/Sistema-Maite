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
    public class EstadosUsuariosController : Controller
    {
        private readonly IEstadosUsuariosService _EstadosUsuariosService;

        public EstadosUsuariosController(IEstadosUsuariosService EstadosUsuariosService)
        {
            _EstadosUsuariosService = EstadosUsuariosService;
        }

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var EstadosUsuarios = await _EstadosUsuariosService.ObtenerTodos();

            var lista = EstadosUsuarios.Select(c => new VMEstadosUsuarios
            {
                Id = c.Id,
                Nombre = c.Nombre,
            }).ToList();

            return Ok(lista);
        }


        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMEstadosUsuarios model)
        {
            var EstadosUsuario = new UsuariosEstado
            {
                Id = model.Id,
                Nombre = model.Nombre,
            };

            bool respuesta = await _EstadosUsuariosService.Insertar(EstadosUsuario);

            return Ok(new { valor = respuesta });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMEstadosUsuarios model)
        {
            var EstadosUsuario = new UsuariosEstado
            {
                Id = model.Id,
                Nombre = model.Nombre,
            };

            bool respuesta = await _EstadosUsuariosService.Actualizar(EstadosUsuario);

            return Ok(new { valor = respuesta });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _EstadosUsuariosService.Eliminar(id);

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
             var EstadosUsuario = await _EstadosUsuariosService.Obtener(id);

            if (EstadosUsuario != null)
            {
                return StatusCode(StatusCodes.Status200OK, EstadosUsuario);
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