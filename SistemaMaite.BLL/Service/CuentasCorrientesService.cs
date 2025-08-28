﻿// SistemaMaite.BLL.Service/CuentasCorrientesService.cs
using SistemaMaite.DAL.Repository;
using SistemaMaite.Models;

namespace SistemaMaite.BLL.Service
{
    public class CuentasCorrientesService : ICuentasCorrientesService
    {
        private readonly ICuentasCorrientesRepository<ClientesCuentaCorriente> _repo;
        public CuentasCorrientesService(ICuentasCorrientesRepository<ClientesCuentaCorriente> repo)
        {
            _repo = repo;
        }

        public Task<List<Cliente>> ListarClientes(string? texto) =>
            _repo.ListarClientes(texto);

        public Task<(List<ClientesCuentaCorriente> Lista, decimal SaldoAnterior)> ListarConSaldoAnterior(
            int idCliente, DateTime? desde, DateTime? hasta, int? idSucursal, string? texto) =>
            _repo.ListarConSaldoAnterior(idCliente, desde, hasta, idSucursal, texto);

        public Task<decimal> ObtenerSaldo(int idCliente, int? idSucursal) =>
            _repo.ObtenerSaldo(idCliente, idSucursal);

        public Task<ClientesCuentaCorriente?> Obtener(int id) =>
            _repo.Obtener(id);

        public Task<bool> InsertarManual(ClientesCuentaCorriente mov, bool impactaCaja, int? idCuentaCaja) =>
            _repo.InsertarManual(mov, impactaCaja, idCuentaCaja);

        public Task<bool> ActualizarManual(ClientesCuentaCorriente mov, bool impactaCaja, int? idCuentaCaja) =>
            _repo.ActualizarManual(mov, impactaCaja, idCuentaCaja);

        public Task<bool> EliminarManual(int id) =>
            _repo.EliminarManual(id);

        public Task<bool> ExisteVenta(int idVenta) =>
            _repo.ExisteVenta(idVenta);

        public Task<int?> ObtenerCuentaCajaDeMovimientoCC(int idMovimientoCC) =>
            _repo.ObtenerCuentaCajaDeMovimientoCC(idMovimientoCC);

        // helper sync (usa .Result de forma controlada)
        public int? ObtenerCuentaCajaDeMovimientoCCSync(int idMovimientoCC) =>
            _repo.ObtenerCuentaCajaDeMovimientoCC(idMovimientoCC).GetAwaiter().GetResult();
    }
}
