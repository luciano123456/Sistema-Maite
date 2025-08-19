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
    public class CajasRepository : ICajasRepository<Caja>
    {

        private readonly SistemaMaiteContext _dbcontext;

        public CajasRepository(SistemaMaiteContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(Caja model)
        {
            _dbcontext.Cajas.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            Caja model = _dbcontext.Cajas.First(c => c.Id == id);
            _dbcontext.Cajas.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(Caja model)
        {
            _dbcontext.Cajas.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<Caja> Obtener(int id)
        {
            return await _dbcontext.Cajas
                .Include(c => c.IdSucursalNavigation) // Sucursal
                .Include(c => c.IdCuentaNavigation)   // Cuenta
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == id);
        }


        public async Task<IQueryable<Caja>> ObtenerTodos()
        {
            IQueryable<Caja> query = _dbcontext.Cajas;
            return await Task.FromResult(query);
        }




    }
}
