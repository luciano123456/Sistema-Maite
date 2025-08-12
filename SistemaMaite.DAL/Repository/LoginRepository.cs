using SistemaMaite.Models;
using System;
using System.Collections.Generic;
using System.Diagnostics.Contracts;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory;
using SistemaMaite.DAL.DataContext;

namespace SistemaMaite.DAL.Repository
{
    public class LoginRepository : ILoginRepository<User>
    {

        private readonly SistemaMaiteContext _dbcontext;

        public LoginRepository(SistemaMaiteContext context)
        {
            _dbcontext = context;
        }

        public async Task<User> Login(string username, string password)
        { 
            User user = _dbcontext.Usuarios.Where(x => x.Usuario == username).FirstOrDefault();

            if (user != null)
            {
                return user;
            } else
            {
                return null;
            }
        }

        public async Task<bool> Logout()
        {
            return true;
        }

    }
}
