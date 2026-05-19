// Cache-bust ESM modules on deploys (Safari/iOS is especially aggressive here).
const __v = "20260507_14";
import { endpoint, postRequest } from "./js/api.js?v=20260507_14";
import { get } from "./js/dom.js?v=20260507_14";
import { initAuth } from "./js/auth.js?v=20260507_14";
import { initCarSelector } from "./js/carSelector.js?v=20260507_14";
import { initLocationsAdminUi } from "./js/admin/locations.js?v=20260507_14";

// Always keep Help navigation working, even if legacy code below throws.
// No internal links inside the button: just a hard navigation to /help.
document.addEventListener(
	"click",
	(e) => {
		const target = e.target;
		const helpBtn = target?.closest?.("#help_button");
		if (!helpBtn) return;
		e.preventDefault();
		window.location.href = "/help";
	},
	true,
);

const tg = window.Telegram?.WebApp;

try { tg?.expand?.(); } catch { }

/** User-visible text for failed checkup submit (Telegram showAlert historically showed title-only if message was empty). */
function showSubmitError(text) {
	let body = String(text || "Не удалось отправить отчёт. Попробуйте снова.");
	if (body.length > 350) body = body.slice(0, 347) + "…";
	try {
		if (tg && typeof tg.showAlert === "function") {
			tg.showAlert(body);
			return;
		}
	} catch { }
	alert(body);
}

function formatSubmitFailure(err, response) {
	if (response?.error === "SESSION_INVALID") {
		return "Сессия истекла или недействительна. Выйдите из учётной записи и войдите снова.";
	}
	if (response?.status === "error" && response?.error) {
		const code = String(response.error);
		if (code === "NON_JSON_RESPONSE") {
			return "Сервер вернул неожиданный ответ. Обновите страницу или обратитесь к администратору.";
		}
		return "Ошибка: " + code;
	}
	if (!err) return "Ошибка сети. Проверьте подключение к интернету.";
	if (err.name === "AbortError") {
		return "Превышено время ожидания ответа сервера. Проверьте связь и попробуйте снова.";
	}
	const p = err.payload;
	if (p && typeof p === "object") {
		if (p.error) return "Ошибка: " + String(p.error);
		if (p.message) return String(p.message);
	}
	if (err.httpStatus) return "Ошибка сервера (" + err.httpStatus + "). Попробуйте позже или обновите страницу.";
	return "Не удалось отправить отчёт. Попробуйте снова.";
}

let refreshUsersAdminList = () => {};
let refreshCarsAdminList = () => {};
let refreshLocationsAdminList = () => {};
let getLocationsForDropdown = async () => [];

function doLogout(){
  try { localStorage.removeItem("session"); } catch { }
  window.location.replace("/login");
}

let currentRole = null;

// Sidebar open/close
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const sidebarToggle = document.getElementById("sidebarToggle");
const sidebarClose = document.getElementById("sidebarClose");

function openSidebar(){
  sidebar?.classList?.remove?.("hidden");
  sidebarOverlay?.classList?.remove?.("hidden");
  sidebar?.setAttribute?.("aria-hidden", "false");
  sidebarOverlay?.setAttribute?.("aria-hidden", "false");
  sidebarToggle?.classList?.add?.("hidden");
}

function closeSidebar(){
  sidebar?.classList?.add?.("hidden");
  sidebarOverlay?.classList?.add?.("hidden");
  sidebar?.setAttribute?.("aria-hidden", "true");
  sidebarOverlay?.setAttribute?.("aria-hidden", "true");
  sidebarToggle?.classList?.remove?.("hidden");
}

sidebarToggle?.addEventListener?.("click", () => {
  sidebar?.classList?.contains?.("hidden") ? openSidebar() : closeSidebar();
});
sidebarClose?.addEventListener?.("click", closeSidebar);
sidebarOverlay?.addEventListener?.("click", closeSidebar);

// Called by every modal open/close (including locations.js via window)
window._onModalOpen  = () => sidebarToggle?.classList?.add?.("hidden");
window._onModalClose = () => {
  if (sidebar?.classList?.contains?.("hidden"))
    sidebarToggle?.classList?.remove?.("hidden");
};

document.getElementById("sidebarGoHome")?.addEventListener?.("click", () => { closeSidebar(); nextPage("car"); });
document.getElementById("sidebarLogout")?.addEventListener?.("click", () => { closeSidebar(); doLogout(); });
document.getElementById("sidebarGoUsers")?.addEventListener?.("click", () => { closeSidebar(); nextPage("users"); });
document.getElementById("sidebarGoReports")?.addEventListener?.("click", () => { closeSidebar(); nextPage("reports"); });
document.getElementById("sidebarGoCars")?.addEventListener?.("click", () => { closeSidebar(); nextPage("cars"); });
document.getElementById("sidebarGoLocations")?.addEventListener?.("click", () => { closeSidebar(); nextPage("locations"); });
document.getElementById("sidebarGoRoutes")?.addEventListener?.("click", () => { closeSidebar(); nextPage("routes"); });

// Start fetching cars immediately — in parallel with auth, not after it.
// /api/cars is public so no session needed.
const _carsPromise = fetch(endpoint + "/api/cars", { credentials: "same-origin", cache: "no-store" })
	.then(r => r.json())
	.catch(() => ({ status: "error", cars: [] }));

// Legacy code below expects these globals to exist.
let session = localStorage.getItem("session") || null;
let check = false;

var user = tg?.initDataUnsafe?.user;

user = null;

//const canvas = document.getElementById("canvas");
const snap = document.getElementById("snap");
const video = document.getElementById("video");
const retry = document.getElementById("retry");
const toGeo = document.getElementById("toGeo");
const toPhoto = document.getElementById("toPhoto");
const mileageInput = document.getElementById("mileage");
const date = document.getElementById("date");
const number = document.getElementById("number");
const pretrip_button = document.getElementById("pretrip_button");
const posttrip_button = document.getElementById("posttrip_button");
const photoChoice = document.getElementById("photoChoice");
const getLocation_button = document.getElementById("getLocation_button");
const oilValue = document.getElementById("oilValue");
const damagedwheelAttention = document.getElementById("damagedwheelAttention");
const wheelokInstruction = document.getElementById("wheelokInstruction");
const wheelokSwitch = document.getElementById("wheelokSwitch");
const damagedwheelSwitch = document.getElementById("damagedwheelSwitch");

const photodayBlock = document.getElementById("photodayBlock");

const wheelokPhoto_button = document.getElementById("wheelokPhoto_button");
const photoChoice_wheelok = document.getElementById("photoChoice_wheelok");

const damagedwheelPhoto_button = document.getElementById("damagedwheelPhoto_button");
const photoChoice_damagedwheel = document.getElementById("photoChoice_damagedwheel");

const photoChoice_mileage = document.getElementById("photoChoice_mileage");
const panelErrorSwitch = document.getElementById("panelErrorSwitch");
const mileage_post_block = document.getElementById("mileage_post_block");

const photoBlockTemplate = document.getElementById("photoBlockTemplate");

initAuth({
	endpoint,
	postRequest,
	get,
	onAuthorized: (response) => {
		// Defensive: never allow auth overlays to remain visible after success.
		// (Some mobile browsers can keep stale UI state if an exception happens mid-flow.)
		document.getElementById("login-form")?.classList?.add?.("hidden");
		document.getElementById("loading")?.classList?.add?.("hidden");

		get('hi').innerText = response.name + ", хорошего дня!";
		get('status').innerText = "Пользователь: " + response.name + " " + response.surname;
		get("dashboardTop")?.classList?.remove?.("hidden");

		setRandomWheel(response.random_wheel);
		setPhotoDay(response.photoday);

		currentRole = (response?.role || "").toString().trim().toLowerCase() || null;
		document.getElementById("sidebarGoUsers")?.classList?.toggle?.(
			"hidden",
			currentRole !== "admin",
		);
		document.getElementById("sidebarGoReports")?.classList?.toggle?.(
			"hidden",
			currentRole !== "admin",
		);
		document.getElementById("sidebarGoCars")?.classList?.toggle?.(
			"hidden",
			currentRole !== "admin",
		);
		document.getElementById("sidebarGoLocations")?.classList?.toggle?.(
			"hidden",
			currentRole !== "admin",
		);
		// Маршруты видны всем авторизованным пользователям
		document.getElementById("sidebarGoRoutes")?.classList?.remove?.("hidden");

		if(currentRole === "admin") {
			access_key = response.access_key;
			get('reports_button').classList.remove('hidden');
			try {
				refreshUsersAdminList();
				refreshCarsAdminList();
				refreshLocationsAdminList();
			} catch (e) {
				console.error("Admin lists refresh:", e);
			}
		}

		// Keep legacy "session" global in sync for checkup submit endpoints.
		if (response?.session) {
			session = response.session;
			localStorage.setItem("session", response.session);
		} else {
			session = localStorage.getItem("session") || session;
		}

		// Car selector is available only after successful authorization
		const _cs = initCarSelector({
			endpoint,
			get,
			carsRequest: async () => _carsPromise,
			onCarsLoaded: () => {},
			onSelectCar: (car) => {
				selectCar({
					number: car.plateNumber,
					brand: car.brand,
					model: car.model,
					vin: car.vin,
					year: car.year,
					department: car.department,
					responsible: car.responsible,
				});
			},
			onClearCar: () => {
				clearSelectedCar();
			},
		});
		// Expose selected car globally for routes modal
		window._carSelectorGetSelected = () => _cs.getSelected();
	}
});

