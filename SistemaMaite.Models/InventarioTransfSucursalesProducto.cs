using System;
using System.Collections.Generic;

namespace SistemaMaite.Models;

public partial class InventarioTransfSucursalesProducto
{
    public int Id { get; set; }

    public int IdTransfSucursal { get; set; }

    public int IdProducto { get; set; }

    public decimal Cantidad { get; set; }

    public virtual Producto IdProductoNavigation { get; set; } = null!;

    public virtual InventarioTransfSucursale IdTransfSucursalNavigation { get; set; } = null!;

    public virtual ICollection<InventarioTransfSucursalesProductosVariante> InventarioTransfSucursalesProductosVariantes { get; set; } = new List<InventarioTransfSucursalesProductosVariante>();
}
