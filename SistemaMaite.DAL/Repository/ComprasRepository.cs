// SistemaMaite.DAL/Repository/ComprasRepository.cs
using Microsoft.EntityFrameworkCore;
using SistemaMaite.DAL.DataContext;
using SistemaMaite.Models;

namespace SistemaMaite.DAL.Repository
{
    public class ComprasRepository : IComprasRepository<Compra>
    {
        private readonly SistemaMaiteContext _db;
        public ComprasRepository(SistemaMaiteContext db) { _db = db; }

        // -------- LISTADO / OBTENER --------
        public async Task<List<Compra>> Listar(DateTime? desde, DateTime? hasta, int? idProveedor, string? texto)
        {
            var q = _db.Compras
                .Include(c => c.IdProveedorNavigation)
                .AsNoTracking()
                .AsQueryable();

            if (desde.HasValue) q = q.Where(c => c.Fecha >= desde.Value.Date);
            if (hasta.HasValue)
            {
                var h = hasta.Value.Date.AddDays(1).AddTicks(-1);
                q = q.Where(c => c.Fecha <= h);
            }
            if (idProveedor.HasValue && idProveedor > 0) q = q.Where(c => c.IdProveedor == idProveedor.Value);

            if (!string.IsNullOrWhiteSpace(texto))
            {
                var t = texto.Trim();
                q = q.Where(c =>
                    EF.Functions.Like(c.NotaInterna ?? "", $"%{t}%") ||
                    EF.Functions.Like(c.IdProveedorNavigation.Nombre ?? "", $"%{t}%"));
            }

            return await q
                .OrderByDescending(c => c.Fecha)
                .ThenByDescending(c => c.Id)
                .ToListAsync();
        }

        public Task<Compra?> Obtener(int id)
        {
            return _db.Compras
                .Include(c => c.IdProveedorNavigation)
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == id);
        }

        public Task<List<ComprasInsumo>> ObtenerItemsPorCompra(int idCompra)
        {
            return _db.ComprasInsumos
                .Where(i => i.IdCompra == idCompra)
                .AsNoTracking()
                .ToListAsync();
        }

        public Task<List<ComprasPago>> ObtenerPagosPorCompra(int idCompra)
        {
            return _db.ComprasPagos
                .Where(p => p.IdCompra == idCompra)
                .AsNoTracking()
                .ToListAsync();
        }

