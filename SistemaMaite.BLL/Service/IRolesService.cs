using SistemaMaite.Models;

namespace SistemaMaite.BLL.Service
{
    public interface IRolesService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(UsuariosRoles model);
        Task<bool> Insertar(UsuariosRoles model);

        Task<UsuariosRoles> Obtener(int id);

        Task<IQueryable<UsuariosRoles>> ObtenerTodos();
    }

}
