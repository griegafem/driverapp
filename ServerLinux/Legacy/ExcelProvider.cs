using ClosedXML.Excel;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

public class ExcelProvider
{
    private XLWorkbook workbook;

    private string filepath;

    public ExcelProvider(string filepath)
    {
        this.filepath = filepath;
        workbook = new XLWorkbook(filepath);
    }

    public string Get(int row, int column, int sheetId = 1)
    {
        var sheet = workbook.Worksheet(sheetId);

        return sheet.Row(row).Cell(column).GetString();
    }

    public Row GetRow(int row, int sheetId = 1)
    {
        var sheet = workbook.Worksheet(sheetId);

        var headers = sheet.Row(1).CellsUsed().Select(x => x.GetString()).ToArray();

        var count = headers.Length;

        var result = new Row();

        for (int i = 0; i < count; i++)
        {
            result.Add(headers[i], sheet.Row(row).Cell(i + 1).GetString());
        }

        return result;
    }

    public void Set(int row, int column, string value, int sheetId = 1)
    {
        var sheet = workbook.Worksheet(sheetId);

        sheet.Cell(row, column).Clear();
        sheet.Cell(row, column).Value = value;
        sheet.Cell(row, column).ShareString = false;
    }

    public IXLWorksheet GetSheet(int id)
    {
        return workbook.Worksheet(id);
    }

    public void Save()
    {
        workbook.Save();
    }

    public int GetRowsCount(int sheetId = 1)
    {
        var sheet = workbook.Worksheet(sheetId);

        return sheet.RowsUsed().Count();
    }

    public void Update()
    {
        workbook.Dispose();
        workbook = new XLWorkbook(filepath);
    }

    public class Row : Dictionary<string, string>
    {
        public new string this[string key]
        {
            get
            {
                if (!ContainsKey(key)) return default;
                else return base[key];
            }
            set
            {
                if (!ContainsKey(key)) Add(key, value);
                else base[key] = value;
            }
        }

        public new void Add(string key, string value)
        {
            if (key == null) return;
            if (value == null) value = "";

            base.Add(key, value);
        }
    }
}
