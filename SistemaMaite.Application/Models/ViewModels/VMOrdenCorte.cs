// SistemaMaite.Application/Models/ViewModels/VMOrdenesCorte.cs
using System;
using System.Collections.Generic;

namespace SistemaMaite.Application.Models.ViewModels
{
    public class VMOrdenCorte
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

        // Lectura
        public string Estado { get; set; } = "";

        // Producto + Variantes
        public VMOrdenCorteProducto Producto { get; set; } = new();

        // Insumos
        public List<VMOrdenCorteInsumo> Insumos { get; set; } = new();
    }

    public class VMOrdenCorteProducto
    {
        public int Id { get; set; }
        public int IdProducto { get; set; }
        public int Cantidad { get; set; }

        public string Producto { get; set; } = "";

        public List<VMOrdenCorteProductoVariante> Variantes { get; set; } = new();
    }

    public class VMOrdenCorteProductoVariante
    {
        public int Id { get; set; }
        public int IdProducto { get; set; }
        public int IdProductoVariante { get; set; }
        public int Cantidad { get; set; }

        // lectura
        public string Color { get; set; } = "";
        public string Talle { get; set; } = "";
    }

    public class VMOrdenCorteInsumo
    {
        public int Id { get; set; }
        public int IdInsumo { get; set; }
        public int Cantidad { get; set; }

        // lectura
        public string Insumo { get; set; } = "";
    }
}
