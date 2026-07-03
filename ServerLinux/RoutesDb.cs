using Microsoft.Data.Sqlite;

public sealed class RoutesDb
{
    private readonly string _connStr;

    public RoutesDb(string dbPath)
    {
        _connStr = new SqliteConnectionStringBuilder
        {
            DataSource = dbPath,
            Mode = SqliteOpenMode.ReadWriteCreate,
            Cache = SqliteCacheMode.Shared
        }.ToString();
        EnsureCreated();
    }

    private void EnsureCreated()
    {
        using var conn = Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS routes (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at       TEXT    NOT NULL,
                car_id           TEXT    NOT NULL,
                car_number       TEXT    NOT NULL DEFAULT '',
                car_brand        TEXT    NOT NULL DEFAULT '',
                car_model        TEXT    NOT NULL DEFAULT '',
                driver_login     TEXT    NOT NULL,
                driver_name      TEXT    NOT NULL DEFAULT '',
                driver_surname   TEXT    NOT NULL DEFAULT '',
                from_location    TEXT    NOT NULL DEFAULT '',
                to_location      TEXT    NOT NULL DEFAULT '',
                status           TEXT    NOT NULL DEFAULT 'active',
                pre_checkup_id   INTEGER,
                post_checkup_id  INTEGER,
                departed_at      TEXT,
                arrived_at       TEXT
            );
            """;
        cmd.ExecuteNonQuery();
    }

    public long Insert(RouteRecord r)
    {
        using var conn = Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            INSERT INTO routes
                (created_at, car_id, car_number, car_brand, car_model,
                 driver_login, driver_name, driver_surname,
                 from_location, to_location, status, departed_at)
            VALUES
                ($created_at, $car_id, $car_number, $car_brand, $car_model,
                 $driver_login, $driver_name, $driver_surname,
                 $from_location, $to_location, 'active', $departed_at);
            SELECT last_insert_rowid();
            """;
        cmd.Parameters.AddWithValue("$created_at", r.CreatedAt);
        cmd.Parameters.AddWithValue("$car_id", r.CarId);
        cmd.Parameters.AddWithValue("$car_number", r.CarNumber);
        cmd.Parameters.AddWithValue("$car_brand", r.CarBrand);
        cmd.Parameters.AddWithValue("$car_model", r.CarModel);
        cmd.Parameters.AddWithValue("$driver_login", r.DriverLogin);
        cmd.Parameters.AddWithValue("$driver_name", r.DriverName);
        cmd.Parameters.AddWithValue("$driver_surname", r.DriverSurname);
        cmd.Parameters.AddWithValue("$from_location", r.FromLocation);
        cmd.Parameters.AddWithValue("$to_location", r.ToLocation);
        cmd.Parameters.AddWithValue("$departed_at", r.DepartedAt ?? (object)DBNull.Value);
        return (long)(cmd.ExecuteScalar() ?? 0L);
    }

    public RouteRecord? GetById(long id)
    {
        using var conn = Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT * FROM routes WHERE id = $id LIMIT 1;";
        cmd.Parameters.AddWithValue("$id", id);
        using var r = cmd.ExecuteReader();
        return r.Read() ? Map(r) : null;
    }

    public RouteRecord? GetActiveByCarId(string carId)
    {
        using var conn = Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT * FROM routes WHERE car_id = $car_id AND status = 'active' LIMIT 1;";
        cmd.Parameters.AddWithValue("$car_id", carId);
        using var r = cmd.ExecuteReader();
        return r.Read() ? Map(r) : null;
    }

    public RouteRecord[] GetByDriver(string login)
    {
        using var conn = Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT * FROM routes WHERE driver_login = $login ORDER BY id DESC;";
        cmd.Parameters.AddWithValue("$login", login);
        return ReadAll(cmd);
    }

    public RouteRecord[] GetAll()
    {
        using var conn = Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT * FROM routes ORDER BY id DESC;";
        return ReadAll(cmd);
    }

    public bool Complete(long id, string arrivedAt)
    {
        using var conn = Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "UPDATE routes SET status = 'completed', arrived_at = $arrived_at WHERE id = $id AND status = 'active';";
        cmd.Parameters.AddWithValue("$id", id);
        cmd.Parameters.AddWithValue("$arrived_at", arrivedAt);
        return cmd.ExecuteNonQuery() > 0;
    }

