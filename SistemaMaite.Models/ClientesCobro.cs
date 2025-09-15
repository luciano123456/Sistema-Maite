﻿using System;
using System.Collections.Generic;

namespace SistemaMaite.Models;

public partial class ClientesCobro
{
    public int Id { get; set; }

    public int IdSucursal { get; set; }

    public int IdCliente { get; set; }

    public int? IdVenta { get; set; }

    public int? IdCuentaCorriente { get; set; }

    public DateTime Fecha { get; set; }

    public int IdCuenta { get; set; }

    public decimal Concepto { get; set; }

    public decimal Importe { get; set; }

    public string? NotaInterna { get; set; }

    public virtual Cliente IdClienteNavigation { get; set; } = null!;

    public virtual Cuenta IdCuentaNavigation { get; set; } = null!;

    public virtual Sucursal IdSucursalNavigation { get; set; } = null!;
}
