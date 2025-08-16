﻿using SistemaMaite.Models;

namespace SistemaMaite.BLL.Service
{
    public interface IPersonalService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Personal model);
        Task<bool> Insertar(Personal model);

        Task<Personal> Obtener(int id);

        Task<IQueryable<Personal>> ObtenerTodos();
    }

}
