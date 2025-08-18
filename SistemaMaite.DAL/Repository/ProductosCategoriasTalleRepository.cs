using Microsoft.EntityFrameworkCore;
using SistemaMaite.DAL.DataContext;
using SistemaMaite.Models;
using System;
using System.Collections.Generic;
using System.Diagnostics.Contracts;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory;

namespace SistemaMaite.DAL.Repository
{
    public class ProductosCategoriasTalleRepository : IProductosCategoriasTalleRepository<ProductosCategoriasTalle>
    {

        private readonly SistemaMaiteContext _dbcontext;

        public ProductosCategoriasTalleRepository(SistemaMaiteContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(ProductosCategoriasTalle model)
        {
            _dbcontext.ProductosCategoriasTalles.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            ProductosCategoriasTalle model = _dbcontext.ProductosCategoriasTalles.First(c => c.Id == id);
            _dbcontext.ProductosCategoriasTalles.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(ProductosCategoriasTalle model)
        {
            _dbcontext.ProductosCategoriasTalles.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<ProductosCategoriasTalle> Obtener(int id)
        {
            var model = await _dbcontext.ProductosCategoriasTalles
                .Include(x => x.IdCategoriaNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);
            return model;
        }


        public async Task<IQueryable<ProductosCategoriasTalle>> ObtenerTodos()
        {
            IQueryable<ProductosCategoriasTalle> query = _dbcontext.ProductosCategoriasTalles.Include(x => x.IdCategoriaNavigation);
            return await Task.FromResult(query);
        }




    }
}
