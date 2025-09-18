// SistemaMaite.BLL/Service/IOrdenesCorteService.cs
using SistemaMaite.Models;

namespace SistemaMaite.BLL.Service
{
    public interface IOrdenesCorteService
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

        Task<List<OrdenesCorteEstado>> ObtenerEstados();
    }
}
