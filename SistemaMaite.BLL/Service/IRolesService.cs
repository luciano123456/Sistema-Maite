using SistemaMaite.Models;

namespace SistemaMaite.BLL.Service
{
    public interface IRolesService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Rol model);
        Task<bool> Insertar(Rol model);

        Task<Rol> Obtener(int id);

        Task<IQueryable<Rol>> ObtenerTodos();
    }

}
