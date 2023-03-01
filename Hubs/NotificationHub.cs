using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace Acme.Hubs;

public class NotificationHub : Hub {
    private readonly ILogger<NotificationHub> _logger;

    public NotificationHub(ILogger<NotificationHub> logger) {
        _logger = logger;
    }

    /// <summary>
    /// Record the association between the current user and connection id.
    /// </summary>
    /// <returns></returns>
    public override async Task OnConnectedAsync() {
        _logger.LogDebug("User {user} connected with id {connection}", Context.UserIdentifier, Context.ConnectionId);
        await base.OnConnectedAsync();
    }
}

