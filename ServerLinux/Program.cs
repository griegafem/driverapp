using ClosedXML.Excel;
using Microsoft.Extensions.FileProviders;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Net;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRouting();

var app = builder.Build();

var contentRoot = app.Environment.ContentRootPath;
var repoRootCandidate = Path.GetFullPath(Path.Combine(contentRoot, ".."));
// In a published/Docker layout ContentRoot is already the app folder.
// In dev, ContentRoot is ServerLinux/ and repo root is its parent.
var repoRoot =
    Directory.Exists(Path.Combine(repoRootCandidate, "Client"))
        ? repoRootCandidate
        : contentRoot;

static string GetDataRoot(string contentRoot, string repoRoot)
{
    var env = Environment.GetEnvironmentVariable("MOTORSHARKS_DATA_DIR");
    if (!string.IsNullOrWhiteSpace(env)) return Path.GetFullPath(env);

    // Default for dev (repo) and for container/publish (content root).
    var repoData = Path.Combine(repoRoot, "data");
    if (Directory.Exists(repoData)) return repoData;

    return Path.Combine(contentRoot, "data");
}

var dataRoot = GetDataRoot(contentRoot, repoRoot);
Directory.CreateDirectory(dataRoot);

var photoRoot = Path.Combine(dataRoot, "Photo");
Directory.CreateDirectory(photoRoot);

EnsureLocalAssets(repoRoot, dataRoot);

var driverApp = new DriverAppProvider();
driverApp.SetCheckUpTable(Path.Combine(dataRoot, "checkups.xlsx"));
driverApp.SetPostCheckUpTable(Path.Combine(dataRoot, "post_checkups.xlsx"));
driverApp.SetRandomTable(Path.Combine(dataRoot, "random.xlsx"));

var userDb = new UserDb(Path.Combine(dataRoot, "users.db"));
userDb.EnsureCreatedAndSeed();
var sessionStore = new SessionStore(Path.Combine(dataRoot, "sessionstorage"));

var carDb = new CarDb(Path.Combine(dataRoot, "cars.db"));
carDb.EnsureCreatedAndSeed();
TryMigrateCarsFromExcelAndDelete(dataRoot, carDb);

// Health
app.MapGet("/test", () => Results.Text("OK"));

// Support links page
app.MapGet("/help", () =>
{
    var html = """
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Техподдержка</title>
  <style>
    :root{
      --bg:#f7f7f7;
      --card:#ffffff;
      --text:#111827;
      --muted:#6b7280;
      --border:#e5e7eb;
      --shadow:0 16px 44px rgba(17,24,39,0.12);
      --radius:16px;
      --accent:#2563eb;
    }
    html,body{ height:100%; }
    body{
      margin:0;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      background:var(--bg);
      color:var(--text);
      display:flex;
      align-items:flex-start;
      justify-content:center;
      padding:18px;
      line-height:1.55;
    }
    .wrap{
      width:min(520px, 100%);
      margin-top:10vh;
      text-align:center;
    }
    .logo{
      width:120px; height:120px;
      border-radius:28px;
      object-fit:contain;
      background:#fff;
      box-shadow:var(--shadow);
    }
    .card{
      margin-top:22px;
      background:var(--card);
      border:1px solid var(--border);
      border-radius:var(--radius);
      box-shadow:0 10px 26px rgba(17,24,39,0.10);
      padding:18px;
      text-align:left;
    }
    h1{
      font-size:18px;
      margin:0 0 6px 0;
    }
    p{ margin:0 0 14px 0; color:var(--muted); font-size:14px; }
    .grid{ display:grid; gap:10px; }
    a.btn{
      display:flex;
      align-items:center;
      justify-content:center;
      gap:10px;
      padding:12px 14px;
      border-radius:14px;
      text-decoration:none;
      background:var(--accent);
      color:#fff;
      border:1px solid rgba(37,99,235,0.22);
      transition: filter 160ms ease, transform 160ms ease, box-shadow 160ms ease;
      box-shadow:0 10px 26px rgba(37,99,235,0.22);
      font-weight:600;
    }
    a.btn:hover{ filter:brightness(0.95); box-shadow:0 14px 32px rgba(37,99,235,0.26); }
    a.btn:active{ transform:translateY(1px) scale(0.99); filter:brightness(0.9); }
    .hint{ margin-top:12px; font-size:12px; color:var(--muted); text-align:center; }
  </style>
</head>
<body>
  <div class="wrap">
    <img class="logo" src="/driver-app/assets/logo.png" alt="Motorsharks" />
    <div class="card">
      <h1>Техподдержка</h1>
      <p>Выберите удобный канал связи.</p>
      <div class="grid">
        <a class="btn" href="https://t.me/MYGaluev" target="_blank" rel="noreferrer">Telegram @MYGaluev</a>
        <a class="btn" href="https://max.ru/u/f9LHodD0cOJ3DcJeZVA5I03gITNYuxRVnfnsgHIzIhWxJgHyo7Eu_UiJOM0" target="_blank" rel="noreferrer">Max</a>
        <a class="btn" href="mailto:MYGaluev@mail.ru">Email</a>
        <a class="btn" href="/driver-app/">← Вернуться в приложение</a>
      </div>
      <div class="hint">Если ссылки не открываются внутри WebApp — откройте в браузере.</div>
    </div>
  </div>
</body>
</html>
""";

    return Results.Text(html, "text/html; charset=utf-8");
});

