using System.Threading.Tasks;
using Acme.Http;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Acme.Controllers;

[Authorize]
[Route("[controller]")]
public class NotificationsController : Controller {

    private readonly WeavyClient _weavy;

    public NotificationsController(WeavyClient weavy) {
        _weavy = weavy;
    }

    [HttpGet("")]
    public async Task<IActionResult> Index() {
        var model = await _weavy.GetNotifications(User, false, 25);
        return View(model);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id) {
        // mark specified notification as read
        var notification = await _weavy.MarkNotificationAsRead(User, id);

        // redirect to weavy app that triggered the notification
        if (notification.Link != null) {
            var doc = await _weavy.GetEntity(notification.Link.Type, notification.Link.Id);
            if (doc.RootElement.TryGetProperty("app_id", out var prop) && prop.TryGetInt32(out var appId)) {
                var app = await _weavy.GetApp(appId);
                switch (app.Uid) {
                    case "acme_chat":
                        return RedirectToAction(nameof(HomeController.Chat), "home");
                    case "acme_feed":
                        return RedirectToAction(nameof(HomeController.Feed), "home");
                    case "acme_files":
                        return RedirectToAction(nameof(HomeController.Files), "home");
                }
            }
        }

        return RedirectToAction(nameof(Index));
    }

    /// <summary>
    /// Mark all notifications as  read.
    /// </summary>
    /// <returns></returns>
    [HttpPost("mark")]
    public async Task<IActionResult> Mark() {
        await _weavy.MarkNotificationsAsRead(User);
        return RedirectToAction(nameof(Index));
    }

    /// <summary>
    /// Mark specified notification as read.
    /// </summary>
    /// <returns></returns>
    [HttpPost("{id:int}/read")]
    public async Task<IActionResult> Read(int id) {
        _ = await _weavy.MarkNotificationAsRead(User, id);
        return RedirectToAction(nameof(Index));
    }

    /// <summary>
    /// Mark specified notification as unread.
    /// </summary>
    /// <returns></returns>
    [HttpPost("{id:int}/unread")]
    public async Task<IActionResult> Unread(int id) {
        _ = await _weavy.MarkNotificationAsUnread(User, id);
        return RedirectToAction(nameof(Index));
    }

}
