# Guía para agentes y desarrolladores — Sistema Maite

Este documento describe **cómo está armado el proyecto** y **cómo conviene trabajar** sobre el código (incluidos asistentes automatizados). Léelo antes de tocar archivos que no sean estrictamente necesarios para la tarea.

## Qué es el proyecto

Aplicación web de **gestión empresarial** en **ASP.NET Core 6** (MVC + Razor), con **SQL Server** y **Entity Framework Core**. El front combina vistas Razor, Bootstrap y **JavaScript** en `wwwroot/js` (muchas pantallas consumen acciones del controlador vía JSON).

## Estructura de la solución

Abrir `Sistema Maite.sln`. Cuatro proyectos:

| Proyecto | Responsabilidad |
|----------|-----------------|
| **SistemaMaite.Application** | Host web: `Program.cs`, controladores, vistas Razor, `wwwroot`, ViewModels. Referencia **BLL** y **Models** (no DAL directamente en el `.csproj`). |
| **SistemaMaite.BLL** | Servicios de aplicación: orquestan repositorios. Referencia **DAL** y **Models**. |
| **SistemaMaite.DAL** | `SistemaMaiteContext`, repositorios, acceso a datos con EF Core. |
| **SistemaMaite.Models** | Entidades / modelo de dominio persistido. |

**Flujo habitual:** `Controller` → `IService` / `Service` → `IRepository` / `Repository` → `SistemaMaiteContext`.

## Reglas al implementar cambios

1. **Alcance mínimo:** solo archivos y líneas necesarios para el pedido. No refactorizar “de paso” módulos no relacionados.
2. **Respetar el estilo existente:** nombres en españis donde ya existen, mismos patrones de async/await, mismas convenciones de controladores (vista + JSON).
3. **Registrar dependencias:** todo repositorio o servicio nuevo debe registrarse en `SistemaMaite.Application/Program.cs` con `AddScoped` (igual que el resto del proyecto).
4. **No inventar rutas o nombres de configuración:** la cadena de conexión típica es `ConnectionStrings:SistemaDB` (ver `appsettings*.json`).

## Dónde colocar cada tipo de código

- **Nueva entidad o cambio de modelo:** `SistemaMaite.Models/`.
- **Consultas y persistencia:** interfaz en `SistemaMaite.DAL/Repository/` (prefijo `I`), implementación junto al mismo patrón que `ClientesRepository`.
- **Lógica orquestada / CRUD de negocio:** `SistemaMaite.BLL/Service/` + interfaz `I*Service`.
- **HTTP, vistas, JSON hacia el navegador:** `SistemaMaite.Application/Controllers/`.
- **DTOs para la UI:** `SistemaMaite.Application/Models/ViewModels/`.
- **Vistas Razor:** `SistemaMaite.Application/Views/<Controller>/`.
- **CSS/JS por pantalla:** `SistemaMaite.Application/wwwroot/css/` y `wwwroot/js/` (suele haber un `.js` principal por módulo).

## Autenticación y autorización

- Esquema principal: **JWT Bearer**; el token puede llegar en la cookie **`JwtToken`** (ver `JwtBearerEvents.OnMessageReceived` en `Program.cs`).
- La política por defecto exige usuario autenticado. Los controladores o acciones que requieran login suelen llevar **`[Authorize]`**.
- Claims útiles y helpers: `SistemaMaite.Application/Extensions/ClaimsPrincipalExtensions.cs` (`GetUserId`, `GetRolId`, `GetUserName`).
- Login y permisos: `LoginController` + `IUsuariosPermisosService` (estructura de módulos/permisos para menú y dashboard).

## Convenciones de la UI

- Layout principal: `Views/Shared/_Layout.cshtml`; navbar: `Views/Shared/Partials/NavBarLogin.cshtml` (nombre exacto puede variar en mayúsculas según el repo).
- Muchas pantallas cargan datos con **fetch** / jQuery contra acciones que devuelven `Ok(...)` con ViewModels o objetos anónimos.

## Cosas a tener en cuenta (deuda / trampas)

- Puede haber **namespaces desalineados** con el nombre del producto (por ejemplo controladores bajo un namespace “Bronx” en algún archivo). Al agregar código nuevo, preferí **`SistemaMaite.Application`** coherente con el resto del proyecto.
- En `Program.cs` aparece **`AddControllersWithViews()`** más de una vez; al editar, no dupliques bloques innecesariamente.
- Los repositorios a veces usan **`try/catch` que devuelve `false`** sin log: si corregís bugs de datos, considerá al menos no ocultar errores críticos sin criterio.
- El repo puede estar en **refactor de usuarios/roles/permisos** (entidades y tablas nuevas vs. tipos antiguos). Antes de asumir `User`/`Rol`, revisá `SistemaMaite.Models` y los servicios de login/permisos vigentes en la rama.

## Comandos útiles

Desde la raíz del repositorio:

```bash
dotnet build "Sistema Maite.sln"
dotnet run --project SistemaMaite.Application/SistemaMaite.Application.csproj
```

Asegurate de tener configurada la cadena **SQL Server** local o remota según `appsettings.Development.json` / variables de entorno.

## Resumen para el agente

1. Localizar el módulo (controlador + servicio + repositorio + vista + js si aplica).  
2. Implementar el cambio en la **capa correcta** (no meter EF en controladores salvo que el proyecto ya lo haga explícitamente en ese punto).  
3. **Registrar** nuevas interfaces en `Program.cs`.  
4. Compilar con `dotnet build` y corregir errores de la solución completa.  
5. No expandir el alcance más allá de lo pedido por el usuario.
