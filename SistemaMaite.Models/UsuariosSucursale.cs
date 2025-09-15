using System;
using System.Collections.Generic;

namespace SistemaMaite.Models;

public partial class UsuariosSucursale
{
    public int Id { get; set; }

    public int IdUsuario { get; set; }

    public int IdSucursal { get; set; }

    public virtual Sucursale IdSucursalNavigation { get; set; } = null!;

    public virtual Usuario IdUsuarioNavigation { get; set; } = null!;
}
