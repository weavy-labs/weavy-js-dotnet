using System;
using System.Collections.Generic;

namespace Acme.Http;

/// <summary>
/// Input model for creating/updating weavy apps.
/// </summary>
public class AppModel  {

    public string Uid { get; set; }

    public string Type { get; set; }

    public string Name { get; set; }

    public string Description { get; set; }
   
    public Dictionary<string, string> Metadata { get; set; }

    public string[] Tags { get; set; }

}
