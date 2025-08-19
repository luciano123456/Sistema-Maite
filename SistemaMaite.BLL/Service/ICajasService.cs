using SistemaMaite.Models;

namespace SistemaMaite.BLL.Service
{
    public interface ICajasService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Caja model);
        Task<bool> Insertar(Caja model);

        Task<Caja> Obtener(int id);

        Task<IQueryable<Caja>> ObtenerTodos();
    }

}
