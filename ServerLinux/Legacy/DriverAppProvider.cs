using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

public class DriverAppProvider
{
    private static readonly string SESSION_STORAGE_PATH = Environment.CurrentDirectory + "/sessionstorage";
    private static readonly string RANDOM_PATH = Environment.CurrentDirectory + "/random_data.json";

    private ExcelProvider users;
    private ExcelProvider cars;
    private ExcelProvider checkups;
    private ExcelProvider postCheckups;
    private ExcelProvider randomPhoto;

    private string usersPath;
    private string carsPath;
    private string checkupsPath;
    private string postCheckupsPath;

    private List<string> access_keys = new List<string>();

    private Dictionary<string, User> sessions_storage = new Dictionary<string, User>();

    private static Random random = new Random();

    public DriverAppProvider()
    {
        LoadSessionStorage();
    }

    private void LoadSessionStorage()
    {
        try
        {
            if (!File.Exists(SESSION_STORAGE_PATH)) sessions_storage = new Dictionary<string, User>();
            else
            {
                var data = File.ReadAllText(SESSION_STORAGE_PATH);

                byte[] decrypt = data.Select(x => (byte)(x ^ 69)).ToArray();

                var raw = Encoding.UTF8.GetString(decrypt);

                sessions_storage = JsonConvert.DeserializeObject<Dictionary<string, User>>(raw);
            }
        }
        catch
        {

        }
    }

    private void SaveSessionStorage()
    {
        try
        {
            var data = JsonConvert.SerializeObject(sessions_storage);

            byte[] raw = Encoding.UTF8.GetBytes(data);

            byte[] encrypt = raw.Select(x => (byte)(x ^ 69)).ToArray();

            File.WriteAllBytes(SESSION_STORAGE_PATH, encrypt);
        }
        catch
        {

        }
    }

    public void SetUserTable(string filepath)
    {
        usersPath = filepath;
        users = new ExcelProvider(filepath);
    }

    public void SetRandomTable(string filepath)
    {
        randomPhoto = new ExcelProvider(filepath);
    }

    public void SetCarsTable(string filepath)
    {
        carsPath = filepath;
        cars = new ExcelProvider(filepath);
    }

    public void SetCheckUpTable(string filepath)
    {
        checkupsPath = filepath;
        checkups = new ExcelProvider(filepath);
    }

    public void SetPostCheckUpTable(string filepath)
    {
        postCheckupsPath = filepath;
        postCheckups = new ExcelProvider(filepath);
    }

    public User[] GetUsers()
    {
        users.Update();

        int count = users.GetRowsCount();

        var result = new User[count - 1];

        for (int i = 1; i < count; i++)
        {
            var userData = users.GetRow(i + 1);

            User user = new User(this);

            user.surname = userData["Фамилия"];
            user.name = userData["Имя"];
            user.patronymic = userData["Отчество"];
            user.number = userData["Номер телефона"];
            user.role = userData["Права доступа"];
            user.login = userData["Логин"];
            user.password = userData["Пароль"];
            try { user.id = long.Parse(userData["Telegram ID"]); } catch { }

            result[i - 1] = user;
        }

        return result;
    }

    public Car[] GetCars()
    {
        cars.Update();

        int count = cars.GetRowsCount();

        var result = new Car[count - 1];

        for (int i = 1; i < count; i++)
        {
            var data = cars.GetRow(i + 1);

            Car car = new Car();

            car.number = data["Гос.номер"];
            car.brand = data["Марка"];
            car.model = data["Модель"];
            car.vin = data["VIN"];
            car.color = data["Цвет"];

            result[i - 1] = car;
        }

        return result;
    }

