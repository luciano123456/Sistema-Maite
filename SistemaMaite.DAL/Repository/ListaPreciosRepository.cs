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
    public class ListaPreciosRepository : IListaPreciosRepository<ListasPrecio>
    {

        private readonly SistemaMaiteContext _dbcontext;

        public ListaPreciosRepository(SistemaMaiteContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(ListasPrecio model)
        {
            _dbcontext.ListasPrecios.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            ListasPrecio model = _dbcontext.ListasPrecios.First(c => c.Id == id);
            _dbcontext.ListasPrecios.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(ListasPrecio model)
        {
            _dbcontext.ListasPrecios.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<ListasPrecio> Obtener(int id)
        {
            ListasPrecio model = await _dbcontext.ListasPrecios.FindAsync(id);
            return model;
        }
        public async Task<IQueryable<ListasPrecio>> ObtenerTodos()
        {
            IQueryable<ListasPrecio> query = _dbcontext.ListasPrecios;
            return await Task.FromResult(query);
        }




    }
}
