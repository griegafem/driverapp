using Newtonsoft.Json;
using System.Text;

public sealed class SessionStore
{
    private readonly string _path;
    private readonly Dictionary<string, string> _sessions = new();
    private readonly object _lock = new();

    public SessionStore(string path)
    {
        _path = path;
        Load();
    }

    private void Load()
    {
        try
        {
            if (!File.Exists(_path)) return;
            var data = File.ReadAllBytes(_path);
            var decrypt = data.Select(x => (byte)(x ^ 69)).ToArray();
            var raw = Encoding.UTF8.GetString(decrypt);
            var obj = JsonConvert.DeserializeObject<Dictionary<string, string>>(raw);
            if (obj == null) return;
            _sessions.Clear();
            foreach (var kv in obj) _sessions[kv.Key] = kv.Value;
        }
        catch { }
    }

    private void Save()
    {
        try
        {
            var raw = Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(_sessions));
            var encrypt = raw.Select(x => (byte)(x ^ 69)).ToArray();
            File.WriteAllBytes(_path, encrypt);
        }
        catch { }
    }

    public string Create(string login)
    {
        var bytes = new byte[64];
        Random.Shared.NextBytes(bytes);
        var session = Convert.ToBase64String(bytes);
        lock (_lock)
        {
            _sessions[session] = login;
            Save();
        }
        return session;
    }

    public string? GetLogin(string? session)
    {
        if (string.IsNullOrWhiteSpace(session)) return null;
        lock (_lock)
        {
            return _sessions.TryGetValue(session, out var login) ? login : null;
        }
    }

    public void Remove(string? session)
    {
        if (string.IsNullOrWhiteSpace(session)) return;
        lock (_lock)
        {
            if (_sessions.Remove(session)) Save();
        }
    }
}
