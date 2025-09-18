// SistemaMaite.DAL/Repository/IOrdenesCorteRepository.cs
using SistemaMaite.Models;

namespace SistemaMaite.DAL.Repository
{
    public interface IOrdenesCorteRepository
    {
        Task<List<OrdenesCorte>> Listar(DateTime? desde, DateTime? hasta, int? idEstado, string? texto);
        Task<OrdenesCorte?> Obtener(int id);

        Task<bool> InsertarConDetalles(OrdenesCorte orden,
                                       OrdenesCorteProducto producto,
                                       IEnumerable<OrdenCorteProductosVariante> variantes,
                                       IEnumerable<OrdenesCorteInsumo> insumos);

        Task<bool> ActualizarConDetalles(OrdenesCorte orden,
                                         OrdenesCorteProducto producto,
                                         IEnumerable<OrdenCorteProductosVariante> variantes,
                                         IEnumerable<OrdenesCorteInsumo> insumos);

        Task<bool> Eliminar(int id);

        // Catálogos mínimos (si te sirven en combos)
        Task<List<OrdenesCorteEstado>> ObtenerEstados();
    }
}
