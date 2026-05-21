using Microsoft.Data.Sqlite;

public sealed class CheckupDb
{
    private readonly string _connStr;

    public CheckupDb(string dbPath)
    {
        _connStr = $"Data Source={dbPath}";
        EnsureCreated();
    }

    private void EnsureCreated()
    {
        using var conn = Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS pre_checkups (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                submitted_at     TEXT    NOT NULL,
                user_login       TEXT,
                user_name        TEXT,
                user_surname     TEXT,
                car_id           TEXT,
                car_number       TEXT,
                car_brand        TEXT,
                car_model        TEXT,
                geo              TEXT,
                body_condition   TEXT,
                wheels_ok        INTEGER,
                wheel_damaged    INTEGER,
                interior_condition TEXT,
                oil_checked      INTEGER,
                oil_level        TEXT,
                coolant_ok       INTEGER,
                brake_fluid      TEXT,
                washer_ok        INTEGER,
                lighting_ok      INTEGER,
                emergency_kit_ok INTEGER,
                glass_condition  TEXT,
                mileage          TEXT,
                fuel_level       TEXT,
                dashboard_errors INTEGER,
                registration_ok  INTEGER,
                osago_date       TEXT,
                osago_missing    INTEGER,
                wifi             TEXT,
                vpn              TEXT,
                additional_info  TEXT,
                critical_info    TEXT,
                quick_exit       INTEGER,
                photo_mileage    TEXT,
                photo_rl         TEXT,
                photo_rr         TEXT,
                photo_br         TEXT,
                photo_bl         TEXT,
                photo_front      TEXT,
                photo_rear       TEXT,
                photo_left       TEXT,
                photo_right      TEXT,
                photo_irl        TEXT,
                photo_irr        TEXT,
                photo_ibr        TEXT,
                photo_ibl        TEXT,
                photo_of_day     TEXT,
                photo_dashboard  TEXT
            );
            """;
        cmd.ExecuteNonQuery();
    }

    public long Insert(PreCheckupRecord r)
    {
        using var conn = Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            INSERT INTO pre_checkups
                (submitted_at, user_login, user_name, user_surname,
                 car_id, car_number, car_brand, car_model,
                 geo, body_condition, wheels_ok, wheel_damaged,
                 interior_condition, oil_checked, oil_level, coolant_ok,
                 brake_fluid, washer_ok, lighting_ok, emergency_kit_ok,
                 glass_condition, mileage, fuel_level, dashboard_errors,
                 registration_ok, osago_date, osago_missing, wifi, vpn,
                 additional_info, critical_info, quick_exit,
                 photo_mileage, photo_rl, photo_rr, photo_br, photo_bl,
                 photo_front, photo_rear, photo_left, photo_right,
                 photo_irl, photo_irr, photo_ibr, photo_ibl, photo_of_day, photo_dashboard)
            VALUES
                (@submitted_at, @user_login, @user_name, @user_surname,
                 @car_id, @car_number, @car_brand, @car_model,
                 @geo, @body_condition, @wheels_ok, @wheel_damaged,
                 @interior_condition, @oil_checked, @oil_level, @coolant_ok,
                 @brake_fluid, @washer_ok, @lighting_ok, @emergency_kit_ok,
                 @glass_condition, @mileage, @fuel_level, @dashboard_errors,
                 @registration_ok, @osago_date, @osago_missing, @wifi, @vpn,
                 @additional_info, @critical_info, @quick_exit,
                 @photo_mileage, @photo_rl, @photo_rr, @photo_br, @photo_bl,
                 @photo_front, @photo_rear, @photo_left, @photo_right,
                 @photo_irl, @photo_irr, @photo_ibr, @photo_ibl, @photo_of_day, @photo_dashboard);
            SELECT last_insert_rowid();
            """;
        Add(cmd, "@submitted_at", r.SubmittedAt);
        Add(cmd, "@user_login", r.UserLogin);
        Add(cmd, "@user_name", r.UserName);
        Add(cmd, "@user_surname", r.UserSurname);
        Add(cmd, "@car_id", r.CarId);
        Add(cmd, "@car_number", r.CarNumber);
        Add(cmd, "@car_brand", r.CarBrand);
        Add(cmd, "@car_model", r.CarModel);
        Add(cmd, "@geo", r.Geo);
        Add(cmd, "@body_condition", r.BodyCondition);
        Add(cmd, "@wheels_ok", r.WheelsOk);
        Add(cmd, "@wheel_damaged", r.WheelDamaged);
        Add(cmd, "@interior_condition", r.InteriorCondition);
        Add(cmd, "@oil_checked", r.OilChecked);
        Add(cmd, "@oil_level", r.OilLevel);
        Add(cmd, "@coolant_ok", r.CoolantOk);
        Add(cmd, "@brake_fluid", r.BrakeFluid);
        Add(cmd, "@washer_ok", r.WasherOk);
        Add(cmd, "@lighting_ok", r.LightingOk);
        Add(cmd, "@emergency_kit_ok", r.EmergencyKitOk);
        Add(cmd, "@glass_condition", r.GlassCondition);
        Add(cmd, "@mileage", r.Mileage);
        Add(cmd, "@fuel_level", r.FuelLevel);
        Add(cmd, "@dashboard_errors", r.DashboardErrors);
        Add(cmd, "@registration_ok", r.RegistrationOk);
        Add(cmd, "@osago_date", r.OsagoDate);
        Add(cmd, "@osago_missing", r.OsagoMissing);
        Add(cmd, "@wifi", r.Wifi);
        Add(cmd, "@vpn", r.Vpn);
        Add(cmd, "@additional_info", r.AdditionalInfo);
        Add(cmd, "@critical_info", r.CriticalInfo);
        Add(cmd, "@quick_exit", r.QuickExit);
        Add(cmd, "@photo_mileage", r.PhotoMileage);
        Add(cmd, "@photo_rl", r.PhotoRl);
        Add(cmd, "@photo_rr", r.PhotoRr);
        Add(cmd, "@photo_br", r.PhotoBr);
        Add(cmd, "@photo_bl", r.PhotoBl);
        Add(cmd, "@photo_front", r.PhotoFront);
        Add(cmd, "@photo_rear", r.PhotoRear);
        Add(cmd, "@photo_left", r.PhotoLeft);
        Add(cmd, "@photo_right", r.PhotoRight);
        Add(cmd, "@photo_irl", r.PhotoIrl);
        Add(cmd, "@photo_irr", r.PhotoIrr);
        Add(cmd, "@photo_ibr", r.PhotoIbr);
        Add(cmd, "@photo_ibl", r.PhotoIbl);
        Add(cmd, "@photo_of_day", r.PhotoOfDay);
        Add(cmd, "@photo_dashboard", r.PhotoDashboard);
        return (long)(cmd.ExecuteScalar() ?? 0L);
    }

