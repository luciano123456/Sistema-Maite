using SistemaMaite.Models;

namespace SistemaMaite.BLL.Service
{
    public interface IPersonalSueldosService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(PersonalSueldo model);
        Task<bool> Insertar(PersonalSueldo model);

        Task<PersonalSueldo> Obtener(int id);

        Task<IQueryable<PersonalSueldo>> ObtenerTodos();
    }

}
