using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using System.Web;
using Acme.Models;
using Acme.Utils;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Acme.Http;

/// <summary>
/// Class for accessing the Weavy API.
/// </summary>
public class WeavyClient
{
    private readonly HttpClient _httpClient;
    private readonly WeavyOptions _options;
    private readonly ILogger _logger;
    private readonly ITokenStore _tokenStore;
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingDefault,
        PropertyNamingPolicy = new SnakeCaseNamingPolicy()
    };

    /// <summary>
    /// Initialize a new instance of the <see cref="WeavyClient"/> class.
    /// </summary>
    /// <param name="httpClient"></param>
    /// <param name="tokenStore"></param>
    /// <param name="options"></param>
    public WeavyClient(HttpClient httpClient, IOptions<WeavyOptions> options, ILogger<WeavyClient> logger, ITokenStore tokenStore)
    {
        _options = options.Value;
        _httpClient = httpClient;
        _logger = logger;
        _tokenStore = tokenStore;
        _httpClient.BaseAddress = new System.Uri(_options.Server);
        // by default we use the configured api key for requests to weavy
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);
    }

    /// <summary>
    /// Get access_token for the specified user.
    /// </summary>
    /// <param name="user">The user for which to get access_token.</param>
    /// <param name="refresh"><c>true</c> to request a new token, or <c>false</c> to reuse existing token from local storage.</param>
    /// <returns></returns>
    public async Task<string> GetToken(ClaimsPrincipal user, bool refresh)
    {
        var id = user.Id();
        ArgumentNullException.ThrowIfNull(nameof(id));

        // check local token store for access_token
        var accessToken = _tokenStore.GetToken(id.Value);

        if (accessToken == null || refresh)
        {
            // no token in storage (or invalid token)
            var uid = user.Guid();

            _logger.LogDebug("Requesting access_token for {uid} ", uid);

            // request a new access_token from the Weavy backend (passing in token creation options is optional, but can be used to set lifetime of the created access_token)
            var response = await _httpClient.PostAsJsonAsync($"/api/users/{HttpUtility.UrlEncode(uid)}/tokens", new { ExpiresIn = 7200 }, options: _jsonSerializerOptions);

            if (response.IsSuccessStatusCode)
            {
                var resp = await response.Content.ReadFromJsonAsync<TokenResponse>(options: _jsonSerializerOptions);
                accessToken = resp.AccessToken;

                // save token in our local storage
                _tokenStore.SaveToken(id.Value, resp.AccessToken);
            }
        }

        // return access_token
        return accessToken;
    }



    /// <summary>
    /// Get Weavy app.
    /// </summary>
    /// <param name="id">The app id.</param>
    /// <returns></returns>
    public async Task<AppResponse> GetApp(int id)
    {
        _logger.LogDebug("Getting app {id} ", id);
        var response = await _httpClient.GetAsync("/api/apps/" + id);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<AppResponse>(options: _jsonSerializerOptions);
    }


    /// <summary>
    /// Get Weavy entity.
    /// </summary>
    /// <param name="id">The app id.</param>
    /// <returns></returns>
    public async Task<JsonDocument> GetEntity(string type, int id)
    {
        var url = type switch
        {
            "app" => "/api/apps/" + id,
            "comment" => "/api/comments/" + id,
            "file" => "/api/files/" + id,
            "message" => "/api/messages/" + id,
            "user" => "/api/users/" + id,
            "post" => "/api/posts/" + id,
            _ => null
        };

        _logger.LogDebug("Getting {type} {id} ", type, id);
        var json = await _httpClient.GetStringAsync(url);
        return JsonDocument.Parse(json);
    }


    /// <summary>
    /// Init contextual Weavy app (and ensure specified user is member).
    /// </summary>
    /// <param name="app">The app to get or create.</param>
    /// <param name="user">The user to add as member.</param>
    /// <returns></returns>
    public async Task<AppResponse> InitApp(AppModel app, ClaimsPrincipal user)
    {

        _logger.LogDebug("Initializing app {uid} ", app.Uid);

        // the init endpoint accepts an optional user to add as member
        var member = new { Uid = user.Guid() };

        var response = await _httpClient.PostAsJsonAsync("/api/apps/init", new { App = app, User = member }, options: _jsonSerializerOptions);
        response.EnsureSuccessStatusCode();
        string responseBody = await response.Content.ReadAsStringAsync();
        _logger.LogDebug(responseBody);
        return await response.Content.ReadFromJsonAsync<AppResponse>(options: _jsonSerializerOptions);
    }

    /// <summary>
    /// Sync profile data to Weavy. 
    /// </summary>
    /// <param name="user">The user to sync.</param>
    /// <returns></returns>
    public async Task<UserResponse> SyncUser(User user)
    {
        var uid = user.Guid.ToString();

        _logger.LogDebug("Syncing user {uid} to Weavy", uid);

        var profile = new UserModel
        {
            Name = user.Name,
            Email = user.Email,
            PhoneNumber = user.Phone,
            //Picture = "",
            Directory = "Acme"
        };

        var response = await _httpClient.PutAsJsonAsync("/api/users/" + HttpUtility.UrlEncode(uid), profile, options: _jsonSerializerOptions);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<UserResponse>();
    }

    /// <summary>
    /// Get notifications for the authenticated user from Weavy.
    /// </summary>
    /// <param name="user"></param>
    /// <param name="unread"><c>true</c> to get unread notifications, otherwise <c>false</c>.</param>
    /// <param name="top">Max number of notifications to return.</param>
    /// <returns></returns>
    public async Task<NotificationsResponse> GetNotifications(ClaimsPrincipal user, bool unread, int? top)
    {

        var url = $"/api/notifications?order_by=id+desc";
        if (unread)
        {
            url += "&unread=true";
        }
        if (top != null)
        {
            url += "&top=" + top;
        }

        // for /api/notifications we need to use an access token instead of an api key
        var accessToken = await GetToken(user, refresh: false);
        using var msg = new HttpRequestMessage(HttpMethod.Get, url);
        msg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        var response = await _httpClient.SendAsync(msg);
        if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
        {
            // access token probably expired, request a new token and try again
            _logger.LogDebug("Unauthorized. Refreshing access token.");
            accessToken = await GetToken(user, refresh: true);
            using var retry = new HttpRequestMessage(HttpMethod.Get, url);
            retry.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            response = await _httpClient.SendAsync(retry);
        }

        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<NotificationsResponse>(options: _jsonSerializerOptions);
    }

    /// <summary>
    /// Mark all notifications as read.
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    public async Task MarkNotificationsAsRead(ClaimsPrincipal user)
    {
        var url = "/api/notifications/mark";

        // for /api/notifications we need to use an access token instead of an api key

        var accessToken = await GetToken(user, refresh: false);
        using var msg = new HttpRequestMessage(HttpMethod.Put, url);
        msg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        var response = await _httpClient.SendAsync(msg);
        if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
        {
            // access token probably expired, request a new token and try again
            _logger.LogDebug("Unauthorized. Refreshing access token.");
            accessToken = await GetToken(user, refresh: true);
            using var retry = new HttpRequestMessage(HttpMethod.Put, url);
            retry.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            response = await _httpClient.SendAsync(retry);
        }

        response.EnsureSuccessStatusCode();
    }

    /// <summary>
    /// Mark notification as read.
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    public async Task<NotificationResponse> MarkNotificationAsRead(ClaimsPrincipal user, int id)
    {
        var url = "/api/notifications/" + id + "/mark";

        // for /api/notifications we need to use an access token instead of an api key

        var accessToken = await GetToken(user, refresh: false);
        using var msg = new HttpRequestMessage(HttpMethod.Put, url);
        msg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        var response = await _httpClient.SendAsync(msg);
        if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
        {
            // access token probably expired, request a new token and try again
            _logger.LogDebug("Unauthorized. Refreshing access token.");
            accessToken = await GetToken(user, refresh: true);
            using var retry = new HttpRequestMessage(HttpMethod.Put, url);
            retry.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            response = await _httpClient.SendAsync(retry);
        }

        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<NotificationResponse>(options: _jsonSerializerOptions);
    }

    /// <summary>
    /// Mark notification as unread.
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    public async Task<NotificationResponse> MarkNotificationAsUnread(ClaimsPrincipal user, int id)
    {
        var url = "/api/notifications/" + id + "/mark";

        // for /api/notifications we need to use an access token instead of an api key

        var accessToken = await GetToken(user, refresh: false);
        using var msg = new HttpRequestMessage(HttpMethod.Delete, url);
        msg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        var response = await _httpClient.SendAsync(msg);
        if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
        {
            // access token probably expired, request a new token and try again
            _logger.LogDebug("Unauthorized. Refreshing access token.");
            accessToken = await GetToken(user, refresh: true);
            using var retry = new HttpRequestMessage(HttpMethod.Get, "/api/notifications");
            retry.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            response = await _httpClient.SendAsync(retry);
        }

        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<NotificationResponse>(options: _jsonSerializerOptions);
    }



}
