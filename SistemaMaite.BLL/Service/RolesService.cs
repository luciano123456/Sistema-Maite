using SistemaMaite.DAL.Repository;
using SistemaMaite.Models;

namespace SistemaMaite.BLL.Service
{
    public class RolesService : IRolesService
    {

        private readonly IRolesRepository<UsuariosRoles> _contactRepo;

        public RolesService(IRolesRepository<UsuariosRoles> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(UsuariosRoles model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(UsuariosRoles model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<UsuariosRoles> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<UsuariosRoles>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
