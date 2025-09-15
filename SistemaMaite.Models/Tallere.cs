using System;
using System.Collections.Generic;

namespace SistemaMaite.Models;

public partial class Tallere
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public int DiasEntrega { get; set; }

    public virtual ICollection<OrdenesCorteEtapa> OrdenesCorteEtapas { get; set; } = new List<OrdenesCorteEtapa>();
}
