using System;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Cryptography.KeyDerivation;

namespace Acme.Utils;

/// <summary>
/// Provides helper methods for calculating and verifying hash values.
/// </summary>
public static class HashUtils {

    // PBKDF2 configuration (see https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#pbkdf2)
    private const KeyDerivationPrf PBKDF2_PRF = KeyDerivationPrf.HMACSHA512; // HMAC-SHA512
    private const int PBKDF2_ITERATION_COUNT = 210_000; // 210000 iterations
    private const int PBKDF2_SUBKEY_LENGTH = 256 / 8; // 256 bits
    private const int PBKDF2_SALT_LENGTH = 128 / 8; // 128 bits

    /// <summary>
    /// Computes a Hash-based Message Authentication Code (HMAC) as a hex-encoded string.
    /// </summary>
    /// <param name="alg">The hash algorithm to use, e.g. "sha256".</param>
    /// <param name="secret">The secret key to use in the HMAC calculation.</param>
    /// <param name="input">The input to compute the hash code for.</param>
    /// <returns>The computed hash as a hex-encoded string.</returns>
    public static string HMAC(string alg, string secret, string input) {
        ArgumentException.ThrowIfNullOrEmpty(alg);
        ArgumentException.ThrowIfNullOrEmpty(secret);
        ArgumentException.ThrowIfNullOrEmpty(input);

        var key = Encoding.UTF8.GetBytes(secret);
        switch (alg.ToLowerInvariant()) {
            case "sha256":
                using (var hmac = new HMACSHA256(key)) {
                    return Hash(hmac, input);
                }
            case "sha384":
                using (var hmac = new HMACSHA384(key)) {
                    return Hash(hmac, input);
                }
            case "sha512":
                using (var hmac = new HMACSHA512(key)) {
                    return Hash(hmac, input);
                }
            default:
                throw new ArgumentException("Unsupported HMAC algorithm: " + alg, nameof(alg));
        };
    }

    /// <summary>
    /// Computes a hash value for the specified <paramref name="input"/> with the given algorithm.
    /// </summary>
    /// <param name="alg">The <see cref="HashAlgorithm"/> to use.</param>
    /// <param name="input">The input string to hash.</param>
    /// <returns>The computed hash as hex-encoded string.</returns>
    private static string Hash(HashAlgorithm alg, string input) {
        var hash = alg.ComputeHash(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    /// <summary>
    /// Produce a PBKDF2 password hash for the specified plain text password.
    /// </summary>
    /// <param name="password"></param>
    /// <returns>A base64url-encoded password hash.</returns>
    public static string HashPassword(string password) {
        if (string.IsNullOrEmpty(password)) {
            return null;
        }

        var hash = HashPassword(password, PBKDF2_PRF, PBKDF2_ITERATION_COUNT, PBKDF2_SALT_LENGTH, PBKDF2_SUBKEY_LENGTH);
        return StringUtils.Base64UrlEncode(hash);
    }

    /// <summary>
    /// Produce a PBKDF2 password hash.
    /// Format: { iterations (uint), salt length (uint), salt, subkey}
    /// All uints are stored big-endian.
    /// </summary>
    /// <param name="password">The plain text password to hash.</param>
    /// <param name="prf">The pseudo-random function to be used in the key derivation process.</param>
    /// <param name="iterationCount">The number of iterations of the pseudo-random function to apply during the key derivation process.</param>
    /// <param name="saltLength">The salt length to be used during the key derivation process.</param>
    /// <param name="subKeyLength">The desired length (in bytes) of the derived key.</param>
    /// <returns>A PBKDF2 password hash.</returns>
    private static byte[] HashPassword(string password, KeyDerivationPrf prf, int iterationCount, int saltLength, int subKeyLength) {
        byte[] salt = RandomNumberGenerator.GetBytes(saltLength);
        byte[] subkey = KeyDerivation.Pbkdf2(password, salt, prf, iterationCount, subKeyLength);
        var outputBytes = new byte[8 + salt.Length + subkey.Length];
        WriteBigEndian(outputBytes, 0, (uint)iterationCount); // include the iteration count 
        WriteBigEndian(outputBytes, 4, (uint)saltLength); // include the salt length
        Buffer.BlockCopy(salt, 0, outputBytes, 8, salt.Length);
        Buffer.BlockCopy(subkey, 0, outputBytes, 8 + saltLength, subkey.Length);
        return outputBytes;
    }

    /// <summary>
    /// Compares a hash of the specified plain text password to a given hash value.
    /// </summary>
    /// <param name="password">Plain text password to be verified against the specified hash.</param>
    /// <param name="hash">A password hash produced by the <see cref="HashPassword(string)"/> function.</param>
    /// <returns>A <see cref="bool"/> indicating the result of a password hash comparison.</returns>
    public static bool VerifyPassword(string password, string hash) {
        if (string.IsNullOrWhiteSpace(password)) {
            return false;
        }

        if (string.IsNullOrWhiteSpace(hash)) {
            return false;
        }

        // decode from base64url
        var decodedHashedPassword = StringUtils.Base64UrlDecode(hash);

        return VerifyPassword(decodedHashedPassword, password, PBKDF2_PRF);
    }

    /// <summary>
    /// 
    /// </summary>
    /// <param name="hash"></param>
    /// <param name="password"></param>
    /// <param name="iterationCount"></param>
    /// <param name="prf"></param>
    /// <returns></returns>
    private static bool VerifyPassword(byte[] hash, string password, KeyDerivationPrf prf) {
        try {
            // read header information
            var iterationCount = (int)ReadBigEndian(hash, 0);
            var saltLength = (int)ReadBigEndian(hash, 4);

            // read the salt: must be >= 128 bits
            if (saltLength < 128 / 8) {
                return false;
            }
            byte[] salt = new byte[saltLength];
            Buffer.BlockCopy(hash, 8, salt, 0, salt.Length);

            // read the subkey (the rest of the payload): must be >= 128 bits
            int subkeyLength = hash.Length - 8 - salt.Length;
            if (subkeyLength < 128 / 8) {
                return false;
            }

            byte[] expectedSubkey = new byte[subkeyLength];
            Buffer.BlockCopy(hash, 8 + salt.Length, expectedSubkey, 0, expectedSubkey.Length);

            // hash the incoming password and verify it
            byte[] actualSubkey = KeyDerivation.Pbkdf2(password, salt, prf, iterationCount, subkeyLength);
            return CryptographicOperations.FixedTimeEquals(actualSubkey, expectedSubkey);
        } catch {
            // malformed payload
            return false;
        }
    }

    /// <summary>
    /// Read uint from buffer in big-endian.
    /// </summary>
    /// <param name="buffer"></param>
    /// <param name="offset"></param>
    /// <returns></returns>
    private static uint ReadBigEndian(byte[] buffer, int offset) {
        return ((uint)(buffer[offset + 0]) << 24) | ((uint)(buffer[offset + 1]) << 16) | ((uint)(buffer[offset + 2]) << 8) | ((uint)(buffer[offset + 3]));
    }

    /// <summary>
    /// Write uint to buffer in big-endian. 
    /// </summary>
    /// <param name="buffer"></param>
    /// <param name="offset"></param>
    /// <param name="value"></param>
    private static void WriteBigEndian(byte[] buffer, int offset, uint value) {
        buffer[offset + 0] = (byte)(value >> 24);
        buffer[offset + 1] = (byte)(value >> 16);
        buffer[offset + 2] = (byte)(value >> 8);
        buffer[offset + 3] = (byte)(value >> 0);
    }

}
