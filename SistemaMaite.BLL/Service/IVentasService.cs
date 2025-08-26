﻿// SistemaMaite.BLL/Service/IVentasService.cs
using SistemaMaite.Models;

namespace SistemaMaite.BLL.Service
{
    public interface IVentasService
    {
        Task<List<Venta>> Listar(DateTime? desde, DateTime? hasta, int? idCliente, int? idVendedor, string? estado, string? texto);
        Task<Venta?> Obtener(int id);

        Task<bool> InsertarConDetallesYPagos(Venta venta, IEnumerable<VentasProducto> items, IEnumerable<VentasProductosVariante> variantes,
                                             IEnumerable<ClientesCobro> pagos);
        Task<bool> ActualizarConDetallesYPagos(Venta venta, IEnumerable<VentasProducto> items, IEnumerable<VentasProductosVariante> variantes,
                                               IEnumerable<ClientesCobro> pagos);
        Task<bool> Eliminar(int id);

        Task<List<ClientesCobro>> ObtenerPagosPorVenta(int idVenta);
        Task<List<VentasProducto>> ObtenerItemsPorVenta(int idVenta);

        // Aux: Precios por lista, variantes, etc.
        Task<decimal?> ObtenerPrecioPorLista(int idProducto, int idListaPrecio);
        Task<List<ProductosVariante>> ObtenerVariantesPorProducto(int idProducto);
    }
}