// Static driver app (from Client/)
var clientDirCandidates = new[]
{
    Path.Combine(repoRoot, "Client"),
    Path.Combine(contentRoot, "Client"),
    Path.Combine(contentRoot, "..", "Client"),
}.Select(Path.GetFullPath).ToArray();

var clientDir = clientDirCandidates.FirstOrDefault(Directory.Exists);
if (Directory.Exists(clientDir))
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(clientDir),
        RequestPath = "/driver-app"
    });

    app.MapGet("/driver-app/", () => Results.File(Path.Combine(clientDir, "index.html"), "text/html; charset=utf-8"));
}
else
{
    app.MapGet("/driver-app/", () => Results.Problem("Client folder not found"));
}

// Minimal API used by client
app.MapGet("/api/cars", () =>
{
    try
    {
        static string? Clean(string? s)
        {
            if (string.IsNullOrWhiteSpace(s)) return null;
            return s.Trim();
        }

        var cars = carDb.GetAll();

        var payload = JsonConvert.SerializeObject(new
        {
            status = "ok",
            cars = cars
                .Where(c => !string.IsNullOrWhiteSpace(c.Number))
                .Select(c => new
                {
                    plateNumber = Clean(c.Number)?.ToUpperInvariant(),
                    brand = Clean(c.Brand),
                    model = Clean(c.Model),
                    vin = Clean(c.Vin),
                    year = Clean(c.Year),
                    department = Clean(c.Department),
                    responsible = Clean(c.Responsible),
                })
                .ToArray()
        });

        return Results.Text(payload, "application/json; charset=utf-8");
    }
    catch (Exception ex)
    {
        return Results.Text(JsonConvert.SerializeObject(new { status = "error", error = "CARS_READ_ERROR", message = ex.Message }), "application/json; charset=utf-8");
    }
});

static IResult CarsForbidden() =>
    Results.Text(JsonConvert.SerializeObject(new { status = "error", error = "FORBIDDEN" }), "application/json; charset=utf-8");

app.MapGet("/api/admin/cars", (HttpRequest request) =>
{
    var session = request.Query["session"].ToString();
    var admin = RequireAdmin(userDb, sessionStore, session);
    if (admin == null) return CarsForbidden();

    var cars = carDb.GetAll()
        .Select(c => new
        {
            id = c.Id,
            number = c.Number ?? "",
            brand = c.Brand ?? "",
            model = c.Model ?? "",
            color = c.Color ?? "",
            vin = c.Vin ?? "",
            year = c.Year ?? "",
            department = c.Department ?? "",
            responsible = c.Responsible ?? "",
        })
        .ToArray();

    return Results.Text(JsonConvert.SerializeObject(new { status = "ok", cars }), "application/json; charset=utf-8");
});

app.MapPost("/api/admin/cars/upsert", async (HttpRequest request) =>
{
    var body = await ReadBodyAsync(request);
    dynamic root = JObject.Parse(body);
    var session = (string?)root.session ?? "";
    var admin = RequireAdmin(userDb, sessionStore, session);
    if (admin == null) return CarsForbidden();

    dynamic c = root.car;
    string GetStr(dynamic d, string key) => ((string?)d?[key] ?? "").Trim();
    var id = (long?)c.id ?? 0;
    var number = GetStr(c, "number");
    if (string.IsNullOrWhiteSpace(number))
        return Results.Text(JsonConvert.SerializeObject(new { status = "error", error = "BAD_DATA" }), "application/json; charset=utf-8");

    carDb.Upsert(new CarDb.CarRecord
    {
        Id = id,
        Number = number,
        Brand = GetStr(c, "brand"),
        Model = GetStr(c, "model"),
        Color = GetStr(c, "color"),
        Vin = GetStr(c, "vin"),
        Year = GetStr(c, "year"),
        Department = GetStr(c, "department"),
        Responsible = GetStr(c, "responsible"),
    });

    return Results.Text(JsonConvert.SerializeObject(new { status = "ok" }), "application/json; charset=utf-8");
});