        // -------- INSERTAR: cabecera + items + pagos (+ CAJA EGRESO por pago) --------
        public async Task<bool> InsertarConDetallesYPagos(Compra compra, IEnumerable<ComprasInsumo> items, IEnumerable<ComprasPago> pagos)
        {
            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                _db.Compras.Add(compra);
                await _db.SaveChangesAsync();

                // Ítems
                if (items != null)
                {
                    foreach (var it in items)
                    {
                        it.Id = 0;
                        it.IdCompra = compra.Id;
                    }
                    _db.ComprasInsumos.AddRange(items);
                }

                // Pagos
                if (pagos != null)
                {
                    foreach (var p in pagos)
                    {
                        p.Id = 0;
                        p.IdCompra = compra.Id;
                        p.IdProveedor = compra.IdProveedor;
                        p.IdCuentaCorriente = compra.IdCuentaCorriente;
                    }
                    _db.ComprasPagos.AddRange(pagos);
                    await _db.SaveChangesAsync(); // necesito los Id de pagos para Caja

                    // CAJA: un EGRESO por cada pago
                    foreach (var p in pagos)
                    {
                        _db.Cajas.Add(new Caja
                        {
                            // IdSucursal = ???, // ← si tu esquema lo exige, setealo acá
                            IdCuenta = p.IdCuenta,
                            Fecha = p.Fecha,
                            TipoMov = "EGRESO",
                            IdMov = p.Id, // referenciamos al pago
                            Concepto = $"PAGO COMPRA NRO {compra.Id}",
                            Ingreso = 0m,
                            Egreso = p.Importe
                        });
                    }
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

        // -------- ACTUALIZAR: cabecera + upsert items y pagos (+ CAJA EGRESO por pago) --------
        public async Task<bool> ActualizarConDetallesYPagos(Compra compra, IEnumerable<ComprasInsumo> items, IEnumerable<ComprasPago> pagos)
        {
            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var ent = await _db.Compras
                    .Include(c => c.ComprasInsumos)
                    .Include(c => c.ComprasPagos)
                    .FirstOrDefaultAsync(c => c.Id == compra.Id);

                if (ent is null) return false;

                // Cabecera
                ent.IdProveedor = compra.IdProveedor;
                ent.IdCuentaCorriente = compra.IdCuentaCorriente;
                ent.Fecha = compra.Fecha;
                ent.Subtotal = compra.Subtotal;
                ent.Descuentos = compra.Descuentos;
                ent.TotalIva = compra.TotalIva;
                ent.ImporteTotal = compra.ImporteTotal;
                ent.NotaInterna = compra.NotaInterna ?? string.Empty;

                // Ítems (reconciliación)
                var incomingItems = (items ?? Enumerable.Empty<ComprasInsumo>()).ToList();
                var incomingItemIds = incomingItems.Where(x => x.Id > 0).Select(x => x.Id).ToHashSet();

                var itemsToDelete = ent.ComprasInsumos.Where(x => !incomingItemIds.Contains(x.Id)).ToList();
                if (itemsToDelete.Count > 0) _db.ComprasInsumos.RemoveRange(itemsToDelete);

                foreach (var inIt in incomingItems)
                {
                    if (inIt.Id > 0)
                    {
                        var dbIt = ent.ComprasInsumos.First(i => i.Id == inIt.Id);
                        dbIt.CostoUnitario = inIt.CostoUnitario;
                        dbIt.PorcDescuento = inIt.PorcDescuento;
                        dbIt.DescuentoUnit = inIt.DescuentoUnit;
                        dbIt.DescuentoTotal = inIt.DescuentoTotal;
                        dbIt.CostoUnitCdesc = inIt.CostoUnitCdesc;
                        dbIt.PorcIva = inIt.PorcIva;
                        dbIt.IvaUnit = inIt.IvaUnit;
                        dbIt.IvaTotal = inIt.IvaTotal;
                        dbIt.CostoUnitFinal = inIt.CostoUnitFinal;
                        dbIt.Cantidad = inIt.Cantidad;
                        dbIt.Subtotal = inIt.Subtotal;
                    }
                    else
                    {
                        inIt.Id = 0;
                        inIt.IdCompra = ent.Id;
                        _db.ComprasInsumos.Add(inIt);
                    }
                }

                // Pagos (reconciliación + CAJA)
                var incomingPagos = (pagos ?? Enumerable.Empty<ComprasPago>()).ToList();
                var incomingPagoIds = incomingPagos.Where(p => p.Id > 0).Select(p => p.Id).ToHashSet();

                // Eliminados
                var pagosToDelete = ent.ComprasPagos.Where(p => !incomingPagoIds.Contains(p.Id)).ToList();
                if (pagosToDelete.Count > 0)
                {
                    // borrar Caja por esos pagos
                    foreach (var del in pagosToDelete)
                    {
                        var cajas = await _db.Cajas
                            .Where(ca => ca.TipoMov == "EGRESO" && ca.IdMov == del.Id)
                            .ToListAsync();
                        if (cajas.Any()) _db.Cajas.RemoveRange(cajas);
                    }
                    _db.ComprasPagos.RemoveRange(pagosToDelete);
                }

                // Upsert
                foreach (var inP in incomingPagos)
                {
                    if (inP.Id > 0)
                    {
                        // update pago + su Caja
                        var dbP = ent.ComprasPagos.First(p => p.Id == inP.Id);
                        dbP.Fecha = inP.Fecha;
                        dbP.IdCuenta = inP.IdCuenta;
                        dbP.Concepto = inP.Concepto;
                        dbP.Importe = inP.Importe;
                        dbP.NotaInterna = inP.NotaInterna ?? string.Empty;

                        // Caja asociada a este pago
                        var caja = await _db.Cajas.FirstOrDefaultAsync(ca => ca.TipoMov == "EGRESO" && ca.IdMov == dbP.Id);
                        if (caja is null)
                        {
                            _db.Cajas.Add(new Caja
                            {
                                // IdSucursal = ???, // ← si tu esquema lo exige, setealo acá
                                IdCuenta = dbP.IdCuenta,
                                Fecha = dbP.Fecha,
                                TipoMov = "EGRESO",
                                IdMov = dbP.Id,
                                Concepto = $"PAGO COMPRA NRO {ent.Id}",
                                Ingreso = 0m,
                                Egreso = dbP.Importe
                            });
                        }
                        else
                        {
                            // IdSucursal = ??? // idem comentario
                            caja.IdCuenta = dbP.IdCuenta;
                            caja.Fecha = dbP.Fecha;
                            caja.Concepto = $"PAGO COMPRA NRO {ent.Id}";
                            caja.Ingreso = 0m;
                            caja.Egreso = dbP.Importe;
                        }
                    }
                    else
                    {
                        // insert pago + Caja
                        inP.Id = 0;
                        inP.IdCompra = ent.Id;
                        inP.IdProveedor = ent.IdProveedor;
                        inP.IdCuentaCorriente = ent.IdCuentaCorriente;

                        _db.ComprasPagos.Add(inP);
                        await _db.SaveChangesAsync(); // necesito el Id del pago

                        _db.Cajas.Add(new Caja
                        {
                            // IdSucursal = ???, // ← si tu esquema lo exige, setealo acá
                            IdCuenta = inP.IdCuenta,
                            Fecha = inP.Fecha,
                            TipoMov = "EGRESO",
                            IdMov = inP.Id,
                            Concepto = $"PAGO COMPRA NRO {ent.Id}",
                            Ingreso = 0m,
                            Egreso = inP.Importe,
                            IdSucursal = null
                        });
                    }
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

        // -------- ELIMINAR: compra + ítems + pagos (+ borra Caja por cada pago) --------
        public async Task<bool> Eliminar(int id)
        {
            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var compra = await _db.Compras
                    .Include(c => c.ComprasInsumos)
                    .Include(c => c.ComprasPagos)
                    .FirstOrDefaultAsync(c => c.Id == id);

                if (compra is null) return false;

                // Borrar asientos de Caja por pagos de esta compra
                var pagos = compra.ComprasPagos?.ToList() ?? new List<ComprasPago>();
                foreach (var p in pagos)
                {
                    var cajas = await _db.Cajas
                        .Where(ca => ca.TipoMov == "EGRESO" && ca.IdMov == p.Id)
                        .ToListAsync();
                    if (cajas.Any()) _db.Cajas.RemoveRange(cajas);
                }

                // Detalles + pagos + compra
                if (compra.ComprasInsumos?.Any() == true)
                    _db.ComprasInsumos.RemoveRange(compra.ComprasInsumos);

                if (pagos.Any())
                    _db.ComprasPagos.RemoveRange(pagos);

                _db.Compras.Remove(compra);

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

    }
}
