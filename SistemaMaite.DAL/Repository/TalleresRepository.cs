// /DAL/Repository/TalleresRepository.cs
using Microsoft.EntityFrameworkCore;
using SistemaMaite.DAL.DataContext;
using SistemaMaite.Models;

namespace SistemaMaite.DAL.Repository
{
    public class TalleresRepository : ITalleresRepository<Taller>
    {
        private readonly SistemaMaiteContext _dbcontext;

        public TalleresRepository(SistemaMaiteContext context)
        {
            _dbcontext = context;
        }

        public async Task<bool> Eliminar(int id)
        {
            var model = await _dbcontext.Talleres.FirstAsync(p => p.Id == id); // Ajustá el DbSet si es Tallers
            _dbcontext.Talleres.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<Taller?> Obtener(int id)
        {
            return await _dbcontext.Talleres
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == id);
        }

        public Task<IQueryable<Taller>> ObtenerTodos()
        {
            IQueryable<Taller> query = _dbcontext.Talleres;
            return Task.FromResult(query);
        }

        public async Task<bool> Insertar(Taller model)
        {
            _dbcontext.Talleres.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Actualizar(Taller model)
        {
            _dbcontext.Talleres.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }
    }
}
