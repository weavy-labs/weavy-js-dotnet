using System.Security.Claims;
using System.Threading.Tasks;
using Acme.Http;
using Microsoft.AspNetCore.Mvc;

namespace Acme.ViewComponents;

public class NotificationsViewComponent : ViewComponent {
    private readonly WeavyClient _client;

    public NotificationsViewComponent(WeavyClient client) => _client = client;

    public async Task<IViewComponentResult> InvokeAsync(bool unread, int? top) {
        var items = await _client.GetNotifications(User as ClaimsPrincipal, unread, top);
        return View(items);
    }
}
