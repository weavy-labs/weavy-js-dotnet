using System.Threading.Tasks;
using Acme.Data;
using Acme.Http;
using Acme.Models;
using Acme.Utils;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Acme.Controllers;

[Authorize]
[Route("[controller]")]
public class UsersController : Controller {

    private readonly AcmeContext _db;
    private readonly ILogger _logger;
    private readonly WeavyClient _weavy;

    public UsersController(AcmeContext db, WeavyClient weavy, ILogger<UsersController> logger) {
        _db = db; 
        _weavy = weavy;
        _logger = logger;
    }

    /// <summary>
    /// List users.
    /// </summary>
    /// <returns></returns>
    [HttpGet("")]
    public async Task<IActionResult> Index() {
        var users = await _db.Users.ToListAsync();
        return View(users);
    }

    /// <summary>
    /// Edit user.
    /// </summary>
    /// <returns></returns>
    [Authorize(Roles = ClaimsUtils.ADMIN_ROLE)]
    [HttpGet("{id:int}")]
    public async Task<IActionResult> Edit(int id) {
        var user = await _db.Users.FindAsync(id);
        var model = new EditUserModel(user);
        return View(model);
    }

    /// <summary>
    /// Edit authenticated user.
    /// </summary>
    /// <returns></returns>
    [HttpGet("profile")]
    public async Task<IActionResult> Profile() {
        var user = await _db.Users.FindAsync(User.Id());
        var model = new EditUserModel(user);
        return View(model);
    }

    /// <summary>
    /// Edit user settings.
    /// </summary>
    /// <returns></returns>
    [HttpGet("settings")]
    public async Task<IActionResult> Settings() {
        var user = await _db.Users.FindAsync(User.Id());
        var model = new EditSettingsModel { TimeZone = user.TimeZone };
        return View(model);
    }

    /// <summary>
    /// Update user.
    /// </summary>
    /// <returns></returns>
    [Authorize(Roles = ClaimsUtils.ADMIN_ROLE)]
    [HttpPost("{id:int}")]
    public async Task<IActionResult> Update(int id, EditUserModel model) {
        var user = await _db.Users.FindAsync(id);
        if (user == null) {
            return BadRequest();
        }

        if (ModelState.IsValid) {
            user.Name = model.Name;
            user.Title = model.Title;
            user.Email = model.Email;
            user.Phone = model.Phone;            
            user.Username = model.Username;
            if (model.Password != null) {
                user.Password = HashUtils.HashPassword(model.Password);
            }
            user.IsAdmin = model.IsAdmin;
            await _db.SaveChangesAsync();

            // sync user to Weavy in the background
            _weavy.SyncUser(user).FireAndForget(_logger);

            return RedirectToAction(nameof(Index));
        }

        model.User = user;
        return View(nameof(Edit), model);
    }

    /// <summary>
    /// Update authenticated user.
    /// </summary>
    /// <returns></returns>

    [HttpPost("profile")]
    public async Task<IActionResult> Profile(EditUserModel model) {
        var user = await _db.Users.FindAsync(User.Id());
        if (user == null) {
            return BadRequest();
        }

        if (ModelState.IsValid) {
            user.Name = model.Name;
            user.Title = model.Title;
            user.Email = model.Email;
            user.Phone = model.Phone;
            user.Username = model.Username;
            if (model.Password != null) {
                user.Password = HashUtils.HashPassword(model.Password);
            }
            await _db.SaveChangesAsync();

            // sync user to Weavy in the background
            _weavy.SyncUser(user).FireAndForget(_logger);

            return RedirectToAction(nameof(Index));
        }

        model.User = user;
        return View(model);
    }


    /// <summary>
    /// Save user settings.
    /// </summary>
    /// <returns></returns>

    [HttpPost("settings")]
    public async Task<IActionResult> Settings(EditSettingsModel model) {
        var user = await _db.Users.FindAsync(User.Id());
        if (user == null) {
            return BadRequest();
        }

        if (ModelState.IsValid) {
            user.TimeZone = model.TimeZone;
            await _db.SaveChangesAsync();

            return RedirectToAction(nameof(Index));
        }


        return View(model);
    }

    [AllowAnonymous]
    [HttpGet("~/login")]
    public IActionResult Login() {
        var model = new LoginModel();
        return View(model);
    }

    [AllowAnonymous]
    [HttpPost("~/login")]
    public async Task<IActionResult> Login(LoginModel model) {

        if (ModelState.IsValid) {
            var user = await _db.Users.SingleOrDefaultAsync(x => x.Username == model.Username);
            if (user == null) {
                _logger.LogDebug("Could not locate user account for {user}", model.Username);
            } else if (user.IsTrashed) {
                _logger.LogInformation("Unable to sign in trashed user {user}", model.Username);
            } else {
                // compare password hash with supplied password
                if (HashUtils.VerifyPassword(model.Password, user.Password)) {
                    // create and set auth cookie
                    var principal = ClaimsUtils.CreatePrincipal(user, CookieAuthenticationDefaults.AuthenticationScheme);
                    await HttpContext.SignInAsync(principal, new AuthenticationProperties { IsPersistent = true });
                    _logger.LogInformation("Signed in {user}", model.Username);

                    // sync user to Weavy in the background
                    _weavy.SyncUser(user).FireAndForget(_logger);

                    return LocalRedirect(model.Path ?? "~/");
                } else {
                    _logger.LogDebug("Invalid password for {user}", model.Username);
                }
            }
            ModelState.AddModelError(nameof(model.Password), "The credentials you entered did not match our records.");
        }

        // login failed
        return View(model);
    }

    [HttpGet("~/logout")]
    public async Task<IActionResult> Logout() {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return LocalRedirect("~/");
    }

    /// <summary>
    /// Returns an access_token for the authenticated user.
    /// </summary>
    /// <param name="refresh"><c>false</c> to reuse existing token, <c>true</c> to request a new token.</param>
    /// <returns></returns>
    [HttpGet("~/token")]
    public async Task<IActionResult> GetToken(bool refresh) {
        var accessToken = await _weavy.GetToken(User, refresh);
        return accessToken != null ? Content(accessToken) : BadRequest();
    }
}
