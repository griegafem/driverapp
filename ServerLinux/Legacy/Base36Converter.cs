using System;
using System.Numerics;
using System.Text;

public static class Base36Converter
{
    private const string Alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";

    public static string Encode(string data) { return Encode(Encoding.UTF8.GetBytes(data)); }

    public static string DecodeToUTF(string input) { return Encoding.UTF8.GetString(Decode(input)); }

    public static string Encode(byte[] data)
    {
        if (data == null || data.Length == 0)
            return string.Empty;

        var temp = new byte[data.Length + 1];
        Array.Copy(data, temp, data.Length);

        var value = new BigInteger(temp);

        if (value == 0)
            return "0";

        var sb = new StringBuilder();

        while (value > 0)
        {
            value = BigInteger.DivRem(value, 36, out var remainder);
            sb.Insert(0, Alphabet[(int)remainder]);
        }

        return sb.ToString();
    }

    public static byte[] Decode(string input)
    {
        if (string.IsNullOrEmpty(input))
            return new byte[0];

        input = input.ToLower();

        BigInteger result = BigInteger.Zero;

        foreach (char c in input)
        {
            int val = Alphabet.IndexOf(c);
            if (val < 0)
                throw new ArgumentException("Invalid character: " + c);

            result = result * 36 + val;
        }

        var bytes = result.ToByteArray();

        if (bytes.Length > 1 && bytes[bytes.Length - 1] == 0)
        {
            Array.Resize(ref bytes, bytes.Length - 1);
        }

        return bytes;
    }
}