    private static void Add(SqliteCommand cmd, string name, object? value)
        => cmd.Parameters.AddWithValue(name, value ?? DBNull.Value);

    private SqliteConnection Open()
    {
        var conn = new SqliteConnection(_connStr);
        conn.Open();
        return conn;
    }

    public (string? Mileage, string? Date) GetLastMileageByCarNumber(string carNumber)
    {
        var n = carNumber.Trim().ToUpperInvariant();
        using var conn = Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT mileage, submitted_at FROM pre_checkups
            WHERE car_number = $num AND mileage IS NOT NULL AND mileage != ''
            ORDER BY id DESC LIMIT 1;
            """;
        cmd.Parameters.AddWithValue("$num", n);
        using var r = cmd.ExecuteReader();
        if (!r.Read()) return (null, null);
        return (r.IsDBNull(0) ? null : r.GetString(0), r.IsDBNull(1) ? null : r.GetString(1));
    }

    public sealed class PreCheckupRecord
    {
        public string SubmittedAt { get; set; } = "";
        public string? UserLogin { get; set; }
        public string? UserName { get; set; }
        public string? UserSurname { get; set; }
        public string? CarId { get; set; }
        public string? CarNumber { get; set; }
        public string? CarBrand { get; set; }
        public string? CarModel { get; set; }
        public string? Geo { get; set; }
        public string? BodyCondition { get; set; }
        public bool? WheelsOk { get; set; }
        public bool? WheelDamaged { get; set; }
        public string? InteriorCondition { get; set; }
        public bool? OilChecked { get; set; }
        public string? OilLevel { get; set; }
        public bool? CoolantOk { get; set; }
        public string? BrakeFluid { get; set; }
        public bool? WasherOk { get; set; }
        public bool? LightingOk { get; set; }
        public bool? EmergencyKitOk { get; set; }
        public string? GlassCondition { get; set; }
        public string? Mileage { get; set; }
        public string? FuelLevel { get; set; }
        public bool? DashboardErrors { get; set; }
        public bool? RegistrationOk { get; set; }
        public string? OsagoDate { get; set; }
        public bool? OsagoMissing { get; set; }
        public string? Wifi { get; set; }
        public string? Vpn { get; set; }
        public string? AdditionalInfo { get; set; }
        public string? CriticalInfo { get; set; }
        public bool? QuickExit { get; set; }
        public string? PhotoMileage { get; set; }
        public string? PhotoRl { get; set; }
        public string? PhotoRr { get; set; }
        public string? PhotoBr { get; set; }
        public string? PhotoBl { get; set; }
        public string? PhotoFront { get; set; }
        public string? PhotoRear { get; set; }
        public string? PhotoLeft { get; set; }
        public string? PhotoRight { get; set; }
        public string? PhotoIrl { get; set; }
        public string? PhotoIrr { get; set; }
        public string? PhotoIbr { get; set; }
        public string? PhotoIbl { get; set; }
        public string? PhotoOfDay { get; set; }
        public string? PhotoDashboard { get; set; }
    }
}
