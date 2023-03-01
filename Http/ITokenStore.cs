using System.Collections.Concurrent;

namespace Acme.Http;

/// <summary>
/// Interface for local token storage.
/// </summary>
public interface ITokenStore {

    /// <summary>
    /// Get access_token for specified user from our local token store.
    /// </summary>
    /// <param name="id">User id.</param>
    /// <returns></returns>
    public string GetToken(int id);

    /// <summary>
    /// Save access_token for specified user in our local token store.
    /// </summary>
    /// <param name="id">User id.</param>
    /// <returns></returns>
    public void SaveToken(int id, string token);

}

