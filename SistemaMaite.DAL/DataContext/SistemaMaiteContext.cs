﻿using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SistemaMaite.Models;

namespace SistemaMaite.DAL.DataContext;


public partial class SistemaMaiteContext : DbContext
{
    public SistemaMaiteContext()
    {
    }

    public SistemaMaiteContext(DbContextOptions<SistemaMaiteContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Banco> Bancos { get; set; }

    public virtual DbSet<Caja> Cajas { get; set; }

    public virtual DbSet<CajasTransfEntreCuenta> CajasTransfEntreCuentas { get; set; }

    public virtual DbSet<Cliente> Clientes { get; set; }

    public virtual DbSet<ClientesCobro> ClientesCobros { get; set; }

    public virtual DbSet<ClientesCuentaCorriente> ClientesCuentaCorrientes { get; set; }

    public virtual DbSet<Color> Colores { get; set; }

    public virtual DbSet<Compra> Compras { get; set; }

    public virtual DbSet<ComprasInsumo> ComprasInsumos { get; set; }

    public virtual DbSet<CondicionesIva> CondicionesIvas { get; set; }

    public virtual DbSet<Cuenta> Cuentas { get; set; }

    public virtual DbSet<EstadosUsuario> EstadosUsuarios { get; set; }

    public virtual DbSet<Gasto> Gastos { get; set; }

    public virtual DbSet<GastosCategoria> GastosCategorias { get; set; }

    public virtual DbSet<Insumo> Insumos { get; set; }

    public virtual DbSet<InsumosCategoria> InsumosCategorias { get; set; }

    public virtual DbSet<Inventario> Inventarios { get; set; }

    public virtual DbSet<InventarioMovimiento> InventarioMovimientos { get; set; }

    public virtual DbSet<InventarioTransfSucursal> InventarioTransfSucursales { get; set; }

    public virtual DbSet<InventarioTransfSucursalesProducto> InventarioTransfSucursalesProductos { get; set; }

    public virtual DbSet<InventarioTransfSucursalesProductosVariante> InventarioTransfSucursalesProductosVariantes { get; set; }

    public virtual DbSet<ListasPrecio> ListasPrecios { get; set; }

    public virtual DbSet<OrdenCorteProductosVariante> OrdenCorteProductosVariantes { get; set; }

    public virtual DbSet<OrdenesCorte> OrdenesCortes { get; set; }

    public virtual DbSet<OrdenesCorteEstado> OrdenesCorteEstados { get; set; }

    public virtual DbSet<OrdenesCorteEtapa> OrdenesCorteEtapas { get; set; }

    public virtual DbSet<OrdenesCorteEtapasEstado> OrdenesCorteEtapasEstados { get; set; }

    public virtual DbSet<OrdenesCorteInsumo> OrdenesCorteInsumos { get; set; }

    public virtual DbSet<OrdenesCorteProducto> OrdenesCorteProductos { get; set; }

    public virtual DbSet<Personal> Personals { get; set; }

    public virtual DbSet<PersonalPuesto> PersonalPuestos { get; set; }

    public virtual DbSet<PersonalSueldo> PersonalSueldos { get; set; }

    public virtual DbSet<PersonalSueldosPago> PersonalSueldosPagos { get; set; }

    public virtual DbSet<Producto> Productos { get; set; }

    public virtual DbSet<ProductosCategoria> ProductosCategorias { get; set; }

    public virtual DbSet<ProductosCategoriasTalle> ProductosCategoriasTalles { get; set; }

    public virtual DbSet<ProductosColor> ProductosColores { get; set; }

    public virtual DbSet<ProductosPrecio> ProductosPrecios { get; set; }

    public virtual DbSet<ProductosTalle> ProductosTalles { get; set; }

    public virtual DbSet<ProductosVariante> ProductosVariantes { get; set; }

    public virtual DbSet<Proveedor> Proveedores { get; set; }

    public virtual DbSet<Provincia> Provincias { get; set; }

    public virtual DbSet<Rol> Roles { get; set; }

    public virtual DbSet<Sucursal> Sucursales { get; set; }

    public virtual DbSet<Taller> Talleres { get; set; }

    public virtual DbSet<User> Usuarios { get; set; }

    public virtual DbSet<UsuariosSucursal> UsuariosSucursales { get; set; }

    public virtual DbSet<Venta> Ventas { get; set; }

    public virtual DbSet<VentasProducto> VentasProductos { get; set; }

    public virtual DbSet<VentasProductosVariante> VentasProductosVariantes { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see http://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseSqlServer("Server=DESKTOP-3MT5F5F; Database=Sistema_Maite; Integrated Security=true; Trusted_Connection=True; Encrypt=False");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Banco>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Caja>(entity =>
        {
            entity.Property(e => e.Concepto)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.Egreso).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Fecha).HasColumnType("date");
            entity.Property(e => e.Ingreso).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.TipoMov)
                .HasMaxLength(70)
                .IsUnicode(false);

