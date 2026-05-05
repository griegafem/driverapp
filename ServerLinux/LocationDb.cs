using Microsoft.Data.Sqlite;

public sealed class LocationDb
{
    private readonly string _dbPath;

    public LocationDb(string dbPath)
    {
        _dbPath = dbPath;
    }

    private string ConnString => new SqliteConnectionStringBuilder
    {
        DataSource = _dbPath,
        ForeignKeys = true,
        Mode = SqliteOpenMode.ReadWriteCreate,
        Cache = SqliteCacheMode.Shared
    }.ToString();

    public sealed class LocationRecord
    {
        public long Id { get; set; }
        public string Name { get; set; } = "";
        public string Description { get; set; } = "";
    }

    public void EnsureCreatedAndSeed()
    {
        using var conn = new SqliteConnection(ConnString);
        conn.Open();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);
""";
        cmd.ExecuteNonQuery();
    }

    public LocationRecord[] GetAll()
    {
        using var conn = new SqliteConnection(ConnString);
        conn.Open();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT id, name, description FROM locations ORDER BY name;";

        using var r = cmd.ExecuteReader();
        var list = new List<LocationRecord>();
        while (r.Read())
        {
            list.Add(new LocationRecord
            {
                Id = r.GetInt64(0),
                Name = r.GetString(1),
                Description = r.GetString(2)
            });
        }
        return list.ToArray();
    }

    public LocationRecord? GetById(long id)
    {
        if (id <= 0) return null;
        using var conn = new SqliteConnection(ConnString);
        conn.Open();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT id, name, description FROM locations WHERE id = $id LIMIT 1;";
        cmd.Parameters.AddWithValue("$id", id);
        using var r = cmd.ExecuteReader();
        if (!r.Read()) return null;
        return new LocationRecord { Id = r.GetInt64(0), Name = r.GetString(1), Description = r.GetString(2) };
    }

    public void Upsert(LocationRecord loc)
    {
        using var conn = new SqliteConnection(ConnString);
        conn.Open();

        var name = (loc.Name ?? "").Trim();
        if (string.IsNullOrWhiteSpace(name)) return;

        if (loc.Id > 0)
        {
            using var upd = conn.CreateCommand();
            upd.CommandText = "UPDATE locations SET name = $name, description = $desc WHERE id = $id;";
            upd.Parameters.AddWithValue("$id", loc.Id);
            upd.Parameters.AddWithValue("$name", name);
            upd.Parameters.AddWithValue("$desc", (loc.Description ?? "").Trim());
            if (upd.ExecuteNonQuery() > 0) return;
        }

        using var cmd = conn.CreateCommand();
        cmd.CommandText = "INSERT INTO locations (name, description) VALUES ($name, $desc);";
        cmd.Parameters.AddWithValue("$name", name);
        cmd.Parameters.AddWithValue("$desc", (loc.Description ?? "").Trim());
        cmd.ExecuteNonQuery();
    }

    public bool DeleteById(long id)
    {
        if (id <= 0) return false;
        using var conn = new SqliteConnection(ConnString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM locations WHERE id = $id;";
        cmd.Parameters.AddWithValue("$id", id);
        return cmd.ExecuteNonQuery() > 0;
    }
}
