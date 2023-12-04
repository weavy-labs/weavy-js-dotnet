using System;
using System.Collections.Generic;

namespace Acme.Http;


/// <summary>
/// Response model for weavy apps.
/// </summary>
public class AppResponse  {

    /// <summary>
    /// Gets the app id.
    /// </summary>
    public int? Id { get; set; }

    /// <summary>
    /// Gets the app type.
    /// </summary>
    public Guid? Type { get; set; }

    /// <summary>
    /// Gets the unique identifier for the app in the host system.
    /// </summary>
    public string Uid { get; set; }

    /// <summary>
    /// Gets the display name.
    /// </summary>
    /// <returns></returns>
    public string DisplayName { get; set; }

    /// <summary>
    /// Gets the name.
    /// </summary>
    /// <returns></returns>
    public string Name { get; set; }

    /// <summary>
    ///  Gets the description text.
    /// </summary>
    public string Description { get; set; }

    /// <summary>
    /// Url to zip-archive with files in the app.
    /// </summary>
    public string ArchiveUrl { get; set; }

    /// <summary>
    /// Gets a thumbnail image.
    /// </summary>
    public string AvatarUrl { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public Dictionary<string, string> Metadata { get; set; } = new();

    /// <summary>
    /// 
    /// </summary>
    public string[] Tags { get; set; } = Array.Empty<string>();

    /// <summary>
    /// Date and time (UTC) when the app was created.
    /// </summary>
    public DateTime? CreatedAt { get; set; }

    /// <summary>
    /// Id of the user that created the app.
    /// </summary>
    public int? CreatedById { get; set; }

    /// <summary>
    /// User that created the entity.
    /// </summary>
    public UserResponse CreatedBy { get; set; }

    /// <summary>
    /// Date and time (UTC) when the app was last updated.
    /// </summary>
    public DateTime? ModifiedAt { get; set; }

    /// <summary>
    /// Id of the user that last modified the app.
    /// </summary>
    public int? ModifiedById { get; set; }

    /// <summary>
    /// The user that last modified the entity.
    /// </summary>
    public UserResponse ModifiedBy { get; set; }

    /// <summary>
    /// Gets the number of members.
    /// </summary>
    public int? MemberCount { get; set; }

    /// <summary>
    /// Gets the app members.
    /// </summary>
    public MembersResponse Members { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public bool? IsStarred { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public bool? IsSubscribed { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public bool? IsTrashed { get; set; }

}
