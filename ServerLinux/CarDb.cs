using Microsoft.Data.Sqlite;
using Newtonsoft.Json;

public sealed class CarDb
{
    private readonly string _dbPath;

    public CarDb(string dbPath)
    {
        _dbPath = dbPath;
    }

    public string DbPath => _dbPath;

    private string ConnString => new SqliteConnectionStringBuilder
    {
        DataSource = _dbPath,
        ForeignKeys = true,
        Mode = SqliteOpenMode.ReadWriteCreate,
        // Important: if the DB file is replaced on disk (e.g. import tool),
        // connection pooling may keep an open handle to the old inode and serve stale data.
        // Disabling pooling ensures the process always reads the current file contents.
        Pooling = false,
        Cache = SqliteCacheMode.Shared
    }.ToString();

    public sealed class CarRecord
    {
        public long Id { get; set; }
        public string Number { get; set; } = "";
        public string Brand { get; set; } = "";
        public string Model { get; set; } = "";
        public string Vin { get; set; } = "";
        public string Color { get; set; } = "";
        public string Year { get; set; } = "";
        public string Department { get; set; } = "";
        public string Responsible { get; set; } = "";
        public string CurrentLocation { get; set; } = "";
    }

    public void EnsureCreatedAndSeed()
    {
        using var conn = new SqliteConnection(ConnString);
        conn.Open();

        using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = """
CREATE TABLE IF NOT EXISTS cars (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT NOT NULL UNIQUE,
  brand TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  vin TEXT NOT NULL DEFAULT '',
  year TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  responsible TEXT NOT NULL DEFAULT '',
  current_location TEXT NOT NULL DEFAULT ''
);
""";
            cmd.ExecuteNonQuery();
        }

        // Migration: add current_location column to existing databases
        try
        {
            using var mig = conn.CreateCommand();
            mig.CommandText = "ALTER TABLE cars ADD COLUMN current_location TEXT NOT NULL DEFAULT '';";
            mig.ExecuteNonQuery();
        }
        catch { /* column already exists — ignore */ }