// Ensure these exist in module scope (prevents ReferenceError in strict ESM)
let checkUpPreData = {
	"id": user?.id,
	"date": new Date(),
	"number": null,
	"mileage": null,
	"photo_mileage": null,
	"geo": null,
	// exterior
	"photo_rl": null, "photo_rr": null, "photo_br": null, "photo_bl": null,
	"photo_r": null,  "photo_b": null,  "photo_l": null,  "photo_rg": null,
	"body_condition": null,
	// wheels
	"wheel_damaged": null,
	"wheel_damaged_photo": null,
	"wheels_ok": null,
	"random_wheel_photo": null,
	// interior
	"photo_irl": null, "photo_irr": null, "photo_ibr": null, "photo_ibl": null,
	"interior_condition": null,
	// gsm
	"oil_checked": null,
	"oil_level": null,
	"antifreeze_ok": null,
	"brakefluid_level": null,
	"glasswasher_ok": null,
	// extra checks
	"lighting_ok": null,
	"emergency_kit_ok": null,
	"glass_condition": null,
	// pt3
	"fuel_level": null,
	"dashboard_errors": null,
	"photo_dashboard": null,
	"registration_ok": null,
	"osago_date": null,
	"osago_missing": null,
	"wifi": null,
	"vpn": null,
	"additional_info": null,
	"critical_info": null,
	"photo_of_day": null,
	"quick_exit": null,
};

let checkUpPostData = {
	"id": user?.id,
	"date": new Date(),
	"number": null,
	"mileage": null,
	"photo_mileage": null,
	"geo": null,
	"oil_level": null,
	"antifreeze_ok": null,
	"brakefluid_level": null,
	"glasswasher_ok": null,
	"additional_info": null,
	"critical_info": null,
	"wheel_damaged": null,
	"wheel_damaged_photo": null,
	"random_wheel_photo": null,
	"fuel_level": null,
	"clean_ok": null,
	"interior_ok": null,
	"details_ok": null,
	"photo_of_day": null,
	"wifi": null,
	"vpn": null,
	"photo_rl": null,
	"photo_rr": null,
	"photo_br": null,
	"photo_bl": null,
	"photo_r": null,
	"photo_b": null,
	"photo_l": null,
	"photo_rg": null,
	"photo_irl": null,
	"photo_irr": null,
	"photo_ibr": null,
	"photo_ibl": null,
	"location": null,
};

var random_wheel = null;

var access_key = null;

var user_name = "USERNAME";
var user_surname;


let state = {
	driver: user?.id,
	car: null,
	mileage: null,
	photo: null,
	lat: null,
	lng: null
};

var user_data = JSON.stringify({ 
	user: user
})

date.innerText = "Дата: " + new Date().toLocaleDateString('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric'
}).replace(' г.', '');

// Cars are loaded by CarSelector after authorization.

pretrip_button.onclick = () => {
	nextPage("pretrip");
}

posttrip_button.onclick = async () => {
	nextPage("posttrip");
	try {
		const sel = document.getElementById("location_post");
		if (sel) {
			const locs = await getLocationsForDropdown();
			const current = sel.value;
			sel.innerHTML = '<option value="">— Выберите локацию —</option>';
			locs.forEach(l => {
				const opt = document.createElement("option");
				opt.value = l.name;
				opt.textContent = l.name;
				if (l.name === current) opt.selected = true;
				sel.appendChild(opt);
			});
		}
	} catch { }
}

// Posttrip "back" arrow (also useful for deep links)
get('posttripBack')?.addEventListener?.('click', () => {
	nextPage("car");
});

addPhotoBlock(get('photoChoice_mileage'), null, (photoData) => { checkUpPreData.photo_mileage = photoData; });
addPhotoBlock(get('photoBlock_panel'), null, (photoData) => { checkUpPostData.photo_mileage = photoData; });
addPhotoBlock(get('damagePhoto'), null, (photoData) => { checkUpPostData.damage_photo = photoData; });

addPhotoBlock(get('postPhoto_1'), 'Фото переднего левого угла', (photoData) => { checkUpPostData.photo_rl = photoData; });
addPhotoBlock(get('postPhoto_2'), 'Фото переднего правого угла', (photoData) => { checkUpPostData.photo_rr = photoData; });
addPhotoBlock(get('postPhoto_3'), 'Фото заднего правого угла', (photoData) => { checkUpPostData.photo_br = photoData; });
addPhotoBlock(get('postPhoto_4'), 'Фото заднего левого угла', (photoData) => { checkUpPostData.photo_bl = photoData; });

addPhotoBlock(get('postPhoto_5'), 'Фото открытая передняя левая дверь', (photoData) => { checkUpPostData.photo_irl = photoData; });
addPhotoBlock(get('postPhoto_6'), 'Фото открытая передняя правая дверь', (photoData) => { checkUpPostData.photo_irr = photoData; });
addPhotoBlock(get('postPhoto_7'), 'Фото открытая задняя правая дверь', (photoData) => { checkUpPostData.photo_ibr = photoData; });
addPhotoBlock(get('postPhoto_8'), 'Фото открытая задняя левая дверь', (photoData) => { checkUpPostData.photo_ibl = photoData; });

addPhotoBlock(document.getElementById('postPhoto_9'), null, (photoData) => { checkUpPostData.photo_of_day = photoData; });

addPhotoBlock(get('prePhoto_1'), 'Передний левый угол',  (d) => { checkUpPreData.photo_rl = d; });
addPhotoBlock(get('prePhoto_2'), 'Передний правый угол', (d) => { checkUpPreData.photo_rr = d; });
addPhotoBlock(get('prePhoto_3'), 'Задний правый угол',   (d) => { checkUpPreData.photo_br = d; });
addPhotoBlock(get('prePhoto_4'), 'Задний левый угол',    (d) => { checkUpPreData.photo_bl = d; });

addPhotoBlock(get('prePhoto_front'), 'Спереди (бампер, капот, стекло)',    (d) => { checkUpPreData.photo_r  = d; });
addPhotoBlock(get('prePhoto_rear'),  'Сзади (бампер, багажник, стекло)',   (d) => { checkUpPreData.photo_b  = d; });
addPhotoBlock(get('prePhoto_left'),  'Левая сторона (бампера, двери)',     (d) => { checkUpPreData.photo_l  = d; });
addPhotoBlock(get('prePhoto_right'), 'Правая сторона (бампера, двери)',    (d) => { checkUpPreData.photo_rg = d; });

addPhotoBlock(get('prePhoto_5'), 'Салон — водительская дверь открыта',        (d) => { checkUpPreData.photo_irl = d; });
addPhotoBlock(get('prePhoto_6'), 'Салон — правая передняя дверь открыта',     (d) => { checkUpPreData.photo_irr = d; });
addPhotoBlock(get('prePhoto_7'), 'Салон — правая задняя дверь (необязательно)', (d) => { checkUpPreData.photo_ibr = d; });
addPhotoBlock(get('prePhoto_8'), 'Салон — левая задняя дверь (необязательно)', (d) => { checkUpPreData.photo_ibl = d; });

addPhotoBlock(get('photoBlock_panel_pre'), null, (d) => { checkUpPreData.photo_dashboard = d; });

// Show a retake-able thumbnail next to a wheel photo choice container.
function showWheelThumb(choiceEl, photoData, onClear) {
	const existing = choiceEl.parentElement?.querySelector('.wheelThumb');
	if (existing) existing.remove();

	choiceEl.classList.add('hidden');

	const wrap = document.createElement('div');
	wrap.className = 'photoThumbs wheelThumb';

	const item = document.createElement('div');
	item.className = 'photoThumb';

	const img = document.createElement('img');
	img.className = 'photoThumb__img';
	img.src = photoData;
	img.alt = '';

	const btn = document.createElement('button');
	btn.type = 'button';
	btn.className = 'photoThumb__remove';
	btn.innerText = '×';
	btn.onclick = () => {
		wrap.remove();
		choiceEl.classList.remove('hidden');
		if (onClear) onClear();
	};

	item.appendChild(img);
	item.appendChild(btn);
	wrap.appendChild(item);
	choiceEl.after(wrap);
}

// Opens the native system camera (or file picker on desktop) and returns a
// resized JPEG data URL via callback. max 1920px on the longest side.
function capturePhotoFromFile(callback) {
	const input = document.createElement('input');
	input.type = 'file';
	input.accept = 'image/*';
	input.capture = 'environment';
	input.onchange = () => {
		const file = input.files?.[0];
		if (!file) return;
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			URL.revokeObjectURL(url);
			const MAX = 1920;
			let w = img.naturalWidth, h = img.naturalHeight;
			if (w > MAX || h > MAX) {
				if (w >= h) { h = Math.round(h * MAX / w); w = MAX; }
				else        { w = Math.round(w * MAX / h); h = MAX; }
			}
			const c = document.createElement('canvas');
			c.width = w; c.height = h;
			c.getContext('2d').drawImage(img, 0, 0, w, h);
			callback(c.toDataURL('image/jpeg', 0.88));
		};
		img.onerror = () => URL.revokeObjectURL(url);
		img.src = url;
	};
	input.click();
}

