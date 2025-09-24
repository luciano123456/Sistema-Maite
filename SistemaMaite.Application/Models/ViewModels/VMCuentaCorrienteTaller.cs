﻿// SistemaMaite.Application/Models/ViewModels/VMCuentasCorrientesTaller.cs
namespace SistemaMaite.Application.Models.ViewModels
{
    public class VMCuentasCorrientesTaller
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = "";
        public decimal? Saldo { get; set; }
    }
}

// SistemaMaite.Application/Models/ViewModels/VMCuentasCorrientesPagoTallerUpsert.cs
namespace SistemaMaite.Application.Models.ViewModels
{
    public class VMCuentasCorrientesPagoTallerUpsert
    {
        public int Id { get; set; }
        public int IdTaller { get; set; }
        public DateTime Fecha { get; set; }
        public string? Concepto { get; set; }
        public decimal Importe { get; set; }
        public int? IdCuentaCaja { get; set; } // impacto en Caja (EGRESO)
    }
}
