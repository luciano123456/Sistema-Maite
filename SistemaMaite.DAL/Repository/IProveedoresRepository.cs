// /DAL/Repository/IProveedoresRepository.cs
using SistemaMaite.Models;

namespace SistemaMaite.DAL.Repository
{
    public interface IProveedoresRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);
        Task<bool> Insertar(Proveedor p);
        Task<bool> Actualizar(Proveedor p);
        Task<Proveedor?> Obtener(int id);
        Task<IQueryable<Proveedor>> ObtenerTodos();
    }
}