function addPhotoBlock(parent, info, action){
    var clone = photoBlockTemplate.cloneNode(true);

    clone.id = '';
	clone.style = 'display: block;';
	clone.classList.add('photoBlock');

	clone.querySelector('#info_photoBlockTemplate').innerText = info;

	if(info != null) clone.querySelector('#info_photoBlockTemplate').style = 'display: block;';

	// Thumbnails container (keeps UI compact; does not affect business logic)
	const thumbs = document.createElement('div');
	thumbs.className = 'photoThumbs';
	const photoChoiceRoot = clone.querySelector('#photoChoice_photoBlockTemplate');
	photoChoiceRoot?.after?.(thumbs);

	const setThumb = (photoData) => {
		thumbs.innerHTML = '';
		if (!photoData) return;

		const item = document.createElement('div');
		item.className = 'photoThumb';

		const img = document.createElement('img');
		img.className = 'photoThumb__img';
		img.src = photoData;
		img.alt = '';
		img.onerror = () => {
			thumbs.innerHTML = '';
			const err = document.createElement('div');
			err.className = 'photoThumb';
			err.style.color = '#b91c1c';
			err.style.fontSize = '13px';
			err.textContent = 'Не удалось показать превью';
			thumbs.appendChild(err);
		};

		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'photoThumb__remove';
		btn.innerText = '×';
		btn.onclick = () => {
			thumbs.innerHTML = '';
			if (action) action(null);
		};

		item.appendChild(img);
		item.appendChild(btn);
		thumbs.appendChild(item);
	};

	clone.querySelector('#photoBlockTemplate_photo_button').onclick = () => {
		capturePhotoFromFile((photo) => {
			if (action) action(photo);
			setThumb(photo);
		});
	};

	parent.appendChild(clone);
}

var triple_switch_iterator = 1;

// wifi/vpn are now inline segmented HTML — no JS needed to build them

function addTripleSwitch(parent, title, name, v1, v2, v3){
	if(!parent) return null;

	var clone = get('switch-container-template').cloneNode(true);
	clone.id = '';
	clone.classList.remove('hidden');

	clone.querySelector('#triple-switch-title').innerText = title;

	clone.querySelector('#switch-z').name = name;
	clone.querySelector('#switch-x').name = name;
	clone.querySelector('#switch-c').name = name;
	clone.querySelector('#switch-o').name = name;

	clone.querySelector('#switch-z').id = "switch-z" + triple_switch_iterator;
	clone.querySelector('#switch-x').id = "switch-x" + triple_switch_iterator;
	clone.querySelector('#switch-c').id = "switch-c" + triple_switch_iterator;
	clone.querySelector('#switch-o').id = "switch-o" + triple_switch_iterator;

	clone.querySelector('#switch-zl').setAttribute('for', 'switch-z' + triple_switch_iterator);
	clone.querySelector('#switch-xl').setAttribute('for', 'switch-x' + triple_switch_iterator);
	clone.querySelector('#switch-cl').setAttribute('for', 'switch-c' + triple_switch_iterator);
	clone.querySelector('#switch-ol').setAttribute('for', 'switch-o' + triple_switch_iterator);

	if(v1 != null && v1 != '') clone.querySelector('#switch-zl').innerText = v1;
	if(v2 != null && v2 != '') clone.querySelector('#switch-xl').innerText = v2;
	if(v3 != null && v3 != '') clone.querySelector('#switch-cl').innerText = v3;

	triple_switch_iterator++;

	parent.innerHTML = "";
	parent.appendChild(clone);

	return clone;
}

if(photodayBlock){
	addPhotoBlock(photodayBlock, null, (photoData) => { checkUpPreData.photo_of_day = photoData; });
}

damagedwheelPhoto_button.onclick = () => {
	capturePhotoFromFile((photo) => {
		checkUpPreData.wheel_damaged_photo = photo;
		showWheelThumb(photoChoice_damagedwheel, photo, () => {
			checkUpPreData.wheel_damaged_photo = null;
		});
	});
}

wheelokPhoto_button.onclick = () => {
	capturePhotoFromFile((photo) => {
		checkUpPreData.random_wheel_photo = photo;
		showWheelThumb(photoChoice_wheelok, photo, () => {
			checkUpPreData.random_wheel_photo = null;
		});
	});
}

mileageInput.addEventListener('input', (event) => {
	var input_value = mileageInput.value;  
  
	input_value = input_value.replace(/\D/g, "");
  
	if(input_value.length > 10) input_value = input_value.substr(0, 10);
  
	mileageInput.value = input_value;

	//console.log(input_value);

	checkUpPreData.mileage = input_value;

	if(input_value.length > 0) {
		// mileagePhoto_button.classList.remove('inactive');
		// mileageUpload_button.classList.remove('inactive');
	}
	else {
		//toPhoto.classList.add('inactive');
	}
  });

// Old manual plate input/dropdown removed (replaced by CarSelector modal).

function selectCar(car) {
	if (!car) return;
	state.car = car.number;
	pretrip_button.classList.remove("inactive");
	get('posttrip_button').classList.remove('inactive');
	checkUpPreData.number = car.number;
	checkUpPostData.number = car.number;

	// Prefer local data from selector; fallback to API for legacy compatibility.
	if (car.brand || car.model) {
		get('number').innerText = (car.brand || "") + " " + (car.model || "") + " " + car.number;
	} else {
		postRequest(endpoint + "/api/get-car", JSON.stringify({"number": car.number})).then(response => {
			if (response?.status === "ok" && (response.brand || response.model)) {
				get('number').innerText = (response.brand || "") + " " + (response.model || "") + " " + car.number;
			} else {
				get('number').innerText = car.number || "";
			}
		}).catch(() => {
			get('number').innerText = car.number || "";
		});
	}
}

function clearSelectedCar(){
	state.car = null;
	checkUpPreData.number = null;
	checkUpPostData.number = null;
	get('number').innerText = "";
	pretrip_button.classList.add("inactive");
	get('posttrip_button').classList.add('inactive');
}

function nextPage(name) {
	document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
	document.getElementById("page-" + name).classList.add("active");
}

async function apiGetUsers(){
	const s = localStorage.getItem("session") || "";
	const r = await fetch(endpoint + "/api/users?session=" + encodeURIComponent(s), { credentials: "same-origin", cache: "no-store" });
	return await r.json();
}

async function apiUpsertUser(user){
	const s = localStorage.getItem("session") || "";
	return await postRequest(endpoint + "/api/users/upsert", JSON.stringify({ session: s, user }));
}

async function apiDeleteUser(id){
	const s = localStorage.getItem("session") || "";
	return await postRequest(endpoint + "/api/users/delete", JSON.stringify({ session: s, id }));
}

async function apiGetCarsAdmin(){
	const s = localStorage.getItem("session") || "";
	const r = await fetch(endpoint + "/api/admin/cars?session=" + encodeURIComponent(s), { credentials: "same-origin", cache: "no-store" });
	return await r.json();
}

async function apiUpsertCarAdmin(car){
	const s = localStorage.getItem("session") || "";
	return await postRequest(endpoint + "/api/admin/cars/upsert", JSON.stringify({ session: s, car }));
}

async function apiDeleteCarAdmin(id){
	const s = localStorage.getItem("session") || "";
	return await postRequest(endpoint + "/api/admin/cars/delete", JSON.stringify({ session: s, id }));
}

