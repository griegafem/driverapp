using Microsoft.Data.Sqlite;

public sealed class UserDb
{
    private readonly string _dbPath;

    public UserDb(string dbPath)
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

    public void EnsureCreatedAndSeed()
    {
        using var conn = new SqliteConnection(ConnString);
        conn.Open();

        using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = """
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  login TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  surname TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  patronymic TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT ''
);
""";
            cmd.ExecuteNonQuery();
        }

        // Seed admin/admin=1 (legacy bootstrap expected by the project).
        if (GetByLogin("admin") == null)
        {
            Upsert(new UserRecord
            {
                Id = 0,
                Login = "admin",
                Password = "1",
                Role = "admin",
                Surname = "Admin",
                Name = "Admin",
                Patronymic = "",
                Phone = ""
            });
        }
    }

    public sealed class UserRecord
    {
        public long Id { get; set; }
        public string Login { get; set; } = "";
        public string Password { get; set; } = "";
        public string Role { get; set; } = "user";
        public string Surname { get; set; } = "";
        public string Name { get; set; } = "";
        public string Patronymic { get; set; } = "";
        public string Phone { get; set; } = "";
    }

    public UserRecord? GetByLogin(string login)
    {
        if (string.IsNullOrWhiteSpace(login)) return null;
        using var conn = new SqliteConnection(ConnString);
        conn.Open();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
SELECT id, login, password, role, surname, name, patronymic, phone
FROM users
WHERE login = $login
LIMIT 1;
""";
        cmd.Parameters.AddWithValue("$login", login.Trim());
        using var r = cmd.ExecuteReader();
        if (!r.Read()) return null;

        return new UserRecord
        {
            Id = r.GetInt64(0),
            Login = r.GetString(1),
            Password = r.GetString(2),
            Role = r.GetString(3),
            Surname = r.GetString(4),
            Name = r.GetString(5),
            Patronymic = r.GetString(6),
            Phone = r.GetString(7)
        };
    }

    public UserRecord? GetById(long id)
    {
        if (id <= 0) return null;
        using var conn = new SqliteConnection(ConnString);
        conn.Open();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
SELECT id, login, password, role, surname, name, patronymic, phone
FROM users
WHERE id = $id
LIMIT 1;
""";
        cmd.Parameters.AddWithValue("$id", id);
        using var r = cmd.ExecuteReader();
        if (!r.Read()) return null;

        return new UserRecord
        {
            Id = r.GetInt64(0),
            Login = r.GetString(1),
            Password = r.GetString(2),
            Role = r.GetString(3),
            Surname = r.GetString(4),
            Name = r.GetString(5),
            Patronymic = r.GetString(6),
            Phone = r.GetString(7)
        };
    }

    public UserRecord[] GetAll()
    {
        using var conn = new SqliteConnection(ConnString);
        conn.Open();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
SELECT id, login, password, role, surname, name, patronymic, phone
FROM users
ORDER BY surname, name, patronymic, login;
""";

        using var r = cmd.ExecuteReader();
        var list = new List<UserRecord>();
        while (r.Read())
        {
            list.Add(new UserRecord
            {
                Id = r.GetInt64(0),
                Login = r.GetString(1),
                Password = r.GetString(2),
                Role = r.GetString(3),
                Surname = r.GetString(4),
                Name = r.GetString(5),
                Patronymic = r.GetString(6),
                Phone = r.GetString(7)
            });
        }
        return list.ToArray();
    }

    public void Upsert(UserRecord u)
    {
        using var conn = new SqliteConnection(ConnString);
        conn.Open();

        var login = (u.Login ?? "").Trim();
        var password = (u.Password ?? "").Trim();
        if (string.IsNullOrWhiteSpace(login) || string.IsNullOrWhiteSpace(password)) return;

        // Prefer stable updates by ID (edit flow), fallback to login-based upsert (add flow).
        if (u.Id > 0)
        {
            using var upd = conn.CreateCommand();
            upd.CommandText = """
UPDATE users SET
  login = $login,
  password = $password,
  role = $role,
  surname = $surname,
  name = $name,
  patronymic = $patronymic,
  phone = $phone
WHERE id = $id;
""";
            upd.Parameters.AddWithValue("$id", u.Id);
            upd.Parameters.AddWithValue("$login", login);
            upd.Parameters.AddWithValue("$password", password);
            upd.Parameters.AddWithValue("$role", NormalizeRole(u.Role));
            upd.Parameters.AddWithValue("$surname", (u.Surname ?? "").Trim());
            upd.Parameters.AddWithValue("$name", (u.Name ?? "").Trim());
            upd.Parameters.AddWithValue("$patronymic", (u.Patronymic ?? "").Trim());
            upd.Parameters.AddWithValue("$phone", (u.Phone ?? "").Trim());

            try
            {
                var changed = upd.ExecuteNonQuery();
                if (changed > 0) return;
            }
            catch
            {
                // fall back to login-based upsert below (e.g. unique constraint on login)
            }
        }

        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
INSERT INTO users (login, password, role, surname, name, patronymic, phone)
VALUES ($login, $password, $role, $surname, $name, $patronymic, $phone)
ON CONFLICT(login) DO UPDATE SET
  password = excluded.password,
  role = excluded.role,
  surname = excluded.surname,
  name = excluded.name,
  patronymic = excluded.patronymic,
  phone = excluded.phone;
""";
        cmd.Parameters.AddWithValue("$login", login);
        cmd.Parameters.AddWithValue("$password", password);
        cmd.Parameters.AddWithValue("$role", NormalizeRole(u.Role));
        cmd.Parameters.AddWithValue("$surname", (u.Surname ?? "").Trim());
        cmd.Parameters.AddWithValue("$name", (u.Name ?? "").Trim());
        cmd.Parameters.AddWithValue("$patronymic", (u.Patronymic ?? "").Trim());
        cmd.Parameters.AddWithValue("$phone", (u.Phone ?? "").Trim());

        cmd.ExecuteNonQuery();
    }

    public bool DeleteById(long id)
    {
        if (id <= 0) return false;
        using var conn = new SqliteConnection(ConnString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM users WHERE id = $id;";
        cmd.Parameters.AddWithValue("$id", id);
        return cmd.ExecuteNonQuery() > 0;
    }

    public static string NormalizeRole(string? role)
    {
        var r = (role ?? "").Trim().ToLowerInvariant();
        return r switch
        {
            "admin" => "admin",
            "driver" => "driver",
            "user" => "user",
            _ => "user"
        };
    }
}

