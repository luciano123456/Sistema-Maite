// SistemaMaite.DAL/Repository/OrdenesCorteRepository.cs
using Microsoft.EntityFrameworkCore;
using SistemaMaite.DAL.DataContext;
using SistemaMaite.Models;

namespace SistemaMaite.DAL.Repository
{
    public class OrdenesCorteRepository : IOrdenesCorteRepository
    {
        private readonly SistemaMaiteContext _db;
        public OrdenesCorteRepository(SistemaMaiteContext db) { _db = db; }

        public async Task<List<OrdenesCorte>> Listar(DateTime? desde, DateTime? hasta, int? idEstado, string? texto)
        {
            var q = _db.OrdenesCortes
                .Include(o => o.IdEstadoNavigation)
                .Include(o => o.IdNavigation) // OrdenesCorteProducto
                    .ThenInclude(p => p.OrdenCorteProductosVariantes)
                        .ThenInclude(v => v.IdProductoNavigation) // para tener Descripcion
                .Include(o => o.OrdenesCorteInsumos)
                    .ThenInclude(i => i.IdInsumoNavigation)
                .AsNoTracking()
                .AsQueryable();

            if (desde.HasValue) q = q.Where(x => x.FechaInicio >= desde.Value.Date);
            if (hasta.HasValue) q = q.Where(x => x.FechaInicio <= hasta.Value.Date.AddDays(1).AddTicks(-1));
            if (idEstado.HasValue && idEstado > 0) q = q.Where(x => x.IdEstado == idEstado.Value);

            if (!string.IsNullOrWhiteSpace(texto))
            {
                var t = texto.Trim();
                q = q.Where(x =>
                    EF.Functions.Like(x.IdEstadoNavigation.Nombre, $"%{t}%") ||
                    (x.IdNavigation != null &&
                     x.IdNavigation.OrdenCorteProductosVariantes.Any(v =>
                         EF.Functions.Like(v.IdProductoNavigation.Descripcion, $"%{t}%"))));
            }

            return await q.OrderByDescending(x => x.FechaInicio)
                          .ThenByDescending(x => x.Id)
                          .ToListAsync();
        }

        public Task<OrdenesCorte?> Obtener(int id)
        {
            return _db.OrdenesCortes
                .Include(o => o.IdEstadoNavigation)
                .Include(o => o.IdNavigation)
                    .ThenInclude(p => p.OrdenCorteProductosVariantes)
                        .ThenInclude(v => v.IdProductoVarianteNavigation) // para Color/Talle
                .Include(o => o.IdNavigation)
                    .ThenInclude(p => p.OrdenCorteProductosVariantes)
                        .ThenInclude(v => v.IdProductoNavigation) // para Descripción de producto
                .Include(o => o.OrdenesCorteInsumos)
                    .ThenInclude(i => i.IdInsumoNavigation)
                .AsNoTracking()
                .FirstOrDefaultAsync(o => o.Id == id);
        }

        public async Task<bool> InsertarConDetalles(
            OrdenesCorte orden,
            OrdenesCorteProducto producto,
            IEnumerable<OrdenCorteProductosVariante> variantes,
            IEnumerable<OrdenesCorteInsumo> insumos)
        {
            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                // 1) Cabecera
                _db.OrdenesCortes.Add(orden);
                await _db.SaveChangesAsync();

                // 2) Producto
                producto.IdOrdenCorte = orden.Id;
                _db.OrdenesCorteProductos.Add(producto);
                await _db.SaveChangesAsync();

                // 3) Variantes
                foreach (var v in (variantes ?? Enumerable.Empty<OrdenCorteProductosVariante>()))
                {
                    v.IdOrdenCorteProducto = producto.Id;
                    _db.OrdenCorteProductosVariantes.Add(v);
                }
                await _db.SaveChangesAsync();

                // 4) Insumos
                foreach (var i in (insumos ?? Enumerable.Empty<OrdenesCorteInsumo>()))
                {
                    i.IdCorte = orden.Id;
                    _db.OrdenesCorteInsumos.Add(i);
                }
                await _db.SaveChangesAsync();

                await trx.CommitAsync();
                return true;
            }
            catch
            {
                await trx.RollbackAsync();
                return false;
            }
        }