app.MapPost("/api/admin/cars/delete", async (HttpRequest request) =>
{
    var body = await ReadBodyAsync(request);
    dynamic root = JObject.Parse(body);
    var session = (string?)root.session ?? "";
    var admin = RequireAdmin(userDb, sessionStore, session);
    if (admin == null) return CarsForbidden();

    var id = (long?)root.id;
    if (id == null || id <= 0)
        return Results.Text(JsonConvert.SerializeObject(new { status = "error", error = "BAD_ID" }), "application/json; charset=utf-8");

    var deleted = carDb.DeleteById(id.Value);
    return Results.Text(JsonConvert.SerializeObject(new { status = "ok", deleted }), "application/json; charset=utf-8");
});

static bool IsAdminRole(string? role)
{
    var r = (role ?? "").Trim().ToLowerInvariant();
    return r is "admin" or "owner";
}

static UserDb.UserRecord? RequireAdmin(UserDb userDb, SessionStore sessions, string session)
{
    if (string.IsNullOrWhiteSpace(session)) return null;
    var login = sessions.GetLogin(session);
    if (string.IsNullOrWhiteSpace(login)) return null;
    var u = userDb.GetByLogin(login);
    if (u == null) return null;
    return IsAdminRole(u.Role) ? u : null;
}

static IResult UsersForbidden() =>
    Results.Text(JsonConvert.SerializeObject(new { status = "error", error = "FORBIDDEN" }), "application/json; charset=utf-8");

app.MapGet("/api/users", (HttpRequest request) =>
{
    var session = request.Query["session"].ToString();
    var admin = RequireAdmin(userDb, sessionStore, session);
    if (admin == null) return UsersForbidden();

    var users = userDb.GetAll()
        .Select(u => new
        {
            id = u.Id,
            surname = u.Surname ?? "",
            name = u.Name ?? "",
            patronymic = u.Patronymic ?? "",
            phone = u.Phone ?? "",
            role = (u.Role ?? "").ToLowerInvariant(),
            login = u.Login ?? "",
            password = u.Password ?? "",
        })
        .ToArray();

    return Results.Text(JsonConvert.SerializeObject(new { status = "ok", users }), "application/json; charset=utf-8");
});

app.MapPost("/api/users/upsert", async (HttpRequest request) =>
{
    var body = await ReadBodyAsync(request);
    dynamic root = JObject.Parse(body);
    var session = (string?)root.session ?? "";
    var admin = RequireAdmin(userDb, sessionStore, session);
    if (admin == null) return UsersForbidden();

    dynamic u = root.user;
    string GetStr(dynamic d, string key) => ((string?)d?[key] ?? "").Trim();
    var id = (long?)u.id ?? 0;
    var login = GetStr(u, "login");
    var password = GetStr(u, "password");
    if (string.IsNullOrWhiteSpace(login) || string.IsNullOrWhiteSpace(password))
        return Results.Text(JsonConvert.SerializeObject(new { status = "error", error = "BAD_DATA" }), "application/json; charset=utf-8");

    userDb.Upsert(new UserDb.UserRecord
    {
        Id = id,
        Login = login,
        Password = password,
        Role = UserDb.NormalizeRole(GetStr(u, "role")),
        Surname = GetStr(u, "surname"),
        Name = GetStr(u, "name"),
        Patronymic = GetStr(u, "patronymic"),
        Phone = GetStr(u, "phone"),
    });

    return Results.Text(JsonConvert.SerializeObject(new { status = "ok" }), "application/json; charset=utf-8");
});

app.MapPost("/api/users/delete", async (HttpRequest request) =>
{
    var body = await ReadBodyAsync(request);
    dynamic root = JObject.Parse(body);
    var session = (string?)root.session ?? "";
    var admin = RequireAdmin(userDb, sessionStore, session);
    if (admin == null) return UsersForbidden();

    var id = (long?)root.id;
    if (id == null || id <= 0)
        return Results.Text(JsonConvert.SerializeObject(new { status = "error", error = "BAD_ID" }), "application/json; charset=utf-8");

    var deleted = userDb.DeleteById(id.Value);
    return Results.Text(JsonConvert.SerializeObject(new { status = "ok", deleted }), "application/json; charset=utf-8");
});

