using System;
using System.Collections.Generic;

namespace SistemaMaite.Models {

public partial class GastosCategoria
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public virtual ICollection<Gasto> Gastos { get; set; } = new List<Gasto>();
}
}
