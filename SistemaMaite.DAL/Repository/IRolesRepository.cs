using SistemaMaite.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaMaite.DAL.Repository
{
    public interface IRolesRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(UsuariosRoles model);
        Task<bool> Insertar(UsuariosRoles model);
        Task<UsuariosRoles> Obtener(int id);
        Task<IQueryable<UsuariosRoles>> ObtenerTodos();
    }
}
