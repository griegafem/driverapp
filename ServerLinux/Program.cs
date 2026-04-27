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
    if (Directory.Exists(repoData) || File.Exists(Path.Combine(repoData, "users.xlsx"))) return repoData;

    return Path.Combine(contentRoot, "data");
}

var dataRoot = GetDataRoot(contentRoot, repoRoot);
Directory.CreateDirectory(dataRoot);

var photoRoot = Path.Combine(dataRoot, "Photo");
Directory.CreateDirectory(photoRoot);

EnsureLocalAssets(repoRoot, dataRoot);

var driverApp = new DriverAppProvider();
driverApp.SetUserTable(Path.Combine(dataRoot, "users.xlsx"));
driverApp.SetCarsTable(Path.Combine(dataRoot, "cars.xlsx"));
driverApp.SetCheckUpTable(Path.Combine(dataRoot, "checkups.xlsx"));
driverApp.SetPostCheckUpTable(Path.Combine(dataRoot, "post_checkups.xlsx"));
driverApp.SetRandomTable(Path.Combine(dataRoot, "random.xlsx"));

// Health
app.MapGet("/test", () => Results.Text("OK"));

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
    var cars = driverApp.GetCars();
    var payload = JsonConvert.SerializeObject(cars.Select(x => new { number = (x.number ?? "").ToUpperInvariant() }).ToArray());
    return Results.Text(payload, "application/json; charset=utf-8");
});

app.MapPost("/api/get-car", async (HttpRequest request) =>
{
    var body = await ReadBodyAsync(request);
    var obj = JObject.Parse(body);
    var number = (string?)obj["number"];
    if (string.IsNullOrWhiteSpace(number)) return Results.Text("CAR_NOT_FOUND");

    var cars = driverApp.GetCars();
    var car = cars.FirstOrDefault(x => string.Equals(x.number, number, StringComparison.OrdinalIgnoreCase));
    if (car == null) return Results.Text("CAR_NOT_FOUND");

    var result = JsonConvert.SerializeObject(new { brand = car.brand, model = car.model });
    return Results.Text(result, "application/json; charset=utf-8");
});

app.MapPost("/api/login", async (HttpRequest request) =>
{
    var body = await ReadBodyAsync(request);
    var obj = JObject.Parse(body);

    var login = (string?)obj["login"];
    var password = (string?)obj["password"];

    var (success, session, user) = driverApp.CreateSession(login ?? "", password ?? "");
    if (!success || user == null)
    {
        return Results.Text(JsonConvert.SerializeObject(new { status = "error", error = "USER_NOT_FOUND" }), "application/json; charset=utf-8");
    }

    if (user.password != password)
    {
        return Results.Text(JsonConvert.SerializeObject(new { status = "error", error = "WRONG_DATA" }), "application/json; charset=utf-8");
    }

    string access_key = "";
    if (user.role == "Admin" || user.role == "Owner" || user.role == "Report")
    {
        access_key = driverApp.CreateAccessKey();
    }

    var payload = JsonConvert.SerializeObject(new
    {
        status = "ok",
        user.name,
        user.surname,
        user.role,
        access_key,
        session,
        random_wheel = user.GetRandomWheel(),
        photoday = user.GetRandomPhotoday()
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

    var user = driverApp.Authorize(session);
    if (user == null)
    {
        return Results.Text(JsonConvert.SerializeObject(new { status = "error", error = "USER_NOT_FOUND" }), "application/json; charset=utf-8");
    }

    string access_key = "";
    if (user.role == "Admin" || user.role == "Owner" || user.role == "Report")
    {
        access_key = driverApp.CreateAccessKey();
    }

    var payload = JsonConvert.SerializeObject(new
    {
        status = "ok",
        user.name,
        user.surname,
        user.role,
        access_key,
        random_wheel = user.GetRandomWheel(),
        photoday = user.GetRandomPhotoday()
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
    var user = driverApp.Authorize(session ?? "");
    if (user == null) return Results.Text("");

    dynamic obj = root.data;

    var cars = driverApp.GetCars();
    DriverAppProvider.Car car = new();
    try { car = cars.First(x => string.Equals(x.number, (string?)obj.number, StringComparison.OrdinalIgnoreCase)); } catch { }

    var row = new ExcelProvider.Row();

    row.Add("Дата записи", (string?)obj.date ?? "");
    row.Add("Время завершения отчёта", (string?)obj.date_2 ?? (string?)obj.date ?? "");
    row.Add("Фамилия пользователя", user.surname);
    row.Add("Имя пользователя", user.name);
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

    try { user.SwitchRandomWheel(); user.SwitchRandomPhotoday(); } catch { }
    driverApp.AddCheckUp(row);

    return Results.Text(JsonConvert.SerializeObject(new { status = "ok" }), "application/json; charset=utf-8");
});

app.MapPost("/api/post-checkup", async (HttpRequest request) =>
{
    var body = await ReadBodyAsync(request);
    dynamic root = JObject.Parse(body);
    var session = (string?)root.session;
    var user = driverApp.Authorize(session ?? "");
    if (user == null) return Results.Text("");

    dynamic obj = root.data;

    var cars = driverApp.GetCars();
    DriverAppProvider.Car car = new();
    try { car = cars.First(x => string.Equals(x.number, (string?)obj.number, StringComparison.OrdinalIgnoreCase)); } catch { }

    var row = new ExcelProvider.Row();

    row.Add("Дата записи", (string?)obj.date ?? "");
    row.Add("Время завершения отчёта", DateTime.Now.ToString());
    row.Add("Фамилия пользователя", user.surname);
    row.Add("Имя пользователя", user.name);
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

    try { user.SwitchRandomWheel(); user.SwitchRandomPhotoday(); } catch { }
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
    EnsureXlsx(
        Path.Combine(dataRoot, "users.xlsx"),
        new[]
        {
            "Фамилия",
            "Имя",
            "Отчество",
            "Номер телефона",
            "Права доступа",
            "Логин",
            "Пароль",
            "Telegram ID",
        },
        seedFirstDataRow: new[] { "Иванов", "Иван", "Иванович", "+79990000000", "Admin", "admin", "admin", "0" }
    );

    EnsureXlsx(
        Path.Combine(dataRoot, "cars.xlsx"),
        new[]
        {
            "Гос.номер",
            "Марка",
            "Модель",
            "VIN",
            "Цвет",
        },
        seedFirstDataRow: new[] { "А000АА00", "Lada", "Vesta", "", "" }
    );

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