            entity.HasOne(d => d.IdCuentaNavigation).WithMany(p => p.Cajas)
                .HasForeignKey(d => d.IdCuenta)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Cajas_Cuentas");

            entity.HasOne(d => d.IdSucursalNavigation).WithMany(p => p.Cajas)
                .HasForeignKey(d => d.IdSucursal)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Cajas_Sucursales");
        });

        modelBuilder.Entity<CajasTransfEntreCuenta>(entity =>
        {
            entity.ToTable("Cajas_Transf_EntreCuentas");

            entity.Property(e => e.ImporteDestino).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.ImporteOrigen).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.NotaInterna)
                .HasMaxLength(200)
                .IsUnicode(false);

            entity.HasOne(d => d.IdCuentaDestinoNavigation).WithMany(p => p.CajasTransfEntreCuentaIdCuentaDestinoNavigations)
                .HasForeignKey(d => d.IdCuentaDestino)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Cajas_Transf_EntreCuentas_Cuentas1");

            entity.HasOne(d => d.IdCuentaOrigenNavigation).WithMany(p => p.CajasTransfEntreCuentaIdCuentaOrigenNavigations)
                .HasForeignKey(d => d.IdCuentaOrigen)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Cajas_Transf_EntreCuentas_Cuentas");
        });

        modelBuilder.Entity<Cliente>(entity =>
        {
            entity.Property(e => e.CodigoPostal)
                .HasMaxLength(10)
                .IsUnicode(false);
            entity.Property(e => e.Cuit)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Dni)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Domicilio)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.IdCondicionIva).HasColumnName("IdCondicionIVA");
            entity.Property(e => e.Localidad)
                .HasMaxLength(80)
                .IsUnicode(false);
            entity.Property(e => e.Nombre)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.Telefono)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.TelefonoAlternativo)
                .HasMaxLength(50)
                .IsUnicode(false);

            entity.HasOne(d => d.IdCondicionIvaNavigation).WithMany(p => p.Clientes)
                .HasForeignKey(d => d.IdCondicionIva)
                .HasConstraintName("FK_Clientes_CondicionesIVA");

            entity.HasOne(d => d.IdListaPrecioNavigation).WithMany(p => p.Clientes)
                .HasForeignKey(d => d.IdListaPrecio)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Clientes_Listas_Precios");

            entity.HasOne(d => d.IdProvinciaNavigation).WithMany(p => p.Clientes)
                .HasForeignKey(d => d.IdProvincia)
                .HasConstraintName("FK_Clientes_Provincias");
        });

        modelBuilder.Entity<ClientesCobro>(entity =>
        {
            entity.ToTable("Clientes_Cobros");

            entity.Property(e => e.Concepto).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Fecha).HasColumnType("date");
            entity.Property(e => e.Importe).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.NotaInterna)
                .HasMaxLength(200)
                .IsUnicode(false);

            entity.HasOne(d => d.IdClienteNavigation).WithMany(p => p.ClientesCobros)
                .HasForeignKey(d => d.IdCliente)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Clientes_Cobros_Clientes");

            entity.HasOne(d => d.IdCuentaNavigation).WithMany(p => p.ClientesCobros)
                .HasForeignKey(d => d.IdCuenta)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Clientes_Cobros_Cuentas");

            entity.HasOne(d => d.IdSucursalNavigation).WithMany(p => p.ClientesCobros)
                .HasForeignKey(d => d.IdSucursal)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Clientes_Cobros_Sucursales");
        });

        modelBuilder.Entity<ClientesCuentaCorriente>(entity =>
        {
            entity.ToTable("Clientes_CuentaCorriente");

            entity.Property(e => e.Concepto)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.Debe).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Fecha).HasColumnType("date");
            entity.Property(e => e.Haber).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.TipoMov)
                .HasMaxLength(50)
                .IsUnicode(false);

            entity.HasOne(d => d.IdClienteNavigation).WithMany(p => p.ClientesCuentaCorrientes)
                .HasForeignKey(d => d.IdCliente)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Clientes_CuentaCorriente_Clientes");

            entity.HasOne(d => d.IdSucursalNavigation).WithMany(p => p.ClientesCuentaCorrientes)
                .HasForeignKey(d => d.IdSucursal)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Clientes_CuentaCorriente_Sucursales");
        });

        modelBuilder.Entity<Color>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(70)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Compra>(entity =>
        {
            entity.Property(e => e.Descuentos).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Fecha).HasColumnType("date");
            entity.Property(e => e.ImporteTotal).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.NotaInterna)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.Subtotal).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.TotalIva)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("TotalIVA");

            entity.HasOne(d => d.IdProveedorNavigation).WithMany(p => p.Compras)
                .HasForeignKey(d => d.IdProveedor)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Compras_Proveedores");
        });

        modelBuilder.Entity<ComprasInsumo>(entity =>
        {
            entity.ToTable("Compras_Insumos");

            entity.Property(e => e.Cantidad).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.CostoUnitCdesc).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.CostoUnitFinal).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.CostoUnitario).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.DescuentoTotal).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.DescuentoUnit).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.IvaTotal).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.IvaUnit).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.PorcDescuento).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.PorcIva).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Subtotal).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.IdCompraNavigation).WithMany(p => p.ComprasInsumos)
                .HasForeignKey(d => d.IdCompra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Compras_Insumos_Compras");
        });

        modelBuilder.Entity<CondicionesIva>(entity =>
        {
            entity.ToTable("CondicionesIVA");

            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Cuenta>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<EstadosUsuario>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Gasto>(entity =>
        {
            entity.Property(e => e.Concepto)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.Fecha).HasColumnType("date");
            entity.Property(e => e.Importe).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.IdCategoriaNavigation).WithMany(p => p.Gastos)
                .HasForeignKey(d => d.IdCategoria)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Gastos_Gastos_Categorias");

            entity.HasOne(d => d.IdCuentaNavigation).WithMany(p => p.Gastos)
                .HasForeignKey(d => d.IdCuenta)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Gastos_Cuentas");

            entity.HasOne(d => d.IdSucursalNavigation).WithMany(p => p.Gastos)
                .HasForeignKey(d => d.IdSucursal)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Gastos_Sucursales");
        });

        modelBuilder.Entity<GastosCategoria>(entity =>
        {
            entity.ToTable("Gastos_Categorias");

            entity.Property(e => e.Nombre)
                .HasMaxLength(200)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Insumo>(entity =>
        {
            entity.Property(e => e.Codigo)
                .HasMaxLength(70)
                .IsUnicode(false);
            entity.Property(e => e.CostoUnitario).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Descripcion)
                .HasMaxLength(100)
                .IsUnicode(false);

            entity.HasOne(d => d.IdCategoriaNavigation).WithMany(p => p.Insumos)
                .HasForeignKey(d => d.IdCategoria)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Insumos_Insumos_Categorias");

            entity.HasOne(d => d.IdProveedorNavigation).WithMany(p => p.Insumos)
                .HasForeignKey(d => d.IdProveedor)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Insumos_Proveedores");
        });

        modelBuilder.Entity<InsumosCategoria>(entity =>
        {
            entity.ToTable("Insumos_Categorias");

            entity.Property(e => e.Nombre)
                .HasMaxLength(70)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Inventario>(entity =>
        {
            entity.ToTable("Inventario");

            entity.Property(e => e.Cantidad).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.IdProductoNavigation).WithMany(p => p.Inventarios)
                .HasForeignKey(d => d.IdProducto)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Inventario_Productos");

            entity.HasOne(d => d.IdProductoVarianteNavigation).WithMany(p => p.Inventarios)
                .HasForeignKey(d => d.IdProductoVariante)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Inventario_Productos_Variantes");

            entity.HasOne(d => d.IdSucursalNavigation).WithMany(p => p.Inventarios)
                .HasForeignKey(d => d.IdSucursal)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Inventario_Sucursales");
        });

        modelBuilder.Entity<InventarioMovimiento>(entity =>
        {
            entity.ToTable("Inventario_Movimientos");

            entity.Property(e => e.Concepto)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.Entrada).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Fecha).HasColumnType("date");
            entity.Property(e => e.Salida).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.TipoMov)
                .HasMaxLength(50)
                .IsUnicode(false);

            entity.HasOne(d => d.IdInventarioNavigation).WithMany(p => p.InventarioMovimientos)
                .HasForeignKey(d => d.IdInventario)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Inventario_Movimientos_Inventario");

            entity.HasOne(d => d.IdSucursalNavigation).WithMany(p => p.InventarioMovimientos)
                .HasForeignKey(d => d.IdSucursal)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Inventario_Movimientos_Sucursales");
        });

        modelBuilder.Entity<InventarioTransfSucursal>(entity =>
        {
            entity.ToTable("Inventario_TransfSucursales");

            entity.Property(e => e.Fecha).HasColumnType("date");
            entity.Property(e => e.Notas)
                .HasMaxLength(200)
                .IsUnicode(false);

            entity.HasOne(d => d.IdSucursalDestinoNavigation).WithMany(p => p.InventarioTransfSucursaleIdSucursalDestinoNavigations)
                .HasForeignKey(d => d.IdSucursalDestino)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Inventario_TransfSucursales_Sucursales1");

            entity.HasOne(d => d.IdSucursalOrigenNavigation).WithMany(p => p.InventarioTransfSucursaleIdSucursalOrigenNavigations)
                .HasForeignKey(d => d.IdSucursalOrigen)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Inventario_TransfSucursales_Sucursales");
        });

        modelBuilder.Entity<InventarioTransfSucursalesProducto>(entity =>
        {
            entity.ToTable("Inventario_TransfSucursales_Productos");

            entity.Property(e => e.Cantidad).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.IdProductoNavigation).WithMany(p => p.InventarioTransfSucursalesProductos)
                .HasForeignKey(d => d.IdProducto)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Inventario_TransfSucursales_Productos_Productos");

            entity.HasOne(d => d.IdTransfSucursalNavigation).WithMany(p => p.InventarioTransfSucursalesProductos)
                .HasForeignKey(d => d.IdTransfSucursal)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Inventario_TransfSucursales_Productos_Inventario_TransfSucursales");
        });

        modelBuilder.Entity<InventarioTransfSucursalesProductosVariante>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK_Inventario_TransfSucursales_Productos_Talles");

            entity.ToTable("Inventario_TransfSucursales_Productos_Variantes");

            entity.Property(e => e.Cantidad).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.IdProductoNavigation).WithMany(p => p.InventarioTransfSucursalesProductosVariantes)
                .HasForeignKey(d => d.IdProducto)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Inventario_TransfSucursales_Productos_Variantes_Productos");

            entity.HasOne(d => d.IdProductoVarianteNavigation).WithMany(p => p.InventarioTransfSucursalesProductosVariantes)
                .HasForeignKey(d => d.IdProductoVariante)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Inventario_TransfSucursales_Productos_Variantes_Productos_Variantes");

            entity.HasOne(d => d.IdTransfSucursalProductoNavigation).WithMany(p => p.InventarioTransfSucursalesProductosVariantes)
                .HasForeignKey(d => d.IdTransfSucursalProducto)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Inventario_TransfSucursales_Productos_Variantes_Inventario_TransfSucursales_Productos");
        });

        modelBuilder.Entity<ListasPrecio>(entity =>
        {
            entity.ToTable("Listas_Precios");

            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<OrdenCorteProductosVariante>(entity =>
        {
            entity.ToTable("Orden_Corte_Productos_Variantes");

            entity.Property(e => e.Id).ValueGeneratedNever();

            entity.HasOne(d => d.IdOrdenCorteProductoNavigation).WithMany(p => p.OrdenCorteProductosVariantes)
                .HasForeignKey(d => d.IdOrdenCorteProducto)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Orden_Corte_Productos_Variantes_Ordenes_Corte_Productos");

            entity.HasOne(d => d.IdProductoNavigation).WithMany(p => p.OrdenCorteProductosVariantes)
                .HasForeignKey(d => d.IdProducto)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Orden_Corte_Productos_Variantes_Productos");

            entity.HasOne(d => d.IdProductoVarianteNavigation).WithMany(p => p.OrdenCorteProductosVariantes)
                .HasForeignKey(d => d.IdProductoVariante)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Orden_Corte_Productos_Variantes_Productos_Variantes");
        });

        modelBuilder.Entity<OrdenesCorte>(entity =>
        {
            entity.ToTable("Ordenes_Corte");

            entity.Property(e => e.Id).ValueGeneratedNever();
            entity.Property(e => e.AnchoTizada).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.CantidadCapas).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.CantidadFinalReal).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.CantidadProducidas).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.CantidadProducir).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.DiferenciaCorte).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.DiferenciaFinalReal).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.FechaFinalizacion).HasColumnType("date");
            entity.Property(e => e.FechaInicio).HasColumnType("date");
            entity.Property(e => e.HoraFinCorte).HasColumnType("datetime");
            entity.Property(e => e.HoraInicioCorte).HasColumnType("datetime");
            entity.Property(e => e.LargoTizada).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.IdNavigation).WithOne(p => p.OrdenesCorte)
                .HasForeignKey<OrdenesCorte>(d => d.Id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Ordenes_Corte_Ordenes_Corte_Productos");

            entity.HasOne(d => d.IdEstadoNavigation).WithMany(p => p.OrdenesCortes)
                .HasForeignKey(d => d.IdEstado)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Ordenes_Corte_Ordenes_Corte_Estados");
        });

        modelBuilder.Entity<OrdenesCorteEstado>(entity =>
        {
            entity.ToTable("Ordenes_Corte_Estados");

            entity.Property(e => e.Nombre)
                .HasMaxLength(70)
                .IsUnicode(false);
        });

        modelBuilder.Entity<OrdenesCorteEtapa>(entity =>
        {
            entity.ToTable("Ordenes_Corte_Etapas");

            entity.Property(e => e.CantidadProducidas).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.CantidadProducir).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Diferencias).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.FechaEntrada).HasColumnType("date");
            entity.Property(e => e.FechaSalidaAproximada).HasColumnType("date");
            entity.Property(e => e.FechaSalidaReal).HasColumnType("date");
            entity.Property(e => e.NotaInterna)
                .HasMaxLength(200)
                .IsUnicode(false);

            entity.HasOne(d => d.IdEstadoNavigation).WithMany(p => p.OrdenesCorteEtapas)
                .HasForeignKey(d => d.IdEstado)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Ordenes_Corte_Etapas_Ordenes_Corte_Etapas_Estados");

            entity.HasOne(d => d.IdTallerNavigation).WithMany(p => p.OrdenesCorteEtapas)
                .HasForeignKey(d => d.IdTaller)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Ordenes_Corte_Etapas_Talleres");
        });

        modelBuilder.Entity<OrdenesCorteEtapasEstado>(entity =>
        {
            entity.ToTable("Ordenes_Corte_Etapas_Estados");

            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<OrdenesCorteInsumo>(entity =>
        {
            entity.ToTable("Ordenes_Corte_Insumos");

            entity.Property(e => e.Id).ValueGeneratedNever();

            entity.HasOne(d => d.IdCorteNavigation).WithMany(p => p.OrdenesCorteInsumos)
                .HasForeignKey(d => d.IdCorte)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Ordenes_Corte_Insumos_Ordenes_Corte");

            entity.HasOne(d => d.IdInsumoNavigation).WithMany(p => p.OrdenesCorteInsumos)
                .HasForeignKey(d => d.IdInsumo)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Ordenes_Corte_Insumos_Insumos");
        });

        modelBuilder.Entity<OrdenesCorteProducto>(entity =>
        {
            entity.ToTable("Ordenes_Corte_Productos");

            entity.Property(e => e.Id).ValueGeneratedNever();
        });

        modelBuilder.Entity<Personal>(entity =>
        {
            entity.ToTable("Personal");

            entity.Property(e => e.BancoAlias)
                .HasMaxLength(80)
                .IsUnicode(false);
            entity.Property(e => e.BancoCbu)
                .HasMaxLength(80)
                .IsUnicode(false);
            entity.Property(e => e.Cuit)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.DiasLaborales).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Dni)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Domicilio)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.FechaIngreso).HasColumnType("date");
            entity.Property(e => e.FechaRetiro).HasColumnType("date");
            entity.Property(e => e.HsLaborales).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.IdCondicionIva).HasColumnName("IdCondicionIVA");
            entity.Property(e => e.Localidad)
                .HasMaxLength(80)
                .IsUnicode(false);
            entity.Property(e => e.Nombre)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.SueldoMensual).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Telefono)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.TelefonoAlternativo)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.ValorDia).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.ValorHora).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.IdBancoNavigation).WithMany(p => p.Personals)
                .HasForeignKey(d => d.IdBanco)
                .HasConstraintName("FK_Personal_Bancos");

            entity.HasOne(d => d.IdCondicionIvaNavigation).WithMany(p => p.Personals)
                .HasForeignKey(d => d.IdCondicionIva)
                .HasConstraintName("FK_Personal_CondicionesIVA");

            entity.HasOne(d => d.IdProvinciaNavigation).WithMany(p => p.Personals)
                .HasForeignKey(d => d.IdProvincia)
                .HasConstraintName("FK_Personal_Provincias");

            entity.HasOne(d => d.IdPuestoNavigation).WithMany(p => p.Personals)
                .HasForeignKey(d => d.IdPuesto)
                .HasConstraintName("FK_Personal_Personal_Puestos");

            entity.HasOne(d => d.IdSucursalNavigation).WithMany(p => p.Personals)
                .HasForeignKey(d => d.IdSucursal)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Personal_Sucursales");
        });

        modelBuilder.Entity<PersonalPuesto>(entity =>
        {
            entity.ToTable("Personal_Puestos");

            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<PersonalSueldo>(entity =>
        {
            entity.ToTable("Personal_Sueldos");

            entity.Property(e => e.Concepto)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.Fecha).HasColumnType("date");
            entity.Property(e => e.Importe).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.ImporteAbonado).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.NotaInterna)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.Saldo).HasColumnType("decimal(20, 2)");

            entity.HasOne(d => d.IdPersonalNavigation).WithMany(p => p.PersonalSueldos)
                .HasForeignKey(d => d.IdPersonal)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Personal_Sueldos_Personal");
        });

        modelBuilder.Entity<PersonalSueldosPago>(entity =>
        {
            entity.ToTable("Personal_Sueldos_Pagos");

            entity.Property(e => e.Fecha).HasColumnType("date");
            entity.Property(e => e.Importe).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.NotaInterna)
                .HasMaxLength(200)
                .IsUnicode(false);

            entity.HasOne(d => d.IdCuentaNavigation).WithMany(p => p.PersonalSueldosPagos)
                .HasForeignKey(d => d.IdCuenta)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Personal_Sueldos_Pagos_Cuentas");

            entity.HasOne(d => d.IdSueldoNavigation).WithMany(p => p.PersonalSueldosPagos)
                .HasForeignKey(d => d.IdSueldo)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Personal_Sueldos_Pagos_Personal_Sueldos");
        });

        modelBuilder.Entity<Producto>(entity =>
        {
            entity.Property(e => e.Descripcion)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.PrecioUnitario).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.IdCategoriaNavigation).WithMany(p => p.Productos)
                .HasForeignKey(d => d.IdCategoria)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Productos_PCategorias");
        });

        modelBuilder.Entity<ProductosCategoria>(entity =>
        {
            entity.ToTable("Productos_Categorias");

            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<ProductosCategoriasTalle>(entity =>
        {
            entity.ToTable("Productos_Categorias_Talles");

            entity.Property(e => e.Nombre)
                .HasMaxLength(200)
                .IsUnicode(false);

            entity.HasOne(d => d.IdCategoriaNavigation).WithMany(p => p.ProductosCategoriasTalles)
                .HasForeignKey(d => d.IdCategoria)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Productos_Categorias_Talles_Productos_Categorias");
        });

        modelBuilder.Entity<ProductosColor>(entity =>
        {
            entity.ToTable("Productos_Colores");

            entity.HasOne(d => d.IdColorNavigation).WithMany(p => p.ProductosColores)
                .HasForeignKey(d => d.IdColor)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Productos_Colores_Colores");

            entity.HasOne(d => d.IdProductoNavigation).WithMany(p => p.ProductosColores)
                .HasForeignKey(d => d.IdProducto)
                .HasConstraintName("FK_Productos_Colores_Productos");
        });

        modelBuilder.Entity<ProductosPrecio>(entity =>
        {
            entity.ToTable("Productos_Precios");

            entity.Property(e => e.PrecioUnitario).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.IdListaPrecioNavigation).WithMany(p => p.ProductosPrecios)
                .HasForeignKey(d => d.IdListaPrecio)
                .HasConstraintName("FK_Productos_Precios_Listas_Precios");

            entity.HasOne(d => d.IdProductoNavigation).WithMany(p => p.ProductosPrecios)
                .HasForeignKey(d => d.IdProducto)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_Productos_Precios_Productos");
        });

        modelBuilder.Entity<ProductosTalle>(entity =>
        {
            entity.ToTable("Productos_Talles");

            entity.HasOne(d => d.IdProductoNavigation).WithMany(p => p.ProductosTalles)
                .HasForeignKey(d => d.IdProducto)
                .HasConstraintName("FK_Productos_Talles_Productos");

            entity.HasOne(d => d.IdTalleNavigation).WithMany(p => p.ProductosTalles)
                .HasForeignKey(d => d.IdTalle)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Productos_Talles_Productos_Categorias_Talles");
        });

        modelBuilder.Entity<ProductosVariante>(entity =>
        {
            entity.ToTable("Productos_Variantes");

            entity.HasOne(d => d.IdColorNavigation).WithMany(p => p.ProductosVariantes)
                .HasForeignKey(d => d.IdColor)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Productos_Variantes_Productos_Colores");

            entity.HasOne(d => d.IdProductoNavigation).WithMany(p => p.ProductosVariantes)
                .HasForeignKey(d => d.IdProducto)
                .HasConstraintName("FK_Productos_Variantes_Productos");

            entity.HasOne(d => d.IdTalleNavigation).WithMany(p => p.ProductosVariantes)
                .HasForeignKey(d => d.IdTalle)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Productos_Variantes_Productos_Talles");
        });

        modelBuilder.Entity<Proveedor>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Provincia>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(60)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Rol>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Sucursal>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(200)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Taller>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(200)
                .IsUnicode(false);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.Property(e => e.Apellido)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.CodigoRecuperacion)
                .HasMaxLength(250)
                .IsUnicode(false);
            entity.Property(e => e.Contrasena)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.Correo)
                .HasMaxLength(250)
                .IsUnicode(false);
            entity.Property(e => e.Direccion)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Dni)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.Telefono)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Usuario)
                .HasMaxLength(100)
                .IsUnicode(false)
                .HasColumnName("Usuario");

            entity.HasOne(d => d.IdEstadoNavigation).WithMany(p => p.Usuarios)
                .HasForeignKey(d => d.IdEstado)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Usuarios_EstadosUsuarios");

            entity.HasOne(d => d.IdRolNavigation).WithMany(p => p.Usuarios)
                .HasForeignKey(d => d.IdRol)
                .HasConstraintName("FK_Usuarios_Roles");
        });

        modelBuilder.Entity<UsuariosSucursal>(entity =>
        {
            entity.ToTable("Usuarios_Sucursales");

            entity.HasOne(d => d.IdSucursalNavigation).WithMany(p => p.UsuariosSucursales)
                .HasForeignKey(d => d.IdSucursal)
                .HasConstraintName("FK_Usuarios_Sucursales_Sucursales");

            entity.HasOne(d => d.IdUsuarioNavigation).WithMany(p => p.UsuariosSucursales)
                .HasForeignKey(d => d.IdUsuario)
                .HasConstraintName("FK_Usuarios_Sucursales_Usuarios_Sucursales");
        });

        modelBuilder.Entity<Venta>(entity =>
        {
            entity.Property(e => e.Descuentos).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Fecha).HasColumnType("date");
            entity.Property(e => e.ImporteTotal).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.NotaCliente)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.NotaInterna)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.Subtotal).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.TotalIva)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("TotalIVA");

            entity.HasOne(d => d.IdClienteNavigation).WithMany(p => p.Venta)
                .HasForeignKey(d => d.IdCliente)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Ventas_Clientes");

            entity.HasOne(d => d.IdListaPrecioNavigation).WithMany(p => p.Venta)
                .HasForeignKey(d => d.IdListaPrecio)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Ventas_Listas_Precios");

            entity.HasOne(d => d.IdSucursalNavigation).WithMany(p => p.Venta)
                .HasForeignKey(d => d.IdSucursal)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Ventas_Sucursales");

            entity.HasOne(d => d.IdVendedorNavigation).WithMany(p => p.Venta)
                .HasForeignKey(d => d.IdVendedor)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Ventas_Personal");
        });

        modelBuilder.Entity<VentasProducto>(entity =>
        {
            entity.ToTable("Ventas_Productos");

            entity.Property(e => e.Cantidad).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.DescuentoTotal).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.DescuentoUnit).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.IvaTotal).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.IvaUnit).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.PorcDescuento).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.PorcIva).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.PrecioUnitCdesc).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.PrecioUnitFinal).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.PrecioUnitario).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Subtotal).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.IdProductoNavigation).WithMany(p => p.VentasProductos)
                .HasForeignKey(d => d.IdProducto)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Ventas_Productos_Productos");

            entity.HasOne(d => d.IdVentaNavigation).WithMany(p => p.VentasProductos)
                .HasForeignKey(d => d.IdVenta)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Ventas_Productos_Ventas");
        });

        modelBuilder.Entity<VentasProductosVariante>(entity =>
        {
            entity.ToTable("Ventas_Productos_Variantes");

            entity.Property(e => e.Cantidad).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.IdProductoNavigation).WithMany(p => p.VentasProductosVariantes)
                .HasForeignKey(d => d.IdProducto)
                .HasConstraintName("FK_Ventas_Productos_Variantes_Productos");

            entity.HasOne(d => d.IdProductoVarianteNavigation).WithMany(p => p.VentasProductosVariantes)
                .HasForeignKey(d => d.IdProductoVariante)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Ventas_Productos_Variantes_Productos_Variantes");

            entity.HasOne(d => d.IdVentaProductoNavigation).WithMany(p => p.VentasProductosVariantes)
                .HasForeignKey(d => d.IdVentaProducto)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Ventas_Productos_Variantes_Ventas_Productos");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
