using System;
using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace Acme.Models;

/// <summary>
/// Data model for users.
/// </summary>

[Index(nameof(Guid), IsUnique = true)]
[Index(nameof(Email), IsUnique = true)]
[Index(nameof(Username), IsUnique = true)]
public class User {

    /// <summary>
    ///  The user id.
    /// </summary>    
    public int Id { get; set; }

    /// <summary>
    /// A globally unique identifier for the user.
    /// </summary>        
    public Guid Guid { get; set; } = Guid.NewGuid();

    /// <summary>
    ///  Gets or sets the display name.
    /// </summary>
    [Required]
    [StringLength(256, ErrorMessage = "{0} must have a maximum length of {1}.")]
    public required string Name { get; set; }

    /// <summary>
    /// Gets or sets the job title/position.
    /// </summary>
    public string Title { get; set; }

    /// <summary>
    ///  Gets or sets the email address.
    /// </summary>
    [EmailAddress(ErrorMessage = "{0} is not a valid email address.")]
    [StringLength(256, ErrorMessage = "{0} must have a maximum length of {1}.")]
    public string Email { get; set; }

    /// <summary>
    ///  Gets or sets the user's preferred phone number.
    /// </summary>
    [StringLength(32, ErrorMessage = "{0} must have a maximum length of {1}.")]
    public string Phone { get; set; }

    /// <summary>
    ///  Gets or sets the username.
    /// </summary>
    [StringLength(32, ErrorMessage = "{0} must have a maximum length of {1}.")]
    public string Username { get; set; }

    /// <summary>
    ///  Gets or sets the password hash.
    /// </summary>
    public string Password { get; set; }

    /// <summary>
    /// Gets or sets the preferred time zone for date/time formatting.
    /// </summary>
    public string TimeZone { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the user account is trashed.
    /// </summary>
    public bool IsTrashed { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the user is a system administrator.
    /// </summary>
    public bool IsAdmin { get; set; }



}

