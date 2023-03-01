using System.Collections.Generic;

namespace Acme.Http;

/// <summary>
/// Input model for creating/updating weavy users.
/// </summary>
public class UserModel  {

    public string Uid { get; set; }

    public string Name { get; set; }

    public string Email { get; set; }

    public string PhoneNumber { get; set; }

    public string Picture { get; set; }

    public string Directory { get; set; }

    public Dictionary<string, string> Metadata { get; set; }

    public string[] Tags { get; set; }

    public bool IsSuspended { get; set; }
}
