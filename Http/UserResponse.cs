using System;
using System.Collections.Generic;


namespace Acme.Http;

public class UserResponse {

    public int? Id { get; set; }

    public string Uid { get; set; }

    public string DisplayName { get; set; }

    public string Username { get; set; }

    public string Email { get; set; }

    public string GivenName { get; set; }

    public string MiddleName { get; set; }

    public string Name { get; set; }

    public string FamilyName { get; set; }

    public string Nickname { get; set; }

    public string PhoneNumber { get; set; }

    public string Comment { get; set; }

    public int? DirectoryId { get; set; }

    /// <summary>
    /// Gets profile picture meta data.
    /// </summary>
    //public BlobOut Picture { get; set; }

    /// <summary>
    /// Gets the (blob) id of the profile picture.
    /// </summary>
    public int? PictureId { get; set; }

    /// <summary>
    ///  Gets or sets the avatar url of the user
    /// </summary>
    public string AvatarUrl { get; set; }

    public Dictionary<string, string> Metadata { get; set; }

    public string[] Tags { get; set; } = Array.Empty<string>();

    /// <summary>
    ///   Gets a value indicating the user's presence.
    /// </summary>
    //public PresenceStatus? Presence { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? ModifiedAt { get; set; }

    public bool? IsAdmin { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the user account is suspended.
    /// </summary>
    public bool? IsSuspended { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the user account is trashed.
    /// </summary>
    public bool? IsTrashed { get; set; }
}
