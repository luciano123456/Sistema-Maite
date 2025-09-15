using System;
using System.Collections.Generic;

namespace SistemaMaite.Models;

public partial class OrdenesCorteProducto
{
    public int Id { get; set; }

    public int IdOrdenCorte { get; set; }

    public int IdProducto { get; set; }

    public int Cantidad { get; set; }

    public virtual ICollection<OrdenCorteProductosVariante> OrdenCorteProductosVariantes { get; set; } = new List<OrdenCorteProductosVariante>();

    public virtual OrdenesCorte? OrdenesCorte { get; set; }
}
