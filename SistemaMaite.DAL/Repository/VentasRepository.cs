// SistemaMaite.DAL/Repository/VentasRepository.cs
using Microsoft.EntityFrameworkCore;
using SistemaMaite.DAL.DataContext;
using SistemaMaite.Models;

namespace SistemaMaite.DAL.Repository
{
    public class VentasRepository : IVentasRepository<Venta>
    {
        private readonly SistemaMaiteContext _db;
        public VentasRepository(SistemaMaiteContext db) { _db = db; }

        private const string CONCEPTO_Venta = "VENTA";
        private const string CONCEPTO_Cobro = "COBRO VENTA";

        public async Task<List<Venta>> Listar(DateTime? desde, DateTime? hasta, int? idCliente, int? idVendedor, string? estado, string? texto)
        {
            var q = _db.Ventas
                .Include(v => v.IdClienteNavigation)
                .Include(v => v.IdVendedorNavigation)
                .Include(v => v.IdSucursalNavigation)
                .AsNoTracking()
                .AsQueryable();

            if (desde.HasValue) q = q.Where(v => v.Fecha >= desde.Value.Date);
            if (hasta.HasValue)
            {
                var h = hasta.Value.Date.AddDays(1).AddTicks(-1);
                q = q.Where(v => v.Fecha <= h);
            }
            if (idCliente.HasValue && idCliente > 0) q = q.Where(v => v.IdCliente == idCliente.Value);
            if (idVendedor.HasValue && idVendedor > 0) q = q.Where(v => v.IdVendedor == idVendedor.Value);

            if (!string.IsNullOrWhiteSpace(texto))
            {
                var t = texto.Trim();
                q = q.Where(v =>
                    EF.Functions.Like(v.NotaCliente ?? "", $"%{t}%") ||
                    EF.Functions.Like(v.NotaInterna ?? "", $"%{t}%") ||
                    EF.Functions.Like(v.IdClienteNavigation.Nombre ?? "", $"%{t}%"));
            }

            if (!string.IsNullOrWhiteSpace(estado))
            {
                var st = estado.Trim().ToLowerInvariant();
                // "con_saldo": Debe pendiente en CC; "saldado": sin saldo
                if (st == "con_saldo")
                {
                    // saldo = Debe - Haber de CC para esa venta
                    q = q.Where(v => _db.ClientesCuentaCorrientes
                        .Where(cc => cc.IdCliente == v.IdCliente && cc.IdSucursal == v.IdSucursal && cc.IdMov == v.Id && cc.Concepto == CONCEPTO_Venta)
                        .Select(cc => cc.Debe - (_db.ClientesCuentaCorrientes
                            .Where(h => h.IdCliente == v.IdCliente && h.IdSucursal == v.IdSucursal && h.Concepto == CONCEPTO_Cobro && h.IdMov == v.Id)
                            .Sum(h => (decimal?)h.Haber) ?? 0m))
                        .FirstOrDefault() > 0m);
                }
                else if (st == "saldado")
                {
                    q = q.Where(v => (_db.ClientesCuentaCorrientes
                            .Where(cc => cc.IdCliente == v.IdCliente && cc.IdSucursal == v.IdSucursal && cc.IdMov == v.Id && cc.Concepto == CONCEPTO_Venta)
                            .Select(cc => cc.Debe)
                            .FirstOrDefault())
                        <=
                        (_db.ClientesCuentaCorrientes
                            .Where(h => h.IdCliente == v.IdCliente && h.IdSucursal == v.IdSucursal && h.Concepto == CONCEPTO_Cobro && h.IdMov == v.Id)
                            .Sum(h => (decimal?)h.Haber) ?? 0m));
                }
            }

            return await q.OrderByDescending(v => v.Fecha).ThenByDescending(v => v.Id).ToListAsync();
        }

        public Task<Venta?> Obtener(int id) =>
            _db.Ventas
                .Include(v => v.IdClienteNavigation)
                .Include(v => v.IdVendedorNavigation)
                .Include(v => v.VentasProductos).ThenInclude(p => p.VentasProductosVariantes)
                .AsNoTracking()
                .FirstOrDefaultAsync(v => v.Id == id);

