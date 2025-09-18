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
    public class OrdenesCorteEstadosRepository : IOrdenesCorteEstadosRepository<OrdenesCorteEstado>
    {

        private readonly SistemaMaiteContext _dbcontext;

        public OrdenesCorteEstadosRepository(SistemaMaiteContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(OrdenesCorteEstado model)
        {
            _dbcontext.OrdenesCorteEstados.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            OrdenesCorteEstado model = _dbcontext.OrdenesCorteEstados.First(c => c.Id == id);
            _dbcontext.OrdenesCorteEstados.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(OrdenesCorteEstado model)
        {
            _dbcontext.OrdenesCorteEstados.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<OrdenesCorteEstado> Obtener(int id)
        {
            OrdenesCorteEstado model = await _dbcontext.OrdenesCorteEstados.FindAsync(id);
            return model;
        }
        public async Task<IQueryable<OrdenesCorteEstado>> ObtenerTodos()
        {
            IQueryable<OrdenesCorteEstado> query = _dbcontext.OrdenesCorteEstados;
            return await Task.FromResult(query);
        }




    }
}
