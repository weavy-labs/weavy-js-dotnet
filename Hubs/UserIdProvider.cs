using Acme.Utils;
using Microsoft.AspNetCore.SignalR;

namespace Acme.Hubs;

/// <summary>
/// Custom user id provider for SignalR.
/// </summary>
public class UserIdProvider : IUserIdProvider {
    /// <summary>
    /// Returns Id of current user (instead of IPrincipal.Identity.Name).
    /// </summary>
    /// <param name="request"></param>
    /// <returns></returns>        
    public string GetUserId(HubConnectionContext connection) {
        return connection.User.Guid();
    }
}
