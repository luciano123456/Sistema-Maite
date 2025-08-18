using SistemaMaite.DAL.Repository;
using SistemaMaite.Models;

namespace SistemaMaite.BLL.Service
{
    public class ProductosCategoriasTalleService : IProductosCategoriasTalleService
    {

        private readonly IProductosCategoriasTalleRepository<ProductosCategoriasTalle> _contactRepo;

        public ProductosCategoriasTalleService(IProductosCategoriasTalleRepository<ProductosCategoriasTalle> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(ProductosCategoriasTalle model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(ProductosCategoriasTalle model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<ProductosCategoriasTalle> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<ProductosCategoriasTalle>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