function initUsersAdminUi(){
	const tbody = document.getElementById("usersTbody");
	const status = document.getElementById("usersStatus");

	const btnOpenAdd = document.getElementById("usersOpenAdd");
	const btnBack = document.getElementById("usersBackBtn");

	// Modal elements
	const modal = document.getElementById("userModal");
	const modalOverlay = document.getElementById("userModalOverlay");
	const modalTitle = document.getElementById("userModalTitle");
	const modalCancel = document.getElementById("userModalCancel");
	const modalSubmit = document.getElementById("userModalSubmit");
	const modalStatus = document.getElementById("userModalStatus");

	// Confirm delete modal
	const confirmModal = document.getElementById("confirmModal");
	const confirmOverlay = document.getElementById("confirmModalOverlay");
	const confirmText = document.getElementById("confirmModalText");
	const confirmYes = document.getElementById("confirmDeleteYes");
	const confirmNo = document.getElementById("confirmDeleteNo");

	const inId = document.getElementById("userEditId");
	const inSurname = document.getElementById("userSurname");
	const inName = document.getElementById("userName");
	const inPatr = document.getElementById("userPatronymic");
	const inRole = document.getElementById("userRole");
	const inLogin = document.getElementById("userLogin");
	const inPass = document.getElementById("userPassword");

	if (!tbody || !btnOpenAdd || !btnBack || !modal || !modalOverlay || !modalTitle || !modalCancel || !modalSubmit) return;
	if (!confirmModal || !confirmOverlay || !confirmText || !confirmYes || !confirmNo) return;

	let all = [];

	const setStatus = (t) => { if (status) status.textContent = t || ""; };
	const setModalStatus = (t) => { if (modalStatus) modalStatus.textContent = t || ""; };

	const openModal = () => {
		modal.classList.remove("hidden");
		modalOverlay.classList.remove("hidden");
		modal.setAttribute("aria-hidden", "false");
		modalOverlay.setAttribute("aria-hidden", "false");
		window._onModalOpen?.();
	};

	const closeModal = () => {
		modal.classList.add("hidden");
		modalOverlay.classList.add("hidden");
		modal.setAttribute("aria-hidden", "true");
		modalOverlay.setAttribute("aria-hidden", "true");
		setModalStatus("");
		window._onModalClose?.();
	};

	const confirmDelete = (label) => {
		return new Promise((resolve) => {
			confirmText.textContent = `Вы точно уверены, что хотите удалить пользователя${label ? ` «${label}»` : ""}?`;

			const open = () => {
				confirmModal.classList.remove("hidden");
				confirmOverlay.classList.remove("hidden");
				confirmModal.setAttribute("aria-hidden", "false");
				confirmOverlay.setAttribute("aria-hidden", "false");
				window._onModalOpen?.();
			};

			const close = () => {
				confirmModal.classList.add("hidden");
				confirmOverlay.classList.add("hidden");
				confirmModal.setAttribute("aria-hidden", "true");
				confirmOverlay.setAttribute("aria-hidden", "true");
				window._onModalClose?.();
			};

			const cleanup = () => {
				confirmYes.onclick = null;
				confirmNo.onclick = null;
				confirmOverlay.onclick = null;
			};

			confirmYes.onclick = () => { cleanup(); close(); resolve(true); };
			confirmNo.onclick = () => { cleanup(); close(); resolve(false); };
			confirmOverlay.onclick = () => { cleanup(); close(); resolve(false); };

			open();
		});
	};

	const fillForm = (u) => {
		inId && (inId.value = u?.id ? String(u.id) : "");
		inSurname && (inSurname.value = u?.surname || "");
		inName && (inName.value = u?.name || "");
		inPatr && (inPatr.value = u?.patronymic || "");
		inRole && (inRole.value = (u?.role || "user").toLowerCase());
		inLogin && (inLogin.value = u?.login || "");
		inPass && (inPass.value = u?.password || "");
	};

	const render = () => {
		tbody.innerHTML = "";
		all.forEach((u) => {
			const fio = [u.surname, u.name, u.patronymic].filter(Boolean).join(" ").trim();
			const tr = document.createElement("tr");
			tr.innerHTML = `
				<td style="padding:8px; border-top:1px solid rgba(226,232,240,0.8); font-size:13px;">${fio}</td>
				<td style="padding:8px; border-top:1px solid rgba(226,232,240,0.8); font-size:13px;">${u.login || ""}</td>
				<td style="padding:8px; border-top:1px solid rgba(226,232,240,0.8); font-size:13px;">${u.role || ""}</td>
				<td style="padding:6px; border-top:1px solid rgba(226,232,240,0.8); white-space:nowrap;">
					<div class="usersActions">
						<button class="btn btn--secondary btn--xxs" data-act="edit" data-id="${u.id}" title="Редактировать" aria-label="Редактировать">✎</button>
						<button class="btn btn--danger btn--xxs" data-act="del" data-id="${u.id}" title="Удалить" aria-label="Удалить">🗑</button>
					</div>
				</td>
			`;
			tbody.appendChild(tr);
		});
	};

	const load = async () => {
		setStatus("Загрузка...");
		const r = await apiGetUsers();
		if (r?.status !== "ok") {
			setStatus("Нет доступа или ошибка загрузки");
			all = [];
			render();
			return;
		}
		all = Array.isArray(r.users) ? r.users : [];
		setStatus(`Пользователей: ${all.length}`);
		render();
	};

	btnBack.onclick = () => nextPage("car");

	btnOpenAdd.onclick = () => {
		modalTitle.textContent = "Добавление пользователя";
		modalSubmit.textContent = "Добавить";
		fillForm(null);
		openModal();
		inLogin?.focus?.();
	};

	const onCloseAny = () => closeModal();
	modalCancel.onclick = onCloseAny;
	modalOverlay.addEventListener("click", onCloseAny);

	tbody.addEventListener("click", async (e) => {
		const btn = e.target?.closest?.("button");
		if (!btn) return;
		const act = btn.getAttribute("data-act");
		const id = Number(btn.getAttribute("data-id"));
		const u = all.find((x) => Number(x.id) === id);
		if (!act || !id) return;

		if (act === "edit") {
			modalTitle.textContent = "Редактирование пользователя";
			modalSubmit.textContent = "Сохранить";
			fillForm(u);
			openModal();
			return;
		}
		if (act === "del") {
			const fio = [u?.surname, u?.name, u?.patronymic].filter(Boolean).join(" ").trim();
			const ok = await confirmDelete(fio || u?.login || "");
			if (!ok) return;
			setStatus("Удаление...");
			await apiDeleteUser(id);
			await load();
		}
	});

	modalSubmit.onclick = async () => {
		const id = Number((inId?.value || "").trim()) || 0;
		const user = {
			id,
			surname: (inSurname?.value || "").trim(),
			name: (inName?.value || "").trim(),
			patronymic: (inPatr?.value || "").trim(),
			role: (inRole?.value || "user").trim(),
			login: (inLogin?.value || "").trim(),
			password: (inPass?.value || "").trim(),
		};
		setModalStatus("Сохранение...");
		const r = await apiUpsertUser(user);
		if (r?.status !== "ok") {
			setModalStatus("Ошибка сохранения");
			return;
		}
		closeModal();
		await load();
	};

	refreshUsersAdminList = load;
}

// Initialize admin users screen (safe if elements not present)
initUsersAdminUi();

function initCarsAdminUi(){
	const tbody = document.getElementById("carsTbody");
	const status = document.getElementById("carsStatus");
	const btnOpenAdd = document.getElementById("carsOpenAdd");
	const btnBack = document.getElementById("carsBackBtn");

	// Modal
	const modal = document.getElementById("carModal");
	const overlay = document.getElementById("carModalOverlay");
	const title = document.getElementById("carModalTitle");
	const btnCancel = document.getElementById("carModalCancel");
	const btnSubmit = document.getElementById("carModalSubmit");
	const modalStatus = document.getElementById("carModalStatus");

	const inId = document.getElementById("carEditId");
	const inNumber = document.getElementById("carNumber");
	const inBrand = document.getElementById("carBrand");
	const inModel = document.getElementById("carModel");
	const inVin = document.getElementById("carVin");
	const inYear = document.getElementById("carYear");
	const inDepartment = document.getElementById("carDepartment");
	const inResponsible = document.getElementById("carResponsible");

	// Confirm delete
	const cModal = document.getElementById("confirmCarModal");
	const cOverlay = document.getElementById("confirmCarModalOverlay");
	const cText = document.getElementById("confirmCarModalText");
	const cYes = document.getElementById("confirmCarDeleteYes");
	const cNo = document.getElementById("confirmCarDeleteNo");

	if (!tbody || !btnOpenAdd || !btnBack) return;
	if (!modal || !overlay || !title || !btnCancel || !btnSubmit || !modalStatus) return;
	if (!cModal || !cOverlay || !cText || !cYes || !cNo) return;

	let all = [];
	const setStatus = (t) => { if (status) status.textContent = t || ""; };
	const setModalStatus = (t) => { modalStatus.textContent = t || ""; };

	const openModal = () => {
		modal.classList.remove("hidden");
		overlay.classList.remove("hidden");
		modal.setAttribute("aria-hidden", "false");
		overlay.setAttribute("aria-hidden", "false");
		window._onModalOpen?.();
	};
	const closeModal = () => {
		modal.classList.add("hidden");
		overlay.classList.add("hidden");
		modal.setAttribute("aria-hidden", "true");
		overlay.setAttribute("aria-hidden", "true");
		setModalStatus("");
		window._onModalClose?.();
	};

	const fill = (c) => {
		inId && (inId.value = c?.id ? String(c.id) : "");
		inNumber && (inNumber.value = c?.number || "");
		inBrand && (inBrand.value = c?.brand || "");
		inModel && (inModel.value = c?.model || "");
		inVin && (inVin.value = c?.vin || "");
		inYear && (inYear.value = c?.year || "");
		inDepartment && (inDepartment.value = c?.department || "");
		inResponsible && (inResponsible.value = c?.responsible || "");
	};

	const render = () => {
		tbody.innerHTML = "";
		all.forEach((c) => {
			const tr = document.createElement("tr");
			tr.innerHTML = `
				<td class="mono" style="padding:8px; border-top:1px solid rgba(226,232,240,0.8); font-size:12px; color:#64748b;">${c.id ?? ""}</td>
				<td class="mono" style="padding:8px; border-top:1px solid rgba(226,232,240,0.8); font-size:13px;">${c.number || ""}</td>
				<td style="padding:8px; border-top:1px solid rgba(226,232,240,0.8); font-size:13px;">${c.brand || ""}</td>
				<td class="mono" style="padding:8px; border-top:1px solid rgba(226,232,240,0.8); font-size:12px;">${c.vin || ""}</td>
				<td style="padding:6px; border-top:1px solid rgba(226,232,240,0.8); white-space:nowrap;">
					<div class="usersActions">
						<button class="btn btn--secondary btn--xxs" data-act="edit" data-id="${c.id}" title="Редактировать" aria-label="Редактировать">✎</button>
						<button class="btn btn--danger btn--xxs" data-act="del" data-id="${c.id}" title="Удалить" aria-label="Удалить">🗑</button>
					</div>
				</td>
			`;
			tbody.appendChild(tr);
		});
	};

	const load = async () => {
		setStatus("Загрузка...");
		const r = await apiGetCarsAdmin();
		if (r?.status !== "ok") {
			setStatus("Нет доступа или ошибка загрузки");
			all = [];
			render();
			return;
		}
		all = Array.isArray(r.cars) ? r.cars : [];
		setStatus(`Автомобилей: ${all.length}`);
		render();
	};

	const confirmDelete = (label) => {
		return new Promise((resolve) => {
			cText.textContent = `Вы точно уверены, что хотите удалить автомобиль${label ? ` «${label}»` : ""}?`;

			const open = () => {
				cModal.classList.remove("hidden");
				cOverlay.classList.remove("hidden");
				cModal.setAttribute("aria-hidden", "false");
				cOverlay.setAttribute("aria-hidden", "false");
				window._onModalOpen?.();
			};
			const close = () => {
				cModal.classList.add("hidden");
				cOverlay.classList.add("hidden");
				cModal.setAttribute("aria-hidden", "true");
				cOverlay.setAttribute("aria-hidden", "true");
				window._onModalClose?.();
			};
			const cleanup = () => {
				cYes.onclick = null;
				cNo.onclick = null;
				cOverlay.onclick = null;
			};

			cYes.onclick = () => { cleanup(); close(); resolve(true); };
			cNo.onclick = () => { cleanup(); close(); resolve(false); };
			cOverlay.onclick = () => { cleanup(); close(); resolve(false); };
			open();
		});
	};

	btnBack.onclick = () => nextPage("car");
	btnOpenAdd.onclick = () => {
		title.textContent = "Добавление автомобиля";
		btnSubmit.textContent = "Добавить";
		fill(null);
		openModal();
		inNumber?.focus?.();
	};

	btnCancel.onclick = () => closeModal();
	overlay.addEventListener("click", () => closeModal());

	tbody.addEventListener("click", async (e) => {
		const btn = e.target?.closest?.("button");
		if (!btn) return;
		const act = btn.getAttribute("data-act");
		const id = Number(btn.getAttribute("data-id"));
		const c = all.find((x) => Number(x.id) === id);
		if (!act || !id) return;

		if (act === "edit") {
			title.textContent = "Редактирование автомобиля";
			btnSubmit.textContent = "Сохранить";
			fill(c);
			openModal();
			return;
		}
		if (act === "del") {
			const ok = await confirmDelete(c?.number || "");
			if (!ok) return;
			setStatus("Удаление...");
			await apiDeleteCarAdmin(id);
			await load();
		}
	});

	btnSubmit.onclick = async () => {
		const id = Number((inId?.value || "").trim()) || 0;
		const car = {
			id,
			number: (inNumber?.value || "").trim(),
			brand: (inBrand?.value || "").trim(),
			model: (inModel?.value || "").trim(),
			vin: (inVin?.value || "").trim(),
			year: (inYear?.value || "").trim(),
			department: (inDepartment?.value || "").trim(),
			responsible: (inResponsible?.value || "").trim(),
		};
		setModalStatus("Сохранение...");
		const r = await apiUpsertCarAdmin(car);
		if (r?.status !== "ok") {
			setModalStatus("Ошибка сохранения");
			return;
		}
		closeModal();
		await load();
	};

	refreshCarsAdminList = load;
}

