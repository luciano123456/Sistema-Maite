using System;
using System.Collections.Generic;

namespace SistemaMaite.Models {

public partial class User
{
    public int Id { get; set; }

    public string? Usuario { get; set; }

    public string? Nombre { get; set; }

    public string? Apellido { get; set; }
    public string? Correo { get; set; }

    public string? Dni { get; set; }

    public string? Telefono { get; set; }

    public string? Direccion { get; set; }

    public int IdRol { get; set; }

    public string Contrasena { get; set; } = null!;

    public int IdEstado { get; set; }

    public virtual EstadosUsuario IdEstadoNavigation { get; set; } = null!;

    public virtual Rol IdRolNavigation { get; set; } = null!;
}
}

