using System;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using Acme.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Logging;
using Microsoft.Net.Http.Headers;

namespace Acme.Controllers;

/// <summary>
/// Controller for HTTP status code responses and unhandled exceptions.
/// </summary>
[AllowAnonymous]
public class StatusController : Controller {

    private readonly IWebHostEnvironment _env;
    private static readonly MediaTypeHeaderValue _textHtmlMediaType = new MediaTypeHeaderValue("text/html");

    public StatusController(IWebHostEnvironment env) {
        _env = env;
    }

    /// <summary>
    /// Display message for HTTP status code response.
    /// </summary>
    /// <param name="code">The HTTP status code.</param>
    /// <returns></returns>
    [Route("{code:int}")]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Status(int code) {

        // create model with status code
        var model = new StatusCodeModel(code);

        // check if we have an exception
        var exceptionFeature = HttpContext.Features.Get<IExceptionHandlerPathFeature>();
        var exception = exceptionFeature?.Error;
        if (exception is not null) {
            // populate model with exception details
            model.Detail = exception.Message;
            model.Exception = exception;
        }

        // return a ViewResult if the client asks for text/html
        var accept = Request.GetTypedHeaders().Accept;
        if (accept != null && accept.Any(h => h.IsSubsetOf(_textHtmlMediaType))) {

            // set status code
            Response.StatusCode = model.Code;

            // custom detail for some common status codes
            model.Detail ??= model.Code switch {
                StatusCodes.Status401Unauthorized => "Authentication is required.",
                StatusCodes.Status404NotFound => "Sorry, the requested URL was not found on this server.",
                StatusCodes.Status500InternalServerError => "An unexpected error has occured.",
                _ => null
            };

            return View(nameof(Status), model);
        }

        if (model.Code >= StatusCodes.Status400BadRequest) {
            // for error codes we return a machine-readable Problem Details response (see https://tools.ietf.org/html/rfc7807)
            return Problem(statusCode: model.Code, title: model.Title, detail: model.Detail);
        }

        // by default we return a StatusCodeResult
        return StatusCode(model.Code);
    }

    /// <summary>
    /// Action for testing unhandled exceptions.
    /// </summary>
    /// <returns></returns>
    [AllowAnonymous]
    [HttpGet("throw")]
    public IActionResult Throw() {
        throw new Exception("Pew ^ Pew");
    }

}
