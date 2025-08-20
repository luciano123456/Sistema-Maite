using SistemaMaite.DAL.Repository;
using SistemaMaite.Models;

namespace SistemaMaite.BLL.Service
{
    public class GastosService : IGastosService
    {

        private readonly IGastosRepository<Gasto> _contactRepo;

        public GastosService(IGastosRepository<Gasto> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(Gasto model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(Gasto model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<Gasto> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<Gasto>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
