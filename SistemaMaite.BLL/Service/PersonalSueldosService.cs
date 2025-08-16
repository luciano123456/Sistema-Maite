using SistemaMaite.DAL.Repository;
using SistemaMaite.Models;

namespace SistemaMaite.BLL.Service
{
    public class PersonalSueldosService : IPersonalSueldosService
    {

        private readonly IPersonalSueldosRepository<PersonalSueldo> _contactRepo;

        public PersonalSueldosService(IPersonalSueldosRepository<PersonalSueldo> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(PersonalSueldo model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(PersonalSueldo model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<PersonalSueldo> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<PersonalSueldo>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
