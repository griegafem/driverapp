using ClosedXML.Excel;
using Microsoft.Data.Sqlite;

static string Clean(string? s) => (s ?? "").Trim();

static string NormalizeRole(string? role)
{
    var r = Clean(role).ToLowerInvariant();
    return r switch
    {
        "admin" or "owner" => "admin",
        "driver" => "driver",
        "user" => "user",
        "пользователь" => "user",
        "водитель" => "driver",
        "админ" or "администратор" => "admin",
        _ => "user"
    };
}

static void EnsureUsersTable(SqliteConnection conn)
{
    using var cmd = conn.CreateCommand();
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

static int CountUsers(SqliteConnection conn)
{
    using var cmd = conn.CreateCommand();
    cmd.CommandText = "SELECT COUNT(1) FROM users;";
    return Convert.ToInt32(cmd.ExecuteScalar() ?? 0);
}

static void UpsertUser(
    SqliteConnection conn,
    string login,
    string password,
    string role,
    string surname,
    string name,
    string patronymic,
    string phone)
{
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
    cmd.Parameters.AddWithValue("$role", NormalizeRole(role));
    cmd.Parameters.AddWithValue("$surname", surname);
    cmd.Parameters.AddWithValue("$name", name);
    cmd.Parameters.AddWithValue("$patronymic", patronymic);
    cmd.Parameters.AddWithValue("$phone", phone);
    cmd.ExecuteNonQuery();
}

static Dictionary<string, int> BuildHeaderIndex(IXLWorksheet ws)
{
    var map = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
    var lastCol = ws.Row(1).LastCellUsed()?.Address.ColumnNumber ?? 0;
    for (var c = 1; c <= lastCol; c++)
    {
        var raw = Clean(ws.Cell(1, c).GetString());
        if (string.IsNullOrWhiteSpace(raw)) continue;
        var key = raw.Trim();
        if (!map.ContainsKey(key)) map[key] = c;
    }
    return map;
}

static int? Col(Dictionary<string, int> headers, params string[] variants)
{
    foreach (var v in variants)
    {
        if (headers.TryGetValue(v, out var idx)) return idx;
    }
    return null;
}

if (args.Length < 2)
{
    Console.Error.WriteLine("Usage: ImportUsers <users.xlsx path> <users.db path>");
    return 2;
}

var xlsxPath = Path.GetFullPath(args[0]);
var dbPath = Path.GetFullPath(args[1]);

if (!File.Exists(xlsxPath))
{
    Console.Error.WriteLine($"XLSX not found: {xlsxPath}");
    return 2;
}

Directory.CreateDirectory(Path.GetDirectoryName(dbPath)!);

var connString = new SqliteConnectionStringBuilder
{
    DataSource = dbPath,
    ForeignKeys = true,
    Mode = SqliteOpenMode.ReadWriteCreate,
    Cache = SqliteCacheMode.Shared
}.ToString();

using var conn = new SqliteConnection(connString);
conn.Open();
EnsureUsersTable(conn);

var before = CountUsers(conn);
var imported = 0;
var skipped = 0;

using (var wb = new XLWorkbook(xlsxPath))
{
    var ws = wb.Worksheet(1);
    var lastRow = ws.LastRowUsed()?.RowNumber() ?? 1;
    if (lastRow <= 1)
    {
        Console.WriteLine("No data rows found.");
        return 0;
    }

    var headers = BuildHeaderIndex(ws);

    // Header-based mapping (preferred).
    var cLogin = Col(headers, "login", "Login", "логин", "Логин");
    var cPassword = Col(headers, "password", "Password", "пароль", "Пароль");
    var cRole = Col(headers, "role", "Role", "роль", "Роль");
    var cSurname = Col(headers, "surname", "Surname", "фамилия", "Фамилия");
    var cName = Col(headers, "name", "Name", "имя", "Имя");
    var cPatronymic = Col(headers, "patronymic", "Patronymic", "отчество", "Отчество");
    var cPhone = Col(headers, "phone", "Phone", "телефон", "Телефон");

    // Fallback to legacy positional columns:
    // 1 surname, 2 name, 3 patronymic, 4 role, 5 login, 6 password, 7 phone
    bool usePositional = cLogin == null || cPassword == null;

    for (var r = 2; r <= lastRow; r++)
    {
        string Read(int row, int col) => Clean(ws.Cell(row, col).GetString());

        string login, password, role, surname, name, patronymic, phone;
        if (usePositional)
        {
            surname = Read(r, 1);
            name = Read(r, 2);
            patronymic = Read(r, 3);
            role = Read(r, 4);
            login = Read(r, 5);
            password = Read(r, 6);
            phone = Read(r, 7);
        }
        else
        {
            login = cLogin.HasValue ? Read(r, cLogin.Value) : "";
            password = cPassword.HasValue ? Read(r, cPassword.Value) : "";
            role = cRole.HasValue ? Read(r, cRole.Value) : "user";
            surname = cSurname.HasValue ? Read(r, cSurname.Value) : "";
            name = cName.HasValue ? Read(r, cName.Value) : "";
            patronymic = cPatronymic.HasValue ? Read(r, cPatronymic.Value) : "";
            phone = cPhone.HasValue ? Read(r, cPhone.Value) : "";
        }

        login = Clean(login);
        password = Clean(password);
        if (string.IsNullOrWhiteSpace(login) || string.IsNullOrWhiteSpace(password))
        {
            skipped++;
            continue;
        }

        UpsertUser(conn,
            login: login,
            password: password,
            role: role,
            surname: surname,
            name: name,
            patronymic: patronymic,
            phone: phone);
        imported++;
    }
}

var after = CountUsers(conn);
Console.WriteLine($"users.db: {before} -> {after}");
Console.WriteLine($"Imported rows: {imported}, skipped: {skipped}");
return 0;

