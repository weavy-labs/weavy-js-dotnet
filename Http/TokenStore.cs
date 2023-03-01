using System.Collections.Concurrent;

namespace Acme.Http;

/// <summary>
/// In-memory token store.
/// </summary>
public class InMemoryTokenStore : ITokenStore {

    public readonly ConcurrentDictionary<int, string> _tokens = new();

    /// <summary>
    /// Get access_token for specified user from our local token store.
    /// </summary>
    /// <param name="id">User id.</param>
    /// <returns></returns>
    public string GetToken(int id) {
        if (_tokens.TryGetValue(id, out var token)) {
            return token;
        }
        return null;
    }

    /// <summary>
    /// Save access_token for specified user in our local token store.
    /// </summary>
    /// <param name="id">User id.</param>
    /// <returns></returns>
    public void SaveToken(int id, string token) => _tokens.AddOrUpdate(id, token, (key, oldToken) => token);

}