        public Task<List<ClientesCobro>> ObtenerPagosPorVenta(int idVenta) =>
            _db.ClientesCobros
                .Include(c => c.IdCuentaNavigation)
                .Where(c => c.IdVenta == idVenta)
                .OrderByDescending(c => c.Fecha).ThenByDescending(c => c.Id)
                .AsNoTracking()
                .ToListAsync();

        public Task<List<VentasProducto>> ObtenerItemsPorVenta(int idVenta) =>
            _db.VentasProductos
                .Include(i => i.VentasProductosVariantes)
                .Include(i => i.IdProductoNavigation)
                .Where(i => i.IdVenta == idVenta)
                .AsNoTracking()
                .ToListAsync();

        public Task<decimal?> ObtenerPrecioPorLista(int idProducto, int idListaPrecio)
        {
            // ADAPTA a tu esquema real de precios por lista:
            var precio = _db.ProductosPrecios
                .Where(pp => pp.IdProducto == idProducto && pp.IdListaPrecio == idListaPrecio)
                .Select(pp => (decimal?)pp.PrecioUnitario)
                .FirstOrDefault();
            return Task.FromResult(precio);
        }

        public Task<List<ProductosVariante>> ObtenerVariantesPorProducto(int idProducto) =>
            _db.ProductosVariantes
                .Where(v => v.IdProducto == idProducto)
                .Include(v => v.IdColorNavigation)
                    .ThenInclude(pc => pc.IdColorNavigation)      // ← segundo nivel
                .Include(v => v.IdTalleNavigation)
                    .ThenInclude(pt => pt.IdTalleNavigation)      // ← segundo nivel
                .AsNoTracking()
                .ToListAsync();

        // ----------------- UPSERT TRANSACCIONAL -----------------
        public async Task<bool> InsertarConDetallesYPagos(Venta venta, IEnumerable<VentasProducto> items, IEnumerable<VentasProductosVariante> variantes,
                                                          IEnumerable<ClientesCobro> pagos)
        {
            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                // 1) Insert Venta
                _db.Ventas.Add(venta);
                await _db.SaveChangesAsync();

                // 2) Insert Items
                var listItems = items?.ToList() ?? new List<VentasProducto>();
                foreach (var it in listItems)
                {
                    it.IdVenta = venta.Id;
                    _db.VentasProductos.Add(it);
                    await _db.SaveChangesAsync();

                    // 2.1) Variantes del item
                    foreach (var vr in variantes?.Where(v => v.IdVentaProducto == it.Id) ?? Enumerable.Empty<VentasProductosVariante>())
                    {
                        var nuevoVr = new VentasProductosVariante
                        {
                            IdVentaProducto = it.Id,
                            IdProducto = vr.IdProducto,
                            IdProductoVariante = vr.IdProductoVariante,
                            Cantidad = vr.Cantidad
                        };
                        _db.VentasProductosVariantes.Add(nuevoVr);
                    }
                    await _db.SaveChangesAsync();
                }

                // 3) Asiento en CC: Debe por la venta (un movimiento)
                var ccDebe = new ClientesCuentaCorriente
                {
                    IdSucursal = venta.IdSucursal,
                    IdCliente = venta.IdCliente,
                    Fecha = venta.Fecha,
                    TipoMov = "DEBE",
                    IdMov = venta.Id, // referencia a la venta
                    Concepto = CONCEPTO_Venta,
                    Debe = venta.ImporteTotal,
                    Haber = 0m
                };
                _db.ClientesCuentaCorrientes.Add(ccDebe);
                await _db.SaveChangesAsync();

                // Vinculamos IdCuentaCorriente en Venta
                venta.IdCuentaCorriente = ccDebe.Id;
                await _db.SaveChangesAsync();

                // 4) Pagos (ClientesCobro) + CC Haber por cada pago
                decimal abonado = 0m;
                foreach (var p in pagos ?? Enumerable.Empty<ClientesCobro>())
                {
                    var cobro = new ClientesCobro
                    {
                        IdSucursal = venta.IdSucursal,
                        IdCliente = venta.IdCliente,
                        IdVenta = venta.Id,
                        IdCuentaCorriente = ccDebe.Id,
                        Fecha = p.Fecha,
                        IdCuenta = p.IdCuenta,
                        Concepto = 0m, // si usás número aquí, dejalo, o cambia el tipo a string si es concepto textual
                        Importe = p.Importe,
                        NotaInterna = p.NotaInterna
                    };
                    _db.ClientesCobros.Add(cobro);
                    await _db.SaveChangesAsync();

                    var ccHaber = new ClientesCuentaCorriente
                    {
                        IdSucursal = venta.IdSucursal,
                        IdCliente = venta.IdCliente,
                        Fecha = p.Fecha,
                        TipoMov = "HABER",
                        IdMov = venta.Id, // lo linkeo a la venta para poder calcular saldo por venta
                        Concepto = CONCEPTO_Cobro,
                        Debe = 0m,
                        Haber = p.Importe
                    };
                    _db.ClientesCuentaCorrientes.Add(ccHaber);
                    await _db.SaveChangesAsync();

                    abonado += p.Importe;
                }

                // 5) Totales ya vienen calculados en venta; no obstante, podrías revalidar aquí

                await trx.CommitAsync();
                return true;
            }
            catch
            {
                await trx.RollbackAsync();
                return false;
            }
        }