    public bool SetPreCheckup(long routeId, long checkupId)
    {
        using var conn = Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "UPDATE routes SET pre_checkup_id = $cid WHERE id = $id;";
        cmd.Parameters.AddWithValue("$id", routeId);
        cmd.Parameters.AddWithValue("$cid", checkupId);
        return cmd.ExecuteNonQuery() > 0;
    }

    public bool SetPostCheckup(long routeId, long checkupId)
    {
        using var conn = Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "UPDATE routes SET post_checkup_id = $cid WHERE id = $id;";
        cmd.Parameters.AddWithValue("$id", routeId);
        cmd.Parameters.AddWithValue("$cid", checkupId);
        return cmd.ExecuteNonQuery() > 0;
    }

    // Returns car_ids that currently have an active route
    public HashSet<string> GetActiveCarIds()
    {
        using var conn = Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT car_id FROM routes WHERE status = 'active';";
        using var r = cmd.ExecuteReader();
        var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        while (r.Read()) set.Add(r.GetString(0));
        return set;
    }

    // For each car: returns its last completed route's to_location (current location)
    public Dictionary<string, string> GetCarLastLocations()
    {
        using var conn = Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT car_id, to_location FROM routes
            WHERE status = 'completed'
              AND id IN (
                SELECT MAX(id) FROM routes WHERE status = 'completed' GROUP BY car_id
              );
            """;
        using var r = cmd.ExecuteReader();
        var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        while (r.Read()) dict[r.GetString(0)] = r.GetString(1);
        return dict;
    }

    private static RouteRecord[] ReadAll(SqliteCommand cmd)
    {
        using var r = cmd.ExecuteReader();
        var list = new List<RouteRecord>();
        while (r.Read()) list.Add(Map(r));
        return list.ToArray();
    }

    private static RouteRecord Map(SqliteDataReader r) => new()
    {
        Id             = r.GetInt64(r.GetOrdinal("id")),
        CreatedAt      = r.GetString(r.GetOrdinal("created_at")),
        CarId          = r.GetString(r.GetOrdinal("car_id")),
        CarNumber      = r.GetString(r.GetOrdinal("car_number")),
        CarBrand       = r.GetString(r.GetOrdinal("car_brand")),
        CarModel       = r.GetString(r.GetOrdinal("car_model")),
        DriverLogin    = r.GetString(r.GetOrdinal("driver_login")),
        DriverName     = r.GetString(r.GetOrdinal("driver_name")),
        DriverSurname  = r.GetString(r.GetOrdinal("driver_surname")),
        FromLocation   = r.GetString(r.GetOrdinal("from_location")),
        ToLocation     = r.GetString(r.GetOrdinal("to_location")),
        Status         = r.GetString(r.GetOrdinal("status")),
        PreCheckupId   = r.IsDBNull(r.GetOrdinal("pre_checkup_id"))  ? null : r.GetInt64(r.GetOrdinal("pre_checkup_id")),
        PostCheckupId  = r.IsDBNull(r.GetOrdinal("post_checkup_id")) ? null : r.GetInt64(r.GetOrdinal("post_checkup_id")),
        DepartedAt     = r.IsDBNull(r.GetOrdinal("departed_at"))     ? null : r.GetString(r.GetOrdinal("departed_at")),
        ArrivedAt      = r.IsDBNull(r.GetOrdinal("arrived_at"))      ? null : r.GetString(r.GetOrdinal("arrived_at")),
    };

    private SqliteConnection Open()
    {
        var conn = new SqliteConnection(_connStr);
        conn.Open();
        return conn;
    }

    public sealed class RouteRecord
    {
        public long Id { get; set; }
        public string CreatedAt { get; set; } = "";
        public string CarId { get; set; } = "";
        public string CarNumber { get; set; } = "";
        public string CarBrand { get; set; } = "";
        public string CarModel { get; set; } = "";
        public string DriverLogin { get; set; } = "";
        public string DriverName { get; set; } = "";
        public string DriverSurname { get; set; } = "";
        public string FromLocation { get; set; } = "";
        public string ToLocation { get; set; } = "";
        public string Status { get; set; } = "active";
        public long? PreCheckupId { get; set; }
        public long? PostCheckupId { get; set; }
        public string? DepartedAt { get; set; }
        public string? ArrivedAt { get; set; }
    }
}
