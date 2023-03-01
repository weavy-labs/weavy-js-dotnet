using System.Text.Json;
using Acme.Utils;

namespace Acme.Http;

/// <summary>
/// Json naming policy for snake_case.
/// </summary>
public class SnakeCaseNamingPolicy : JsonNamingPolicy {

    /// <summary>
    /// Converts the specified name to snake_case.
    /// </summary>
    /// <param name="name"></param>
    /// <returns></returns>
    public sealed override string ConvertName(string name) => name.ToSnakeCase();
}
