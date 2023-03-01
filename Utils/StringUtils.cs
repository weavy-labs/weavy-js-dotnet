using System;
using System.Buffers;
using System.Globalization;
using System.Text;

namespace Acme.Utils;

/// <summary>
/// Provides extension and helper methods for working with strings.
/// </summary>
public static class StringUtils {

    private const char SNAKE_CASE_SEPARATOR = '_';
    private const int STACKALLOC_BYTE_THRESHOLD = 256;
    private const int STACKALLOC_CHAR_THRESHOLD = STACKALLOC_BYTE_THRESHOLD / 2;

    private const char BASE64_PAD_CHAR = '=';
    private const string BASE64_PAD_CHARS = "==";
    private const char BASE64_CHAR_62 = '+';
    private const char BASE64_CHAR_63 = '/';
    private const char BASE64_URL_CHAR_62 = '-';
    private const char BASE64_URL_CHAR_63 = '_';

    /// <summary>
    /// Helper method for converting a string to a nullable int.
    /// </summary>
    /// <param name="input">The input string.</param>
    /// <returns>The value as a nullable int.</returns>
    public static int? AsNullableInt(this string input) {
        if (int.TryParse(input, out var i)) {
            return i;
        }
        return null;
    }

    /// <summary>
    /// Appends a string before the text if it does not already exist.
    /// </summary>
    /// <param name="original">Required. The string expression to append to.</param>
    /// <param name="append">The string to append.</param>
    /// <returns>A string containing the original and appended string.</returns>
    public static string AddLeading(this string original, string append) {
        if (string.IsNullOrEmpty(original)) {
            return append;
        }
        if (!original.StartsWith(append)) {
            original = append + original;
        }
        return original;
    }

    /// <summary>
    /// Removes trailing text from a string.
    /// </summary>
    /// <param name="original">The string to remove from.</param>
    /// <param name="trailing">The string to remove.</param>
    /// <param name="comparisonType">One of the enumeration values that determines how strings are compared.</param>
    /// <returns>A string with the trailing text removed.</returns>
    public static string RemoveTrailing(this string original, string trailing, StringComparison? comparisonType = null) {
        if (string.IsNullOrEmpty(original)) {
            return original;
        }
        while (original.EndsWith(trailing, comparisonType ?? StringComparison.Ordinal)) {
            original = original[..original.LastIndexOf(trailing, comparisonType ?? StringComparison.Ordinal)];
        }
        return original;
    }

    /// <summary>
    /// Removes trailing slash from a string.
    /// </summary>
    /// <param name="original">The string to remove from.</param>
    /// <returns>A string the trailing slash removed.</returns>
    public static string RemoveTrailingSlash(this string original) {
        return original.RemoveTrailing("/");
    }

    /// <summary>
    /// Converts a byte array to a base64url encoded string.
    /// </summary>
    /// <param name="input">The bytes to encode.</param>
    /// <returns>A base64url encoded string.</returns>
    public static string Base64UrlEncode(byte[] bytes) {
        var encoded = Convert.ToBase64String(bytes);

        // replace + with -
        encoded = encoded.Replace(BASE64_CHAR_62, BASE64_URL_CHAR_62);

        // replace / with _
        encoded = encoded.Replace(BASE64_CHAR_63, BASE64_URL_CHAR_63);

        // remove padding and return
        return encoded.TrimEnd(BASE64_PAD_CHAR);
    }

    /// <summary>
    /// Encodes a string with base64url.
    /// </summary>
    /// <param name="input">The input string to encode.</param>
    /// <returns>A base64url encoded string.</returns>
    public static string Base64UrlEncode(string input) {
        if (string.IsNullOrEmpty(input)) {
            return input;
        }
        return Base64UrlEncode(Encoding.UTF8.GetBytes(input));
    }

    /// <summary>
    /// Convert a base64url string to an equivalent byte array.
    /// </summary>
    /// <param name="input">The input string to convert.</param>
    /// <returns>A byte array.</returns>
    public static byte[] Base64UrlDecode(string input) {

        // replace - with +
        input = input.Replace(BASE64_URL_CHAR_62, BASE64_CHAR_62);

        // replace _ with /
        input = input.Replace(BASE64_URL_CHAR_63, BASE64_CHAR_63);

        // add padding
        switch (input.Length % 4) {
            case 0:
                // no pad chars in this case
                break;
            case 2:
                // two pad chars
                input += BASE64_PAD_CHARS;
                break;
            case 3:
                // one pad char
                input += BASE64_PAD_CHAR;
                break;
        }

        return Convert.FromBase64String(input);
    }

    /// <summary>
    /// Return initials for the specified name.
    /// </summary>
    /// <param name="name">A name for which to get get initials, e.g. "Eddie" or "John Doe"</param>
    /// <param name="length">Max number of chars to return.</param>
    /// <returns></returns>
    public static string GetInitials(string name, int length = 2) {
        if (string.IsNullOrWhiteSpace(name)) {
            return null;
        }

        string initials = null;
        name = name.ToTitleCase();
        string[] words = name.Split(new string[] { ",", " " }, StringSplitOptions.RemoveEmptyEntries);
        if (words.Length == 1) {
            initials = words[0];
        } else {
            foreach (string word in words) {
                initials += word[0];
            }
        }

        // for unicode/emoji support we need check the length in text elements
        var str = new StringInfo(initials);
        return str.SubstringByTextElements(0, Math.Min(str.LengthInTextElements, length));
    }

