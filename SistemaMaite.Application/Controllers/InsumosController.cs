﻿// /Application/Controllers/InsumosController.cs
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
    public class InsumosController : Controller
    {
        private readonly IInsumosService _InsumosService;

        public InsumosController(IInsumosService InsumosService)
        {
            _InsumosService = InsumosService;
        }

        [AllowAnonymous]
        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var insumos = await _InsumosService.ObtenerTodos();

            var lista = insumos.Select(i => new VMInsumo
            {
                Id = i.Id,
                Codigo = i.Codigo,
                Descripcion = i.Descripcion,
                IdCategoria = i.IdCategoria,
                IdProveedor = i.IdProveedor,
                CostoUnitario = i.CostoUnitario
            }).ToList();

            return Ok(lista);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMInsumo model)
        {
            var entidad = new Insumo
            {
                Id = model.Id,
                Codigo = model.Codigo,
                Descripcion = model.Descripcion,
                IdCategoria = model.IdCategoria,
                IdProveedor = model.IdProveedor,
                CostoUnitario = model.CostoUnitario
            };

            bool ok = await _InsumosService.Insertar(entidad);
            return Ok(new { valor = ok });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMInsumo model)
        {
            var entidad = new Insumo
            {
                Id = model.Id,
                Codigo = model.Codigo,
                Descripcion = model.Descripcion,
                IdCategoria = model.IdCategoria,
                IdProveedor = model.IdProveedor,
                CostoUnitario = model.CostoUnitario
            };

            bool ok = await _InsumosService.Actualizar(entidad);
            return Ok(new { valor = ok });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _InsumosService.Eliminar(id);
            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var i = await _InsumosService.Obtener(id);
            if (i == null) return StatusCode(StatusCodes.Status404NotFound);

            var vm = new VMInsumo
            {
                Id = i.Id,
                Codigo = i.Codigo,
                Descripcion = i.Descripcion,
                IdCategoria = i.IdCategoria,
                IdProveedor = i.IdProveedor,
                CostoUnitario = i.CostoUnitario
            };

            return Ok(vm);
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