        if (Count() == 0)
        {
            Upsert(new CarRecord
            {
                Number = "А000АА00",
                Brand = "Lada",
                Model = "Vesta",
                Color = "",
                Vin = ""
            });
        }
    }

    public void SeedFromJsonFile(string path)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(path) || !File.Exists(path)) return;
            var json = File.ReadAllText(path);
            var list = JsonConvert.DeserializeObject<List<CarRecord>>(json);
            if (list == null || list.Count == 0) return;

            foreach (var c in list)
            {
                if (string.IsNullOrWhiteSpace(c?.Number)) continue;
                Upsert(c);
            }
        }
        catch { }
    }

    public int Count()
    {
        using var conn = new SqliteConnection(ConnString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT COUNT(1) FROM cars;";
        return Convert.ToInt32(cmd.ExecuteScalar() ?? 0);
    }

    public CarRecord[] GetAll()
    {
        using var conn = new SqliteConnection(ConnString);
        conn.Open();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
SELECT id, number, brand, model, color, vin, year, department, responsible, current_location
FROM cars
ORDER BY number;
""";

        using var r = cmd.ExecuteReader();
        var list = new List<CarRecord>();
        while (r.Read())
        {
            list.Add(new CarRecord
            {
                Id = r.GetInt64(0),
                Number = r.GetString(1),
                Brand = r.GetString(2),
                Model = r.GetString(3),
                Color = r.GetString(4),
                Vin = r.GetString(5),
                Year = r.GetString(6),
                Department = r.GetString(7),
                Responsible = r.GetString(8),
                CurrentLocation = r.GetString(9),
            });
        }
        return list.ToArray();
    }

    public CarRecord? GetById(long id)
    {
        if (id <= 0) return null;
        using var conn = new SqliteConnection(ConnString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
SELECT id, number, brand, model, color, vin, year, department, responsible, current_location
FROM cars
WHERE id = $id
LIMIT 1;
""";
        cmd.Parameters.AddWithValue("$id", id);
        using var r = cmd.ExecuteReader();
        if (!r.Read()) return null;
        return new CarRecord
        {
            Id = r.GetInt64(0),
            Number = r.GetString(1),
            Brand = r.GetString(2),
            Model = r.GetString(3),
            Color = r.GetString(4),
            Vin = r.GetString(5),
            Year = r.GetString(6),
            Department = r.GetString(7),
            Responsible = r.GetString(8),
            CurrentLocation = r.GetString(9),
        };
    }

    public CarRecord? GetByNumber(string? number)
    {
        var n = NormalizeNumber(number);
        if (string.IsNullOrWhiteSpace(n)) return null;
        using var conn = new SqliteConnection(ConnString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
SELECT id, number, brand, model, color, vin, year, department, responsible, current_location
FROM cars
WHERE number = $number
LIMIT 1;
""";
        cmd.Parameters.AddWithValue("$number", n);
        using var r = cmd.ExecuteReader();
        if (!r.Read()) return null;
        return new CarRecord
        {
            Id = r.GetInt64(0),
            Number = r.GetString(1),
            Brand = r.GetString(2),
            Model = r.GetString(3),
            Color = r.GetString(4),
            Vin = r.GetString(5),
            Year = r.GetString(6),
            Department = r.GetString(7),
            Responsible = r.GetString(8),
            CurrentLocation = r.GetString(9),
        };
    }

    public void Upsert(CarRecord c)
    {
        using var conn = new SqliteConnection(ConnString);
        conn.Open();

        var number = NormalizeNumber(c.Number);
        if (string.IsNullOrWhiteSpace(number)) return;

        if (c.Id > 0)
        {
            using var upd = conn.CreateCommand();
            upd.CommandText = """
UPDATE cars SET
  number = $number,
  brand = $brand,
  model = $model,
  color = $color,
  vin = $vin,
  year = $year,
  department = $department,
  responsible = $responsible,
  current_location = $current_location
WHERE id = $id;
""";
            upd.Parameters.AddWithValue("$id", c.Id);
            upd.Parameters.AddWithValue("$number", number);
            upd.Parameters.AddWithValue("$brand", (c.Brand ?? "").Trim());
            upd.Parameters.AddWithValue("$model", (c.Model ?? "").Trim());
            upd.Parameters.AddWithValue("$color", (c.Color ?? "").Trim());
            upd.Parameters.AddWithValue("$vin", (c.Vin ?? "").Trim());
            upd.Parameters.AddWithValue("$year", (c.Year ?? "").Trim());
            upd.Parameters.AddWithValue("$department", (c.Department ?? "").Trim());
            upd.Parameters.AddWithValue("$responsible", (c.Responsible ?? "").Trim());
            upd.Parameters.AddWithValue("$current_location", (c.CurrentLocation ?? "").Trim());

            try
            {
                var changed = upd.ExecuteNonQuery();
                if (changed > 0) return;
            }
            catch
            {
                // fallback to number-based upsert below (e.g. unique constraint)
            }
        }

        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
INSERT INTO cars (number, brand, model, color, vin, year, department, responsible, current_location)
VALUES ($number, $brand, $model, $color, $vin, $year, $department, $responsible, $current_location)
ON CONFLICT(number) DO UPDATE SET
  brand = excluded.brand,
  model = excluded.model,
  color = excluded.color,
  vin = excluded.vin,
  year = excluded.year,
  department = excluded.department,
  responsible = excluded.responsible,
  current_location = excluded.current_location;
""";
        cmd.Parameters.AddWithValue("$number", number);
        cmd.Parameters.AddWithValue("$brand", (c.Brand ?? "").Trim());
        cmd.Parameters.AddWithValue("$model", (c.Model ?? "").Trim());
        cmd.Parameters.AddWithValue("$color", (c.Color ?? "").Trim());
        cmd.Parameters.AddWithValue("$vin", (c.Vin ?? "").Trim());
        cmd.Parameters.AddWithValue("$year", (c.Year ?? "").Trim());
        cmd.Parameters.AddWithValue("$department", (c.Department ?? "").Trim());
        cmd.Parameters.AddWithValue("$responsible", (c.Responsible ?? "").Trim());
        cmd.Parameters.AddWithValue("$current_location", (c.CurrentLocation ?? "").Trim());
        cmd.ExecuteNonQuery();
    }

    public void UpdateLocation(string carNumber, string location)
    {
        var n = NormalizeNumber(carNumber);
        if (string.IsNullOrWhiteSpace(n)) return;
        using var conn = new SqliteConnection(ConnString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "UPDATE cars SET current_location = $loc WHERE number = $number;";
        cmd.Parameters.AddWithValue("$number", n);
        cmd.Parameters.AddWithValue("$loc", (location ?? "").Trim());
        cmd.ExecuteNonQuery();
    }

    public bool DeleteById(long id)
    {
        if (id <= 0) return false;
        using var conn = new SqliteConnection(ConnString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM cars WHERE id = $id;";
        cmd.Parameters.AddWithValue("$id", id);
        return cmd.ExecuteNonQuery() > 0;
    }

    public static string NormalizeNumber(string? number)
    {
        return (number ?? "").Trim().ToUpperInvariant();
    }
}

