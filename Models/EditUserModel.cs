using System.ComponentModel.DataAnnotations;

namespace Acme.Models;

/// <summary>
/// Input model for editing users.
/// </summary>
public class EditUserModel  {

    public EditUserModel() {
    }

    public EditUserModel(User user) {
        User = user;

        Id = user.Id;
        Name = user.Name;
        Title = user.Title;
        Email = user.Email;
        Phone = user.Phone;
        Username = user.Username;
        IsAdmin = user.IsAdmin;
    }

    public int Id { get; set; }

    /// <summary>
    ///  Gets or sets the display name.
    /// </summary>
    [Required]
    [StringLength(256, ErrorMessage = "{0} must have a maximum length of {1}.")]
    [Display(Name = "Name", Description = "Display name.")]
    public string Name { get; set; }

    /// <summary>
    /// Gets or sets the job title/position.
    /// </summary>
    [Display(Name = "Title", Description = "Job title.")]
    public string Title { get; set; }

    /// <summary>
    ///  Gets or sets the email address.
    /// </summary>
    [EmailAddress(ErrorMessage = "{0} is not a valid email address.")]
    [StringLength(256, ErrorMessage = "{0} must have a maximum length of {1}.")]
    [Display(Name = "Email", Description = "Primary email address (must be unique).", Order = 3)]
    public string Email { get; set; }

    /// <summary>
    ///  Gets or sets the user's preferred phone number.
    /// </summary>
    [StringLength(32, ErrorMessage = "{0} must have a maximum length of {1}.")]
    [Display(Name = "Phone", Description = "Preferred telephone number.")]
    public string Phone { get; set; }

    /// <summary>
    ///  Gets or sets the username.
    /// </summary>
    [StringLength(32, ErrorMessage = "{0} must have a maximum length of {1}.")]
    [Display(Name = "Username", Description = "Username for logging in (must be unique).")]
    public string Username { get; set; }

    /// <summary>
    ///  Gets or sets the password.
    /// </summary>
    [Display(Description = "Set password (leave blank to keep existing).")]
    public string Password { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the user is a system administrator.
    /// </summary>
    [Display(Name = "Administrator", Description = "Check to give the user administrative rights.")]
    public bool IsAdmin { get; set; }

    /// <summary>
    /// The user being edited.
    /// </summary>
    public User User { get; set; }


    ///// <summary>
    ///// 
    ///// </summary>
    //public virtual IEnumerable<ValidationResult> Validate(ValidationContext validationContext) {

    //    // check that username is unique
    //    var user = UserService.GetByUsername(Username, trashed: false);
    //    if (user != null && user.Id != Id) {
    //        yield return new ValidationResult("Username is already in use.", new[] { nameof(Username) });
    //    }

    //    // check that email is unique
    //    user = UserService.GetByEmail(Email, trashed: false);
    //    if (user != null && user.Id != Id) {
    //        yield return new ValidationResult("Email is already in use.", new[] { nameof(Email) });
    //    }
    //}
}


