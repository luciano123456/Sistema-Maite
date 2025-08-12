using SistemaMaite.Models;
using System.Net.Http;

namespace SistemaMaite.BLL.Service
{
    public interface ILoginService
    {
        Task<User> Login(string username, string password);

        Task<bool> Logout();
    }
}
