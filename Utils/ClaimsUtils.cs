using System;
using System.Globalization;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Acme.Data;
using Acme.Models;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Serilog;
using static System.Net.Mime.MediaTypeNames;

namespace Acme.Utils;

/// <summary>
/// Provides helper methods for calculating and verifying hash values.
/// </summary>
public static class ClaimsUtils {

    /// <summary>
    /// Name of the administrators role (for role based security).
    /// </summary>
    public const string ADMIN_ROLE = "Administrator";

    /// <summary>
    /// Claims for auth cookies
    /// </summary>
    public const string ISS_CLAIM = "iss";
    public const string SUB_CLAIM = "sub";
    public const string GUID_CLAIM = "guid";
    public const string EMAIL_CLAIM = "email";
    public const string USERNAME_CLAIM = "username";
    public const string NAME_CLAIM = "name";
    public const string ROLE_CLAIM = "role";

    /// <summary>
    /// Value used as "iss" claim in authentication cookie.
    /// </summary>
    public const string ISSUER = "ACME";

    /// <summary>
    /// Create a <see cref="ClaimsPrincipal"/> for the specified <see cref="User"/>.
    /// </summary>
    /// <param name="user">The user for which to create a <see cref="ClaimsPrincipal"/> object.</param>
    /// <param name="authenticationType">The type of authentication used, <c>null</c> or empty string to create an identity that is not authenticated.</param>
    public static ClaimsPrincipal CreatePrincipal(this User user, string authenticationType) {
        if (user == null) {
            throw new ArgumentNullException(nameof(user));
        }

        var identity = new ClaimsIdentity(authenticationType, USERNAME_CLAIM, ROLE_CLAIM);
        identity.AddClaim(new Claim(ISS_CLAIM, ISSUER, null, ISSUER));
        identity.AddClaim(new Claim(SUB_CLAIM, user.Id.ToString(CultureInfo.InvariantCulture), ClaimValueTypes.Integer, ISSUER));
        identity.AddClaim(new Claim(GUID_CLAIM, user.Guid.ToString(), null, GUID_CLAIM));
        if (!string.IsNullOrWhiteSpace(user.Name)) {
            identity.AddClaim(new Claim(NAME_CLAIM, user.Name, null, ISSUER));
        }
        if (!string.IsNullOrWhiteSpace(user.Username)) {
            identity.AddClaim(new Claim(USERNAME_CLAIM, user.Username, null, ISSUER));
        }
        if (!string.IsNullOrWhiteSpace(user.Email)) {
            identity.AddClaim(new Claim(EMAIL_CLAIM, user.Email, null, ISSUER));
        }
        if (user.IsAdmin) {
            identity.AddClaim(new Claim(ROLE_CLAIM, ADMIN_ROLE, ClaimValueTypes.Boolean, ISSUER));
        }

        var principal = new ClaimsPrincipal(identity);
        return principal;
    }

    /// <summary>
    /// Gets the the user id from the <see cref="SUB_CLAIM"/>.
    /// </summary>
    /// <param name="user"></param>
    /// <returns></returns>
    public static int? Id(this ClaimsPrincipal user) => user.FindFirstValue(SUB_CLAIM).AsNullableInt();

    /// <summary>
    /// Gets the value of the <see cref="GUID_CLAIM"/>.
    /// </summary>
    /// <param name="user"></param>
    /// <returns></returns>
    public static string Guid(this ClaimsPrincipal user) => user.FindFirstValue(GUID_CLAIM);

    /// <summary>
    /// Gets the value of the <see cref="NAME_CLAIM"/>.
    /// </summary>
    /// <param name="user"></param>
    /// <returns></returns>
    public static string DisplayName(this ClaimsPrincipal user) => user.FindFirstValue(NAME_CLAIM) ?? user.FindFirstValue(USERNAME_CLAIM) ?? user.FindFirstValue(EMAIL_CLAIM);

    /// <summary>
    /// Gets the value of the <see cref="EMAIL_CLAIM"/>.
    /// </summary>
    /// <param name="user"></param>
    /// <returns></returns>
    public static string Email(this ClaimsPrincipal user) => user.FindFirstValue(EMAIL_CLAIM);

    /// <summary>
    ///  Returrns a avalue indicating whether the specified user is an administrator.
    /// </summary>
    /// <param name="user"></param>
    /// <returns></returns>
    public static bool IsAdmin(this ClaimsPrincipal user) => user.Identity.IsAuthenticated && user.IsInRole(ADMIN_ROLE);


}

