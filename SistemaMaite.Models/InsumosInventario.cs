using System;
using System.Collections.Generic;

namespace SistemaMaite.Models;

public partial class InsumosInventario
{
    public int Id { get; set; }

    public int IdInsumo { get; set; }

    public decimal Cantidad { get; set; }

    public virtual ICollection<InsumosInventarioMovimiento> InsumosInventarioMovimientos { get; set; } = new List<InsumosInventarioMovimiento>();
}
