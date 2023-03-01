using System;
using System.Collections.Generic;

namespace Acme.Http;

/// <summary>
///   An object representing a notification.
/// </summary>
public class NotificationResponse {

    /// <summary>
    ///  Gets the id of the notification.
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    ///The type of action that triggered the notification.
    /// </summary>
    public string Action { get; set; }

    /// <summary>
    /// Id of the user that performed the action that triggered the notification.
    /// </summary>
    public int? ActorId { get; set; }

    /// <summary>
    /// The user that performed the action that triggered the notification.
    /// </summary>
    public UserResponse Actor { get; set; }

    /// <summary>
    /// Gets or sets the notification template string.
    /// </summary>
    public string Template { get; set; }

    /// <summary>
    /// Gets or sets the arguments used to format <see cref="Template"/> into a (localized) string.
    /// </summary>
    public string[] Args { get;set; }

    /// <summary>
    /// Gets the formatted (and localized) notification text.
    /// </summary>
    public string Text { get; set; }

    /// <summary>
    /// Gets the notification text as html.
    /// </summary>
    public string Html { get; set; }

    /// <summary>
    /// Gets the notification text as plain text.
    /// </summary>
    public string Plain { get; set; }

    /// <summary>
    /// Gets or sets the entity the notification regards.
    /// </summary>
    public EntityResponse Link { get; set; }

    /// <summary>
    /// Gets or sets an url to open when clicking on the notification.
    /// </summary>
    public string Url { get; set; }

    /// <summary>
    /// Id of the notification receiver.
    /// </summary>
    public int? UserId { get; set; }

    /// <summary>
    /// Gets the notification receiver.
    /// </summary>
    public UserResponse User { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public Dictionary<string, string> Metadata { get; set; }

    /// <summary>
    /// Gets or sets the time (UTC) the notification was created.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// If the notification is unread or not.
    /// </summary>
    public bool? IsUnread { get; set; }


}