initCarsAdminUi();

{
	const locs = initLocationsAdminUi({ endpoint, postRequest, get, onNavigate: nextPage });
	refreshLocationsAdminList = locs.refresh;
	getLocationsForDropdown = locs.getLocations;
}

// ── Routes ────────────────────────────────────────────────────────────────
{
  let _activeRoute = null; // текущий активный маршрут водителя

  const s = () => localStorage.getItem("session") || "";

  async function apiGetRoutes() {
    const r = await fetch(endpoint + "/api/routes?session=" + encodeURIComponent(s()), { credentials: "same-origin", cache: "no-store" });
    return r.json();
  }
  async function apiCreateRoute(body) {
    return postRequest(endpoint + "/api/routes", JSON.stringify({ session: s(), ...body }));
  }
  async function apiCompleteRoute(id) {
    return postRequest(endpoint + "/api/routes/" + id + "/complete", JSON.stringify({ session: s() }));
  }
  async function apiGetBoard() {
    const r = await fetch(endpoint + "/api/routes/board?session=" + encodeURIComponent(s()), { credentials: "same-origin", cache: "no-store" });
    return r.json();
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    try { return new Date(iso).toLocaleString("ru-RU", { day:"2-digit", month:"2-digit", year:"2-digit", hour:"2-digit", minute:"2-digit" }); }
    catch { return iso; }
  }

  // ── Модалка создания маршрута ──
  const routeModal        = document.getElementById("routeModal");
  const routeModalOverlay = document.getElementById("routeModalOverlay");
  const routeFromSelect   = document.getElementById("routeFromSelect");
  const routeToSelect     = document.getElementById("routeToSelect");
  const routeModalStatus  = document.getElementById("routeModalStatus");
  const routeModalCarSearch = document.getElementById("routeModalCarSearch");
  const routeModalCarList   = document.getElementById("routeModalCarList");
  const routeModalCarChosen = document.getElementById("routeModalCarChosen");

  let _routeModalSelectedCar = null; // { plateNumber, brand, model }

  // Поиск машины внутри модалки
  let _allCarsCache = [];
  _carsPromise.then(data => { _allCarsCache = Array.isArray(data?.cars) ? data.cars : []; });

  function routeModalRenderList(query) {
    if (!routeModalCarList) return;
    const q = (query || "").toLowerCase().trim();
    const matches = q.length === 0 ? _allCarsCache : _allCarsCache.filter(c =>
      (c.plateNumber || "").toLowerCase().includes(q) ||
      (c.brand || "").toLowerCase().includes(q) ||
      (c.model || "").toLowerCase().includes(q)
    );
    if (matches.length === 0) {
      routeModalCarList.innerHTML = '<div style="padding:10px 14px; font-size:13px; color:#94a3b8;">Не найдено</div>';
    } else {
      routeModalCarList.innerHTML = matches.slice(0, 30).map(c => {
        const label = [c.brand, c.model, c.plateNumber].filter(Boolean).join(" ");
        return `<div class="vehicleCard__searchItem" data-plate="${c.plateNumber}" data-brand="${c.brand||''}" data-model="${c.model||''}"
          style="padding:10px 14px; cursor:pointer; font-size:14px; border-bottom:1px solid #f1f5f9;">${label}</div>`;
      }).join("");
      routeModalCarList.querySelectorAll(".vehicleCard__searchItem").forEach(el => {
        el.addEventListener("click", () => {
          _routeModalSelectedCar = { plateNumber: el.dataset.plate, brand: el.dataset.brand, model: el.dataset.model };
          const label = [_routeModalSelectedCar.brand, _routeModalSelectedCar.model, _routeModalSelectedCar.plateNumber].filter(Boolean).join(" ");
          routeModalCarSearch.value = label;
          routeModalCarChosen.textContent = "✓ " + label;
          routeModalCarChosen.classList.remove("hidden");
          routeModalCarList.classList.add("hidden");
          // Авто-заполнение «Откуда» из последнего маршрута
          if (_activeRouteLastLocation) routeFromSelect.value = _activeRouteLastLocation;
        });
      });
    }
    routeModalCarList.classList.remove("hidden");
  }

  routeModalCarSearch?.addEventListener("input", () => {
    _routeModalSelectedCar = null;
    routeModalCarChosen?.classList.add("hidden");
    routeModalRenderList(routeModalCarSearch.value);
  });
  routeModalCarSearch?.addEventListener("focus", () => routeModalRenderList(routeModalCarSearch.value));
  document.addEventListener("click", e => {
    if (!routeModal?.contains(e.target)) return;
    if (!routeModalCarSearch?.contains(e.target) && !routeModalCarList?.contains(e.target)) {
      routeModalCarList?.classList.add("hidden");
    }
  });

  function openRouteModal() {
    if (!routeModal) return;
    routeModalStatus.textContent = "";
    // Сбрасываем выбор машины, но пробуем подставить из CarSelector
    _routeModalSelectedCar = null;
    const preselected = window._carSelectorGetSelected?.();
    if (preselected) {
      _routeModalSelectedCar = { plateNumber: preselected.plateNumber, brand: preselected.brand, model: preselected.model };
      const label = [preselected.brand, preselected.model, preselected.plateNumber].filter(Boolean).join(" ");
      routeModalCarSearch.value = label;
      routeModalCarChosen.textContent = "✓ " + label;
      routeModalCarChosen.classList.remove("hidden");
    } else {
      routeModalCarSearch.value = "";
      routeModalCarChosen?.classList.add("hidden");
    }
    routeModalCarList?.classList.add("hidden");
    routeModal.classList.remove("hidden");
    routeModalOverlay.classList.remove("hidden");
    routeModal.setAttribute("aria-hidden", "false");
    routeModalOverlay.setAttribute("aria-hidden", "false");
    window._onModalOpen?.();
    // Заполняем локации
    getLocationsForDropdown().then(locs => {
      [routeFromSelect, routeToSelect].forEach(sel => {
        sel.innerHTML = '<option value="">— не указано —</option>';
        locs.forEach(l => {
          const o = document.createElement("option");
          o.value = l.name; o.textContent = l.name;
          sel.appendChild(o);
        });
      });
      if (_activeRouteLastLocation) routeFromSelect.value = _activeRouteLastLocation;
    });
  }

  function closeRouteModal() {
    routeModal?.classList.add("hidden");
    routeModalOverlay?.classList.add("hidden");
    routeModal?.setAttribute("aria-hidden", "true");
    routeModalOverlay?.setAttribute("aria-hidden", "true");
    routeModalCarList?.classList.add("hidden");
    window._onModalClose?.();
  }

  document.getElementById("routeModalCancel")?.addEventListener("click", closeRouteModal);
  routeModalOverlay?.addEventListener("click", closeRouteModal);

  async function submitRouteModal(withCheckup) {
    const car = _routeModalSelectedCar;
    const toLoc = routeToSelect?.value?.trim();
    if (!car) { routeModalStatus.textContent = "Сначала выберите автомобиль."; return; }
    if (!toLoc) { routeModalStatus.textContent = "Укажите локацию назначения."; return; }
    routeModalStatus.textContent = "";
    const btnCreate = document.getElementById("routeModalCreate");
    const btnNoChk  = document.getElementById("routeModalCreateNoCheckup");
    if (btnCreate) btnCreate.disabled = true;
    if (btnNoChk)  btnNoChk.disabled  = true;
    try {
      const res = await apiCreateRoute({
        car_number: car.plateNumber,
        from_location: routeFromSelect?.value?.trim() || "",
        to_location: toLoc,
      });
      if (res?.status === "ok") {
        closeRouteModal();
        await loadDriverRoutes();
        // Если нажали «Создать» — предлагаем чек-ап перед выездом
        if (withCheckup && res.route?.id) {
          localStorage.setItem("activeRouteId", String(res.route.id));
          nextPage("pretrip");
        }
      } else if (res?.error === "CAR_BUSY") {
        routeModalStatus.textContent = "Этот автомобиль уже в маршруте.";
      } else {
        routeModalStatus.textContent = "Ошибка создания маршрута.";
      }
    } catch { routeModalStatus.textContent = "Ошибка сети."; }
    finally {
      if (btnCreate) btnCreate.disabled = false;
      if (btnNoChk)  btnNoChk.disabled  = false;
    }
  }

  document.getElementById("routeModalCreate")?.addEventListener("click", () => submitRouteModal(true));
  document.getElementById("routeModalCreateNoCheckup")?.addEventListener("click", () => submitRouteModal(false));

  document.getElementById("routeCreateBtn")?.addEventListener("click", openRouteModal);

  // ── Завершить без осмотра ──
  document.getElementById("routeActiveComplete")?.addEventListener("click", async () => {
    if (!_activeRoute) return;
    if (!confirm("Завершить маршрут без осмотра по прибытии?")) return;
    const res = await apiCompleteRoute(_activeRoute.id);
    if (res?.status === "ok") await loadDriverRoutes();
  });

  // ── Чек-ап из маршрута ──
  document.getElementById("routeActivePreCheckup")?.addEventListener("click", () => {
    if (_activeRoute) localStorage.setItem("activeRouteId", String(_activeRoute.id));
    nextPage("pretrip");
  });
  document.getElementById("routeActivePostCheckup")?.addEventListener("click", async () => {
    if (_activeRoute) {
      localStorage.setItem("activeRouteId", String(_activeRoute.id));
      // Предзаполняем локацию назначения маршрута
      localStorage.setItem("activeRouteToLocation", _activeRoute.to_location || "");
    }
    nextPage("posttrip");
    // Ждём отрисовки селекта и подставляем нужную локацию
    try {
      const sel = document.getElementById("location_post");
      if (sel && _activeRoute?.to_location) {
        const locs = await getLocationsForDropdown();
        sel.innerHTML = '<option value="">— Выберите локацию —</option>';
        locs.forEach(l => {
          const opt = document.createElement("option");
          opt.value = l.name; opt.textContent = l.name;
          if (l.name === _activeRoute.to_location) opt.selected = true;
          sel.appendChild(opt);
        });
      }
    } catch {}
  });

  // ── Последняя известная локация машины (для автозаполнения «Откуда») ──
  let _activeRouteLastLocation = "";

  // ── Отрисовка списка водителя ──
  async function loadDriverRoutes() {
    const data = await apiGetRoutes();
    if (data?.status !== "ok") return;
    const routes = data.routes || [];

    _activeRoute = routes.find(r => r.status === "active") || null;
    // последняя известная = to_location последнего завершённого
    const lastCompleted = routes.filter(r => r.status === "completed")[0];
    _activeRouteLastLocation = lastCompleted?.to_location || "";

    // Активный маршрут
    const activeWrap = document.getElementById("routeActiveWrap");
    const activeInfo = document.getElementById("routeActiveInfo");
    if (_activeRoute) {
      activeWrap?.classList.remove("hidden");
      const from = _activeRoute.from_location || "—";
      const to   = _activeRoute.to_location   || "—";
      const car  = [_activeRoute.car_brand, _activeRoute.car_model, _activeRoute.car_number].filter(Boolean).join(" ");
      activeInfo.innerHTML =
        `<b>${car}</b><br>${from} → <b>${to}</b><br><span style="color:#94a3b8">Выехал: ${fmtDate(_activeRoute.departed_at)}</span>`;
      // Показать кнопку pre-checkup только если ещё не был сделан
      const preBtn = document.getElementById("routeActivePreCheckup");
      if (preBtn) preBtn.classList.toggle("hidden", !!_activeRoute.pre_checkup_id);
    } else {
      activeWrap?.classList.add("hidden");
    }

    // Архив
    const list = document.getElementById("routeDriverList");
    const completed = routes.filter(r => r.status === "completed");
    if (!list) return;
    if (completed.length === 0) {
      list.innerHTML = '<div style="color:#94a3b8; font-size:13px; text-align:center; padding:20px 0;">Нет завершённых маршрутов</div>';
      return;
    }
    list.innerHTML = completed.map(r => {
      const from = r.from_location || "—";
      const to   = r.to_location   || "—";
      const car  = [r.car_brand, r.car_model, r.car_number].filter(Boolean).join(" ");
      return `<div class="routeArchiveItem">
        <span class="routeArchiveItem__status">✅</span>
        <div class="routeArchiveItem__body">
          <div class="routeArchiveItem__route">${from} → ${to}</div>
          <div class="routeArchiveItem__meta">${car} · ${fmtDate(r.arrived_at)}</div>
        </div>
      </div>`;
    }).join("");
  }

  // ── Доска для администратора ──
  async function loadAdminBoard() {
    const boardWrap = document.getElementById("routesBoardWrap");
    if (!boardWrap) return;
    boardWrap.innerHTML = '<div style="color:#94a3b8; font-size:13px; padding:20px 0;">Загрузка...</div>';
    const data = await apiGetBoard();
    if (data?.status !== "ok") { boardWrap.innerHTML = '<div style="color:#ef4444;">Ошибка загрузки</div>'; return; }

    const locations = data.locations || [];
    const cars      = data.cars || [];

    // Колонки: «В пути» + все локации
    const cols = [{ key: "__transit__", label: "В пути", transit: true }, ...locations.map(l => ({ key: l, label: l, transit: false }))];

    boardWrap.innerHTML = cols.map(col => {
      const colCars = col.transit
        ? cars.filter(c => c.active_route)
        : cars.filter(c => !c.active_route && c.current_location === col.key);

      const cards = colCars.map(c => {
        const ar = c.active_route;
        const model = [c.car_brand, c.car_model].filter(Boolean).join(" ");
        const routeHtml = ar
          ? `<div class="routesCarCard__route">➜ ${ar.to_location}</div><div class="routesCarCard__driver">${ar.driver_name} ${ar.driver_surname}</div>`
          : "";
        return `<div class="routesCarCard">
          <div class="routesCarCard__number">${c.car_number}</div>
          <div class="routesCarCard__model">${model}</div>
          ${routeHtml}
        </div>`;
      }).join("") || '<div style="color:#cbd5e1; font-size:12px; text-align:center; padding:10px 0;">—</div>';

      return `<div class="routesCol${col.transit ? " routesCol--transit" : ""}">
        <div class="routesCol__title">${col.label} <span style="color:#94a3b8; font-weight:400;">(${colCars.length})</span></div>
        ${cards}
      </div>`;
    }).join("");
  }

  document.getElementById("routesBoardRefresh")?.addEventListener("click", loadAdminBoard);

  // ── Открытие страницы маршрутов ──
  window._initRoutesPage = (role) => {
    const isAdmin = role === "admin" || role === "owner";
    document.getElementById("routesDriverHeader")?.classList.toggle("hidden", isAdmin);
    document.getElementById("routesAdminBoard")?.classList.toggle("hidden", !isAdmin);
    if (isAdmin) loadAdminBoard();
    else loadDriverRoutes();
  };

  // Перегружаем nextPage чтобы инициализировать маршруты при навигации
  const _origNextPage = nextPage;
  nextPage = function(name) {
    _origNextPage(name);
    if (name === "routes") window._initRoutesPage?.(currentRole);
  };
}
// ── /Routes ───────────────────────────────────────────────────────────────