app.MapPost("/api/get-car", async (HttpRequest request) =>
{
    var body = await ReadBodyAsync(request);
    var obj = JObject.Parse(body);
    var number = (string?)obj["number"];
    if (string.IsNullOrWhiteSpace(number)) return Results.Text("CAR_NOT_FOUND");

    var car = carDb.GetByNumber(number);
    if (car == null) return Results.Text("CAR_NOT_FOUND");

    var result = JsonConvert.SerializeObject(new { brand = car.Brand, model = car.Model });
    return Results.Text(result, "application/json; charset=utf-8");
});

app.MapPost("/api/login", async (HttpRequest request) =>
{
    var body = await ReadBodyAsync(request);
    var obj = JObject.Parse(body);

    var login = (string?)obj["login"];
    var password = (string?)obj["password"];

    var user = userDb.GetByLogin(login ?? "");
    if (user == null)
    {
        return Results.Text(JsonConvert.SerializeObject(new { status = "error", error = "USER_NOT_FOUND" }), "application/json; charset=utf-8");
    }

    if (!string.Equals(user.Password ?? "", password ?? "", StringComparison.Ordinal))
        return Results.Text(JsonConvert.SerializeObject(new { status = "error", error = "WRONG_DATA" }), "application/json; charset=utf-8");

    var session = sessionStore.Create(user.Login);

    string access_key = "";
    if (IsAdminRole(user.Role))
    {
        access_key = driverApp.CreateAccessKey();
    }

    var payload = JsonConvert.SerializeObject(new
    {
        status = "ok",
        name = user.Name,
        surname = user.Surname,
        role = (user.Role ?? "").ToLowerInvariant(),
        access_key,
        session,
        random_wheel = "",
        photoday = ""
    });

    return Results.Text(payload, "application/json; charset=utf-8");
});

app.MapPost("/api/authorize", async (HttpRequest request) =>
{
    var body = await ReadBodyAsync(request);
    var obj = JObject.Parse(body);

    var session = (string?)obj["session"];
    if (string.IsNullOrWhiteSpace(session))
    {
        return Results.Text("{\"status\":\"error\"}", "application/json; charset=utf-8");
    }

    var login = sessionStore.GetLogin(session);
    var user = string.IsNullOrWhiteSpace(login) ? null : userDb.GetByLogin(login);
    if (user == null)
    {
        return Results.Text(JsonConvert.SerializeObject(new { status = "error", error = "USER_NOT_FOUND" }), "application/json; charset=utf-8");
    }

    string access_key = "";
    if (IsAdminRole(user.Role))
    {
        access_key = driverApp.CreateAccessKey();
    }

    var payload = JsonConvert.SerializeObject(new
    {
        status = "ok",
        name = user.Name,
        surname = user.Surname,
        role = (user.Role ?? "").ToLowerInvariant(),
        access_key,
        random_wheel = "",
        photoday = ""
    });

    return Results.Text(payload, "application/json; charset=utf-8");
});

app.MapGet("/api/get-tables", (HttpRequest request) =>
{
    var accessKey = request.Query["l"].ToString();
    var zip = driverApp.GetTables(accessKey);
    if (zip == null) return Results.Text("Ошибка доступа", "text/plain; charset=utf-8");

    return Results.File(zip, "application/zip", fileDownloadName: "checkups.zip");
});

app.MapPost("/api/get-access", async (HttpRequest request) =>
{
    // Legacy behaviour: just accept and log.
    var body = await ReadBodyAsync(request);
    try
    {
        var obj = JObject.Parse(body);
        var userId = (int?)obj["user"]?["id"];
        var username = (string?)obj["user"]?["username"] ?? "-";
        var fio = (string?)obj["name"] ?? "-";
        Console.WriteLine($"\n=====ACCESS-REQUEST=====\nUserID: {userId}\nUsername: {username}\nFIO: {fio}\n================");
    }
    catch { }

    return Results.Text(JsonConvert.SerializeObject(new { status = "ok" }), "application/json; charset=utf-8");
});

