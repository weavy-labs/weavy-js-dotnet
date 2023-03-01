using System.Text.Json.Serialization;

namespace Acme.Http;

/// <summary>
/// Response model for the weavy token endpoint.
/// </summary>
public class TokenResponse {

    public string AccessToken { get; set; }

    public int ExpiresIn { get; set; }
}

