function normalize(text) {
  const s = (text || "")
    .toString()
    .trim()
    .toLowerCase()
    // latin->cyrillic lookalikes for plates
    .replace(/a/g, "а")
    .replace(/b/g, "в")
    .replace(/c/g, "с")
    .replace(/e/g, "е")
    .replace(/h/g, "н")
    .replace(/k/g, "к")
    .replace(/m/g, "м")
    .replace(/o/g, "о")
    .replace(/p/g, "р")
    .replace(/t/g, "т")
    .replace(/x/g, "х")
    .replace(/y/g, "у");

  return s.replace(/[^a-zа-я0-9]/g, "");
}

export function initCarSelector({
  endpoint,
  get,
  carsRequest,
  onSelectCar,
  onClearCar,
  onCarsLoaded,
}) {
  const root = get("carSelector");
  const btnClear = get("carSelectClear");
  const selected = get("carSelected");
  const selectedHint = get("carSelectedHint");
  const requiredHint = get("carRequiredHint");
  const searchInput = get("carSearchInput");
  const searchList = get("carSearchList");

  let cars = [];
  let selectedCar = null;
  let loading = true;
  let error = null;

  const showList = () => searchList?.classList?.remove?.("hidden");
  const hideList = () => searchList?.classList?.add?.("hidden");

  const setSelected = (car) => {
    selectedCar = car;
    root?.classList?.toggle?.("vehicleCard--selected", !!car);
    if (!car) {
      selected.innerText = "Автомобиль не выбран";
      selectedHint.innerText = "Выберите автомобиль из списка для начала осмотра";
      requiredHint?.classList?.remove?.("hidden");
      btnClear.classList.add("hidden");
      if (searchInput) searchInput.value = "";
      hideList();
      onClearCar?.();
      return;
    }

    const plate = car?.plateNumber || "";
    const name = [car?.brand, car?.model].filter(Boolean).join(" ").trim();
    const vin = car?.vin ? `${car.vin}` : "";
    const resp = car?.responsible ? `${car.responsible}` : "";

    selected.innerText = plate || "Автомобиль выбран";
    selectedHint.innerHTML = `
      <div class="vehicleCard__details">
        <div>${name || '<span class="muted">Марка/модель не указаны</span>'}</div>
        <div><span class="muted">VIN:</span> ${vin || '<span class="muted">—</span>'}</div>
        ${resp ? `<div><span class="muted">Ответственный:</span> ${resp}</div>` : ""}
      </div>
    `;

    requiredHint?.classList?.add?.("hidden");
    btnClear.classList.remove("hidden");
    if (searchInput) searchInput.value = plate;
    hideList();
    onSelectCar?.(car);
  };

  const matches = (car, q) => {
    if (!q) return true;
    const nq = normalize(q);
    if (!nq) return true;

    const hay = [
      car?.plateNumber,
      car?.brand,
      car?.model,
      car?.vin,
      car?.department,
      car?.responsible,
      car?.year,
    ]
      .filter(Boolean)
      .join(" ");

    return normalize(hay).includes(nq);
  };

  const renderList = ({ forceOpen = false } = {}) => {
    if (!searchList) return;
    const q = searchInput?.value || "";
    const list = cars.filter((c) => matches(c, q)).slice(0, 12);

    searchList.innerHTML = "";

    const isFocused = document.activeElement === searchInput;
    const shouldOpen = forceOpen || (isFocused && (!!q || loading || !!error));
    if (!shouldOpen) {
      hideList();
      return;
    }

    if (loading) {
      searchList.innerHTML = `<div class="vehicleOption vehicleOption--muted">Загрузка автомобилей...</div>`;
      showList();
      return;
    }
    if (error) {
      searchList.innerHTML = `<div class="vehicleOption vehicleOption--muted">Ошибка загрузки списка автомобилей</div>`;
      showList();
      return;
    }
    if (!cars.length) {
      searchList.innerHTML = `<div class="vehicleOption vehicleOption--muted">Автомобили не найдены</div>`;
      showList();
      return;
    }
    if (!q) {
      // Only show hint when user explicitly opened the list (focus/click)
      searchList.innerHTML = `<div class="vehicleOption vehicleOption--muted">Начните вводить госномер, модель или VIN</div>`;
      showList();
      return;
    }
    if (!list.length) {
      searchList.innerHTML = `<div class="vehicleOption vehicleOption--muted">Ничего не найдено</div>`;
      showList();
      return;
    }

    list.forEach((car) => {
      const plate = car?.plateNumber || "";
      const name = [car?.brand, car?.model].filter(Boolean).join(" ").trim();
      const vin = car?.vin || "";

      const row = document.createElement("button");
      row.type = "button";
      row.className = "vehicleOption";
      row.setAttribute("role", "option");
      row.innerHTML = `
        <div class="vehicleOption__main">
          <span class="vehicleOption__plate mono">${plate}</span>
          <span class="vehicleOption__name">${name || ""}</span>
        </div>
        <div class="vehicleOption__sub">
          <span class="muted">VIN:</span> <span class="mono">${vin}</span>
        </div>
      `;
      row.onclick = () => setSelected(car);
      searchList.appendChild(row);
    });

    showList();
  };

  btnClear.onclick = () => setSelected(null);
  searchInput?.addEventListener?.("input", () => renderList({ forceOpen: true }));
  searchInput?.addEventListener?.("focus", () => renderList({ forceOpen: true }));
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!t) return;
    if (t === searchInput) return;
    if (searchList?.contains?.(t)) return;
    hideList();
  });

  // Init UI
  if (root) root.classList.remove("hidden");
  selected.innerText = "Автомобиль не выбран";
  selectedHint.innerText = "Выберите автомобиль из списка для начала осмотра";
  requiredHint?.classList?.remove?.("hidden");
  btnClear.classList.add("hidden");
  hideList();

  // Load cars
  loading = true;
  error = null;
  carsRequest(endpoint)
    .then((data) => {
      if (data?.status === "error") {
        error = data?.error || "CARS_READ_ERROR";
        cars = [];
        return;
      }
      cars = Array.isArray(data?.cars) ? data.cars : Array.isArray(data) ? data : [];
      cars = cars
        .map((c) => ({
          plateNumber: (c?.plateNumber || c?.number || "").toString().trim().toUpperCase(),
          brand: c?.brand ? c.brand.toString().trim() : "",
          model: c?.model ? c.model.toString().trim() : "",
          vin: c?.vin ? c.vin.toString().trim() : "",
          year: c?.year ? c.year.toString().trim() : "",
          department: c?.department ? c.department.toString().trim() : "",
          responsible: c?.responsible ? c.responsible.toString().trim() : "",
        }))
        .filter((c) => c.plateNumber.length > 0);

      onCarsLoaded?.(cars);
    })
    .catch(() => {
      error = "CARS_READ_ERROR";
      cars = [];
    })
    .finally(() => {
      loading = false;
      // Do not auto-open dropdown on page load
      renderList({ forceOpen: false });
    });

  return {
    setSelected,
    getSelected: () => selectedCar,
    getCars: () => cars,
  };
}