app.MapPost("/api/pre-checkup", async (HttpRequest request) =>
{
    var body = await ReadBodyAsync(request);
    dynamic root = JObject.Parse(body);
    var session = (string?)root.session;
    var login = sessionStore.GetLogin(session);
    var user = string.IsNullOrWhiteSpace(login) ? null : userDb.GetByLogin(login);
    if (user == null) return Results.Text("");

    dynamic obj = root.data;

    var carRec = carDb.GetByNumber((string?)obj.number);
    DriverAppProvider.Car car = new();
    if (carRec != null)
    {
        car.number = carRec.Number;
        car.brand = carRec.Brand;
        car.model = carRec.Model;
        car.vin = carRec.Vin;
        car.color = carRec.Color;
        car.year = carRec.Year;
        car.department = carRec.Department;
        car.responsible = carRec.Responsible;
    }

    var row = new ExcelProvider.Row();

    row.Add("Дата записи", (string?)obj.date ?? "");
    row.Add("Время завершения отчёта", (string?)obj.date_2 ?? (string?)obj.date ?? "");
    row.Add("Фамилия пользователя", user.Surname);
    row.Add("Имя пользователя", user.Name);
    row.Add("Тип отчёта", (string?)obj.type ?? "");
    row.Add("ID автомобиля", (string?)obj.car_id ?? "");
    row.Add("Марка автомобиля", car.brand);
    row.Add("Модель автомобиля", car.model);
    row.Add("Госномер", car.number);
    row.Add("Тип ТС", (string?)obj.car_type ?? "");
    row.Add("Пробег", (string?)obj.mileage ?? "");
    row.Add("Геолокация", (string?)obj.geo ?? "");
    row.Add("Уровень моторного масла проверен", "Да");
    row.Add("Уровень моторного масла", (string?)obj.oil_level ?? "");
    row.Add("Уровень антифриза в норме", (string?)obj.antifreeze_ok ?? "");
    row.Add("Тормозная жидкость", (string?)obj.brakefluid_level ?? "");
    row.Add("Омывающая жидкость", (string?)obj.glasswasher_ok ?? "");
    row.Add("Пожелания по авто", (string?)obj.additional_info ?? "");
    row.Add("Критические замечания", (string?)obj.critical_info ?? "");
    row.Add("Уровень топлива", (string?)obj.fuel_level ?? "");
    row.Add("Авто чистый", (string?)obj.clean_ok ?? "");
    row.Add("Салон проверен и чист", (string?)obj.interior_ok ?? "");
    row.Add("Wifi", (string?)obj.wifi ?? "");
    row.Add("VPN", (string?)obj.vpn ?? "");

    TryAddPhoto(row, "Фото пробега", (string?)obj.photo_mileage, car, "Фото пробега", dataRoot);
    TryAddPhoto(row, "Фото передний левый угол", (string?)obj.photo_rl, car, "Фото передний левый угол", dataRoot);
    TryAddPhoto(row, "Фото передний правый угол", (string?)obj.photo_rr, car, "Фото передний правый угол", dataRoot);
    TryAddPhoto(row, "Фото задний правый угол", (string?)obj.photo_br, car, "Фото задний правый угол", dataRoot);
    TryAddPhoto(row, "Фото задний левый угол", (string?)obj.photo_bl, car, "Фото задний левый угол", dataRoot);
    TryAddPhoto(row, "Фото спереди", (string?)obj.photo_r, car, "Фото спереди", dataRoot);
    TryAddPhoto(row, "Фото задняя часть", (string?)obj.photo_b, car, "Фото задняя часть", dataRoot);
    TryAddPhoto(row, "Фото левая сторона", (string?)obj.photo_l, car, "Фото левая сторона", dataRoot);
    TryAddPhoto(row, "Фото правая сторона", (string?)obj.photo_rg, car, "Фото правая сторона", dataRoot);
    TryAddPhoto(row, "Фото открытая передняя левая дверь", (string?)obj.photo_irl, car, "Фото открытая передняя левая дверь", dataRoot);
    TryAddPhoto(row, "Фото открытая передняя правая дверь", (string?)obj.photo_irr, car, "Фото открытая передняя правая дверь", dataRoot);
    TryAddPhoto(row, "Фото открытая задняя правая дверь", (string?)obj.photo_ibr, car, "Фото открытая задняя правая дверь", dataRoot);
    TryAddPhoto(row, "Фото открытая задняя левая дверь", (string?)obj.photo_ibl, car, "Фото открытая задняя левая дверь", dataRoot);
    TryAddPhoto(row, "Фото дня", (string?)obj.photo_of_day, car, "Фото дня", dataRoot);

    driverApp.AddCheckUp(row);

    return Results.Text(JsonConvert.SerializeObject(new { status = "ok" }), "application/json; charset=utf-8");
});