        public async Task<bool> ActualizarConDetalles(
            OrdenesCorte orden,
            OrdenesCorteProducto producto,
            IEnumerable<OrdenCorteProductosVariante> variantes,
            IEnumerable<OrdenesCorteInsumo> insumos)
        {
            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                // Cabecera
                var ent = await _db.OrdenesCortes.FirstOrDefaultAsync(o => o.Id == orden.Id);
                if (ent is null) return false;

                ent.IdPersonal = orden.IdPersonal;
                ent.IdEstado = orden.IdEstado;
                ent.FechaInicio = orden.FechaInicio;
                ent.FechaFinalizacion = orden.FechaFinalizacion;
                ent.CantidadProducir = orden.CantidadProducir;
                ent.CantidadProducidas = orden.CantidadProducidas;
                ent.DiferenciaCorte = orden.DiferenciaCorte;
                ent.CantidadFinalReal = orden.CantidadFinalReal;
                ent.DiferenciaFinalReal = orden.DiferenciaFinalReal;
                ent.LargoTizada = orden.LargoTizada;
                ent.AnchoTizada = orden.AnchoTizada;
                ent.CantidadCapas = orden.CantidadCapas;
                ent.HoraInicioCorte = orden.HoraInicioCorte;
                ent.HoraFinCorte = orden.HoraFinCorte;
                await _db.SaveChangesAsync();

                // Producto (1 solo por orden)
                var prodEx = await _db.OrdenesCorteProductos
                    .FirstOrDefaultAsync(p => p.IdOrdenCorte == ent.Id);

                if (prodEx is null)
                {
                    producto.IdOrdenCorte = ent.Id;
                    _db.OrdenesCorteProductos.Add(producto);
                    await _db.SaveChangesAsync();
                    prodEx = producto;
                }
                else
                {
                    prodEx.IdProducto = producto.IdProducto;
                    prodEx.Cantidad = producto.Cantidad;
                    await _db.SaveChangesAsync();
                }

                // Variantes: reemplazo simple (limpio y re-inserto)
                var exVars = await _db.OrdenCorteProductosVariantes
                    .Where(v => v.IdOrdenCorteProducto == prodEx.Id)
                    .ToListAsync();
                if (exVars.Any())
                {
                    _db.OrdenCorteProductosVariantes.RemoveRange(exVars);
                    await _db.SaveChangesAsync();
                }
                foreach (var v in (variantes ?? Enumerable.Empty<OrdenCorteProductosVariante>()))
                {
                    v.IdOrdenCorteProducto = prodEx.Id;
                    _db.OrdenCorteProductosVariantes.Add(v);
                }
                await _db.SaveChangesAsync();

                // Insumos: reemplazo simple
                var exIns = await _db.OrdenesCorteInsumos
                    .Where(i => i.IdCorte == ent.Id)
                    .ToListAsync();
                if (exIns.Any())
                {
                    _db.OrdenesCorteInsumos.RemoveRange(exIns);
                    await _db.SaveChangesAsync();
                }
                foreach (var i in (insumos ?? Enumerable.Empty<OrdenesCorteInsumo>()))
                {
                    i.IdCorte = ent.Id;
                    _db.OrdenesCorteInsumos.Add(i);
                }
                await _db.SaveChangesAsync();

                await trx.CommitAsync();
                return true;
            }
            catch
            {
                await trx.RollbackAsync();
                return false;
            }
        }

        public async Task<bool> Eliminar(int id)
        {
            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var orden = await _db.OrdenesCortes.FirstOrDefaultAsync(o => o.Id == id);
                if (orden is null) return false;

                var prod = await _db.OrdenesCorteProductos.FirstOrDefaultAsync(p => p.IdOrdenCorte == id);
                if (prod != null)
                {
                    var vars = await _db.OrdenCorteProductosVariantes
                        .Where(v => v.IdOrdenCorteProducto == prod.Id).ToListAsync();
                    if (vars.Any()) _db.OrdenCorteProductosVariantes.RemoveRange(vars);
                    _db.OrdenesCorteProductos.Remove(prod);
                }

                var ins = await _db.OrdenesCorteInsumos.Where(i => i.IdCorte == id).ToListAsync();
                if (ins.Any()) _db.OrdenesCorteInsumos.RemoveRange(ins);

                _db.OrdenesCortes.Remove(orden);
                await _db.SaveChangesAsync();

                await trx.CommitAsync();
                return true;
            }
            catch
            {
                await trx.RollbackAsync();
                return false;
            }
        }

        public Task<List<OrdenesCorteEstado>> ObtenerEstados()
            => _db.OrdenesCorteEstados.AsNoTracking().OrderBy(e => e.Nombre).ToListAsync();
    }
}
