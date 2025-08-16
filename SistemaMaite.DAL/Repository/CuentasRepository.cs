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
    public class CuentasRepository : ICuentasRepository<Cuenta>
    {

        private readonly SistemaMaiteContext _dbcontext;

        public CuentasRepository(SistemaMaiteContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(Cuenta model)
        {
            _dbcontext.Cuentas.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            Cuenta model = _dbcontext.Cuentas.First(c => c.Id == id);
            _dbcontext.Cuentas.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(Cuenta model)
        {
            _dbcontext.Cuentas.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<Cuenta> Obtener(int id)
        {
            Cuenta model = await _dbcontext.Cuentas.FindAsync(id);
            return model;
        }
        public async Task<IQueryable<Cuenta>> ObtenerTodos()
        {
            IQueryable<Cuenta> query = _dbcontext.Cuentas;
            return await Task.FromResult(query);
        }




    }
}
