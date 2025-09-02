// DAL/Repository/InventarioRepository.cs
using Microsoft.EntityFrameworkCore;
using SistemaMaite.DAL.DataContext;
using SistemaMaite.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SistemaMaite.DAL.Repository
{
    public class InventarioRepository : IInventarioRepository<Inventario>
    {
        private readonly SistemaMaiteContext _db;
        public InventarioRepository(SistemaMaiteContext db) { _db = db; }

        private const string CONCEPTO_AJUSTE = "AJUSTE MANUAL";
        private const string CONCEPTO_TRANSF_A = "TRANSFERENCIA A";
        private const string CONCEPTO_TRANSF_DE = "TRANSFERENCIA DE";

        // ---------------- Existencias ----------------
        public async Task<List<Inventario>> ListarExistencias(int? idSucursal, int? idProducto, int? idVariante, string? texto)
        {
            var q = _db.Inventarios
                .Include(i => i.IdSucursalNavigation)
                .Include(i => i.IdProductoNavigation)
                .Include(i => i.IdProductoVarianteNavigation)
                    .ThenInclude(v => v.IdColorNavigation)
                        .ThenInclude(pc => pc.IdColorNavigation)
                .Include(i => i.IdProductoVarianteNavigation)
                    .ThenInclude(v => v.IdTalleNavigation)
                        .ThenInclude(pt => pt.IdTalleNavigation)
                .AsNoTracking()
                .AsQueryable();

            if (idSucursal.HasValue && idSucursal > 0) q = q.Where(i => i.IdSucursal == idSucursal.Value);
            if (idProducto.HasValue && idProducto > 0) q = q.Where(i => i.IdProducto == idProducto.Value);
            if (idVariante.HasValue && idVariante > 0) q = q.Where(i => i.IdProductoVariante == idVariante.Value);

            if (!string.IsNullOrWhiteSpace(texto))
            {
                var t = texto.Trim();
                q = q.Where(i => EF.Functions.Like(i.IdProductoNavigation.Descripcion ?? "", $"%{t}%"));
            }

            return await q
                .OrderBy(i => i.IdSucursal)
                .ThenBy(i => i.IdProducto)
                .ThenBy(i => i.IdProductoVariante)
                .ToListAsync();
        }

        public Task<Inventario?> ObtenerExistencia(int id)
        {
            return _db.Inventarios
                .Include(i => i.IdSucursalNavigation)
                .Include(i => i.IdProductoNavigation)
                .Include(i => i.IdProductoVarianteNavigation)
                    .ThenInclude(v => v.IdColorNavigation)
                        .ThenInclude(pc => pc.IdColorNavigation)
                .Include(i => i.IdProductoVarianteNavigation)
                    .ThenInclude(v => v.IdTalleNavigation)
                        .ThenInclude(pt => pt.IdTalleNavigation)
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.Id == id);
        }

        // ---------------- Movimientos ----------------
        public async Task<(List<InventarioMovimiento> Lista, decimal StockAnterior)> ListarMovimientos(
            int? idSucursal, int? idProducto, int? idVariante, DateTime? desde, DateTime? hasta, string? texto)
        {
            var baseQ = _db.InventarioMovimientos
                .Include(m => m.IdSucursalNavigation)
                .Include(m => m.IdInventarioNavigation).ThenInclude(i => i.IdProductoNavigation)
                .Include(m => m.IdInventarioNavigation).ThenInclude(i => i.IdProductoVarianteNavigation)
                    .ThenInclude(v => v.IdColorNavigation)
                        .ThenInclude(pc => pc.IdColorNavigation)
                .Include(m => m.IdInventarioNavigation).ThenInclude(i => i.IdProductoVarianteNavigation)
                    .ThenInclude(v => v.IdTalleNavigation)
                        .ThenInclude(pt => pt.IdTalleNavigation)
                .AsNoTracking()
                .AsQueryable();

            if (idSucursal.HasValue && idSucursal > 0) baseQ = baseQ.Where(m => m.IdSucursal == idSucursal.Value);
            if (idProducto.HasValue && idProducto > 0) baseQ = baseQ.Where(m => m.IdInventarioNavigation.IdProducto == idProducto.Value);
            if (idVariante.HasValue && idVariante > 0) baseQ = baseQ.Where(m => m.IdInventarioNavigation.IdProductoVariante == idVariante.Value);

            if (!string.IsNullOrWhiteSpace(texto))
            {
                var t = texto.Trim();
                baseQ = baseQ.Where(m => EF.Functions.Like(m.Concepto ?? "", $"%{t}%"));
            }

            decimal stockAnterior = 0m;
            if (desde.HasValue)
            {
                var d = desde.Value.Date;
                stockAnterior = await baseQ
                    .Where(m => m.Fecha < d)
                    .Select(m => (decimal?)(m.Entrada - m.Salida))
                    .SumAsync() ?? 0m;
            }

            var q = baseQ;
            if (desde.HasValue) q = q.Where(m => m.Fecha >= desde.Value.Date);
            if (hasta.HasValue)
            {
                var h = hasta.Value.Date.AddDays(1).AddTicks(-1);
                q = q.Where(m => m.Fecha <= h);
            }

            var lista = await q
                .OrderByDescending(m => m.Fecha)
                .ThenByDescending(m => m.Id)
                .ToListAsync();

            return (lista, stockAnterior);
        }

        // ---------------- Ajuste manual ----------------
        public async Task<bool> AjusteManual(InventarioMovimiento mov)
        {
            using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                var inv = await _db.Inventarios
                    .FirstOrDefaultAsync(i =>
                        i.IdSucursal == mov.IdSucursal &&
                        i.IdProducto == mov.IdInventarioNavigation.IdProducto &&
                        i.IdProductoVariante == mov.IdInventarioNavigation.IdProductoVariante);

                if (inv == null)
                {
                    inv = new Inventario
                    {
                        IdSucursal = mov.IdSucursal,
                        IdProducto = mov.IdInventarioNavigation.IdProducto,
                        IdProductoVariante = mov.IdInventarioNavigation.IdProductoVariante,
                        Cantidad = 0m
                    };
                    _db.Inventarios.Add(inv);
                    await _db.SaveChangesAsync();
                }

                inv.Cantidad += mov.Entrada - mov.Salida;
                _db.Inventarios.Update(inv);
                await _db.SaveChangesAsync();

                mov.IdInventario = inv.Id;
                mov.Concepto = string.IsNullOrWhiteSpace(mov.Concepto) ? CONCEPTO_AJUSTE : mov.Concepto;
                mov.IdMov = 0; // manual
                _db.InventarioMovimientos.Add(mov);
                await _db.SaveChangesAsync();

                await tx.CommitAsync();
                return true;
            }
            catch
            {
                await tx.RollbackAsync();
                return false;
            }
        }

        // ---------------- Transferencias (cabecera + detalle + impacto) ----------------
        public Task<InventarioTransfSucursal?> ObtenerTransferencia(int id)
        {
            return _db.InventarioTransfSucursales
                .Include(t => t.IdSucursalOrigenNavigation)
                .Include(t => t.IdSucursalDestinoNavigation)
                .Include(t => t.InventarioTransfSucursalesProductos)
                    .ThenInclude(p => p.InventarioTransfSucursalesProductosVariantes)
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == id);
        }

        public async Task<bool> CrearTransferencia(
            InventarioTransfSucursal transf,
            IEnumerable<InventarioTransfSucursalesProducto> productos,
            IEnumerable<InventarioTransfSucursalesProductosVariante> variantes)
        {
            using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                _db.InventarioTransfSucursales.Add(transf);
                await _db.SaveChangesAsync();

                var prodList = productos.Select(p => { p.IdTransfSucursal = transf.Id; return p; }).ToList();
                _db.InventarioTransfSucursalesProductos.AddRange(prodList);
                await _db.SaveChangesAsync();

                var varList = variantes.Select(v =>
                {
                    var padre = prodList.First(pp => pp.IdProducto == v.IdProducto);
                    v.IdTransfSucursalProducto = padre.Id;
                    return v;
                }).ToList();
                _db.InventarioTransfSucursalesProductosVariantes.AddRange(varList);
                await _db.SaveChangesAsync();

                var sucOri = await _db.Sucursales.FindAsync(transf.IdSucursalOrigen);
                var sucDes = await _db.Sucursales.FindAsync(transf.IdSucursalDestino);
                var conceptoOrigen = $"{CONCEPTO_TRANSF_A} {sucDes?.Nombre ?? ("Suc " + transf.IdSucursalDestino)}";
                var conceptoDestino = $"{CONCEPTO_TRANSF_DE} {sucOri?.Nombre ?? ("Suc " + transf.IdSucursalOrigen)}";

                foreach (var v in varList)
                {
                    var invOri = await EnsureInventario(transf.IdSucursalOrigen, v.IdProducto, v.IdProductoVariante);
                    invOri.Cantidad -= v.Cantidad;
                    _db.Inventarios.Update(invOri);

                    _db.InventarioMovimientos.Add(new InventarioMovimiento
                    {
                        IdInventario = invOri.Id,
                        IdSucursal = transf.IdSucursalOrigen,
                        Fecha = transf.Fecha,
                        TipoMov = "TRANSFERENCIA",
                        IdMov = transf.Id,
                        Concepto = conceptoOrigen,
                        Entrada = 0m,
                        Salida = v.Cantidad
                    });

                    var invDes = await EnsureInventario(transf.IdSucursalDestino, v.IdProducto, v.IdProductoVariante);
                    invDes.Cantidad += v.Cantidad;
                    _db.Inventarios.Update(invDes);

                    _db.InventarioMovimientos.Add(new InventarioMovimiento
                    {
                        IdInventario = invDes.Id,
                        IdSucursal = transf.IdSucursalDestino,
                        Fecha = transf.Fecha,
                        TipoMov = "TRANSFERENCIA",
                        IdMov = transf.Id,
                        Concepto = conceptoDestino,
                        Entrada = v.Cantidad,
                        Salida = 0m
                    });
                }

                await _db.SaveChangesAsync();
                await tx.CommitAsync();
                return true;
            }
            catch
            {
                await tx.RollbackAsync();
                return false;
            }
        }

        public async Task<bool> ActualizarTransferencia(
            InventarioTransfSucursal transf,
            IEnumerable<InventarioTransfSucursalesProducto> productos,
            IEnumerable<InventarioTransfSucursalesProductosVariante> variantes)
        {
            using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                // revertir impacto previo
                var movs = await _db.InventarioMovimientos
                    .Where(m => m.IdMov == transf.Id && m.TipoMov == "TRANSFERENCIA").ToListAsync();

                foreach (var m in movs)
                {
                    var inv = await _db.Inventarios.FirstAsync(i => i.Id == m.IdInventario);
                    inv.Cantidad -= m.Entrada; // revertir
                    inv.Cantidad += m.Salida;
                    _db.InventarioMovimientos.Remove(m);
                    _db.Inventarios.Update(inv);
                }
                await _db.SaveChangesAsync();

                var detVars = await _db.InventarioTransfSucursalesProductosVariantes
                    .Where(v => v.IdTransfSucursalProductoNavigation.IdTransfSucursal == transf.Id).ToListAsync();
                if (detVars.Any()) _db.InventarioTransfSucursalesProductosVariantes.RemoveRange(detVars);

                var detProds = await _db.InventarioTransfSucursalesProductos
                    .Where(p => p.IdTransfSucursal == transf.Id).ToListAsync();
                if (detProds.Any()) _db.InventarioTransfSucursalesProductos.RemoveRange(detProds);
                await _db.SaveChangesAsync();

                // actualizar cabecera
                var ex = await _db.InventarioTransfSucursales.FirstAsync(t => t.Id == transf.Id);
                ex.IdSucursalOrigen = transf.IdSucursalOrigen;
                ex.IdSucursalDestino = transf.IdSucursalDestino;
                ex.Fecha = transf.Fecha;
                ex.Notas = transf.Notas;
                await _db.SaveChangesAsync();

                // reinsertar detalle e impactar (igual que crear)
                var prodList = productos.Select(p => { p.IdTransfSucursal = ex.Id; return p; }).ToList();
                _db.InventarioTransfSucursalesProductos.AddRange(prodList);
                await _db.SaveChangesAsync();

                var varList = variantes.Select(v =>
                {
                    var padre = prodList.First(pp => pp.IdProducto == v.IdProducto);
                    v.IdTransfSucursalProducto = padre.Id;
                    return v;
                }).ToList();
                _db.InventarioTransfSucursalesProductosVariantes.AddRange(varList);
                await _db.SaveChangesAsync();

                var sucOri = await _db.Sucursales.FindAsync(ex.IdSucursalOrigen);
                var sucDes = await _db.Sucursales.FindAsync(ex.IdSucursalDestino);
                var conceptoOrigen = $"{CONCEPTO_TRANSF_A} {sucDes?.Nombre ?? ("Suc " + ex.IdSucursalDestino)}";
                var conceptoDestino = $"{CONCEPTO_TRANSF_DE} {sucOri?.Nombre ?? ("Suc " + ex.IdSucursalOrigen)}";

                foreach (var v in varList)
                {
                    var invOri = await EnsureInventario(ex.IdSucursalOrigen, v.IdProducto, v.IdProductoVariante);
                    invOri.Cantidad -= v.Cantidad;
                    _db.Inventarios.Update(invOri);

                    _db.InventarioMovimientos.Add(new InventarioMovimiento
                    {
                        IdInventario = invOri.Id,
                        IdSucursal = ex.IdSucursalOrigen,
                        Fecha = ex.Fecha,
                        TipoMov = "TRANSFERENCIA",
                        IdMov = ex.Id,
                        Concepto = conceptoOrigen,
                        Entrada = 0m,
                        Salida = v.Cantidad
                    });

                    var invDes = await EnsureInventario(ex.IdSucursalDestino, v.IdProducto, v.IdProductoVariante);
                    invDes.Cantidad += v.Cantidad;
                    _db.Inventarios.Update(invDes);

                    _db.InventarioMovimientos.Add(new InventarioMovimiento
                    {
                        IdInventario = invDes.Id,
                        IdSucursal = ex.IdSucursalDestino,
                        Fecha = ex.Fecha,
                        TipoMov = "TRANSFERENCIA",
                        IdMov = ex.Id,
                        Concepto = conceptoDestino,
                        Entrada = v.Cantidad,
                        Salida = 0m
                    });
                }

                await _db.SaveChangesAsync();
                await tx.CommitAsync();
                return true;
            }
            catch
            {
                await tx.RollbackAsync();
                return false;
            }
        }

        public async Task<bool> EliminarTransferencia(int id)
        {
            using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                var ex = await _db.InventarioTransfSucursales.FirstOrDefaultAsync(t => t.Id == id);
                if (ex == null) return false;

                var movs = await _db.InventarioMovimientos
                    .Where(m => m.IdMov == id && m.TipoMov == "TRANSFERENCIA").ToListAsync();
                foreach (var m in movs)
                {
                    var inv = await _db.Inventarios.FirstAsync(i => i.Id == m.IdInventario);
                    inv.Cantidad -= m.Entrada;
                    inv.Cantidad += m.Salida;
                    _db.InventarioMovimientos.Remove(m);
                    _db.Inventarios.Update(inv);
                }
                await _db.SaveChangesAsync();

                var detVars = await _db.InventarioTransfSucursalesProductosVariantes
                    .Where(v => v.IdTransfSucursalProductoNavigation.IdTransfSucursal == id).ToListAsync();
                if (detVars.Any()) _db.InventarioTransfSucursalesProductosVariantes.RemoveRange(detVars);

                var detProds = await _db.InventarioTransfSucursalesProductos
                    .Where(p => p.IdTransfSucursal == id).ToListAsync();
                if (detProds.Any()) _db.InventarioTransfSucursalesProductos.RemoveRange(detProds);

                _db.InventarioTransfSucursales.Remove(ex);
                await _db.SaveChangesAsync();

                await tx.CommitAsync();
                return true;
            }
            catch
            {
                await tx.RollbackAsync();
                return false;
            }
        }

        public async Task<List<InventarioTransfSucursal>> HistorialTransferencias(int? idOrigen, int? idDestino, DateTime? desde, DateTime? hasta, string? texto)
        {
            var q = _db.InventarioTransfSucursales
                .Include(t => t.IdSucursalOrigenNavigation)
                .Include(t => t.IdSucursalDestinoNavigation)
                .Include(t => t.InventarioTransfSucursalesProductos)
                    .ThenInclude(p => p.InventarioTransfSucursalesProductosVariantes)
                .AsNoTracking()
                .AsQueryable();

            if (idOrigen.HasValue && idOrigen > 0) q = q.Where(t => t.IdSucursalOrigen == idOrigen.Value);
            if (idDestino.HasValue && idDestino > 0) q = q.Where(t => t.IdSucursalDestino == idDestino.Value);
            if (desde.HasValue) q = q.Where(t => t.Fecha >= desde.Value.Date);
            if (hasta.HasValue) q = q.Where(t => t.Fecha <= hasta.Value.Date.AddDays(1).AddTicks(-1));
            if (!string.IsNullOrWhiteSpace(texto))
            {
                var t = texto.Trim();
                q = q.Where(ti => EF.Functions.Like(ti.Notas ?? "", $"%{t}%"));
            }

            return await q.OrderByDescending(t => t.Fecha).ThenByDescending(t => t.Id).ToListAsync();
        }

        // ---------------- Helpers ----------------
        private async Task<Inventario> EnsureInventario(int idSucursal, int idProducto, int idVariante)
        {
            var inv = await _db.Inventarios
                .FirstOrDefaultAsync(i => i.IdSucursal == idSucursal && i.IdProducto == idProducto && i.IdProductoVariante == idVariante);

            if (inv != null) return inv;

            inv = new Inventario
            {
                IdSucursal = idSucursal,
                IdProducto = idProducto,
                IdProductoVariante = idVariante,
                Cantidad = 0m
            };
            _db.Inventarios.Add(inv);
            await _db.SaveChangesAsync();
            return inv;
        }
    }
}
