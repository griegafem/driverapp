using ClosedXML.Excel;
using Microsoft.Data.Sqlite;

static string Clean(string? s) => (s ?? "").Trim();

static string NormalizeNumber(string? s) => Clean(s).ToUpperInvariant();

static void EnsureCarsTable(SqliteConnection conn)
{
    using var cmd = conn.CreateCommand();
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
  responsible TEXT NOT NULL DEFAULT ''
);
""";
    cmd.ExecuteNonQuery();
}

static int CountCars(SqliteConnection conn)
{
    using var cmd = conn.CreateCommand();
    cmd.CommandText = "SELECT COUNT(1) FROM cars;";
    return Convert.ToInt32(cmd.ExecuteScalar() ?? 0);
}

static void UpsertCar(
    SqliteConnection conn,
    string number,
    string brand,
    string model,
    string color,
    string vin,
    string year,
    string department,
    string responsible)
{
    using var cmd = conn.CreateCommand();
    cmd.CommandText = """
INSERT INTO cars (number, brand, model, color, vin, year, department, responsible)
VALUES ($number, $brand, $model, $color, $vin, $year, $department, $responsible)
ON CONFLICT(number) DO UPDATE SET
  brand = excluded.brand,
  model = excluded.model,
  color = excluded.color,
  vin = excluded.vin,
  year = excluded.year,
  department = excluded.department,
  responsible = excluded.responsible;
""";
    cmd.Parameters.AddWithValue("$number", number);
    cmd.Parameters.AddWithValue("$brand", brand);
    cmd.Parameters.AddWithValue("$model", model);
    cmd.Parameters.AddWithValue("$color", color);
    cmd.Parameters.AddWithValue("$vin", vin);
    cmd.Parameters.AddWithValue("$year", year);
    cmd.Parameters.AddWithValue("$department", department);
    cmd.Parameters.AddWithValue("$responsible", responsible);
    cmd.ExecuteNonQuery();
}

if (args.Length < 2)
{
    Console.Error.WriteLine("Usage: ImportCars <cars.xlsx path> <cars.db path>");
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
EnsureCarsTable(conn);

var before = CountCars(conn);
var imported = 0;
var skipped = 0;

using (var wb = new XLWorkbook(xlsxPath))
{
    var ws = wb.Worksheet(1);
    var last = ws.LastRowUsed()?.RowNumber() ?? 1;

    // IMPORTANT: For the provided legacy cars.xlsx, columns are shifted:
    // - "Марка" column contains the plate number we need as `number`
    // - "Цвет" column contains what we store as `brand`
    // - "VIN" column contains what we store as `model` (requested)
    // - We keep `color` empty and `vin` empty (requested)
    //
    // Best-effort positional mapping used here:
    // 1 (ignored), 2 Марка -> number, 4 VIN -> model, 5 Цвет -> brand
    for (var r = 2; r <= last; r++)
    {
        var number = NormalizeNumber(ws.Cell(r, 2).GetString());
        if (string.IsNullOrWhiteSpace(number))
        {
            skipped++;
            continue;
        }

        var brand = Clean(ws.Cell(r, 5).GetString());
        var model = Clean(ws.Cell(r, 4).GetString());
        var vin = "";
        var color = "";

        UpsertCar(conn, number, brand, model, color, vin, year: "", department: "", responsible: "");
        imported++;
    }
}

var after = CountCars(conn);
Console.WriteLine($"cars.db: {before} -> {after}");
Console.WriteLine($"Imported rows: {imported}, skipped: {skipped}");
return 0;

