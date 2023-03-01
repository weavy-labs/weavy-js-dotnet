using System.Collections.Generic;
using System.Text.Encodings.Web;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Mvc.Routing;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.Extensions.Options;

namespace Acme.Mvc;

/// <summary>
/// Bootstrap compatible <see cref="IHtmlGenerator"/>.
/// </summary>
public class BootstrapHtmlGenerator : DefaultHtmlGenerator {

    /// <summary>
    /// Initializes a new instance of the <see cref="BootstrapHtmlGenerator"/> class.
    /// </summary>
    /// <param name="antiforgery">The <see cref="IAntiforgery"/> instance which is used to generate antiforgery
    /// tokens.</param>
    /// <param name="optionsAccessor">The accessor for <see cref="MvcViewOptions"/>.</param>
    /// <param name="metadataProvider">The <see cref="IModelMetadataProvider"/>.</param>
    /// <param name="urlHelperFactory">The <see cref="IUrlHelperFactory"/>.</param>
    /// <param name="htmlEncoder">The <see cref="HtmlEncoder"/>.</param>
    /// <param name="validationAttributeProvider">The <see cref="ValidationHtmlAttributeProvider"/>.</param>
    public BootstrapHtmlGenerator(IAntiforgery antiforgery, IOptions<MvcViewOptions> optionsAccessor, IModelMetadataProvider metadataProvider, IUrlHelperFactory urlHelperFactory, HtmlEncoder htmlEncoder, ValidationHtmlAttributeProvider validationAttributeProvider) :
        base(antiforgery, optionsAccessor, metadataProvider, urlHelperFactory, htmlEncoder, validationAttributeProvider) {
    }

    /// <inheritdoc />
    public override TagBuilder GenerateLabel(ViewContext viewContext, ModelExplorer modelExplorer, string expression, string labelText, object htmlAttributes) {
        var tagBuilder = base.GenerateLabel(viewContext, modelExplorer, expression, labelText, htmlAttributes);
        FixClassNames(viewContext, tagBuilder);
        return tagBuilder;
    }

    /// <inheritdoc />
    public override TagBuilder GenerateSelect(ViewContext viewContext, ModelExplorer modelExplorer, string optionLabel, string expression, IEnumerable<SelectListItem> selectList, ICollection<string> currentValues, bool allowMultiple, object htmlAttributes) {
        var tagBuilder = base.GenerateSelect(viewContext, modelExplorer, optionLabel, expression, selectList, currentValues, allowMultiple, htmlAttributes);
        FixClassNames(viewContext, tagBuilder);
        return tagBuilder;
    }

    /// <inheritdoc />
    public override TagBuilder GenerateTextArea(ViewContext viewContext, ModelExplorer modelExplorer, string expression, int rows, int columns, object htmlAttributes) {
        var tagBuilder = base.GenerateTextArea(viewContext, modelExplorer, expression, rows, columns, htmlAttributes);
        FixClassNames(viewContext, tagBuilder);
        return tagBuilder;
    }

    /// <inheritdoc />
    public override TagBuilder GenerateValidationMessage(ViewContext viewContext, ModelExplorer modelExplorer, string expression, string message, string tag, object htmlAttributes) {
        var tagBuilder = base.GenerateValidationMessage(viewContext, modelExplorer, expression, message, tag, htmlAttributes);
        FixClassNames(viewContext, tagBuilder);
        return tagBuilder;
    }

    /// <inheritdoc />
    public override TagBuilder GenerateValidationSummary(ViewContext viewContext, bool excludePropertyErrors, string message,
        string headerTag, object htmlAttributes) {
        var tagBuilder = base.GenerateValidationSummary(viewContext, excludePropertyErrors, message, headerTag, htmlAttributes);
        FixClassNames(viewContext, tagBuilder);
        return tagBuilder;
    }

    /// <inheritdoc />
    protected override TagBuilder GenerateFormCore(ViewContext viewContext, string action, string method, object htmlAttributes) {
        var tagBuilder = base.GenerateFormCore(viewContext, action, method, htmlAttributes);
        return tagBuilder;
    }

    /// <inheritdoc />
    protected override TagBuilder GenerateInput(ViewContext viewContext, InputType inputType, ModelExplorer modelExplorer, string expression, object value, bool useViewData, bool isChecked, bool setId, bool isExplicitValue, string format, IDictionary<string, object> htmlAttributes) {
        var tagBuilder = base.GenerateInput(viewContext, inputType, modelExplorer, expression, value, useViewData, isChecked, setId, isExplicitValue, format, htmlAttributes);
        FixClassNames(viewContext, tagBuilder);
        return tagBuilder;
    }

    private void FixClassNames(ViewContext viewContext, TagBuilder tagBuilder) {
        if (tagBuilder == null) {
            return;
        }

        ReplaceClass(tagBuilder, HtmlHelper.ValidationInputCssClassName, "is-invalid");
        ReplaceClass(tagBuilder, HtmlHelper.ValidationInputValidCssClassName, "is-valid");
        ReplaceClass(tagBuilder, HtmlHelper.ValidationMessageCssClassName, "invalid-feedback");
        ReplaceClass(tagBuilder, HtmlHelper.ValidationMessageValidCssClassName, "valid-feedback");
        ReplaceClass(tagBuilder, HtmlHelper.ValidationSummaryCssClassName, "alert alert-danger");
        ReplaceClass(tagBuilder, HtmlHelper.ValidationSummaryValidCssClassName, "d-none");
    }

    /// <summary>
    /// Replace a CSS class with another CSS class in the tag.
    /// </summary>
    /// <param name="tagBuilder"></param>
    /// <param name="oldValue"></param>
    /// <param name="newValue"></param>
    private void ReplaceClass(TagBuilder tagBuilder, string oldValue, string newValue) {
        if (tagBuilder.Attributes.TryGetValue("class", out var currentValue)) {
            tagBuilder.Attributes["class"] = ReplaceClass(currentValue, oldValue, newValue);
        }
    }

    /// <summary>
    /// Replaces a CSS class in a string of CSS classes with another.
    /// </summary>
    /// <param name="css"></param>
    /// <param name="oldValue"></param>
    /// <param name="newValue"></param>
    private string ReplaceClass(string css, string oldValue, string newValue) {
        return Regex.Replace(css, @"(^|\s+)" + oldValue + @"(\s+|$)", "$1" + newValue + "$2").Trim() ?? "";
    }
}
