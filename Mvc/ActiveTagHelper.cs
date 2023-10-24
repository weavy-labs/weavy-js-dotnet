using System;
using System.Linq;
using Acme.Utils;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Razor.TagHelpers;


namespace Acme.Mvc;

/// <summary>
/// Adds the "active" class to the tag if the current area, controller, action or path matches. 
/// </summary>
[HtmlTargetElement(Attributes = "asp-active")]
public class ActiveTagHelper : TagHelper
{

    /// <summary>
    /// A value indicating when the tag should get the "active" class. Should be either "area", "controller", "action" or a path string starting with the '/' character. The path string may include wildcards, e.g /test/* or /test/**).
    /// </summary>
    [HtmlAttributeName("asp-active")]
    public string Active { get; set; }

    /// <summary>
    /// The name of the area.
    /// </summary>
    [HtmlAttributeName("asp-area")]
    public string Area { get; set; }

    /// <summary>
    /// The name of the controller.
    /// </summary>
    [HtmlAttributeName("asp-controller")]
    public string Controller { get; set; }

    /// <summary>
    /// The name of the action method.
    /// </summary>
    [HtmlAttributeName("asp-action")]
    public string Action { get; set; }

    /// <summary>
    /// Gets or sets the <see cref="T:Microsoft.AspNetCore.Mvc.Rendering.ViewContext" /> for the current request.
    /// </summary>
    [HtmlAttributeNotBound]
    [ViewContext]
    public ViewContext ViewContext { get; set; }

    public override void Process(TagHelperContext context, TagHelperOutput output)
    {
        base.Process(context, output);

        if (IsActive())
        {
            MakeActive(output);
        }

        output.Attributes.RemoveAll("asp-active");
    }

    private bool IsActive()
    {
        if (string.IsNullOrWhiteSpace(Active))
        {
            return false;
        }

        if (Active.StartsWith('/'))
        {
            var currentPath = ViewContext.HttpContext.Request.Path.Value ?? "";
            if (Active.EndsWith("/**", StringComparison.OrdinalIgnoreCase))
            {
                // any url under the specified path
                var path = Active.Substring(0, Active.Length - 2);
                return currentPath.StartsWith(path, StringComparison.OrdinalIgnoreCase) || currentPath.Equals(path.RemoveTrailingSlash());
            }
            else if (Active.EndsWith("/*", StringComparison.OrdinalIgnoreCase))
            {
                // any url in the specified folder
                var path = Active.Substring(0, Active.Length - 1);
                if (currentPath!.StartsWith(path, StringComparison.OrdinalIgnoreCase))
                {
                    var u = currentPath.Substring(path.Length);
                    return u.Length > 0 && !u.Contains('/');
                }
                // exact match on folder 
                return currentPath.Equals(path.RemoveTrailingSlash());
            }
            else
            {
                // exact match
                return currentPath!.RemoveTrailingSlash().Equals(Active, StringComparison.OrdinalIgnoreCase);
            }
        }

        var currentArea = ViewContext.RouteData.Values[nameof(Area)]?.ToString() ?? string.Empty;
        if (Active.Equals(nameof(Area), StringComparison.OrdinalIgnoreCase) && Area != null)
        {
            return Area.Equals(currentArea, StringComparison.OrdinalIgnoreCase);
        }

        var currentController = ViewContext.RouteData.Values[nameof(Controller)]?.ToString() ?? string.Empty;
        if (Active.Equals(nameof(Controller), StringComparison.OrdinalIgnoreCase) && Controller != null)
        {
            return Controller.Equals(currentController, StringComparison.OrdinalIgnoreCase) && (Area?.Equals(currentArea, StringComparison.OrdinalIgnoreCase) ?? true);
        }


        if (Active.Equals(nameof(Action), StringComparison.OrdinalIgnoreCase) && Action != null)
        {
            var currentAction = ViewContext.RouteData.Values[nameof(Action)]?.ToString() ?? string.Empty;
            return Action.Equals(currentAction, StringComparison.OrdinalIgnoreCase) && (Controller?.Equals(currentController, StringComparison.OrdinalIgnoreCase) ?? true) && (Area?.Equals(currentArea, StringComparison.OrdinalIgnoreCase) ?? true);
        }

        return false;

    }

    private void MakeActive(TagHelperOutput output)
    {
        var classAttr = output.Attributes.FirstOrDefault(a => a.Name == "class");
        var activeClassName = "active";

        if (classAttr == null)
        {
            classAttr = new TagHelperAttribute("class", activeClassName);
            output.Attributes.Add(classAttr);
        }
        else if (classAttr.Value == null || classAttr.Value.ToString().IndexOf(activeClassName) < 0)
        {
            output.Attributes.SetAttribute("class", classAttr.Value == null ? activeClassName : classAttr.Value.ToString() + " " + activeClassName);
        }
    }
}
