using SistemaMaite.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaMaite.DAL.Repository
{
    public interface ICajasRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Caja model);
        Task<bool> Insertar(Caja model);
        Task<Caja> Obtener(int id);
        Task<IQueryable<Caja>> ObtenerTodos();
    }
}
