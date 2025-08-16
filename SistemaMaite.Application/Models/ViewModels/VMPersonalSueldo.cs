using SistemaMaite.Models;

namespace SistemaMaite.Application.Models.ViewModels

{
    public class VMPersonalSueldo
    {
        public int Id { get; set; }

        public int IdPersonal { get; set; }

        public DateTime Fecha { get; set; }

        public string Concepto { get; set; } = null!;

        public decimal Importe { get; set; }

        public decimal ImporteAbonado { get; set; }

        public string Saldo { get; set; } = null!;

        public string? NotaInterna { get; set; }

        public virtual Personal IdPersonalNavigation { get; set; } = null!;

        public virtual ICollection<PersonalSueldosPago> PersonalSueldosPagos { get; set; } = new List<PersonalSueldosPago>();


    }
}