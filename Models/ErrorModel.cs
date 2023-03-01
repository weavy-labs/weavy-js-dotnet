namespace Acme.Models;

/// <summary>
/// View model for errors.
/// </summary>
public class ErrorModel {
    public string RequestId { get; set; }

    public bool ShowRequestId => !string.IsNullOrEmpty(RequestId);
}