app.MapPost("/api/post-checkup", async (HttpRequest request) =>
{
    var body = await ReadBodyAsync(request);
    dynamic root = JObject.Parse(body);
    var session = (string?)root.session;
    var login = sessionStore.GetLogin(session);
    var user = string.IsNullOrWhiteSpace(login) ? null : userDb.GetByLogin(login);
    if (user == null) return Results.Text("");

    dynamic obj = root.data;

    var carRec = carDb.GetByNumber((string?)obj.number);
    DriverAppProvider.Car car = new();
    if (carRec != null)
    {
        car.number = carRec.Number;
        car.brand = carRec.Brand;
        car.model = carRec.Model;
        car.vin = carRec.Vin;
        car.color = carRec.Color;
        car.year = carRec.Year;
        car.department = carRec.Department;
        car.responsible = carRec.Responsible;
    }

    var row = new ExcelProvider.Row();

    row.Add("Дата записи", (string?)obj.date ?? "");
    row.Add("Время завершения отчёта", DateTime.Now.ToString());
    row.Add("Фамилия пользователя", user.Surname);
    row.Add("Имя пользователя", user.Name);
    row.Add("Тип отчёта", (string?)obj.type ?? "");
    row.Add("ID автомобиля", (string?)obj.car_id ?? "");
    row.Add("Марка автомобиля", car.brand);
    row.Add("Модель автомобиля", car.model);
    row.Add("Госномер", car.number);
    row.Add("Тип ТС", (string?)obj.car_type ?? "");
    row.Add("Пробег", (string?)obj.mileage ?? "");
    row.Add("Геолокация", (string?)obj.geo ?? "");
    row.Add("Уровень моторного масла проверен", "Да");
    row.Add("Уровень моторного масла", (string?)obj.oil_level ?? "");
    row.Add("Уровень антифриза в норме", (string?)obj.antifreeze_ok ?? "");
    row.Add("Тормозная жидкость", (string?)obj.brakefluid_level ?? "");
    row.Add("Омывающая жидкость", (string?)obj.glasswasher_ok ?? "");
    row.Add("Пожелания по авто", (string?)obj.additional_info ?? "");
    row.Add("Критические замечания", (string?)obj.critical_info ?? "");
    row.Add("Уровень топлива", (string?)obj.fuel_level ?? "");
    row.Add("Авто чистый", (string?)obj.clean_ok ?? "");
    row.Add("Салон проверен и чист", (string?)obj.interior_ok ?? "");
    row.Add("Wifi", (string?)obj.wifi ?? "");
    row.Add("VPN", (string?)obj.vpn ?? "");
    row.Add("Локация", (string?)obj.location ?? "");

    TryAddPhoto(row, "Фото пробега", (string?)obj.photo_mileage, car, "По приезду Фото пробега", dataRoot);
    TryAddPhoto(row, "Фото передний левый угол", (string?)obj.photo_rl, car, "По приезду Фото передний левый угол", dataRoot);
    TryAddPhoto(row, "Фото передний правый угол", (string?)obj.photo_rr, car, "По приезду Фото передний правый угол", dataRoot);
    TryAddPhoto(row, "Фото задний правый угол", (string?)obj.photo_br, car, "По приезду Фото задний правый угол", dataRoot);
    TryAddPhoto(row, "Фото задний левый угол", (string?)obj.photo_bl, car, "По приезду Фото задний левый угол", dataRoot);
    TryAddPhoto(row, "Фото спереди", (string?)obj.photo_r, car, "По приезду Фото спереди", dataRoot);
    TryAddPhoto(row, "Фото задняя часть", (string?)obj.photo_b, car, "По приезду Фото задняя часть", dataRoot);
    TryAddPhoto(row, "Фото левая сторона", (string?)obj.photo_l, car, "По приезду Фото левая сторона", dataRoot);
    TryAddPhoto(row, "Фото правая сторона", (string?)obj.photo_rg, car, "По приезду Фото правая сторона", dataRoot);
    TryAddPhoto(row, "Фото открытая передняя левая дверь", (string?)obj.photo_irl, car, "По приезду Фото открытая передняя левая дверь", dataRoot);
    TryAddPhoto(row, "Фото открытая передняя правая дверь", (string?)obj.photo_irr, car, "По приезду Фото открытая передняя правая дверь", dataRoot);
    TryAddPhoto(row, "Фото открытая задняя правая дверь", (string?)obj.photo_ibr, car, "По приезду Фото открытая задняя правая дверь", dataRoot);
    TryAddPhoto(row, "Фото открытая задняя левая дверь", (string?)obj.photo_ibl, car, "По приезду Фото открытая задняя левая дверь", dataRoot);
    TryAddPhoto(row, "Фото дня", (string?)obj.photo_of_day, car, "По приезду Фото дня", dataRoot);
    TryAddPhoto(row, "Фото повреждения", (string?)obj.damage_photo, car, "По приезду Повреждение", dataRoot);

    driverApp.AddPostCheckUp(row);

    return Results.Text(JsonConvert.SerializeObject(new { status = "ok" }), "application/json; charset=utf-8");
});

