using System;
using System.Collections.Generic;

namespace SistemaMaite.Models {

public partial class Color
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public virtual ICollection<ProductosColore> ProductosColores { get; set; } = new List<ProductosColore>();
}
}
