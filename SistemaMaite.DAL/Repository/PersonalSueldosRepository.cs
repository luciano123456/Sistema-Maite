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
    public class PersonalSueldosRepository : IPersonalSueldosRepository<PersonalSueldo>
    {

        private readonly SistemaMaiteContext _dbcontext;

        public PersonalSueldosRepository(SistemaMaiteContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(PersonalSueldo model)
        {
            _dbcontext.PersonalSueldos.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            PersonalSueldo model = _dbcontext.PersonalSueldos.First(c => c.Id == id);
            _dbcontext.PersonalSueldos.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(PersonalSueldo model)
        {
            _dbcontext.PersonalSueldos.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<PersonalSueldo> Obtener(int id)
        {
            PersonalSueldo model = await _dbcontext.PersonalSueldos.FindAsync(id);
            return model;
        }
        public async Task<IQueryable<PersonalSueldo>> ObtenerTodos()
        {
            IQueryable<PersonalSueldo> query = _dbcontext.PersonalSueldos;
            return await Task.FromResult(query);
        }




    }
}