    public void AddCheckUp(CheckUp checkUp)
    {
        int rows = checkups.GetRowsCount();

        var values = new string[]
        {
            (rows - 1).ToString(),                                      // № п/п
            DateTime.Now.ToString(),                                 // Дата записи
            checkUp.user_id,                              // Пользователь
            checkUp.number,                               // Авто
            checkUp.mileage,                              // Пробег
            checkUp.geo,                                  // Локация
            string.IsNullOrEmpty(checkUp.oilLevel) ? "Нет" : "Да", // Масло проверено
            checkUp.oilLevel,                             // Уровень масла %
            checkUp.antifreeze,                           // Антифриз
            checkUp.brakefluidLevel,                      // Тормозная жидкость
            checkUp.glasswasher,                          // Омывайка
            checkUp.additionalInfo,                       // Доп инфа
            "",                                           // Проблема (пока нет)
            checkUp.wheelDamaged,                         // Повреждение колеса
            checkUp.wheelDamagedPhoto,                    // Фото колеса
            "",                                           // Какого колеса (пока нет)
            checkUp.fuel,                                 // Топливо
            checkUp.clean,                                // Авто чистый
            checkUp.interior,                             // Салон
            checkUp.details,                              // Стёкла
            checkUp.photoOfDay,                           // Фото дня  
            checkUp.mileagePhoto,
            checkUp.randomWheelPhoto,
            checkUp.criticalInfo,
        };

        for (int i = 0; i < values.Length; i++)
        {
            checkups.Set(rows + 1, i + 1, values[i]);
        }

        checkups.Save();
    }

    public void AddCheckUp(ExcelProvider.Row data)
    {
        var headers = checkups.GetRow(1);

        var count = checkups.GetRowsCount();

        for (int i = 0; i < headers.Count; i++)
        {
            var key = headers.ElementAt(i).Value;

            if (data.ContainsKey(key)) checkups.Set(count + 1, i + 1, data[key]);
        }

        checkups.Save();
    }

    public void AddPostCheckUp(ExcelProvider.Row data)
    {
        var table = postCheckups;

        var headers = table.GetRow(1);

        var count = table.GetRowsCount();

        for (int i = 0; i < headers.Count; i++)
        {
            var key = headers.ElementAt(i).Value;

            if (data.ContainsKey(key)) table.Set(count + 1, i + 1, data[key]);
        }

        table.Save();
    }

    public ExcelProvider.Row[] GetCheckups()
    {
        checkups.Update();

        var count = checkups.GetRowsCount() - 1;

        var result = new ExcelProvider.Row[count ];

        for (int i = 0; i < count; i++)
        {
            result[i] = checkups.GetRow(i + 2);
        }

        return result;
    }

    public ExcelProvider.Row[] GetPostCheckups()
    {
        postCheckups.Update();

        var count = postCheckups.GetRowsCount() - 1;

        var result = new ExcelProvider.Row[count];

        for (int i = 0; i < count; i++)
        {
            result[i] = postCheckups.GetRow(i + 2);
        }

        return result;
    }

    public CheckUp[] GetCheckUps()
    {
        var result = new List<CheckUp>();
        
        var sheet = checkups.GetSheet(1);

        var rows = sheet.RowsUsed().Skip(1);

        foreach (var row in rows)
        {
            var checkUp = new CheckUp
            {
                date = row.Cell(2).GetString(),
                user_id = row.Cell(3).GetString(),
                number = row.Cell(4).GetString(),
                mileage = row.Cell(5).GetString(),
                geo = row.Cell(6).GetString(),
                oilLevel = row.Cell(8).GetString(),
                antifreeze = row.Cell(9).GetString(),
                brakefluidLevel = row.Cell(10).GetString(),
                glasswasher = row.Cell(11).GetString(),
                additionalInfo = row.Cell(12).GetString(),
                wheelDamaged = row.Cell(14).GetString(),
                wheelDamagedPhoto = row.Cell(15).GetString(),
                fuel = row.Cell(17).GetString(),
                clean = row.Cell(18).GetString(),
                interior = row.Cell(19).GetString(),
                details = row.Cell(20).GetString(),
                photoOfDay = row.Cell(21).GetString(),
                mileagePhoto = row.Cell(22).GetString(),
                randomWheelPhoto = row.Cell(23).GetString(),
                criticalInfo = row.Cell(24).GetString(),
            };

            result.Add(checkUp);
        }

        return result.ToArray();
    }

    private ExcelProvider.Row[] _GetRandom()
    {
        randomPhoto.Update();

        var count = randomPhoto.GetRowsCount() - 1;

        var result = new ExcelProvider.Row[count];

        for (int i = 0; i < count; i++)
        {
            result[i] = randomPhoto.GetRow(i + 2);
        }

        return result;
    }

