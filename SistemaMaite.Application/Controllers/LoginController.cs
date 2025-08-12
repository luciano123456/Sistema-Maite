using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using SistemaMaite.Application.Models;
using SistemaMaite.Application.Models.ViewModels;
using SistemaMaite.BLL.Service;
using SistemaMaite.Models;
using System.Diagnostics;

namespace SistemaMaite.Application.Controllers
{
    public class LoginController : Controller
    {

        private readonly ILoginService _loginService;

        public LoginController(ILoginService loginService)
        {
            _loginService = loginService;
        }
      
        public IActionResult Index()
        {
            return View();
        }



        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> IniciarSesion([FromBody] VMLogin model)
        {
            try
            {
                var user = await _loginService.Login(model.Usuario, model.Contrasena); // Llama al servicio de login

                // Verificar si el usuario existe
                if (user == null)
                {
                    return Json(new { success = false, message = "Usuario o contraseña incorrectos." });
                }

                if (user.IdEstado == 2)
                {
                    return Json(new { success = false, message = "Tu usuario se encuentra bloqueado." });
                }


                var passwordHasher = new PasswordHasher<User>();
                var result = passwordHasher.VerifyHashedPassword(user, user.Contrasena, model.Contrasena);

                if (result == PasswordVerificationResult.Success)
                {
                    // Crear objeto VMUser para la sesión
                    var vmUser = new VMUser
                    {
                        Id = user.Id,
                        Usuario = user.Usuario,
                        IdRol = user.IdRol,
                        Nombre = user.Nombre,
                        Apellido = user.Apellido,
                        Direccion = user.Direccion,
                        Dni = user.Dni,
                        Telefono = user.Telefono,
                    };

                    // Configurar la sesión con el usuario
                    await SessionHelper.SetUsuarioSesion(vmUser, HttpContext);

                    // Responder con éxito y redirigir
                    return Json(new { success = true, redirectUrl = Url.Action("Index", "Usuarios"), user = vmUser });
                }
                else
                {
                    return Json(new { success = false, message = "Usuario o contraseña incorrectos." });
                }
            }
            catch (Exception ex)
            {
                // Si ocurre un error, manejarlo
                return Json(new { success = false, message = "Ocurrió un error inesperado. Inténtalo nuevamente." });
            }
        }




        // Acción para cerrar sesión
        public async Task<IActionResult> Logout()
        {
            await SessionHelper.CerrarSession(HttpContext);
            return RedirectToAction("Index");
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}