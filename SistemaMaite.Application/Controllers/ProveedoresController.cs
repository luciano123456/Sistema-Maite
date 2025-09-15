// /Application/Controllers/ProveedoresController.cs
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
    public class ProveedoresController : Controller
    {
        private readonly IProveedoresService _service;

        public ProveedoresController(IProveedoresService service)
        {
            _service = service;
        }

        [AllowAnonymous]
        public IActionResult Index() => View();

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var proveedores = await _service.ObtenerTodos();
            var lista = proveedores
                .Select(p => new VMProveedor { Id = p.Id, Nombre = p.Nombre ?? string.Empty })
                .ToList();

            return Ok(lista);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMProveedor model)
        {
            var entidad = new Proveedor
            {
                Id = model.Id,
                Nombre = model.Nombre?.Trim() ?? string.Empty
            };

            bool ok = await _service.Insertar(entidad);
            return Ok(new { valor = ok });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMProveedor model)
        {
            var entidad = new Proveedor
            {
                Id = model.Id,
                Nombre = model.Nombre?.Trim() ?? string.Empty
            };

            bool ok = await _service.Actualizar(entidad);
            return Ok(new { valor = ok });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool ok = await _service.Eliminar(id);
            return StatusCode(StatusCodes.Status200OK, new { valor = ok });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var p = await _service.Obtener(id);
            if (p == null) return StatusCode(StatusCodes.Status404NotFound);

            var vm = new VMProveedor { Id = p.Id, Nombre = p.Nombre ?? string.Empty };
            return Ok(vm);
        }

        public IActionResult Privacy() => View();

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
            => View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}
