using SistemaMaite.Models;

namespace SistemaMaite.DAL.Repository
{
    public interface IInventarioRepository<TEntity> where TEntity : class
    {
        // Existencias
        Task<List<Inventario>> ListarExistencias(int? idSucursal, int? idProducto, int? idVariante, string? texto);
        Task<Inventario?> ObtenerExistencia(int id);

        // Movimientos (con stock anterior)
        Task<(List<InventarioMovimiento> Lista, decimal StockAnterior)> ListarMovimientos(
            int? idSucursal, int? idProducto, int? idVariante, DateTime? desde, DateTime? hasta, string? texto);

        // Ajuste manual
        Task<bool> AjusteManual(InventarioMovimiento mov);

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
