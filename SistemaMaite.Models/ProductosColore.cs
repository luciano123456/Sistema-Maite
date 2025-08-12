using System;
using System.Collections.Generic;

namespace SistemaMaite.Models
{

    public partial class ProductosColore
    {
        public int Id { get; set; }

        public int IdProducto { get; set; }

        public int IdColor { get; set; }

        public virtual Color IdColorNavigation { get; set; } = null!;

        public virtual Producto IdProductoNavigation { get; set; } = null!;

        public virtual ICollection<ProductosVariante> ProductosVariantes { get; set; } = new List<ProductosVariante>();
    }
}