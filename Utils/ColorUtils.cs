using System;
using System.Drawing;
using System.Security.Cryptography;
using System.Text;

namespace Acme.Utils;

/// <summary>
/// Provides utility methods for colors.
/// </summary>
public static class ColorUtils {

    private static readonly string[] Colors = new string[] { "#0d6efd", "#6610f2", "#6f42c1", "#d63384", "#dc3545", "#fd7e14", "#ffc107", "#198754", "#20c997", "#0dcaf0" };

    public static string BackgroundFor(string text) {
        var hash = BitConverter.ToUInt32(MD5.HashData(Encoding.UTF8.GetBytes(text)));
        return Colors[hash % Colors.Length];
    }

    public static string TextColorOn(string backgroundColor) {
        // pick a dark or light text color depending on the background
        backgroundColor = backgroundColor.AddLeading("#");
        var color = ColorTranslator.FromHtml(backgroundColor);
        return color.R * 0.299 + color.G * 0.587 + color.B * 0.114 > 150 ? "#000" : "#fff";
    }

}
