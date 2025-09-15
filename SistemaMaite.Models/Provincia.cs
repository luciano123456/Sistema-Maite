﻿using System;
using System.Collections.Generic;

namespace SistemaMaite.Models;

public partial class Provincia
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public virtual ICollection<Cliente> Clientes { get; set; } = new List<Cliente>();

    public virtual ICollection<Personal> Personals { get; set; } = new List<Personal>();
}
