﻿using System;
using System.Collections.Generic;

namespace SistemaMaite.Models;

public partial class OrdenesCorte
{
    public int Id { get; set; }

    public int IdPersonal { get; set; }

    public int IdEstado { get; set; }

    public DateTime FechaInicio { get; set; }

    public DateTime? FechaFinalizacion { get; set; }

    public decimal CantidadProducir { get; set; }

    public decimal? CantidadProducidas { get; set; }

    public decimal? DiferenciaCorte { get; set; }

    public decimal? CantidadFinalReal { get; set; }

    public decimal? DiferenciaFinalReal { get; set; }

    public decimal? LargoTizada { get; set; }

    public decimal? AnchoTizada { get; set; }

    public decimal? CantidadCapas { get; set; }

    public DateTime? HoraInicioCorte { get; set; }

    public DateTime? HoraFinCorte { get; set; }

    public virtual OrdenesCorteEstado IdEstadoNavigation { get; set; } = null!;

    public virtual ICollection<InventarioIngresosOrdenesCorte> InventarioIngresosOrdenesCortes { get; set; } = new List<InventarioIngresosOrdenesCorte>();

    public virtual ICollection<OrdenesCorteEtapa> OrdenesCorteEtapas { get; set; } = new List<OrdenesCorteEtapa>();

    public virtual ICollection<OrdenesCorteInsumo> OrdenesCorteInsumos { get; set; } = new List<OrdenesCorteInsumo>();

    public virtual ICollection<OrdenesCorteProducto> OrdenesCorteProductos { get; set; } = new List<OrdenesCorteProducto>();
}
