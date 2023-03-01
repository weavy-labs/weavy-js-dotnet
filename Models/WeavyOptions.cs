using System.ComponentModel.DataAnnotations;

namespace Acme.Models;

/// <summary>
/// Strongly typed options class for Weavy configuration settings. 
/// </summary>
public class WeavyOptions {

    /// <summary>
    /// Url to the Weavy serer.
    /// </summary>
    [Required]
    [Url]
    public string Server { get; set; }

    /// <summary>
    /// The Weavy server-to-server API key.
    /// </summary>
    [Required]
    public string ApiKey { get; set; }

    /// <summary>
    /// Secret for validating webhook payloads.
    /// </summary>
    public string WebhookSecret { get; set; }
}
