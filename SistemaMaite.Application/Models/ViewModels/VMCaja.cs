using SistemaMaite.Models;

namespace SistemaMaite.Application.Models.ViewModels
{
    public class VMCaja
    {
        public int Id { get; set; }

        public int IdSucursal { get; set; }

        public int IdCuenta { get; set; }

        public DateTime Fecha { get; set; }

        public string TipoMov { get; set; } = null!;

        public int? IdMov { get; set; }

        public string Concepto { get; set; } = null!;

        public decimal Ingreso { get; set; }

        public decimal Egreso { get; set; }
        public string Cuenta { get; set; }
        public string Sucursal { get; set; }

        public virtual Cuenta IdCuentaNavigation { get; set; } = null!;

        public virtual Sucursal IdSucursalNavigation { get; set; } = null!;
    }
}
