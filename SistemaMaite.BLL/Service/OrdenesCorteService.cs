// SistemaMaite.BLL/Service/OrdenesCorteService.cs
using SistemaMaite.DAL.Repository;
using SistemaMaite.Models;

namespace SistemaMaite.BLL.Service
{
    public class OrdenesCorteService : IOrdenesCorteService
    {
        private readonly IOrdenesCorteRepository _repo;
        public OrdenesCorteService(IOrdenesCorteRepository repo) { _repo = repo; }

        public Task<List<OrdenesCorte>> Listar(DateTime? desde, DateTime? hasta, int? idEstado, string? texto)
            => _repo.Listar(desde, hasta, idEstado, texto);

        public Task<OrdenesCorte?> Obtener(int id) => _repo.Obtener(id);

        public Task<bool> InsertarConDetalles(OrdenesCorte orden, OrdenesCorteProducto producto,
                                              IEnumerable<OrdenCorteProductosVariante> variantes,
                                              IEnumerable<OrdenesCorteInsumo> insumos)
            => _repo.InsertarConDetalles(orden, producto, variantes, insumos);

        public Task<bool> ActualizarConDetalles(OrdenesCorte orden, OrdenesCorteProducto producto,
                                                IEnumerable<OrdenCorteProductosVariante> variantes,
                                                IEnumerable<OrdenesCorteInsumo> insumos)
            => _repo.ActualizarConDetalles(orden, producto, variantes, insumos);

        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);

        public Task<List<OrdenesCorteEstado>> ObtenerEstados() => _repo.ObtenerEstados();
    }
}
