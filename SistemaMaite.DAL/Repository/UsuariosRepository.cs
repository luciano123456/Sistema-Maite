﻿using Microsoft.EntityFrameworkCore;
using SistemaMaite.DAL.DataContext;
using SistemaMaite.Models;

namespace SistemaMaite.DAL.Repository
{
    public class UsuariosRepository : IUsuariosRepository<User>
    {
        private readonly SistemaMaiteContext _dbcontext;

        public UsuariosRepository(SistemaMaiteContext context)
        {
            _dbcontext = context;
        }

        public async Task<bool> Actualizar(User model)
        {
            try
            {
                _dbcontext.Usuarios.Update(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch { return false; }
        }

        // ✔️ Actualizar con Sucursales
        public async Task<bool> Actualizar(User model, IEnumerable<int> idSucursales)
        {
            using var tx = await _dbcontext.Database.BeginTransactionAsync();
            try
            {
                _dbcontext.Usuarios.Update(model);
                await _dbcontext.SaveChangesAsync();

                await SyncUsuarioSucursales(model.Id, idSucursales ?? Enumerable.Empty<int>());

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
            try
            {
                var model = _dbcontext.Usuarios.First(c => c.Id == id);

                // ✔️ borrar enlaces de Sucursales
                var links = _dbcontext.UsuariosSucursales.Where(x => x.IdUsuario == id);
                _dbcontext.UsuariosSucursales.RemoveRange(links);

                _dbcontext.Usuarios.Remove(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch { return false; }
        }

        public async Task<bool> Insertar(User model)
        {
            try
            {
                _dbcontext.Usuarios.Add(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch { return false; }
        }

        // ✔️ Insertar con Sucursales
        public async Task<bool> Insertar(User model, IEnumerable<int> idSucursales)
        {
            using var tx = await _dbcontext.Database.BeginTransactionAsync();
            try
            {
                _dbcontext.Usuarios.Add(model);
                await _dbcontext.SaveChangesAsync(); // para obtener Id

                await SyncUsuarioSucursales(model.Id, idSucursales ?? Enumerable.Empty<int>());

                await tx.CommitAsync();
                return true;
            }
            catch
            {
                await tx.RollbackAsync();
                return false;
            }
        }

        public async Task<User> Obtener(int id)
        {
            try
            {
                var model = await _dbcontext.Usuarios.FindAsync(id);
                return model!;
            }
            catch { return null!; }
        }

        // ✔️ Usuario con Sucursales
        public async Task<User?> ObtenerConSucursales(int id)
        {
            try
            {
                var model = await _dbcontext.Usuarios
                    .Include(u => u.IdEstadoNavigation)
                    .Include(u => u.IdRolNavigation)
                    .Include(u => u.UsuariosSucursales)
                        .ThenInclude(us => us.IdSucursalNavigation)
                    .FirstOrDefaultAsync(u => u.Id == id);

                return model;
            }
            catch { return null; }
        }

        public async Task<User> ObtenerUsuario(string usuario)
        {
            try
            {
                var model = await _dbcontext.Usuarios
                    .Where(x => x.Usuario.ToUpper() == usuario.ToUpper())
                    .FirstOrDefaultAsync();
                return model!;
            }
            catch { return null!; }
        }

        public async Task<IQueryable<User>> ObtenerTodos()
        {
            try
            {
                IQueryable<User> query = _dbcontext.Usuarios
                    .Include(c => c.IdEstadoNavigation)
                    .Include(c => c.IdRolNavigation);
                return await Task.FromResult(query);
            }
            catch { return null!; }
        }

        /* ======================== Helpers ======================== */
        private async Task SyncUsuarioSucursales(int idUsuario, IEnumerable<int> idsDeseados)
        {
            var deseados = (idsDeseados ?? Enumerable.Empty<int>()).Distinct().ToHashSet();

            var actuales = await _dbcontext.UsuariosSucursales
                .Where(x => x.IdUsuario == idUsuario)
                .ToListAsync();

            var actualesSet = actuales.Select(a => a.IdSucursal).ToHashSet();

            // Insertar los nuevos
            var aInsertar = deseados.Except(actualesSet)
                .Select(idSuc => new UsuariosSucursal
                {
                    IdUsuario = idUsuario,
                    IdSucursal = idSuc
                }).ToList();

            if (aInsertar.Count > 0)
                _dbcontext.UsuariosSucursales.AddRange(aInsertar);

            // Borrar los que ya no están
            var aBorrar = actuales.Where(a => !deseados.Contains(a.IdSucursal)).ToList();
            if (aBorrar.Count > 0)
                _dbcontext.UsuariosSucursales.RemoveRange(aBorrar);

            if (aInsertar.Count > 0 || aBorrar.Count > 0)
                await _dbcontext.SaveChangesAsync();
        }
    }
}