document.getElementById("toGeo").onclick = () => nextPage("geo");

getLocation_button.onclick = () => {
	getLocation_button.classList.add('inactive');
	getLocation_button.innerText = "Получение координат...";

	navigator.geolocation.getCurrentPosition(
		(pos) => {
			state.lat = pos.coords.latitude;
			state.lng = pos.coords.longitude;
			document.getElementById("coords").innerText = state.lat + ", " + state.lng;
			getLocation_button.innerText = "Координаты получены";
			getLocation_button.classList.remove('inactive');
			checkUpPreData.geo = state.lat + " " + state.lng;
		},
		() => {
			getLocation_button.innerText = "Не удалось получить координаты";
			getLocation_button.classList.remove('inactive');
		},
		{ timeout: 15000, maximumAge: 60000 }
	);
};

function send() {

}

// NOTE: car search/normalization logic moved into `js/carSelector.js`

const msg = document.getElementById("msg");


const oilSwitch = document.getElementById("oilSwitch");
const oilText = document.getElementById("oilText");

let oilChecked = false;

oilSwitch.onchange = () => {
  oilChecked = oilSwitch.checked;
  get('oilRange').classList.toggle('hidden', !oilChecked);
};

panelErrorSwitch.onchange = () => {
	var value = panelErrorSwitch.checked;

	document.getElementById('photoBlock_panel').classList.toggle('hidden', !value);
	mileage_post_block.classList.toggle('hidden', !value);
};

