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

        private const string CONCEPTO_VENTA = "VENTA";
        private const string CONCEPTO_COBRO = "COBRO VENTA";

        // -------------------------------- LISTADO / OBTENER --------------------------------

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
                if (st == "con_saldo")
                {
                    q = q.Where(v => _db.ClientesCuentaCorrientes
                        .Where(cc => cc.IdCliente == v.IdCliente && cc.IdSucursal == v.IdSucursal && cc.IdMov == v.Id && cc.Concepto == CONCEPTO_VENTA)
                        .Select(cc => cc.Debe - (_db.ClientesCuentaCorrientes
                            .Where(h => h.IdCliente == v.IdCliente && h.IdSucursal == v.IdSucursal && h.Concepto == CONCEPTO_COBRO && h.IdMov == v.Id)
                            .Sum(h => (decimal?)h.Haber) ?? 0m))
                        .FirstOrDefault() > 0m);
                }
                else if (st == "saldado")
                {
                    q = q.Where(v => (_db.ClientesCuentaCorrientes
                            .Where(cc => cc.IdCliente == v.IdCliente && cc.IdSucursal == v.IdSucursal && cc.IdMov == v.Id && cc.Concepto == CONCEPTO_VENTA)
                            .Select(cc => cc.Debe)
                            .FirstOrDefault())
                        <=
                        (_db.ClientesCuentaCorrientes
                            .Where(h => h.IdCliente == v.IdCliente && h.IdSucursal == v.IdSucursal && h.Concepto == CONCEPTO_COBRO && h.IdMov == v.Id)
                            .Sum(h => (decimal?)h.Haber) ?? 0m));
                }
            }

            return await q.OrderByDescending(v => v.Fecha).ThenByDescending(v => v.Id).ToListAsync();
        }

        public Task<Venta?> Obtener(int id)
        {
            var result = _db.Ventas
                .Include(v => v.IdClienteNavigation)
                .Include(v => v.IdVendedorNavigation)
                .Include(v => v.VentasProductos).ThenInclude(p => p.VentasProductosVariantes)
                .AsNoTracking()
                .FirstOrDefaultAsync(v => v.Id == id);
            return result;
        }

        public Task<List<ClientesCobro>> ObtenerPagosPorVenta(int idVenta)
        {
            var result = _db.ClientesCobros
                .Include(c => c.IdCuentaNavigation)
                .Where(c => c.IdVenta == idVenta)
                .OrderByDescending(c => c.Fecha).ThenByDescending(c => c.Id)
                .AsNoTracking()
                .ToListAsync();

            return result;
        }

        public Task<List<VentasProducto>> ObtenerItemsPorVenta(int idVenta)
        {
            var result = _db.VentasProductos
                .Where(i => i.IdVenta == idVenta)

                // Producto
                .Include(i => i.IdProductoNavigation)

                .Include(i => i.VentasProductosVariantes)
                    .ThenInclude(v => v.IdProductoVarianteNavigation)
                        .ThenInclude(pv => pv.IdColorNavigation)
                            .ThenInclude(pc => pc.IdColorNavigation)

                .Include(i => i.VentasProductosVariantes)
                    .ThenInclude(v => v.IdProductoVarianteNavigation)
                        .ThenInclude(pv => pv.IdTalleNavigation)
                            .ThenInclude(pt => pt.IdTalleNavigation)

                .AsNoTracking()
                .ToListAsync();
            return result; 
        }


        public Task<decimal?> ObtenerPrecioPorLista(int idProducto, int idListaPrecio)
        {
            var precio = _db.ProductosPrecios
                .Where(pp => pp.IdProducto == idProducto && pp.IdListaPrecio == idListaPrecio)
                .Select(pp => (decimal?)pp.PrecioUnitario)
                .FirstOrDefault();
            return Task.FromResult(precio);
        }

        public Task<List<ProductosVariante>> ObtenerVariantesPorProducto(int idProducto)
        {
            var result = _db.ProductosVariantes
                 .Where(v => v.IdProducto == idProducto)
                 .Include(v => v.IdColorNavigation).ThenInclude(pc => pc.IdColorNavigation)
                 .Include(v => v.IdTalleNavigation).ThenInclude(pt => pt.IdTalleNavigation)
                 .AsNoTracking()
                 .ToListAsync();
            return result;
        }

        // -------------------------------- INSERTAR --------------------------------

        public async Task<bool> InsertarConDetallesYPagos(
            Venta venta,
            IEnumerable<VentasProducto> items,
            IEnumerable<VentasProductosVariante> variantes,
            IEnumerable<ClientesCobro> pagos)
        {
            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                // 1) Venta
                _db.Ventas.Add(venta);
                await _db.SaveChangesAsync();

                // 2) Items + variantes (agregar sin borrar)
                var listItems = items?.ToList() ?? new List<VentasProducto>();
                var listVars = variantes?.ToList() ?? new List<VentasProductosVariante>();

                foreach (var inIt in listItems)
                {
                    var it = new VentasProducto
                    {
                        IdVenta = venta.Id,
                        IdProducto = inIt.IdProducto,
                        PrecioUnitario = inIt.PrecioUnitario,
                        PorcDescuento = inIt.PorcDescuento,
                        DescuentoUnit = inIt.DescuentoUnit,
                        DescuentoTotal = inIt.DescuentoTotal,
                        PrecioUnitCdesc = inIt.PrecioUnitCdesc,
                        PorcIva = inIt.PorcIva,
                        IvaUnit = inIt.IvaUnit,
                        IvaTotal = inIt.IvaTotal,
                        PrecioUnitFinal = inIt.PrecioUnitFinal,
                        Cantidad = inIt.Cantidad,
                        Subtotal = inIt.Subtotal
                    };
                    _db.VentasProductos.Add(it);
                    await _db.SaveChangesAsync(); // necesito Id del item para variantes

                    // variantes para este item:
                    // 1) si vienen con IdVentaProducto == inIt.Id (id temporal) o
                    // 2) si no viene referencia, matcheo por IdProducto
                    var varForItem = listVars.Where(v =>
                            (v.IdVentaProducto > 0 && v.IdVentaProducto == inIt.Id) ||
                            (v.IdVentaProducto == 0 && v.IdProducto == inIt.IdProducto))
                        .ToList();

                    foreach (var vr in varForItem)
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

                // 3) CC Debe por la venta
                var ccDebe = new ClientesCuentaCorriente
                {
                    IdSucursal = venta.IdSucursal,
                    IdCliente = venta.IdCliente,
                    Fecha = venta.Fecha,
                    TipoMov = "DEBE",
                    IdMov = venta.Id,
                    Concepto = CONCEPTO_VENTA,
                    Debe = venta.ImporteTotal,
                    Haber = 0m
                };
                _db.ClientesCuentaCorrientes.Add(ccDebe);
                await _db.SaveChangesAsync();

                venta.IdCuentaCorriente = ccDebe.Id;
                await _db.SaveChangesAsync();

                // 4) Pagos => Cobro + CC(HABER) + Caja(INGRESO con IdMov = IdCobro)
                foreach (var p in (pagos ?? Enumerable.Empty<ClientesCobro>()))
                {
                    // Cobro
                    var cobro = new ClientesCobro
                    {
                        IdSucursal = venta.IdSucursal,
                        IdCliente = venta.IdCliente,
                        IdVenta = venta.Id,
                        IdCuentaCorriente = ccDebe.Id,
                        Fecha = p.Fecha,
                        IdCuenta = p.IdCuenta,
                        Concepto = 0m,
                        Importe = p.Importe,
                        NotaInterna = p.NotaInterna
                    };
                    _db.ClientesCobros.Add(cobro);
                    await _db.SaveChangesAsync(); // ← ya tengo cobro.Id

                    // CC Haber
                    _db.ClientesCuentaCorrientes.Add(new ClientesCuentaCorriente
                    {
                        IdSucursal = venta.IdSucursal,
                        IdCliente = venta.IdCliente,
                        Fecha = p.Fecha,
                        TipoMov = "HABER",
                        IdMov = venta.Id, // sigo referenciando a la Venta
                        Concepto = CONCEPTO_COBRO,
                        Debe = 0m,
                        Haber = p.Importe
                    });

                    // Caja (INGRESO) vinculado al COBRO
                    _db.Cajas.Add(new Caja
                    {
                        IdSucursal = venta.IdSucursal,
                        IdCuenta = p.IdCuenta,
                        Fecha = p.Fecha,
                        TipoMov = "INGRESO",
                        IdMov = cobro.Id, // ← ahora NO es null
                        Concepto = $"{CONCEPTO_COBRO}",
                        Ingreso = p.Importe,
                        Egreso = 0m
                    });

                    await _db.SaveChangesAsync();
                }

                await trx.CommitAsync();
                return true;
            }
            catch
            {
                await trx.RollbackAsync();
                return false;
            }
        }

        // -------------------------------- ACTUALIZAR --------------------------------

        public async Task<bool> ActualizarConDetallesYPagos(
            Venta venta,
            IEnumerable<VentasProducto> items,
            IEnumerable<VentasProductosVariante> variantes,
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

                // Cabecera
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

                await _db.SaveChangesAsync();

                // Items y Variantes (sin borrar todo)
                var incomingItems = (items ?? Enumerable.Empty<VentasProducto>()).ToList();
                var incomingVars = (variantes ?? Enumerable.Empty<VentasProductosVariante>()).ToList();

                // 1) Borrar items faltantes
                var incomingItemIds = incomingItems.Where(x => x.Id > 0).Select(x => x.Id).ToHashSet();
                var itemsToDelete = ent.VentasProductos.Where(x => !incomingItemIds.Contains(x.Id)).ToList();
                if (itemsToDelete.Any())
                {
                    var varsDel = itemsToDelete.SelectMany(x => x.VentasProductosVariantes).ToList();
                    if (varsDel.Any()) _db.VentasProductosVariantes.RemoveRange(varsDel);
                    _db.VentasProductos.RemoveRange(itemsToDelete);
                    await _db.SaveChangesAsync();
                }

                // 2) Agregar/Actualizar items + variantes por item
                foreach (var inIt in incomingItems)
                {
                    VentasProducto target;

                    if (inIt.Id > 0)
                    {
                        // actualizar item existente
                        target = ent.VentasProductos.First(i => i.Id == inIt.Id);
                        target.IdProducto = inIt.IdProducto;
                        target.PrecioUnitario = inIt.PrecioUnitario;
                        target.PorcDescuento = inIt.PorcDescuento;
                        target.DescuentoUnit = inIt.DescuentoUnit;
                        target.DescuentoTotal = inIt.DescuentoTotal;
                        target.PrecioUnitCdesc = inIt.PrecioUnitCdesc;
                        target.PorcIva = inIt.PorcIva;
                        target.IvaUnit = inIt.IvaUnit;
                        target.IvaTotal = inIt.IvaTotal;
                        target.PrecioUnitFinal = inIt.PrecioUnitFinal;
                        target.Cantidad = inIt.Cantidad;
                        target.Subtotal = inIt.Subtotal;
                        await _db.SaveChangesAsync();
                    }
                    else
                    {
                        // nuevo item
                        target = new VentasProducto
                        {
                            IdVenta = ent.Id,
                            IdProducto = inIt.IdProducto,
                            PrecioUnitario = inIt.PrecioUnitario,
                            PorcDescuento = inIt.PorcDescuento,
                            DescuentoUnit = inIt.DescuentoUnit,
                            DescuentoTotal = inIt.DescuentoTotal,
                            PrecioUnitCdesc = inIt.PrecioUnitCdesc,
                            PorcIva = inIt.PorcIva,
                            IvaUnit = inIt.IvaUnit,
                            IvaTotal = inIt.IvaTotal,
                            PrecioUnitFinal = inIt.PrecioUnitFinal,
                            Cantidad = inIt.Cantidad,
                            Subtotal = inIt.Subtotal
                        };
                        _db.VentasProductos.Add(target);
                        await _db.SaveChangesAsync();
                    }

                    // ------- Variantes por item (ADD/UPDATE/DELETE) -------
                    // Match por:
                    // - IdVentaProducto (si viene)
                    // - o por IdProducto si IdVentaProducto == 0
                    var inVarsForItem = incomingVars
                        .Where(v => (v.IdVentaProducto > 0 && v.IdVentaProducto == inIt.Id) ||
                                    (v.IdVentaProducto == 0 && v.IdProducto == inIt.IdProducto))
                        .ToList();

                    var exVars = await _db.VentasProductosVariantes
                        .Where(v => v.IdVentaProducto == target.Id)
                        .ToListAsync();

                    // Mapas para comparar
                    var mapInById = inVarsForItem.Where(v => v.Id > 0).ToDictionary(v => v.Id, v => v);
                    var mapExById = exVars.ToDictionary(v => v.Id, v => v);

                    // 2.1) Eliminar las que ya no están
                    var toDelete = exVars.Where(ev =>
                        !mapInById.ContainsKey(ev.Id) &&  // no viene por Id
                        !inVarsForItem.Any(iv => iv.Id == 0 && iv.IdProductoVariante == ev.IdProductoVariante) // tampoco por PV
                    ).ToList();
                    if (toDelete.Any())
                    {
                        _db.VentasProductosVariantes.RemoveRange(toDelete);
                        await _db.SaveChangesAsync();
                    }

                    // 2.2) Agregar nuevas (no tienen Id) o las que no matchean por Id pero sí por PV
                    foreach (var iv in inVarsForItem)
                    {
                        // buscar existente por Id (si trae) o por IdProductoVariante
                        var ex = exVars.FirstOrDefault(ev => ev.Id == iv.Id) ??
                                 exVars.FirstOrDefault(ev => iv.Id == 0 && ev.IdProductoVariante == iv.IdProductoVariante);

                        if (ex is null)
                        {
                            // nueva
                            _db.VentasProductosVariantes.Add(new VentasProductosVariante
                            {
                                IdVentaProducto = target.Id,
                                IdProducto = iv.IdProducto,
                                IdProductoVariante = iv.IdProductoVariante,
                                Cantidad = iv.Cantidad
                            });
                        }
                        else
                        {
                            // update cantidad / referencia
                            ex.IdProducto = iv.IdProducto;
                            ex.IdProductoVariante = iv.IdProductoVariante;
                            ex.Cantidad = iv.Cantidad;
                        }
                    }
                    await _db.SaveChangesAsync();
                }

                // 3) CC Debe (VENTA)
                var ccDebe = await _db.ClientesCuentaCorrientes
                    .FirstOrDefaultAsync(cc => cc.IdCliente == ent.IdCliente &&
                                               cc.IdSucursal == ent.IdSucursal &&
                                               cc.Concepto == CONCEPTO_VENTA &&
                                               cc.IdMov == ent.Id);
                if (ccDebe is null)
                {
                    ccDebe = new ClientesCuentaCorriente
                    {
                        IdSucursal = ent.IdSucursal,
                        IdCliente = ent.IdCliente,
                        Fecha = ent.Fecha,
                        TipoMov = "DEBE",
                        IdMov = ent.Id,
                        Concepto = CONCEPTO_VENTA,
                        Debe = ent.ImporteTotal,
                        Haber = 0m
                    };
                    _db.ClientesCuentaCorrientes.Add(ccDebe);
                    await _db.SaveChangesAsync();
                    ent.IdCuentaCorriente = ccDebe.Id;
                    await _db.SaveChangesAsync();
                }
                else
                {
                    ccDebe.Fecha = ent.Fecha;
                    ccDebe.Debe = ent.ImporteTotal;
                    await _db.SaveChangesAsync();
                }

                // 4) Pagos (ClientesCobro + CC Haber + Caja)
                var incomingPagos = (pagos ?? Enumerable.Empty<ClientesCobro>()).ToList();
                var incomingPagoIds = incomingPagos.Where(p => p.Id > 0).Select(p => p.Id).ToHashSet();

                var pagosEx = await _db.ClientesCobros.Where(c => c.IdVenta == ent.Id).ToListAsync();

                // 4.1) Borrar los que ya no están + sus haberes y caja
                var delPagos = pagosEx.Where(pe => !incomingPagoIds.Contains(pe.Id)).ToList();
                foreach (var dp in delPagos)
                {
                    // CC Haber asociado
                    var haber = await _db.ClientesCuentaCorrientes
                        .FirstOrDefaultAsync(h => h.IdCliente == ent.IdCliente &&
                                                  h.IdSucursal == ent.IdSucursal &&
                                                  h.Concepto == CONCEPTO_COBRO &&
                                                  h.IdMov == ent.Id &&
                                                  h.Fecha == dp.Fecha &&
                                                  h.Haber == dp.Importe);
                    if (haber != null) _db.ClientesCuentaCorrientes.Remove(haber);

                    // Caja (por IdMov = IdCobro)
                    var caja = await _db.Cajas.FirstOrDefaultAsync(ca => ca.IdMov == dp.Id && ca.TipoMov == "INGRESO");
                    if (caja != null) _db.Cajas.Remove(caja);

                    _db.ClientesCobros.Remove(dp);
                }
                if (delPagos.Any()) await _db.SaveChangesAsync();

                // 4.2) Agregar/Actualizar
                foreach (var p in incomingPagos)
                {
                    if (p.Id > 0)
                    {
                        // EDITAR cobro existente
                        var ex = await _db.ClientesCobros.FirstAsync(c => c.Id == p.Id);

                        var oldFecha = ex.Fecha;
                        var oldImporte = ex.Importe;

                        ex.Fecha = p.Fecha;
                        ex.IdCuenta = p.IdCuenta;
                        ex.Importe = p.Importe;
                        ex.NotaInterna = p.NotaInterna;
                        await _db.SaveChangesAsync();

                        // Actualizar CC Haber (busco por valores viejos)
                        var haber = await _db.ClientesCuentaCorrientes
                            .FirstOrDefaultAsync(h => h.IdCliente == ent.IdCliente &&
                                                      h.IdSucursal == ent.IdSucursal &&
                                                      h.Concepto == CONCEPTO_COBRO &&
                                                      h.IdMov == ent.Id &&
                                                      h.Fecha == oldFecha &&
                                                      h.Haber == oldImporte);
                        if (haber is null)
                        {
                            _db.ClientesCuentaCorrientes.Add(new ClientesCuentaCorriente
                            {
                                IdSucursal = ent.IdSucursal,
                                IdCliente = ent.IdCliente,
                                Fecha = ex.Fecha,
                                TipoMov = "HABER",
                                IdMov = ent.Id,
                                Concepto = CONCEPTO_COBRO,
                                Debe = 0m,
                                Haber = ex.Importe
                            });
                        }
                        else
                        {
                            haber.Fecha = ex.Fecha;
                            haber.Haber = ex.Importe;
                        }

                        // Actualizar Caja por IdMov = IdCobro
                        var caja = await _db.Cajas.FirstOrDefaultAsync(ca => ca.IdMov == ex.Id && ca.TipoMov == "INGRESO");
                        if (caja is null)
                        {
                            _db.Cajas.Add(new Caja
                            {
                                IdSucursal = ent.IdSucursal,
                                IdCuenta = ex.IdCuenta,
                                Fecha = ex.Fecha,
                                TipoMov = "INGRESO",
                                IdMov = ex.Id,
                                Concepto = $"{CONCEPTO_COBRO}",
                                Ingreso = ex.Importe,
                                Egreso = 0m
                            });
                        }
                        else
                        {
                            caja.IdSucursal = ent.IdSucursal;
                            caja.IdCuenta = ex.IdCuenta;
                            caja.Fecha = ex.Fecha;
                            caja.Concepto = $"{CONCEPTO_COBRO}";
                            caja.Ingreso = ex.Importe;
                            caja.Egreso = 0m;
                        }

                        await _db.SaveChangesAsync();
                    }
                    else
                    {
                        // NUEVO cobro
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
                        await _db.SaveChangesAsync(); // para Id

                        _db.ClientesCuentaCorrientes.Add(new ClientesCuentaCorriente
                        {
                            IdSucursal = ent.IdSucursal,
                            IdCliente = ent.IdCliente,
                            Fecha = p.Fecha,
                            TipoMov = "HABER",
                            IdMov = ent.Id,
                            Concepto = CONCEPTO_COBRO,
                            Debe = 0m,
                            Haber = p.Importe
                        });

                        _db.Cajas.Add(new Caja
                        {
                            IdSucursal = ent.IdSucursal,
                            IdCuenta = p.IdCuenta,
                            Fecha = p.Fecha,
                            TipoMov = "INGRESO",
                            IdMov = nuevo.Id, // ← queda seteado
                            Concepto = $"{CONCEPTO_COBRO}",
                            Ingreso = p.Importe,
                            Egreso = 0m
                        });

                        await _db.SaveChangesAsync();
                    }
                }

                await trx.CommitAsync();
                return true;
            }
            catch
            {
                await trx.RollbackAsync();
                return false;
            }
        }

        // -------------------------------- ELIMINAR --------------------------------

        public async Task<bool> Eliminar(int id)
        {
            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var v = await _db.Ventas
                    .Include(v => v.VentasProductos).ThenInclude(i => i.VentasProductosVariantes)
                    .FirstOrDefaultAsync(v => v.Id == id);
                if (v is null) return false;

                // Borrar CC (Debe/Haber por venta)
                var ccs = await _db.ClientesCuentaCorrientes
                    .Where(cc => cc.IdMov == id && (cc.Concepto == CONCEPTO_VENTA || cc.Concepto == CONCEPTO_COBRO))
                    .ToListAsync();
                if (ccs.Any()) _db.ClientesCuentaCorrientes.RemoveRange(ccs);

                // Borrar cobros + caja por cobro
                var cobros = await _db.ClientesCobros.Where(c => c.IdVenta == id).ToListAsync();
                foreach (var c in cobros)
                {
                    var caja = await _db.Cajas.Where(ca => ca.IdMov == c.Id && ca.TipoMov == "INGRESO").ToListAsync();
                    if (caja.Any()) _db.Cajas.RemoveRange(caja);
                }
                if (cobros.Any()) _db.ClientesCobros.RemoveRange(cobros);

                // Borrar detalles/variantes
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
