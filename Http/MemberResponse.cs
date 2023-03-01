using System;

namespace Acme.Http;

public class MemberResponse {
    public int? Id { get; set; }

    public string Uid { get; set; }

    public string DisplayName { get; set; }

    public string AvatarUrl { get; set; }

    public DateTime? DeliveredAt { get; set; }

    /// <summary>
    /// Date and time (UTC) when conversation was marked as read.
    /// </summary>
    public DateTime? MarkedAt { get; set; }

    /// <summary>
    /// Id of the last read message.
    /// </summary>
    public int? MarkedId { get; set; }

    /// <summary>
    /// The presence status of the user.
    /// </summary>
    //public PresenceStatus? Presence { get; set; }

}