    public RandomPhoto GetRandom()
    {
        return new RandomPhoto(_GetRandom());
    }

    public class RandomPhoto
    {
        public string[] wheels;
        public string[] before;
        public string[] interior;

        public RandomPhoto(ExcelProvider.Row[] data)
        {
            List<string> wheels = new List<string>();
            List<string> before = new List<string>();
            List<string> interior = new List<string>();

            foreach (var item in data)
            {
                wheels.Add(item["Случайные фото колёс"]);
                before.Add(item["Случайные фото до выезда"]);
                interior.Add(item["Случайные фото салона"]);
            }

            this.wheels = wheels.Where(x => x != "").ToArray();
            this.before = before.Where(x => x != "").ToArray();
            this.interior = interior.Where(x => x != "").ToArray();
        }
    }

    public class CheckUp
    {
        public string user_id;
        public string date;
        public string number;
        public string mileage;
        public string mileagePhoto;
        public string geo;
        public string oilLevel;
        public string antifreeze;
        public string brakefluidLevel;
        public string glasswasher;
        public string additionalInfo;
        public string wheelDamaged;
        public string wheelDamagedPhoto;
        public string randomWheelPhoto;
        public string fuel;
        public string clean;
        public string interior;
        public string details;
        public string photoOfDay;
        public string criticalInfo;
    }

    public class User
    {
        private static Dictionary<string, string> rw = new Dictionary<string, string>();

        public string name;
        public string surname;
        public string patronymic;
        public string number;
        public long id;
        public string role;
        public string login;
        public string password;
        private DriverAppProvider driverApp;

        public User(DriverAppProvider driverApp)
        {
            this.driverApp = driverApp;
        }

        public string GetRandomWheel()
        {
            var key = login + id + "wheel";

            var random_data = driverApp.GetRandom();

            var random_values = random_data.wheels;

            var random_user_data = new int[] { };

            var random_user_data_block = new Dictionary<string, int[]>();

            try { random_user_data_block = JsonConvert.DeserializeObject<Dictionary<string, int[]>>(File.ReadAllText(RANDOM_PATH)); } catch { }
            try { random_user_data = random_user_data_block[key]; } catch { }

            if (random_user_data.Length == 0)
            {
                SwitchRandomWheel();

                try { random_user_data_block = JsonConvert.DeserializeObject<Dictionary<string, int[]>>(File.ReadAllText(RANDOM_PATH)); } catch { }
                try { random_user_data = random_user_data_block[key]; } catch { }
            }

            var value = random_values[random_user_data.Last()];

            return value;
        }

        public void SwitchRandomWheel()
        {
            var key = login + id + "wheel";

            var random_data = driverApp.GetRandom();

            var random_values = random_data.wheels;

            var random_user_data = new int[] { };

            var random_user_data_block = new Dictionary<string, int[]>();

            try { random_user_data_block = JsonConvert.DeserializeObject<Dictionary<string, int[]>>(File.ReadAllText(RANDOM_PATH)); } catch { }
            try { random_user_data = random_user_data_block[key]; } catch { }

            var available = new List<int>();

            if (random_user_data.Length >= random_values.Length) random_user_data = new int[] { };

            for (int i = 0; i < random_values.Length; i++)
            {
                if (!random_user_data.Contains(i)) available.Add(i);
            }

            var random_index = available[random.Next(0, available.Count - 1)];

            random_user_data = random_user_data.Append(random_index).ToArray();

            if (random_user_data_block.ContainsKey(key)) random_user_data_block[key] = random_user_data;
            else random_user_data_block.Add(key, random_user_data);

            File.WriteAllText(RANDOM_PATH, JsonConvert.SerializeObject(random_user_data_block));
        }

