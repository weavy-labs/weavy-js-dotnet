using System;
using Microsoft.AspNetCore.WebUtilities;

namespace Acme.Models;

/// <summary>
/// View model for HTTP status code results.
/// </summary>
public class StatusCodeModel {

    /// <summary>
    /// 
    /// </summary>
    /// <param name="code"></param>
    public StatusCodeModel(int code) {
        Code = code;
        Title = ReasonPhrases.GetReasonPhrase(code);
    }

    /// <summary>
    /// Gets or sets the HTTP status code, e.g. 404
    /// </summary>
    public int Code { get; set; }

    /// <summary>
    /// Gets or sets a short, human-readable summary of the problem, e.g. "Page not found."
    /// </summary>
    public string Title { get; set; }

    /// <summary>
    /// Gets or sets a human-readable explanation, e.g. "The requested URL was not found on this server."
    /// </summary>
    public string Detail { get; set; }

    /// <summary>
    /// Gets or sets the exception encountered during the original request.
    /// </summary>
    public Exception Exception { get; set; }
}