app.MapGet("/api/get-photo", (HttpRequest request) =>
{
    var key = request.Query["id"].ToString();
    if (string.IsNullOrWhiteSpace(key)) return Results.Text("Фото не найдено", "text/plain; charset=utf-8");

    var relPath = Base36Converter.DecodeToUTF(key);
    if (string.IsNullOrWhiteSpace(relPath)) return Results.Text("Фото не найдено", "text/plain; charset=utf-8");

    var fullPath = Path.GetFullPath(Path.Combine(dataRoot, relPath));
    if (!fullPath.StartsWith(dataRoot, StringComparison.OrdinalIgnoreCase)) return Results.Text("Фото не найдено", "text/plain; charset=utf-8");
    if (!System.IO.File.Exists(fullPath)) return Results.Text("Фото не найдено", "text/plain; charset=utf-8");

    return Results.File(fullPath, "image/jpeg");
});

app.MapGet("/driver-app/pre-checkups", () =>
{
    var checkUps = driverApp.GetCheckups();
    return Results.Text(RenderTableHtml("Осмотры", checkUps), "text/html; charset=utf-8");
});

app.MapGet("/driver-app/post-checkups", () =>
{
    var checkUps = driverApp.GetPostCheckups();
    return Results.Text(RenderTableHtml("Осмотры", checkUps), "text/html; charset=utf-8");
});

app.MapGet("/", () => Results.Redirect("/driver-app/"));

app.Run();

static async Task<string> ReadBodyAsync(HttpRequest request)
{
    using var reader = new StreamReader(request.Body, Encoding.UTF8);
    var body = (await reader.ReadToEndAsync()).Trim();

    // Some clients/tools may send a JSON string that contains JSON (e.g. "\"{...}\"").
    // Normalize that to raw JSON so JObject.Parse works.
    if (body.Length >= 2 && body[0] == '"' && body[^1] == '"')
    {
        try
        {
            var unwrapped = JsonConvert.DeserializeObject<string>(body);
            if (!string.IsNullOrWhiteSpace(unwrapped)) body = unwrapped.Trim();
        }
        catch { }
    }

    return body;
}

static void TryAddPhoto(ExcelProvider.Row row, string columnName, string? dataUri, DriverAppProvider.Car car, string detail, string dataRoot)
{
    if (string.IsNullOrWhiteSpace(dataUri)) return;
    try
    {
        var id = SavePicture(dataUri, car, detail, dataRoot);
        row.Add(columnName, $"/api/get-photo?id={id}");
    }
    catch { }
}

static string SavePicture(string dataUri, DriverAppProvider.Car car, string detail, string dataRoot)
{
    var base64Data = dataUri.Split(',')[1];
    var fileBytes = Convert.FromBase64String(base64Data);

    var key = Guid.NewGuid().ToString().ToLowerInvariant().Replace("-", "");
    var datetime = DateTime.Now;

    var safeBrand = (car.brand ?? "").Replace("/", "_").Replace("\\", "_");
    var safeModel = (car.model ?? "").Replace("/", "_").Replace("\\", "_");
    var safeNumber = (car.number ?? "").Replace("/", "_").Replace("\\", "_");

    var directory = Path.Combine("Photo", datetime.Year.ToString(), datetime.ToString("MMMM"), datetime.ToShortDateString(), $"{safeBrand}_{safeModel}_{safeNumber}");
    var relPath = Path.Combine(directory, $"{detail}_{datetime.Ticks}.jpg");

    var fullDir = Path.GetDirectoryName(Path.Combine(dataRoot, relPath))!;
    Directory.CreateDirectory(fullDir);

    var fullPath = Path.Combine(dataRoot, relPath);
    File.WriteAllBytes(fullPath, fileBytes);

    // Keep legacy-compatible encoded id (posix-like path expected by Base36Converter).
    var relPathForId = relPath.Replace("\\", "/");
    return Base36Converter.Encode(relPathForId);
}

