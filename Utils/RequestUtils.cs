using Microsoft.AspNetCore.Http;
using System.IO;
using System.Threading.Tasks;

namespace Acme.Utils;

public static class RequestUtils {

    /// <summary>
    /// Extension method that reads the raw request body as a string.
    /// </summary>
    /// <param name="request"></param>
    /// <returns>The raw request body as a string.</returns>
    public static async Task<string> ReadBodyAsync(this HttpRequest request) {
        if (!request.Body.CanSeek) {
            // we only do this if the stream isn't *already* seekable, as EnableBuffering will create a new stream instance each time it's called
            request.EnableBuffering();
        }
        request.Body.Position = 0;
        var reader = new StreamReader(request.Body);
        var body = await reader.ReadToEndAsync().ConfigureAwait(false);
        request.Body.Position = 0;
        return body;
    }
}
