﻿using Microsoft.EntityFrameworkCore;
using SistemaMaite.DAL.DataContext;
using SistemaMaite.Models;
using System.Linq;
using System.Threading.Tasks;

namespace SistemaMaite.DAL.Repository
{
    public class GastosRepository : IGastosRepository<Gasto>
    {
        private readonly SistemaMaiteContext _dbcontext;

        public GastosRepository(SistemaMaiteContext context)
        {
            _dbcontext = context;
        }

        public async Task<bool> Insertar(Gasto model)
        {
            using var tx = await _dbcontext.Database.BeginTransactionAsync();
            try
            {
                // 1) Insertar primero el gasto (sin IdCaja todavía)
                _dbcontext.Gastos.Add(model);
                await _dbcontext.SaveChangesAsync();

                // Ahora model.Id ya tiene valor
                int idGasto = model.Id;

                // 2) Insertar movimiento en caja con IdMov = idGasto
                var mov = new Caja
                {
                    IdSucursal = model.IdSucursal,
                    IdCuenta = model.IdCuenta,
                    Fecha = model.Fecha,
                    TipoMov = "EGRESO",
                    Concepto = "GASTO",
                    Ingreso = 0m,
                    Egreso = model.Importe,
                    IdMov = idGasto
                };

                _dbcontext.Cajas.Add(mov);
                await _dbcontext.SaveChangesAsync();

                // 3) Actualizar gasto con el IdCaja recién generado
                model.IdCaja = mov.Id;
                _dbcontext.Gastos.Update(model);
                await _dbcontext.SaveChangesAsync();

                await tx.CommitAsync();
                return true;
            }
            catch
            {
                await tx.RollbackAsync();
                return false;
            }
        }


        public async Task<bool> Actualizar(Gasto model)
        {
            using var tx = await _dbcontext.Database.BeginTransactionAsync();
            try
            {
                // 1) Buscar gasto existente
                var gastoDb = await _dbcontext.Gastos.FirstOrDefaultAsync(g => g.Id == model.Id);
                if (gastoDb is null) return false;

                // 2) Buscar la caja asociada
                var movCaja = await _dbcontext.Cajas.FirstOrDefaultAsync(c => c.Id == gastoDb.IdCaja && c.Concepto == "GASTO");
                if (movCaja is not null)
                {
                    movCaja.IdSucursal = model.IdSucursal;
                    movCaja.IdCuenta = model.IdCuenta;
                    movCaja.Fecha = model.Fecha;
                    movCaja.TipoMov = "EGRESO";
                    movCaja.Concepto = "GASTO";
                    movCaja.Ingreso = 0m;
                    movCaja.Egreso = model.Importe;
                    await _dbcontext.SaveChangesAsync();
                }

                // 3) Actualizar gasto
                gastoDb.IdSucursal = model.IdSucursal;
                gastoDb.IdCategoria = model.IdCategoria;
                gastoDb.IdCuenta = model.IdCuenta;
                gastoDb.Fecha = model.Fecha;
                gastoDb.Concepto = model.Concepto;
                gastoDb.Importe = model.Importe;
                // gastoDb.IdCaja se mantiene (ya asignado en insert)
                await _dbcontext.SaveChangesAsync();

                await tx.CommitAsync();
                return true;
            }
            catch
            {
                await tx.RollbackAsync();
                return false;
            }
        }

        public async Task<bool> Eliminar(int id)
        {
            using var tx = await _dbcontext.Database.BeginTransactionAsync();
            try
            {
                // 1) Buscar gasto
                var gastoDb = await _dbcontext.Gastos.FirstOrDefaultAsync(g => g.Id == id);
                if (gastoDb is null) return false;

                // 2) Eliminar movimiento de caja asociado
                if (gastoDb.IdCaja.HasValue)
                {
                    var movCaja = await _dbcontext.Cajas.FirstOrDefaultAsync(c => c.Id == gastoDb.IdCaja && c.Concepto == "GASTO");
                    if (movCaja is not null)
                    {
                        _dbcontext.Cajas.Remove(movCaja);
                        await _dbcontext.SaveChangesAsync();
                    }
                }

                // 3) Eliminar gasto
                _dbcontext.Gastos.Remove(gastoDb);
                await _dbcontext.SaveChangesAsync();

                await tx.CommitAsync();
                return true;
            }
            catch
            {
                await tx.RollbackAsync();
                return false;
            }
        }

        public async Task<Gasto> Obtener(int id)
        {
            Gasto model = await _dbcontext.Gastos.FindAsync(id);
            return model;
        }

        public async Task<IQueryable<Gasto>> ObtenerTodos()
        {
            IQueryable<Gasto> query = _dbcontext.Gastos;
            return await Task.FromResult(query);
        }
    }
}