    /// <summary>
    /// Converts text to title case.
    /// </summary>
    /// <example>
    /// The string "title case" will return the string "Title Case".
    /// </example>
    /// <param name="text">The text to convert.</param>
    /// <param name="onlyFirstLetter">Only change first letter of words</param>
    /// <returns>The converted text.</returns>
    public static string ToTitleCase(this string text, bool onlyFirstLetter = false) {
        if (string.IsNullOrEmpty(text)) {
            return text;
        }
        var words = text.Split(' ');
        for (var i = 0; i < words.Length; i++) {
            if (words[i].Length > 0) {
                var word = words[i];
                var firstChar = char.ToUpper(word[0]);
                words[i] = firstChar + (onlyFirstLetter ? word[1..] : word[1..].ToLower());
            }
        }
        return string.Join(" ", words);
    }

    /// <summary>
    /// Converts text to snake_case.
    /// </summary>
    /// <param name="text"></param>
    /// <returns></returns>
    /// <remarks>Based on code from https://github.com/dotnet/runtime/blob/main/src/libraries/System.Text.Json/Common/JsonSeparatorNamingPolicy.cs.</remarks>
    public static string ToSnakeCase(this string name) {
        // Rented buffer 20% longer that the input.
        int rentedBufferLength = (12 * name.Length) / 10;
        char[] rentedBuffer = rentedBufferLength > STACKALLOC_CHAR_THRESHOLD ? ArrayPool<char>.Shared.Rent(rentedBufferLength) : null;

        int resultUsedLength = 0;
        Span<char> result = rentedBuffer is null ? stackalloc char[STACKALLOC_CHAR_THRESHOLD] : rentedBuffer;

        void ExpandBuffer(ref Span<char> result) {
            char[] newBuffer = ArrayPool<char>.Shared.Rent(result.Length * 2);

            result.CopyTo(newBuffer);

            if (rentedBuffer is not null) {
                result.Slice(0, resultUsedLength).Clear();
                ArrayPool<char>.Shared.Return(rentedBuffer);
            }

            rentedBuffer = newBuffer;
            result = rentedBuffer;
        }

        void WriteWord(ReadOnlySpan<char> word, ref Span<char> result) {
            if (word.IsEmpty) {
                return;
            }

            int written;
            while (true) {
                var destinationOffset = resultUsedLength != 0 ? resultUsedLength + 1 : resultUsedLength;

                if (destinationOffset < result.Length) {
                    Span<char> destination = result.Slice(destinationOffset);

                    written = word.ToLowerInvariant(destination);

                    if (written > 0) {
                        break;
                    }
                }

                ExpandBuffer(ref result);
            }

            if (resultUsedLength != 0) {
                result[resultUsedLength] = SNAKE_CASE_SEPARATOR;
                resultUsedLength += 1;
            }

            resultUsedLength += written;
        }

        int first = 0;
        ReadOnlySpan<char> chars = name.AsSpan();
        CharCategory previousCategory = CharCategory.Boundary;

        for (int index = 0; index < chars.Length; index++) {
            char current = chars[index];
            UnicodeCategory currentCategoryUnicode = char.GetUnicodeCategory(current);

            if (currentCategoryUnicode == UnicodeCategory.SpaceSeparator ||
                currentCategoryUnicode >= UnicodeCategory.ConnectorPunctuation &&
                currentCategoryUnicode <= UnicodeCategory.OtherPunctuation) {
                WriteWord(chars.Slice(first, index - first), ref result);

                previousCategory = CharCategory.Boundary;
                first = index + 1;

                continue;
            }

            if (index + 1 < chars.Length) {
                char next = chars[index + 1];
                CharCategory currentCategory = currentCategoryUnicode switch {
                    UnicodeCategory.LowercaseLetter => CharCategory.Lowercase,
                    UnicodeCategory.UppercaseLetter => CharCategory.Uppercase,
                    _ => previousCategory
                };

                if (currentCategory == CharCategory.Lowercase && char.IsUpper(next) || next == SNAKE_CASE_SEPARATOR) {
                    WriteWord(chars.Slice(first, index - first + 1), ref result);

                    previousCategory = CharCategory.Boundary;
                    first = index + 1;

                    continue;
                }

                if (previousCategory == CharCategory.Uppercase &&
                    currentCategoryUnicode == UnicodeCategory.UppercaseLetter &&
                    char.IsLower(next)) {
                    WriteWord(chars.Slice(first, index - first), ref result);

                    previousCategory = CharCategory.Boundary;
                    first = index;

                    continue;
                }

                previousCategory = currentCategory;
            }
        }

        WriteWord(chars.Slice(first), ref result);

        name = result.Slice(0, resultUsedLength).ToString();

        if (rentedBuffer is not null) {
            result.Slice(0, resultUsedLength).Clear();
            ArrayPool<char>.Shared.Return(rentedBuffer);
        }

        return name;
    }

    private enum CharCategory {
        Boundary,
        Lowercase,
        Uppercase,
    }
}
