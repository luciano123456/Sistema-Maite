using SistemaMaite.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaMaite.DAL.Repository
{
    public interface IPersonalSueldosRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(PersonalSueldo model);
        Task<bool> Insertar(PersonalSueldo model);
        Task<PersonalSueldo> Obtener(int id);
        Task<IQueryable<PersonalSueldo>> ObtenerTodos();
    }
}
