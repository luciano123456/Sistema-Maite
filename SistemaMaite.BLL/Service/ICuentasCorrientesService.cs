﻿// SistemaMaite.BLL.Service/ICuentasCorrientesService.cs
using SistemaMaite.Models;

namespace SistemaMaite.BLL.Service
{
    public interface ICuentasCorrientesService
    {
        Task<List<Cliente>> ListarClientes(string? texto);

        Task<(List<ClientesCuentaCorriente> Lista, decimal SaldoAnterior)> ListarConSaldoAnterior(
            int idCliente, DateTime? desde, DateTime? hasta, int? idSucursal, string? texto);

        Task<decimal> ObtenerSaldo(int idCliente, int? idSucursal);

        Task<ClientesCuentaCorriente?> Obtener(int id);

        Task<bool> InsertarManual(ClientesCuentaCorriente mov, bool impactaCaja, int? idCuentaCaja);
        Task<bool> ActualizarManual(ClientesCuentaCorriente mov, bool impactaCaja, int? idCuentaCaja);
        Task<bool> EliminarManual(int id);

        Task<bool> ExisteVenta(int idVenta);

        // Caja asociada a un cobro manual (CC.IdMov -> Caja.Id)
        Task<int?> ObtenerCuentaCajaDeMovimientoCC(int idMovimientoCC);

        // helper sync: sólo para mapping en Lista
        int? ObtenerCuentaCajaDeMovimientoCCSync(int idMovimientoCC);
    }
}
