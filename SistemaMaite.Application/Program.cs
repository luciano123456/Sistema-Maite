using Microsoft.EntityFrameworkCore;
using SistemaMaite.BLL.Service;
using SistemaMaite.DAL.DataContext;
using SistemaMaite.DAL.Repository;
using SistemaMaite.Models;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();


builder.Services.AddDbContext<SistemaMaiteContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("SistemaDB")));


// Agregar Razor Pages
builder.Services.AddRazorPages().AddRazorRuntimeCompilation();

// Registrar repositorios y servicios
builder.Services.AddScoped<IUsuariosRepository<User>, UsuariosRepository>();
builder.Services.AddScoped<IUsuariosService, UsuariosService>();

builder.Services.AddScoped<IEstadosUsuariosRepository<EstadosUsuario>, EstadosUsuariosRepository>();
builder.Services.AddScoped<IEstadosUsuariosService, EstadosUsuariosService>();

builder.Services.AddScoped<IRolesRepository<Rol>, RolesRepository>();
builder.Services.AddScoped<IRolesService, RolesService>();

builder.Services.AddScoped<ILoginRepository<User>, LoginRepository>();
builder.Services.AddScoped<ILoginService, LoginService>();

builder.Services.AddControllersWithViews()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        o.JsonSerializerOptions.PropertyNamingPolicy = null;
    });

// Configurar autenticación con cookies
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/Login/Index";  // Ruta para redirigir al login si no está autenticado
        options.LogoutPath = "/Login/Logout"; // Ruta para cerrar sesión
    });


var app = builder.Build();

// Configurar el pipeline de middleware
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Usuarios/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();

app.UseStaticFiles(new StaticFileOptions
{
    ServeUnknownFileTypes = true,
    FileProvider = new PhysicalFileProvider(
        Path.Combine(Directory.GetCurrentDirectory(), "wwwroot")),
    RequestPath = ""
});


app.UseRouting();

app.UseAuthentication(); // Habilitar la autenticación con cookies
app.UseAuthorization();  // Habilitar la autorización

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Usuarios}/{action=Index}/{id?}");

// Asegúrate de que las rutas de login estén excluidas del middleware de autenticación
app.MapControllerRoute(
    name: "login",
    pattern: "Login/{action=Index}",
    defaults: new { controller = "Login", action = "Index" });
app.Run();
