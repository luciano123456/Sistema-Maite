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
    public class ProvinciasRepository : IProvinciasRepository<Provincia>
    {

        private readonly SistemaMaiteContext _dbcontext;

        public ProvinciasRepository(SistemaMaiteContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(Provincia model)
        {
            _dbcontext.Provincias.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            Provincia model = _dbcontext.Provincias.First(c => c.Id == id);
            _dbcontext.Provincias.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(Provincia model)
        {
            _dbcontext.Provincias.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<Provincia> Obtener(int id)
        {
            Provincia model = await _dbcontext.Provincias.FindAsync(id);
            return model;
        }
        public async Task<IQueryable<Provincia>> ObtenerTodos()
        {
            IQueryable<Provincia> query = _dbcontext.Provincias;
            return await Task.FromResult(query);
        }




    }
}
