using SistemaMaite.DAL.Repository;
using SistemaMaite.Models;

namespace SistemaMaite.BLL.Service
{
    public class InventarioService : IInventarioService
    {
        private readonly IInventarioRepository<Inventario> _repo;

        public InventarioService(IInventarioRepository<Inventario> repo)
        {
            _repo = repo;
        }

        // -------- Existencias --------
        public Task<List<Inventario>> ListarExistencias(int? idSucursal, int? idProducto, int? idVariante, string? texto)
            => _repo.ListarExistencias(idSucursal, idProducto, idVariante, texto);

        // -------- Movimientos --------
        public Task<(List<InventarioMovimiento> Lista, decimal StockAnterior)> ListarMovimientos(
            int? idSucursal, int? idProducto, int? idVariante, DateTime? desde, DateTime? hasta, string? texto)
            => _repo.ListarMovimientos(idSucursal, idProducto, idVariante, desde, hasta, texto);

        // -------- Ajuste manual --------
        public Task<bool> AjusteManual(
            int idSucursal, int idProducto, int? idVariante,
            DateTime fecha, string? concepto, string tipo, decimal cantidad)
        {
            // normalizo
            var t = (tipo ?? "").Trim().ToUpperInvariant();
            var esSalida = t == "SALIDA";
            var cant = Math.Abs(cantidad); // SIEMPRE positiva

            var mov = new InventarioMovimiento
            {
                IdSucursal = idSucursal,
                Fecha = fecha,
                TipoMov = esSalida ? "SALIDA" : "ENTRADA",
                Concepto = string.IsNullOrWhiteSpace(concepto) ? string.Empty : concepto.Trim(),
                Entrada = esSalida ? 0m : cant,
                Salida = esSalida ? cant : 0m,

                IdInventarioNavigation = new Inventario
                {
                    IdSucursal = idSucursal,
                    IdProducto = idProducto,
                    IdProductoVariante = (idVariante ?? 0)
                }
            };

            return _repo.AjusteManual(mov);
        }

        // -------- Transferencias --------
        public Task<InventarioTransfSucursal?> ObtenerTransferencia(int id)
            => _repo.ObtenerTransferencia(id);

        public Task<bool> CrearTransferencia(InventarioTransfSucursal transf,
            IEnumerable<InventarioTransfSucursalesProducto> productos,
            IEnumerable<InventarioTransfSucursalesProductosVariante> variantes)
            => _repo.CrearTransferencia(transf, productos, variantes);

        public Task<bool> ActualizarTransferencia(InventarioTransfSucursal transf,
            IEnumerable<InventarioTransfSucursalesProducto> productos,
            IEnumerable<InventarioTransfSucursalesProductosVariante> variantes)
            => _repo.ActualizarTransferencia(transf, productos, variantes);

        public Task<bool> EliminarTransferencia(int id)
            => _repo.EliminarTransferencia(id);

        public Task<List<InventarioTransfSucursal>> HistorialTransferencias(
            int? idOrigen, int? idDestino, DateTime? desde, DateTime? hasta, string? texto)
            => _repo.HistorialTransferencias(idOrigen, idDestino, desde, hasta, texto);
    }
}
