using System.Linq;
using System.Threading.Tasks;
using System;
using System.Collections.Generic;
using SistemaMaite.Models;

namespace SistemaMaite.DAL.Repository
{
    public interface ICajasRepository<T>
    {
        Task<bool> Insertar(T model);
        Task<bool> Actualizar(T model);
        Task<bool> Eliminar(int id);
        Task<T> Obtener(int id);
        Task<IQueryable<T>> ObtenerTodos();


        Task<(List<Caja> Lista, decimal SaldoAnterior)> ObtenerFiltradoConSaldoAnterior(
         DateTime? fechaDesde,
         DateTime? fechaHasta,
         int idSucursal,
         int idCuenta,
         string tipo,
         string concepto);

        // 👉 Nuevo: filtro en repositorio
        Task<List<T>> ObtenerFiltrado(
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            int idSucursal,
            int idCuenta,
            string tipo,
            string concepto
        );
    }
}