        public string GetRandomPhotoday()
        {
            var key = login + id + "photoday";

            var random_data = driverApp.GetRandom();

            var random_values = random_data.before;

            var random_user_data = new int[] { };

            var random_user_data_block = new Dictionary<string, int[]>();

            try { random_user_data_block = JsonConvert.DeserializeObject<Dictionary<string, int[]>>(File.ReadAllText(RANDOM_PATH)); } catch { }
            try { random_user_data = random_user_data_block[key]; } catch { }

            if (random_user_data.Length == 0)
            {
                SwitchRandomPhotoday();

                try { random_user_data_block = JsonConvert.DeserializeObject<Dictionary<string, int[]>>(File.ReadAllText(RANDOM_PATH)); } catch { }
                try { random_user_data = random_user_data_block[key]; } catch { }
            }

            var value = random_values[random_user_data.Last()];

            return value;
        }

        public void SwitchRandomPhotoday()
        {
            var key = login + id + "photoday";

            var random_data = driverApp.GetRandom();

            var random_values = random_data.before;

            var random_user_data = new int[] { };

            var random_user_data_block = new Dictionary<string, int[]>();

            try { random_user_data_block = JsonConvert.DeserializeObject<Dictionary<string, int[]>>(File.ReadAllText(RANDOM_PATH)); } catch { }
            try { random_user_data = random_user_data_block[key]; } catch { }

            var available = new List<int>();

            if (random_user_data.Length >= random_values.Length) random_user_data = new int[] { };

            for (int i = 0; i < random_values.Length; i++)
            {
                if (!random_user_data.Contains(i)) available.Add(i);
            }

            var random_index = available[random.Next(0, available.Count - 1)];

            random_user_data = random_user_data.Append(random_index).ToArray();

            if (random_user_data_block.ContainsKey(key)) random_user_data_block[key] = random_user_data;
            else random_user_data_block.Add(key, random_user_data);

            File.WriteAllText(RANDOM_PATH, JsonConvert.SerializeObject(random_user_data_block));
        }
    }

    public class Car
    {
        public string number;
        public string model;
        public string brand;
        public string vin;
        public string color;
    }

    public string CreateAccessKey()
    {
        string result = "";

        for (int i = 0; i < 64; i++)
        {
            var ch = (char)random.Next(97, 122);
            result += ch;
        }

        result = CreateMD5(result);

        access_keys.Add(result);
        
        return result;
    }

    public (bool, string, User) CreateSession(string login, string password)
    {
        var users = GetUsers();

        var user = users.FirstOrDefault(x => x.login == login && x.password == password);

        if(user == null) return (false, null, null);

        int lenght = 64;

        byte[] result = new byte[lenght];

        for (int i = 0; i < lenght; i++)
        {
            result[i] = (byte)random.Next(0, 255);
        }

        var session = Convert.ToBase64String(result);

        sessions_storage.Add(session, user);

        SaveSessionStorage();

        return (true, session, user);
    }

    public User Authorize(string session)
    {
        LoadSessionStorage();

        if (sessions_storage.ContainsKey(session))
        {
            var users = GetUsers();

            var user = sessions_storage[session];

            user = users.FirstOrDefault(x => x.login == user.login);

            return user;
        }
        else return null;
    }

    public byte[] GetTables(string key)
    {
        if (!access_keys.Contains(key)) return null;

        access_keys.Remove(key);

        var tmpDir = Environment.CurrentDirectory + "/ziptmp/";

        var filepath = Environment.CurrentDirectory + "/tables.zip";

        if (Directory.Exists(tmpDir)) Directory.Delete(tmpDir, true);

        Directory.CreateDirectory(tmpDir);

        File.Copy(postCheckupsPath, tmpDir + "/" + Path.GetFileName(postCheckupsPath));
        File.Copy(checkupsPath, tmpDir + "/" + Path.GetFileName(checkupsPath));

        if (File.Exists(filepath)) File.Delete(filepath);

        ZipFile.CreateFromDirectory(tmpDir, filepath);

        return File.ReadAllBytes(filepath);
    }

    private static string CreateMD5(string input)
    {
        using (System.Security.Cryptography.MD5 md5 = System.Security.Cryptography.MD5.Create())
        {
            byte[] inputBytes = Encoding.ASCII.GetBytes(input);
            byte[] hashBytes = md5.ComputeHash(inputBytes);

            StringBuilder sb = new StringBuilder();

            for (int i = 0; i < hashBytes.Length; i++)
                sb.Append(hashBytes[i].ToString("x2"));

            return sb.ToString();
        }
    }
}
