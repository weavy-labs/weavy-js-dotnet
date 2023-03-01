using System;
using System.Linq;
using System.Text.Encodings.Web;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Mvc.TagHelpers;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Razor.TagHelpers;

namespace Acme.Mvc;

/// <summary>
/// <see cref="ITagHelper"/> implementation targeting any HTML element with an <c>asp-description-for</c> attribute.
/// </summary>
[HtmlTargetElement("*", Attributes = ForAttributeName)]
public class DescriptionTagHelper : TagHelper {

    private const string ForAttributeName = "asp-description-for";
    private readonly HtmlEncoder _htmlEncoder;

    /// <summary>
    /// Creates a new <see cref="DescriptionTagHelper"/>.
    /// </summary>
    public DescriptionTagHelper(HtmlEncoder htmlEncoder) {
        _htmlEncoder = htmlEncoder;
    }

    /// <summary>
    /// Gets the <see cref="Microsoft.AspNetCore.Mvc.Rendering.ViewContext"/> of the executing view.
    /// </summary>
    [HtmlAttributeNotBound]
    [ViewContext]
    public ViewContext ViewContext { get; set; }

    /// <summary>
    /// An expression to be evaluated against the current model.
    /// </summary>
    [HtmlAttributeName(ForAttributeName)]
    public ModelExpression For { get; set; }

    /// <summary>
    /// Gets or sets a value indicating how the tag should behave when field is invalid; <c>true</c> displays the validation message and <c>false</c> hides the tag.
    /// </summary>
    public bool Feedback { get; set; } = true;

    /// <inheritdoc />
    /// <remarks>Does nothing if <see cref="For"/> is <c>null</c>.</remarks>
    public override async Task ProcessAsync(TagHelperContext context, TagHelperOutput output) {
        if (context == null) {
            throw new ArgumentNullException(nameof(context));
        }

        if (output == null) {
            throw new ArgumentNullException(nameof(output));
        }

        if (For != null) {

            // check if field has validation error(s)
            ModelError error = null;
            var fullName = ViewContext.ViewData.TemplateInfo.GetFullHtmlFieldName(For.Name);
            if (ViewContext.ViewData.ModelState.TryGetValue(fullName, out var entry) && entry.ValidationState == ModelValidationState.Invalid) {
                error = entry.Errors.FirstOrDefault(m => !string.IsNullOrEmpty(m.ErrorMessage)) ?? entry.Errors[0];
            }

            if (error == null) {
                // render description
                var childContent = await output.GetChildContentAsync();
                if (childContent.IsEmptyOrWhiteSpace) {
                    var desc = For.Metadata?.Description;
                    if (string.IsNullOrWhiteSpace(desc)) {
                        // generate nothing when there is no description 
                        output.SuppressOutput();
                    } else {
                        // show description
                        output.Content.SetHtmlContent(desc);
                    }
                } else {
                    // use existing child content
                    output.Content.SetHtmlContent(childContent);
                }
            } else {
                // validation error
                if (Feedback) {
                    // replace description with error message when field is invalid
                    output.RemoveClass("form-text", _htmlEncoder);
                    output.AddClass("invalid-feedback", _htmlEncoder);
                    output.Content.SetHtmlContent(error.ErrorMessage);
                } else {
                    // generate nothing when field is invalid (we probably have a separate .invalid-feedback element for the field)
                    output.SuppressOutput();
                }

            }
        }
    }
}



