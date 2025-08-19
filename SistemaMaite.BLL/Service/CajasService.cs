using SistemaMaite.DAL.Repository;
using SistemaMaite.Models;

namespace SistemaMaite.BLL.Service
{
    public class CajasService : ICajasService
    {

        private readonly ICajasRepository<Caja> _contactRepo;

        public CajasService(ICajasRepository<Caja> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(Caja model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(Caja model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<Caja> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<Caja>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
