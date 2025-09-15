using System;
using System.Collections.Generic;

namespace SistemaMaite.Models;

public partial class InventarioTransfSucursale
{
    public int Id { get; set; }

    public int IdSucursalOrigen { get; set; }

    public int IdSucursalDestino { get; set; }

    public DateTime Fecha { get; set; }

    public string? Notas { get; set; }

    public virtual Sucursale IdSucursalDestinoNavigation { get; set; } = null!;

    public virtual Sucursale IdSucursalOrigenNavigation { get; set; } = null!;

    public virtual ICollection<InventarioTransfSucursalesProducto> InventarioTransfSucursalesProductos { get; set; } = new List<InventarioTransfSucursalesProducto>();
}