        public async Task<bool> ActualizarConDetallesYPagos(Venta venta, IEnumerable<VentasProducto> items, IEnumerable<VentasProductosVariante> variantes,
                                                            IEnumerable<ClientesCobro> pagos)
        {
            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var ent = await _db.Ventas
                    .Include(v => v.VentasProductos)
                    .ThenInclude(i => i.VentasProductosVariantes)
                    .FirstOrDefaultAsync(v => v.Id == venta.Id);
                if (ent is null) return false;

                // 1) Update cabecera
                ent.IdSucursal = venta.IdSucursal;
                ent.IdVendedor = venta.IdVendedor;
                ent.IdListaPrecio = venta.IdListaPrecio;
                ent.IdCliente = venta.IdCliente;
                ent.Fecha = venta.Fecha;
                ent.Subtotal = venta.Subtotal;
                ent.Descuentos = venta.Descuentos;
                ent.TotalIva = venta.TotalIva;
                ent.ImporteTotal = venta.ImporteTotal;
                ent.NotaInterna = venta.NotaInterna;
                ent.NotaCliente = venta.NotaCliente;

                // 2) Sincronizar items
                var incoming = items?.ToList() ?? new List<VentasProducto>();
                var incomingIds = incoming.Where(x => x.Id > 0).Select(x => x.Id).ToHashSet();

                // 2.1) Borrar faltantes
                var toDel = ent.VentasProductos.Where(x => !incomingIds.Contains(x.Id)).ToList();
                if (toDel.Any())
                {
                    // borrar variantes de esos items
                    var delVar = toDel.SelectMany(x => x.VentasProductosVariantes).ToList();
                    if (delVar.Any()) _db.VentasProductosVariantes.RemoveRange(delVar);
                    _db.VentasProductos.RemoveRange(toDel);
                    await _db.SaveChangesAsync();
                }

                // 2.2) Agregar/actualizar
                foreach (var it in incoming)
                {
                    if (it.Id > 0)
                    {
                        var ex = ent.VentasProductos.First(i => i.Id == it.Id);
                        ex.IdProducto = it.IdProducto;
                        ex.PrecioUnitario = it.PrecioUnitario;
                        ex.PorcDescuento = it.PorcDescuento;
                        ex.DescuentoUnit = it.DescuentoUnit;
                        ex.DescuentoTotal = it.DescuentoTotal;
                        ex.PrecioUnitCdesc = it.PrecioUnitCdesc;
                        ex.PorcIva = it.PorcIva;
                        ex.IvaUnit = it.IvaUnit;
                        ex.IvaTotal = it.IvaTotal;
                        ex.PrecioUnitFinal = it.PrecioUnitFinal;
                        ex.Cantidad = it.Cantidad;
                        ex.Subtotal = it.Subtotal;

                        // variantes: sincronizar
                        var incomingVar = variantes?.Where(v => v.IdVentaProducto == it.Id).ToList() ?? new();
                        var exVar = ex.VentasProductosVariantes.ToList();

                        // delete faltantes
                        var inIds = incomingVar.Where(v => v.Id > 0).Select(v => v.Id).ToHashSet();
                        var del = exVar.Where(v => !inIds.Contains(v.Id)).ToList();
                        if (del.Any()) _db.VentasProductosVariantes.RemoveRange(del);

                        // add/update
                        foreach (var vr in incomingVar)
                        {
                            if (vr.Id > 0)
                            {
                                var ev = exVar.First(x => x.Id == vr.Id);
                                ev.IdProducto = vr.IdProducto;
                                ev.IdProductoVariante = vr.IdProductoVariante;
                                ev.Cantidad = vr.Cantidad;
                            }
                            else
                            {
                                _db.VentasProductosVariantes.Add(new VentasProductosVariante
                                {
                                    IdVentaProducto = ex.Id,
                                    IdProducto = vr.IdProducto,
                                    IdProductoVariante = vr.IdProductoVariante,
                                    Cantidad = vr.Cantidad
                                });
                            }
                        }
                    }
                    else
                    {
                        var nuevo = new VentasProducto
                        {
                            IdVenta = ent.Id,
                            IdProducto = it.IdProducto,
                            PrecioUnitario = it.PrecioUnitario,
                            PorcDescuento = it.PorcDescuento,
                            DescuentoUnit = it.DescuentoUnit,
                            DescuentoTotal = it.DescuentoTotal,
                            PrecioUnitCdesc = it.PrecioUnitCdesc,
                            PorcIva = it.PorcIva,
                            IvaUnit = it.IvaUnit,
                            IvaTotal = it.IvaTotal,
                            PrecioUnitFinal = it.PrecioUnitFinal,
                            Cantidad = it.Cantidad,
                            Subtotal = it.Subtotal
                        };
                        _db.VentasProductos.Add(nuevo);
                        await _db.SaveChangesAsync();

                        foreach (var vr in variantes?.Where(v => v.IdVentaProducto == it.Id) ?? Enumerable.Empty<VentasProductosVariante>())
                        {
                            _db.VentasProductosVariantes.Add(new VentasProductosVariante
                            {
                                IdVentaProducto = nuevo.Id,
                                IdProducto = vr.IdProducto,
                                IdProductoVariante = vr.IdProductoVariante,
                                Cantidad = vr.Cantidad
                            });
                        }
                    }
                }
                await _db.SaveChangesAsync();

                // 3) Actualizar CC Debe (mismo IdMov=venta.Id, Concepto=VENTA)
                var ccDebe = await _db.ClientesCuentaCorrientes
                    .FirstOrDefaultAsync(cc => cc.IdCliente == ent.IdCliente && cc.IdSucursal == ent.IdSucursal
                                            && cc.Concepto == CONCEPTO_Venta && cc.IdMov == ent.Id);
                if (ccDebe is null)
                {
                    ccDebe = new ClientesCuentaCorriente
                    {
                        IdSucursal = ent.IdSucursal,
                        IdCliente = ent.IdCliente,
                        Fecha = ent.Fecha,
                        TipoMov = "DEBE",
                        IdMov = ent.Id,
                        Concepto = CONCEPTO_Venta,
                        Debe = ent.ImporteTotal,
                        Haber = 0m
                    };
                    _db.ClientesCuentaCorrientes.Add(ccDebe);
                    await _db.SaveChangesAsync();
                    ent.IdCuentaCorriente = ccDebe.Id;
                }
                else
                {
                    ccDebe.Fecha = ent.Fecha;
                    ccDebe.Debe = ent.ImporteTotal;
                }

                // 4) Sincronizar pagos (ClientesCobro + CC Haber)
                var incomingPagos = (pagos ?? Enumerable.Empty<ClientesCobro>()).ToList();
                var incomingPagoIds = incomingPagos.Where(p => p.Id > 0).Select(p => p.Id).ToHashSet();

                // 4.1) borrar pagos faltantes y sus HABER
                var pagosEx = await _db.ClientesCobros.Where(c => c.IdVenta == ent.Id).ToListAsync();
                var delPagos = pagosEx.Where(pe => !incomingPagoIds.Contains(pe.Id)).ToList();
                if (delPagos.Any())
                {
                    // borrar HABER de CC vinculados por venta.Id e importe/fecha (criterio simple: mismo IdVenta y Fecha==)
                    foreach (var dp in delPagos)
                    {
                        var haber = await _db.ClientesCuentaCorrientes
                            .FirstOrDefaultAsync(h => h.IdCliente == ent.IdCliente && h.IdSucursal == ent.IdSucursal
                                                   && h.Concepto == CONCEPTO_Cobro && h.IdMov == ent.Id
                                                   && h.Fecha == dp.Fecha && h.Haber == dp.Importe);
                        if (haber != null) _db.ClientesCuentaCorrientes.Remove(haber);
                    }
                    _db.ClientesCobros.RemoveRange(delPagos);
                }

                // 4.2) agregar/actualizar pagos
                foreach (var p in incomingPagos)
                {
                    if (p.Id > 0)
                    {
                        var ex = await _db.ClientesCobros.FirstAsync(c => c.Id == p.Id);
                        ex.Fecha = p.Fecha;
                        ex.IdCuenta = p.IdCuenta;
                        ex.Importe = p.Importe;
                        ex.NotaInterna = p.NotaInterna;

                        // actualizar su Haber asociado
                        var haber = await _db.ClientesCuentaCorrientes
                            .FirstOrDefaultAsync(h => h.IdCliente == ent.IdCliente && h.IdSucursal == ent.IdSucursal
                                                   && h.Concepto == CONCEPTO_Cobro && h.IdMov == ent.Id
                                                   && h.Fecha == ex.Fecha && h.Haber == ex.Importe);
                        if (haber is null)
                        {
                            _db.ClientesCuentaCorrientes.Add(new ClientesCuentaCorriente
                            {
                                IdSucursal = ent.IdSucursal,
                                IdCliente = ent.IdCliente,
                                Fecha = ex.Fecha,
                                TipoMov = "HABER",
                                IdMov = ent.Id,
                                Concepto = CONCEPTO_Cobro,
                                Debe = 0m,
                                Haber = ex.Importe
                            });
                        }
                        // si querés, podrías buscar por Id del cobro si lo añadís a CC
                    }
                    else
                    {
                        var nuevo = new ClientesCobro
                        {
                            IdSucursal = ent.IdSucursal,
                            IdCliente = ent.IdCliente,
                            IdVenta = ent.Id,
                            IdCuentaCorriente = ent.IdCuentaCorriente,
                            Fecha = p.Fecha,
                            IdCuenta = p.IdCuenta,
                            Concepto = 0m,
                            Importe = p.Importe,
                            NotaInterna = p.NotaInterna
                        };
                        _db.ClientesCobros.Add(nuevo);
                        await _db.SaveChangesAsync();

                        _db.ClientesCuentaCorrientes.Add(new ClientesCuentaCorriente
                        {
                            IdSucursal = ent.IdSucursal,
                            IdCliente = ent.IdCliente,
                            Fecha = p.Fecha,
                            TipoMov = "HABER",
                            IdMov = ent.Id,
                            Concepto = CONCEPTO_Cobro,
                            Debe = 0m,
                            Haber = p.Importe
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

        public async Task<bool> Eliminar(int id)
        {
            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var v = await _db.Ventas
                    .Include(v => v.VentasProductos).ThenInclude(i => i.VentasProductosVariantes)
                    .FirstOrDefaultAsync(v => v.Id == id);
                if (v is null) return false;

                // borrar CC relacionados (Debe/Haber por venta)
                var ccs = await _db.ClientesCuentaCorrientes
                    .Where(cc => cc.IdMov == id && (cc.Concepto == CONCEPTO_Venta || cc.Concepto == CONCEPTO_Cobro))
                    .ToListAsync();
                if (ccs.Any()) _db.ClientesCuentaCorrientes.RemoveRange(ccs);

                // borrar cobros de esta venta
                var cobros = await _db.ClientesCobros.Where(c => c.IdVenta == id).ToListAsync();
                if (cobros.Any()) _db.ClientesCobros.RemoveRange(cobros);

                // borrar detalles/variantes
                var vars = v.VentasProductos.SelectMany(i => i.VentasProductosVariantes).ToList();
                if (vars.Any()) _db.VentasProductosVariantes.RemoveRange(vars);
                if (v.VentasProductos.Any()) _db.VentasProductos.RemoveRange(v.VentasProductos);

                _db.Ventas.Remove(v);
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
