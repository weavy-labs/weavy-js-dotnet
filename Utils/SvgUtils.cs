using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Xml;
using Microsoft.AspNetCore.Html;
using Microsoft.AspNetCore.Mvc.ViewFeatures;

namespace Acme.Utils;

/// <summary>
/// Utility methods for rendering SVG icons and images.
/// </summary>
public static class SvgUtils {

    private static readonly XmlWriterSettings _settings = new XmlWriterSettings {
        Encoding = Encoding.UTF8,
        Indent = false,
        NamespaceHandling = NamespaceHandling.OmitDuplicates,
        OmitXmlDeclaration = true
    };

    /// <summary>
    /// Returns an svg circle with the specified text.
    /// </summary>
    /// <param name="text">The initials to render in the image, e.g. "JD".</param>
    /// <param name="size">Width/Height in pixels.</param>
    /// <param name="backgroundColor">The background color to use..</param>
    /// <param name="textColor">The text color.</param>
    /// <param name="htmlAttributes"></param>
    /// <returns></returns>
    public static HtmlString Circle(string text, int size, string backgroundColor, string textColor, object htmlAttributes = null) {
        var svg = $@"<svg width=""{size}"" height=""{size}"" viewBox=""0 0 24 24""  xmlns=""http://www.w3.org/2000/svg"">
<circle cx=""12"" cy=""12"" r=""12"" fill=""{backgroundColor}"" />
<text x=""12"" y=""15.5"" fill=""{textColor}"" text-anchor=""middle"" font-family=""system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif"" font-size=""10"" font-weight=""600"">{text}</text>
</svg>";
        svg = SetAttributes(svg, htmlAttributes);
        return new HtmlString(svg);
    }

    /// <summary>
    /// Returns a square svg image with the specified text.
    /// </summary>
    /// <param name="text">The initials to render in the image, e.g. "JD".</param>
    /// <param name="size">Width/Height in pixels.</param>
    /// <param name="backgroundColor">The background color to use..</param>
    /// <param name="textColor">The text color.</param>
    /// <param name="htmlAttributes"></param>
    /// <returns></returns>
    public static HtmlString Square(string text, int size, string backgroundColor, string textColor, object htmlAttributes = null) {
        var svg = $@"<svg width=""{size}"" height=""{size}"" viewBox=""0 0 24 24""  xmlns=""http://www.w3.org/2000/svg"">
<path d=""M0 0h24v24H0z"" fill=""{backgroundColor}""/>
<text x=""12"" y=""15.5"" fill=""{textColor}"" text-anchor=""middle"" font-family=""system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif"" font-size=""10"" font-weight=""600"">{text}</text>
</svg>";

        svg = SetAttributes(svg, htmlAttributes);
        return new HtmlString(svg);
    }

    /// <summary>
    /// Set specified attributes on the svg root element.
    /// </summary>
    /// <param name="svg">The svg markup</param>
    /// <param name="title">Text to set in the title element.</param>
    /// <param name="attributes">Attributes to set on the root element.</param>
    /// <returns></returns>
    public static string SetAttributes(string svg, object attributes) {
        if (svg == null || attributes == null) {
            return svg;
        }

        var doc = new XmlDocument();
        doc.LoadXml(svg);
        var root = doc.DocumentElement;
        foreach (var item in HtmlHelper.AnonymousObjectToHtmlAttributes(attributes)) {
            root.SetAttribute(item.Key, item.Value.ToString());
        }
        return Minify(doc);
    }

    /// <summary>
    /// Minify the svg document by removing xml declaration, doctype, unwanted attributes and whitespace.
    /// </summary>
    /// <param name="doc"></param>
    /// <param name="attributes">
    /// Name of attributes to keep, or <c>null</c> to keep all attributes. A good default is "width", "height" and "viewBox"
    /// (according to https://stackoverflow.com/a/34249810/891843 it is safe to remove "xmlns", "xmlns:xlink" and "version" for inline svgs).
    /// </param>
    /// <returns></returns>
    private static string Minify(XmlDocument doc, params string[] attributes) {
        doc.PreserveWhitespace = false;
        if (doc.DocumentType != null) {
            doc.RemoveChild(doc.DocumentType);
        }

        if (attributes != null && attributes.Length > 0) {
            // only keep specified attributes
            var remove = new List<XmlAttribute>();
            for (var i = 0; i < doc.DocumentElement.Attributes.Count; i++) {
                var attr = doc.DocumentElement.Attributes[i];
                if (!attributes.Any(x => attr.Name.Equals(x, System.StringComparison.OrdinalIgnoreCase))) {
                    remove.Add(attr);
                }
            }
            foreach (var a in remove) {
                doc.DocumentElement.Attributes.Remove(a);
            }
        }

        var sb = new StringBuilder();
        using (var xw = XmlWriter.Create(sb, _settings)) {
            doc.Save(xw);
        }

        var svg = sb.ToString();
        if (!attributes.Contains("xmlns")) {
            // since we can't seem to remove the "root" namespace (xmlns="http://www.w3.org/2000/svg") from the XmlDocument we take care of it with a simple string replacement instead
            svg = svg.Replace(@" xmlns=""http://www.w3.org/2000/svg""", "");
            // we also remove xmlns=""
            svg = svg.Replace(@" xmlns=""""", "");
        }
        return svg;
    }
}
