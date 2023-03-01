using System.ComponentModel.DataAnnotations;

namespace Acme.Models;

/// <summary>
/// Input model for logging in.
/// </summary>
public class LoginModel {
    [Required]
    [Display(Prompt ="Username")]
    public string Username { get; set; }

    [Required]
    [Display(Prompt = "Password")]
    [DataType(DataType.Password)]
    public string Password { get; set; }

    /// <summary>
    /// Gets or sets the path where to redirect after successful sign-in.
    /// </summary>
    public string Path { get; set; }
}
