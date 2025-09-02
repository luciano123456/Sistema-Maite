using SistemaMaite.Models;

namespace SistemaMaite.BLL.Service
{
    public interface IInventarioService
    {
        // Existencias
        Task<List<Inventario>> ListarExistencias(int? idSucursal, int? idProducto, int? idVariante, string? texto);

        // Movimientos (lista + stockAnterior)
        Task<(List<InventarioMovimiento> Lista, decimal StockAnterior)> ListarMovimientos(
            int? idSucursal, int? idProducto, int? idVariante, DateTime? desde, DateTime? hasta, string? texto);

        // Ajuste manual (la capa de aplicación me pasa los parámetros crudos)
        Task<bool> AjusteManual(int idSucursal, int idProducto, int? idVariante,
                                DateTime fecha, string? concepto, string tipo, decimal cantidad);

        // Transferencias
        Task<InventarioTransfSucursal?> ObtenerTransferencia(int id);
        Task<bool> CrearTransferencia(InventarioTransfSucursal transf,
            IEnumerable<InventarioTransfSucursalesProducto> productos,
            IEnumerable<InventarioTransfSucursalesProductosVariante> variantes);

        Task<bool> ActualizarTransferencia(InventarioTransfSucursal transf,
            IEnumerable<InventarioTransfSucursalesProducto> productos,
            IEnumerable<InventarioTransfSucursalesProductosVariante> variantes);

        Task<bool> EliminarTransferencia(int id);

        Task<List<InventarioTransfSucursal>> HistorialTransferencias(
            int? idOrigen, int? idDestino, DateTime? desde, DateTime? hasta, string? texto);
    }
}
