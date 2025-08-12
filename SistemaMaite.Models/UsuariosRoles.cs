using System;
using System.Collections.Generic;

namespace SistemaMaite.Models;

public partial class UsuariosRoles
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public virtual ICollection<User> Usuarios { get; set; } = new List<User>();
}
