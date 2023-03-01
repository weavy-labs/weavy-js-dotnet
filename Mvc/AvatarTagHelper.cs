using System;
using System.Collections.Generic;
using System.Security.Claims;
using Acme.Models;
using Acme.Utils;
using Microsoft.AspNetCore.Razor.TagHelpers;

namespace Acme.Mvc;

/// <summary>
/// <see cref="ITagHelper"/> implementation for avatar images.
/// </summary>
[HtmlTargetElement("avatar", Attributes = ForAttributeName)]
public class AvatarTagHelper : TagHelper {

    private const string ForAttributeName = "for";
    private const string SizeAttributeName = "size";

    /// <summary>
    /// The object for which to return an avatar image.</param>
    /// </summary>
    [HtmlAttributeName(ForAttributeName)]
    public object For { get; set; }

    /// <summary>
    /// Gets or sets a value indicating the size of the avatar in pixels.
    /// </summary>
    [HtmlAttributeName(SizeAttributeName)]
    public int Size { get; set; } = 32;

    /// <inheritdoc />
    /// <remarks>Does nothing if <see cref="For"/> is <c>null</c>.</remarks>
    public override void Process(TagHelperContext context, TagHelperOutput output) {
        if (context == null) {
            throw new ArgumentNullException(nameof(context));
        }

        if (output == null) {
            throw new ArgumentNullException(nameof(output));
        }

        var name = For switch {
            ClaimsPrincipal principal => principal.FindFirstValue(ClaimsUtils.NAME_CLAIM),
            User u => u.Name,
            _ => null
        };

        var initials = StringUtils.GetInitials(name);
        var bg = ColorUtils.BackgroundFor(name);
        var fg = ColorUtils.TextColorOn(bg);
        var svg = SvgUtils.Circle(initials, Size, bg, fg, htmlAttributes: GetAttributeDictionary(output));
        output.TagName = null;
        output.TagMode = TagMode.StartTagAndEndTag;
        output.Content.SetHtmlContent(svg);
    }

    /// <summary>
    /// Convert TagHelperAttributeList to attribute dictionary.
    /// </summary>
    /// <param name="value">The CSS class name to add.</param>
    private static IDictionary<string, object> GetAttributeDictionary(TagHelperOutput output) {
        if (output.Attributes.Count > 0) {
            var attributes = new Dictionary<string, object>();
            foreach (var item in output.Attributes) {
                attributes.Add(item.Name, item.Value);
            }
            return attributes;
        }
        return null;
    }
}
