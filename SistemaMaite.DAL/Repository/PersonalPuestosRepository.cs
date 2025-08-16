﻿using Microsoft.EntityFrameworkCore;
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
    public class PersonalPuestosRepository : IPersonalPuestosRepository<PersonalPuesto>
    {

        private readonly SistemaMaiteContext _dbcontext;

        public PersonalPuestosRepository(SistemaMaiteContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(PersonalPuesto model)
        {
            _dbcontext.PersonalPuestos.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            PersonalPuesto model = _dbcontext.PersonalPuestos.First(c => c.Id == id);
            _dbcontext.PersonalPuestos.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(PersonalPuesto model)
        {
            _dbcontext.PersonalPuestos.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<PersonalPuesto> Obtener(int id)
        {
            PersonalPuesto model = await _dbcontext.PersonalPuestos.FindAsync(id);
            return model;
        }
        public async Task<IQueryable<PersonalPuesto>> ObtenerTodos()
        {
            IQueryable<PersonalPuesto> query = _dbcontext.PersonalPuestos;
            return await Task.FromResult(query);
        }




    }
}