static string RenderTableHtml(string title, ExcelProvider.Row[] rows)
{
    if (rows.Length == 0)
    {
        return "<html><body><h2>Нет данных</h2></body></html>";
    }

    var sb = new StringBuilder();
    sb.Append(@"
<!DOCTYPE html>
<html lang='ru'>
<head>
<meta charset='UTF-8'>
<meta name='viewport' content='width=device-width, initial-scale=1.0'>
<title>Осмотры</title>
<style>
body { font-family: Arial; background:#f5f5f5; margin:0; padding:20px; }
table { border-collapse: collapse; width:100%; background:#fff; }
th, td { border:1px solid #ddd; padding:8px; font-size:12px; text-align:left; }
th { background:#222; color:#fff; position:sticky; top:0; }
tr:nth-child(even){ background:#f9f9f9; }
img { max-width:100px; }
</style>
</head>
<body>
");
    sb.AppendLine($"<h2>{WebUtility.HtmlEncode(title)}</h2>");
    sb.AppendLine("<table><tr>");
    foreach (var key in rows[0].Keys) sb.AppendLine($"<th>{WebUtility.HtmlEncode(key)}</th>");
    sb.AppendLine("</tr>");

    foreach (var r in rows)
    {
        sb.AppendLine("<tr>");
        foreach (var item in r)
        {
            var value = item.Value ?? "";
            if (value.StartsWith("/api/get-photo?id=", StringComparison.OrdinalIgnoreCase))
            {
                sb.AppendLine($"<td><img src='{WebUtility.HtmlEncode(value)}' /></td>");
            }
            else
            {
                sb.AppendLine($"<td>{WebUtility.HtmlEncode(value)}</td>");
            }
        }
        sb.AppendLine("</tr>");
    }

    sb.AppendLine("</table></body></html>");
    return sb.ToString();
}

static void EnsureLocalAssets(string repoRoot, string dataRoot)
{
    var checkupHeaders = new[]
    {
        "Дата записи",
        "Время завершения отчёта",
        "Фамилия пользователя",
        "Имя пользователя",
        "Тип отчёта",
        "ID автомобиля",
        "Марка автомобиля",
        "Модель автомобиля",
        "Госномер",
        "Тип ТС",
        "Пробег",
        "Геолокация",
        "Уровень моторного масла проверен",
        "Уровень моторного масла",
        "Уровень антифриза в норме",
        "Тормозная жидкость",
        "Омывающая жидкость",
        "Пожелания по авто",
        "Критические замечания",
        "Уровень топлива",
        "Авто чистый",
        "Салон проверен и чист",
        "Wifi",
        "VPN",
        "Локация",
        "Фото пробега",
        "Фото передний левый угол",
        "Фото передний правый угол",
        "Фото задний правый угол",
        "Фото задний левый угол",
        "Фото спереди",
        "Фото задняя часть",
        "Фото левая сторона",
        "Фото правая сторона",
        "Фото открытая передняя левая дверь",
        "Фото открытая передняя правая дверь",
        "Фото открытая задняя правая дверь",
        "Фото открытая задняя левая дверь",
        "Фото дня",
        "Фото повреждения",
    };

    EnsureXlsx(Path.Combine(dataRoot, "checkups.xlsx"), checkupHeaders);
    EnsureXlsx(Path.Combine(dataRoot, "post_checkups.xlsx"), checkupHeaders);

    EnsureXlsx(
        Path.Combine(dataRoot, "random.xlsx"),
        new[]
        {
            "Случайные фото колёс",
            "Случайные фото до выезда",
            "Случайные фото салона",
        }
    );
}


static void EnsureXlsx(string filepath, string[] headers, string[]? seedFirstDataRow = null)
{
    if (File.Exists(filepath)) return;

    using var wb = new XLWorkbook();
    var ws = wb.AddWorksheet("Sheet1");

    for (int i = 0; i < headers.Length; i++)
    {
        ws.Cell(1, i + 1).Value = headers[i];
    }

    if (seedFirstDataRow != null)
    {
        for (int i = 0; i < Math.Min(headers.Length, seedFirstDataRow.Length); i++)
        {
            ws.Cell(2, i + 1).Value = seedFirstDataRow[i];
        }
    }

    wb.SaveAs(filepath);
}

static void TryMigrateCarsFromExcelAndDelete(string dataRoot, CarDb carDb)
{
    try
    {
        var legacyPath = Path.Combine(dataRoot, "cars.xlsx");
        if (!File.Exists(legacyPath)) return;

        // Only migrate if DB is effectively empty (seed-only).
        if (carDb.Count() > 1) return;

        using var wb = new XLWorkbook(legacyPath);
        var ws = wb.Worksheet(1);
        var last = ws.LastRowUsed()?.RowNumber() ?? 1;
        if (last <= 1) return;

        string ReadCell(int row, int col) => ws.Cell(row, col).GetString()?.Trim() ?? "";

        // Legacy columns (best-effort):
        // 1 number, 2 brand, 3 model, 4 vin, 5 color
        for (int r = 2; r <= last; r++)
        {
            var number = ReadCell(r, 1);
            if (string.IsNullOrWhiteSpace(number)) continue;

            carDb.Upsert(new CarDb.CarRecord
            {
                Number = number,
                Brand = ReadCell(r, 2),
                Model = ReadCell(r, 3),
                Vin = ReadCell(r, 4),
                Color = ReadCell(r, 5),
            });
        }

        // After successful migration, delete legacy file (requested).
        try { File.Delete(legacyPath); } catch { }
    }
    catch
    {
        // best-effort migration only
    }
}
