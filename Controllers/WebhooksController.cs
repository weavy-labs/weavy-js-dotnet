using System.Text.Json;
using System.Threading.Tasks;
using Acme.Hubs;
using Acme.Models;
using Acme.Utils;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using static System.Net.Mime.MediaTypeNames;

namespace Acme.Controllers;

/// <summary>
/// Controller for incoming webhooks from Weavy.
/// </summary>
[AllowAnonymous]
[Route("[controller]")]
public class WebhooksController : ControllerBase {

    private readonly ILogger _logger;
    private readonly IOptions<WeavyOptions> _options;
    private readonly IHubContext<NotificationHub> _hub;

    public WebhooksController(ILogger<WebhooksController> logger, IOptions<WeavyOptions> options, IHubContext<NotificationHub> hub) {
        _logger = logger;
        _options = options;
        _hub = hub;
    }

    /// <summary>
    /// Enpoint for webhook payloads from Weavy.
    /// </summary>
    /// <returns></returns>
    [HttpPost("")]
    public async Task<IActionResult> HandlePayload() {

        var trigger = Request.Headers["X-Weavy-Trigger"].ToString();
        var delivery = Request.Headers["X-Weavy-Delivery"].ToString();
        var signature = Request.Headers["X-Weavy-Signature"].ToString();

        _logger.LogDebug("Received webhook payload {id} for {trigger}", delivery, trigger);

        // read payload
        var payload = await Request.ReadBodyAsync();

        // verify signature
        if (signature != null && _options.Value.WebhookSecret != null) {
            // get hash algorithm used to sign the webhook payload, e.g. sha256=31591413bc17fd8f32b697f20e97f8241a9cbd769e81c9f1eea3159706374f9d -> sha256
            var alg = signature.Substring(0, 6);

            // calculate and verify signature
            var sig = alg + "=" + HashUtils.HMAC(alg, _options.Value.WebhookSecret, payload);
            if (sig != signature) {
                return BadRequest("Invalid signature");
            }
        }

        // handle payload
        using (var json = JsonDocument.Parse(payload)) {
            if (json.RootElement.TryGetProperty("action", out var action)) {
                switch (action.GetString()) {
                    case "notification_created":
                        if (json.RootElement.TryGetProperty("notification", out var notification) && notification.TryGetProperty("user", out var user)) {
                            // push notification id to user (on a background thread to avoid blocking since Weavy expects a reply within 10 seconds)
                            var notificationId = notification.GetProperty("id").GetInt32();
                            var userId = user.GetProperty("uid").GetString();
                            _hub.Clients.User(userId).SendAsync("notification", notificationId).FireAndForget();
                        }
                        break;
                    case "message_created":
                        // TODO: do something
                        break;
                }
            }
        }

        // return Ok to let Weavy know we have handled the event
        return Ok();
    }



}