const slider = document.getElementById("slider_oil");

function sliderGradient(el, pct) {
	const g = Math.min(255, Math.round(510 * pct / 100));
	const r = Math.min(255, 510 - g);
	const fill = `rgb(${r},${g},0)`;
	el.style.background = `linear-gradient(to right, ${fill} 0%, ${fill} ${pct}%, #e2e8f0 ${pct}%, #e2e8f0 100%)`;
}

function updateSlider(){
	const value = parseInt(slider.value);
	sliderGradient(slider, value);
	oilValue.innerText = "Уровень масла: " + value + "%";
	checkUpPreData.oil_level = value;
}

slider.addEventListener("input", updateSlider);

const slider_fuel = document.getElementById("slider_fuel");

function updateSliderFuel(){
	const value = parseInt(slider_fuel.value);
	sliderGradient(slider_fuel, value);
	fuelValue.innerText = "Уровень топлива: " + value + "%";
	checkUpPreData.fuel_level = value;
}

let fuelLevelTouched = false;
slider_fuel.addEventListener("input", () => { fuelLevelTouched = true; updateSliderFuel(); });

if (damagedwheelSwitch) {
	damagedwheelSwitch.onchange = () => {
		check = damagedwheelSwitch.checked;

		damagedwheelAttention?.classList?.toggle?.('hidden', !check);
		photoChoice_damagedwheel?.classList?.toggle?.('hidden', !check);

		checkUpPreData.wheel_damaged = check;

		get('wheelok')?.classList?.toggle?.('hidden', check);
	};
}

if (wheelokSwitch) {
	wheelokSwitch.onchange = () => {
		check = wheelokSwitch.checked;

		wheelokInstruction?.classList?.toggle?.('hidden', !check);
		photoChoice_wheelok?.classList?.toggle?.('hidden', !check);

		get('damagedwheel')?.classList?.toggle?.('hidden', check);
	};
}


function setRandomWheel(value){
	const el = get('wheelokInstruction');
	if (el) el.innerText = "Сделай фото: " + value + ' колеса';
}

function setPhotoDay(value){
	const el1 = get('photodayInstruction');
	if (el1) el1.innerText = "Сделай фото: " + value;
	const el2 = get('photodayInstruction_2');
	if (el2) el2.innerText = "Сделай фото: " + value;
}

get('impossibleSwitch').onchange = () => {
	get('salonPhotos').classList.toggle('hidden', get('impossibleSwitch').checked);
}

get('getLocation_2').onclick = () => {
	const btn2 = get('getLocation_2');
	btn2.classList.add('inactive');
	btn2.innerText = "Получение координат...";

	navigator.geolocation.getCurrentPosition(
		(pos) => {
			state.lat = pos.coords.latitude;
			state.lng = pos.coords.longitude;
			get('coords_2').innerText = state.lat + ", " + state.lng;
			btn2.innerText = "Координаты получены";
			btn2.classList.remove('inactive');
			checkUpPostData.geo = state.lat + " " + state.lng;
		},
		() => {
			btn2.innerText = "Не удалось получить координаты";
			btn2.classList.remove('inactive');
		},
		{ timeout: 15000, maximumAge: 60000 }
	);
};

get('fio').addEventListener("input", () => { 
	get('access_button').classList.toggle('inactive', get('fio').value.length == 0)
 });

 get('access_button').onclick = () => {
	postRequest(endpoint + "/api/get-access", JSON.stringify({
		user: user, name: get('fio').value
	}));

	get('access_button').classList.add('hidden');
	get('fio').classList.add('hidden');
	get('access_attention').innerText = "Ваш запрос принят"
	get('access_attention').style.color = 'black';
};

get('additionalinfo').addEventListener("input", () => {
	checkUpPreData.additional_info = get('additionalinfo').value;
});

get('criticalinfo').addEventListener("input", () => {
	checkUpPreData.critical_info = get('criticalinfo').value;
});

get('antifreezeSwitch').onchange = () => {
	checkUpPreData.antifreeze_ok = get('antifreezeSwitch').checked;
}

get('glasswasherSwitch').onchange = () => {
	checkUpPreData.glasswasher_ok = get('glasswasherSwitch').checked;
};

get('lightingSwitch')?.addEventListener('change', () => {
	checkUpPreData.lighting_ok = get('lightingSwitch').checked;
});

get('emergencyKitSwitch')?.addEventListener('change', () => {
	checkUpPreData.emergency_kit_ok = get('emergencyKitSwitch').checked;
});

get('registrationSwitch')?.addEventListener('change', () => {
	checkUpPreData.registration_ok = get('registrationSwitch').checked;
});

get('panelOkSwitchPre')?.addEventListener('change', () => {
	const okOn = get('panelOkSwitchPre').checked;
	if (okOn) {
		const errSwitch = get('panelErrorSwitchPre');
		if (errSwitch) errSwitch.checked = false;
		checkUpPreData.dashboard_errors = false;
	} else {
		checkUpPreData.dashboard_errors = null;
	}
	get('photoBlock_panel_pre')?.classList.toggle('hidden', !okOn);
});

get('panelErrorSwitchPre')?.addEventListener('change', () => {
	const errOn = get('panelErrorSwitchPre').checked;
	if (errOn) {
		const okSwitch = get('panelOkSwitchPre');
		if (okSwitch) okSwitch.checked = false;
		checkUpPreData.dashboard_errors = true;
	} else {
		checkUpPreData.dashboard_errors = null;
	}
	get('photoBlock_panel_pre')?.classList.toggle('hidden', !errOn);
});

get('osago_date')?.addEventListener('input', () => {
	const el = get('osago_date');
	el.value = el.value.replace(/[^\d.]/g, '');
	checkUpPreData.osago_date = el.value || null;
});

get('impossibleSwitchPre')?.addEventListener('change', () => {
	get('salonPhotosPre')?.classList.toggle('hidden', get('impossibleSwitchPre').checked);
});

const ptScrollTop = () => window.scrollTo(0, 0);

// ── Validation helpers ──

function showStepError(elId, missing) {
	const el = get(elId);
	if (!el) return;
	if (missing.length > 0) {
		el.textContent = '⚠ Не заполнено: ' + missing.join(', ');
		el.classList.remove('hidden');
		el.scrollIntoView({ behavior: 'smooth', block: 'center' });
	} else {
		el.classList.add('hidden');
	}
}

function validatePt1() {
	const missing = [];
	if (!checkUpPreData.geo) missing.push('Геолокация');
	if (!checkUpPreData.photo_rl || !checkUpPreData.photo_rr ||
	    !checkUpPreData.photo_br || !checkUpPreData.photo_bl)
		missing.push('4 угловых фото');
	if (!checkUpPreData.photo_r || !checkUpPreData.photo_b ||
	    !checkUpPreData.photo_l || !checkUpPreData.photo_rg)
		missing.push('4 фото сторон');
	const bodyCond = document.querySelector('input[name="body_condition"]:checked')?.value;
	if (!bodyCond || bodyCond === 'NONE') missing.push('Состояние кузова');
	const damaged = get('damagedwheelSwitch')?.checked;
	const wheelOk = get('wheelokSwitch')?.checked;
	if (!damaged && !wheelOk) {
		missing.push('Проверка колёс');
	} else {
		if (damaged && !checkUpPreData.wheel_damaged_photo) missing.push('Фото повреждения колеса');
		if (wheelOk && !checkUpPreData.random_wheel_photo) missing.push('Фото колёс');
	}
	if (!get('impossibleSwitchPre')?.checked) {
		if (!checkUpPreData.photo_irl || !checkUpPreData.photo_irr)
			missing.push('2 фото салона');
	}
	const interiorCond = document.querySelector('input[name="interior_condition"]:checked')?.value;
	if (!interiorCond || interiorCond === 'NONE') missing.push('Состояние салона');
	return missing;
}

