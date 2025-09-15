﻿using System;
using System.Collections.Generic;

namespace SistemaMaite.Models;

public partial class Insumo
{
    public int Id { get; set; }

    public string Codigo { get; set; } = null!;

    public string Descripcion { get; set; } = null!;

    public int IdCategoria { get; set; }

    public int IdProveedor { get; set; }

    public decimal CostoUnitario { get; set; }

    public virtual InsumosCategoria IdCategoriaNavigation { get; set; } = null!;

    public virtual Proveedore IdProveedorNavigation { get; set; } = null!;

    public virtual ICollection<OrdenesCorteInsumo> OrdenesCorteInsumos { get; set; } = new List<OrdenesCorteInsumo>();
}
