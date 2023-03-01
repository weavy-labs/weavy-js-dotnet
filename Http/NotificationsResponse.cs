using System.Text.Json.Serialization;

namespace Acme.Http;

/// <summary>
/// Response model for the weavy token endpoint.
/// </summary>
public class NotificationsResponse {

    public NotificationResponse[] Data { get; set; }

    /// <summary>
    /// First notification (for paging).
    /// </summary>
    public int? Start { get; set; }

    /// <summary>
    /// Last notification (for paging).
    /// </summary>
    public int? End { get; set; }

    /// <summary>
    /// The total number of notifications.
    /// </summary>
    public long? Count { get; set; }
}