function validatePt2() {
	const missing = [];
	if (!get('oilSwitch')?.checked) missing.push('Масло проверено');
	if (!get('antifreezeSwitch')?.checked) missing.push('Антифриз');
	const brakeVal = document.querySelector('input[name="brakefluid_switch"]:checked')?.value;
	if (!brakeVal || brakeVal === 'NONE') missing.push('Тормозная жидкость');
	if (!get('glasswasherSwitch')?.checked) missing.push('Омывайка');
	if (!get('lightingSwitch')?.checked) missing.push('Освещение');
	if (!get('emergencyKitSwitch')?.checked) missing.push('Аварийный набор');
	const glassCond = document.querySelector('input[name="glass_condition"]:checked')?.value;
	if (!glassCond || glassCond === 'NONE') missing.push('Состояние стёкол');
	return missing;
}

function validatePt3() {
	const missing = [];
	if (!get('mileage')?.value) missing.push('Пробег');
	if (!checkUpPreData.photo_mileage) missing.push('Фото пробега');
	if (!fuelLevelTouched) missing.push('Уровень топлива');
	if (!get('panelOkSwitchPre')?.checked && !get('panelErrorSwitchPre')?.checked)
		missing.push('Приборная панель');
	if (!get('registrationSwitch')?.checked) missing.push('СТС');
	if (!get('osago_date')?.value) missing.push('ОСАГО');
	const wifiVal = document.querySelector('input[name="wifi_switch"]:checked')?.value;
	if (!wifiVal || wifiVal === 'NONE') missing.push('Wi‑Fi');
	const vpnVal = document.querySelector('input[name="vpn_switch"]:checked')?.value;
	if (!vpnVal || vpnVal === 'NONE') missing.push('VPN');
	return missing;
}

function collectLatestFields() {
	checkUpPreData.body_condition      = document.querySelector('input[name="body_condition"]:checked')?.value;
	checkUpPreData.interior_condition  = document.querySelector('input[name="interior_condition"]:checked')?.value;
	checkUpPreData.glass_condition     = document.querySelector('input[name="glass_condition"]:checked')?.value;
	checkUpPreData.brakefluid_level    = document.querySelector('input[name="brakefluid_switch"]:checked')?.value;
	checkUpPreData.wifi                = document.querySelector('input[name="wifi_switch"]:checked')?.value;
	checkUpPreData.vpn                 = document.querySelector('input[name="vpn_switch"]:checked')?.value;
	checkUpPreData.mileage             = get('mileage')?.value || null;
	checkUpPreData.osago_date          = get('osago_date')?.value || null;
	checkUpPreData.date                = new Date().toISOString();
}

async function doSubmitPreCheckup() {
	collectLatestFields();
	const data = JSON.stringify({ data: checkUpPreData, session: session });
	const btn = get('sendPreCheckUp');
	const defaultLabel = "Завершить осмотр";
	btn.classList.add('inactive');
	btn.innerText = "Отправка...";
	try {
		const response = await postRequest(endpoint + "/api/pre-checkup", data);
		if (response?.status !== "ok") {
			showSubmitError(formatSubmitFailure(null, response));
			btn.innerText = defaultLabel;
			return;
		}
		btn.innerText = "Отчёт отправлен!";
		if (tg && tg.platform && tg.platform !== 'unknown') {
			tg.showAlert("Осмотр успешно отправлен");
			setTimeout(() => { tg.close(); }, 1500);
		} else {
			alert("Осмотр успешно отправлен");
			setTimeout(() => { location.reload(); }, 1500);
		}
	} catch (err) {
		showSubmitError(formatSubmitFailure(err, null));
		btn.innerText = defaultLabel;
	} finally {
		btn.classList.remove('inactive');
	}
}

// ── Step navigation with validation ──

get('topt2').onclick = () => {
	const missing = validatePt1();
	showStepError('pt1Errors', missing);
	if (missing.length > 0) return;
	get('pt1').classList.add('hidden');
	get('pt2').classList.remove('hidden');
	ptScrollTop();
};

get('pt2back')?.addEventListener('click', () => {
	get('pt2').classList.add('hidden');
	get('pt1').classList.remove('hidden');
	ptScrollTop();
});

get('topt3').onclick = () => {
	const missing = validatePt2();
	showStepError('pt2Errors', missing);
	if (missing.length > 0) return;
	get('pt2Errors')?.classList.add('hidden');
	get('pt2').classList.add('hidden');
	get('pt3').classList.remove('hidden');
	ptScrollTop();
};

get('pt3back')?.addEventListener('click', () => {
	get('pt3').classList.add('hidden');
	get('pt2').classList.remove('hidden');
	ptScrollTop();
});

get('quickExitBtn')?.addEventListener('click', () => {
	const missing = [...validatePt1(), ...validatePt2()];
	showStepError('pt2Errors', missing);
	if (missing.length > 0) return;
	checkUpPreData.quick_exit = true;
	doSubmitPreCheckup();
});

get('slider_oil').value = 50;
sliderGradient(get('slider_oil'), 50);

get('slider_fuel').value = 50;
sliderGradient(get('slider_fuel'), 50);


get('download_button').onclick = () => {
	var url = endpoint + "/api/get-tables?l=" + access_key;

    if (tg && tg.platform && tg.platform !== 'unknown') {
        tg.openLink(url);
    } else {
        window.open(url, '_blank');
    }

	get('download_button').classList.add('inactive');
}

get('reports_button').onclick = () => {
	nextPage("reports");
	get('head_block').style="display: none; height: 20px; margin-top: 15px;";
}

get('pre_report_button').onclick = () => {
	var url = endpoint + "/driver-app/pre-checkups";

    if (tg && tg.platform && tg.platform !== 'unknown') {
        tg.openLink(url);
    } else {
        window.open(url, '_blank');
    }
}

get('post_report_button').onclick = () => {
	var url = endpoint + "/driver-app/post-checkups";

    if (tg && tg.platform && tg.platform !== 'unknown') {
        tg.openLink(url);
    } else {
        window.open(url, '_blank');
    }
}

get('back_report_button').onclick = () => {
	nextPage('car');
	get('head_block').style="display: flex; height: 20px; margin-top: 15px;";
}

get('back_help_button').onclick = () => {
	nextPage('car');
	get('head_block').style="display: flex; height: 20px; margin-top: 15px;";
}

get('help_button').onclick = () => {
	// Open dedicated support page (server route)
	window.location.href = "/help";
}

get('sendPreCheckUp').onclick = async () => {
	const missing = validatePt3();
	showStepError('preCheckupErrors', missing);
	if (missing.length > 0) return;
	await doSubmitPreCheckup();
};

get('sendPostCheckUp').onclick = async () => {
	const button = get('sendPostCheckUp');
	const defaultLabel = "Завершить осмотр";

	checkUpPostData.mileage = get('mileage_post').value;
	checkUpPostData.location = get('location_post').value;
	checkUpPostData.additional_info = get('additionalinfo_post').value;
	checkUpPostData.critical_info = get('criticalinfo_post').value;
	checkUpPostData.date = new Date().toISOString();

	const data = JSON.stringify({ data: checkUpPostData, session: session });

	button.classList.add('inactive');
	button.innerText = "Отправка...";

	try {
		const response = await postRequest(endpoint + "/api/post-checkup", data);
		if (response?.status !== "ok") {
			showSubmitError(formatSubmitFailure(null, response));
			button.innerText = defaultLabel;
			return;
		}
		button.innerText = "Отчёт отправлен!";

		// Auto-complete the active route if one was linked to this post-checkup
		const linkedRouteId = localStorage.getItem("activeRouteId");
		if (linkedRouteId) {
			try { await apiCompleteRoute(Number(linkedRouteId)); } catch {}
			localStorage.removeItem("activeRouteId");
			localStorage.removeItem("activeRouteToLocation");
		}

		if (tg && tg.platform && tg.platform !== 'unknown') {
			tg.showAlert("Осмотр успешно отправлен");
			setTimeout(() => { tg.close(); }, 1500);
		} else {
			alert("Осмотр успешно отправлен");
			setTimeout(() => { location.reload(); }, 1500);
		}
	} catch (err) {
		showSubmitError(formatSubmitFailure(err, null));
		button.innerText = defaultLabel;
	} finally {
		button.classList.remove('inactive');
	}

	console.log(checkUpPostData);
};

get('damageSwitchPost').onchange = () => {
	get('damagePhoto').classList.toggle('hidden', !get('damageSwitchPost').checked)
}

get('tg_button').onclick = () => {
	var url = "https://t.me/MYGaluev"; // @MYGaluev

    if (tg && tg.platform && tg.platform !== 'unknown') {
        tg.openLink(url);
    } else {
        window.open(url, '_blank');
    }
}

get('max_button').onclick = () => {
	var url = "https://max.ru/u/f9LHodD0cOJ3DcJeZVA5I03gITNYuxRVnfnsgHIzIhWxJgHyo7Eu_UiJOM0";

    if (tg && tg.platform && tg.platform !== 'unknown') {
        tg.openLink(url);
    } else {
        window.open(url, '_blank');
    }
}

get('email_button').onclick = () => {
	if (navigator.clipboard && window.isSecureContext) {
		navigator.clipboard.writeText("MYGaluev@mail.ru").then(() => {
			get("toast").style.opacity = 1;
            
            setTimeout(function(){ 
				get("toast").style.opacity = 0;
            }, 1500);
		}).catch((err) => {
			console.error('Ошибка копирования: ', err);
		});
	} else {}
}