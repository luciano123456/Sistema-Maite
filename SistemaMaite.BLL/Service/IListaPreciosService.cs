﻿using SistemaMaite.Models;

namespace SistemaMaite.BLL.Service
{
    public interface IListasPreciosService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(ListasPrecio model);
        Task<bool> Insertar(ListasPrecio model);

        Task<ListasPrecio> Obtener(int id);

        Task<IQueryable<ListasPrecio>> ObtenerTodos();
    }

}
