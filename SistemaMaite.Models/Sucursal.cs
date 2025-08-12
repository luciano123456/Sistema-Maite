﻿using System;
using System.Collections.Generic;

namespace SistemaMaite.Models
{

    public partial class Sucursal
    {
        public int Id { get; set; }

        public string Nombre { get; set; } = null!;

        public virtual ICollection<Caja> Cajas { get; set; } = new List<Caja>();

        public virtual ICollection<ClientesCobro> ClientesCobros { get; set; } = new List<ClientesCobro>();

        public virtual ICollection<ClientesCuentaCorriente> ClientesCuentaCorrientes { get; set; } = new List<ClientesCuentaCorriente>();

        public virtual ICollection<Gasto> Gastos { get; set; } = new List<Gasto>();

        public virtual ICollection<InventarioMovimiento> InventarioMovimientos { get; set; } = new List<InventarioMovimiento>();

        public virtual ICollection<InventarioTransfSucursal> InventarioTransfSucursaleIdSucursalDestinoNavigations { get; set; } = new List<InventarioTransfSucursal>();

        public virtual ICollection<InventarioTransfSucursal> InventarioTransfSucursaleIdSucursalOrigenNavigations { get; set; } = new List<InventarioTransfSucursal>();

        public virtual ICollection<Inventario> Inventarios { get; set; } = new List<Inventario>();

        public virtual ICollection<Personal> Personals { get; set; } = new List<Personal>();

        public virtual ICollection<Venta> Venta { get; set; } = new List<Venta>();
    }
}