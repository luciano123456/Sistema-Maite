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
    public class OrdenesCorteEtapasEstadosRepository : IOrdenesCorteEtapasEstadosRepository<OrdenesCorteEtapasEstado>
    {

        private readonly SistemaMaiteContext _dbcontext;

        public OrdenesCorteEtapasEstadosRepository(SistemaMaiteContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(OrdenesCorteEtapasEstado model)
        {
            _dbcontext.OrdenesCorteEtapasEstados.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            OrdenesCorteEtapasEstado model = _dbcontext.OrdenesCorteEtapasEstados.First(c => c.Id == id);
            _dbcontext.OrdenesCorteEtapasEstados.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(OrdenesCorteEtapasEstado model)
        {
            _dbcontext.OrdenesCorteEtapasEstados.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<OrdenesCorteEtapasEstado> Obtener(int id)
        {
            OrdenesCorteEtapasEstado model = await _dbcontext.OrdenesCorteEtapasEstados.FindAsync(id);
            return model;
        }
        public async Task<IQueryable<OrdenesCorteEtapasEstado>> ObtenerTodos()
        {
            IQueryable<OrdenesCorteEtapasEstado> query = _dbcontext.OrdenesCorteEtapasEstados;
            return await Task.FromResult(query);
        }




    }
}
