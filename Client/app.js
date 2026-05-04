// Cache-bust ESM modules on deploys (Safari/iOS is especially aggressive here).
const __v = "20260504_2";
import { endpoint, postRequest } from "./js/api.js?v=20260504_2";
import { get } from "./js/dom.js?v=20260504_2";
import { initAuth } from "./js/auth.js?v=20260504_2";
import { initCarSelector } from "./js/carSelector.js?v=20260504_2";

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

function doLogout(){
  try { localStorage.removeItem("session"); } catch { }
  session = null;
  currentRole = null;

  // Reset car selection + disable actions (business logic stays same)
  try { clearSelectedCar(); } catch { }
  try { nextPage("car"); } catch { }

  // Show login overlay again
  document.getElementById("login-form")?.classList?.remove?.("hidden");
  document.getElementById("loading")?.classList?.add?.("hidden");
  document.getElementById("dashboardTop")?.classList?.add?.("hidden");
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
  // When sidebar is open, hide the burger button (close via X).
  sidebarToggle?.classList?.add?.("hidden");
}

function closeSidebar(){
  sidebar?.classList?.add?.("hidden");
  sidebarOverlay?.classList?.add?.("hidden");
  sidebar?.setAttribute?.("aria-hidden", "true");
  sidebarOverlay?.setAttribute?.("aria-hidden", "true");
  sidebarToggle?.classList?.remove?.("hidden");
}

sidebarToggle?.addEventListener?.("click", openSidebar);
sidebarClose?.addEventListener?.("click", closeSidebar);
sidebarOverlay?.addEventListener?.("click", closeSidebar);

document.getElementById("sidebarGoHome")?.addEventListener?.("click", () => { closeSidebar(); nextPage("car"); });
document.getElementById("sidebarLogout")?.addEventListener?.("click", () => { closeSidebar(); doLogout(); });
document.getElementById("sidebarGoUsers")?.addEventListener?.("click", () => { closeSidebar(); nextPage("users"); });
document.getElementById("sidebarGoReports")?.addEventListener?.("click", () => { closeSidebar(); nextPage("reports"); });
document.getElementById("sidebarGoCars")?.addEventListener?.("click", () => { closeSidebar(); nextPage("cars"); });

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
const photoInput = document.getElementById("photoInput");
const photoChoice = document.getElementById("photoChoice");
const getLocation_button = document.getElementById("getLocation_button");
const oilValue = document.getElementById("oilValue");
const damagedwheelAttention = document.getElementById("damagedwheelAttention");
const wheelokInstruction = document.getElementById("wheelokInstruction");
const wheelokSwitch = document.getElementById("wheelokSwitch");
const damagedwheelSwitch = document.getElementById("damagedwheelSwitch");

const Photo_button = document.getElementById("Photo_button");
const video_ = document.getElementById("video_");
const canvas_ = document.getElementById("canvas_");
const snap_ = document.getElementById("snap_");
const retry_ = document.getElementById("retry_");

const mileagePhoto_button = document.getElementById("mileagePhoto_button");
const mileageUpload_button = document.getElementById("mileageUpload_button");
const video_mileage = document.getElementById("video_mileage");
const canvas_mileage = document.getElementById("canvas_mileage");
const snap_mileage = document.getElementById("snap_mileage");
const retry_mileage = document.getElementById("retry_mileage");

const photodayBlock = document.getElementById("photodayBlock");

const wheelokPhoto_button = document.getElementById("wheelokPhoto_button");
const wheelokUpload_button = document.getElementById("wheelokUpload_button");
const photoChoice_wheelok = document.getElementById("photoChoice_wheelok");
const video_wheelok = document.getElementById("video_wheelok");
const canvas_wheelok = document.getElementById("canvas_wheelok");
const snap_wheelok = document.getElementById("snap_wheelok");
const retry_wheelok = document.getElementById("retry_wheelok");

const damagedwheelPhoto_button = document.getElementById("damagedwheelPhoto_button");
const damagedwheelUpload_button = document.getElementById("damagedwheelUpload_button");
const photoChoice_damagedwheel = document.getElementById("photoChoice_damagedwheel");
const video_damagedwheel = document.getElementById("video_damagedwheel");
const canvas_damagedwheel = document.getElementById("canvas_damagedwheel");
const snap_damagedwheel = document.getElementById("snap_damagedwheel");
const retry_damagedwheel = document.getElementById("retry_damagedwheel");

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

		if(currentRole === "admin") {
			access_key = response.access_key;
			get('reports_button').classList.remove('hidden');
			try {
				refreshUsersAdminList();
				refreshCarsAdminList();
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
		initCarSelector({
			endpoint,
			get,
			carsRequest: async (base) => {
				const r = await fetch(base + "/api/cars", { credentials: "same-origin", cache: "no-store" });
				return await r.json();
			},
			onCarsLoaded: () => {},
			onSelectCar: (car) => {
				// Keep business logic intact: reuse current selectCar pathway.
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
	"damage_photo": null,
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

var photoAction = () => {};

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

posttrip_button.onclick = () => {
	nextPage("posttrip");
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

addPhotoBlock(get('prePhoto_1'), 'Передний левый угол', (photoData) => { checkUpPreData.photo_rl = photoData; });
addPhotoBlock(get('prePhoto_2'), 'Передний правый угол', (photoData) => { checkUpPreData.photo_rr = photoData; });
addPhotoBlock(get('prePhoto_3'), 'Задний правый угол', (photoData) => { checkUpPreData.photo_br = photoData; });
addPhotoBlock(get('prePhoto_4'), 'Задний левый угол', (photoData) => { checkUpPreData.photo_bl = photoData; });

addPhotoBlock(get('prePhoto_5'), 'Фото салона с открытой левой передней двери', (photoData) => { checkUpPreData.photo_irl = photoData; });
addPhotoBlock(get('prePhoto_6'), 'Фото салона с открытой правой передней двери', (photoData) => { checkUpPreData.photo_irr = photoData; });
addPhotoBlock(get('prePhoto_7'), 'Фото салона с открытой правой задней двери', (photoData) => { checkUpPreData.photo_ibr = photoData; });
addPhotoBlock(get('prePhoto_8'), 'Фото салона с открытой левой задней двери', (photoData) => { checkUpPreData.photo_ibl = photoData; });

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
	// We'll insert thumbs right after the action buttons for consistent layout.
	const photoChoiceRoot = clone.querySelector('#photoChoice_photoBlockTemplate');
	photoChoiceRoot?.after?.(thumbs);

	// Capture container (video/canvas + buttons) - hidden unless actively capturing
	const video = clone.querySelector('#video_photoBlockTemplate');
	const canvas = clone.querySelector('#canvas_photoBlockTemplate');
	const snap = clone.querySelector('#snap_photoBlockTemplate');
	const retry = clone.querySelector('#retry_photoBlockTemplate');

	const capture = document.createElement('div');
	capture.className = 'photoCapture hidden';

	// Normalize preview element sizing (template has narrow canvas width inline)
	if (video) video.style.width = '100%';
	if (canvas) canvas.style.width = '100%';

	// Move preview elements into capture container
	const previewHost = video?.parentElement;
	if (previewHost) {
		capture.appendChild(video);
		capture.appendChild(canvas);
		capture.appendChild(snap);
		capture.appendChild(retry);
		previewHost.replaceWith(capture);
	}

	let stream = null;
	const stopStream = () => {
		try { stream?.getTracks?.().forEach(t => t.stop()); } catch { }
		stream = null;
	};

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
		if (!video || !canvas || !snap || !retry) return;
		try {
			stopStream();
			navigator.mediaDevices.getUserMedia({video: { facingMode: "environment" }}).then((currentStream) =>{
				stream = currentStream;
				video.srcObject = currentStream;
				video.play();
			});
		} catch (err) {
			console.error("Camera access error:", err);
		}

		capture.classList.remove('hidden');
		video.classList.remove('hidden');
		canvas.classList.add('hidden');

		snap.classList.remove('hidden');
		retry.classList.add('hidden');

		retry.onclick = () => {
			video.classList.remove("hidden");
			canvas.classList.add("hidden");
			snap.classList.remove("hidden");
			retry.classList.add("hidden");
		}

		snap.onclick = () => {

			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
		
			const ctx = canvas.getContext("2d");
		
			ctx.drawImage(video, 0, 0);
		
			const photo = canvas.toDataURL("image/jpeg", 0.8);
		
			if(action != null) action(photo);
			setThumb(photo);

			//console.log(photo);

			// Hide capture UI; thumbnail is shown below buttons.
			capture.classList.add("hidden");
			video.classList.add("hidden");
			canvas.classList.add("hidden");
			snap.classList.add("hidden");
			retry.classList.add("hidden");
			stopStream();
		};
	}

	clone.querySelector('#photoBlockTemplate_upload_button').onclick = () => {
		photoInput.click();

		photoAction = (url) => {
			if (!canvas) return;
			const ctx = canvas.getContext("2d");

			const img = new Image();
			img.src = url;

			img.onload = () => {
				canvas.width = img.width;
				canvas.height = img.height;
				ctx.drawImage(img, 0, 0);
				URL.revokeObjectURL(url);

				const photo = canvas.toDataURL("image/jpeg", 0.8);
				if(action != null) action(photo);
				setThumb(photo);

				capture.classList.add("hidden");
				video?.classList?.add?.("hidden");
				canvas?.classList?.add?.("hidden");
				snap?.classList?.add?.("hidden");
				retry?.classList?.add?.("hidden");
				stopStream();
			};
			img.onerror = () => URL.revokeObjectURL(url);
		};
	}

	parent.appendChild(clone);
}

var triple_switch_iterator = 1;

addTripleSwitch(get('wifi-container'), 'Wi‑Fi', 'wifi_switch')
	?.querySelector?.('#switch-xl')
	?.style?.setProperty?.("font-size", "11px");

addTripleSwitch(get('vpn-container'), 'VPN сервис', 'vpn_switch');

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
	var video = video_damagedwheel;
	var photoChoice = photoChoice_damagedwheel;
	var snap = snap_damagedwheel;
	var canvas = canvas_damagedwheel;
	var retry = retry_damagedwheel;

	let dmgStream = null;
	const stopDmgStream = () => {
		try { dmgStream?.getTracks?.().forEach(t => t.stop()); } catch {}
		dmgStream = null;
	};

	try {
		navigator.mediaDevices.getUserMedia({video: { facingMode: "environment" }}).then((currentStream) => {
			dmgStream = currentStream;
			video.srcObject = currentStream;
			video.play();
		});
	} catch (err) {
		console.error("Camera access error:", err);
	}

	photoChoice.classList.add('hidden');
	video.classList.remove('hidden');
	snap.classList.remove('hidden');

	retry.onclick = () => {
		video.classList.remove("hidden");
		canvas.classList.add("hidden");
		snap.classList.remove("hidden");
		retry.classList.add("hidden");
	};

	snap.onclick = () => {
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		const ctx = canvas.getContext("2d");
		ctx.drawImage(video, 0, 0);
		const photo = canvas.toDataURL("image/jpeg", 0.8);
		checkUpPreData.wheel_damaged_photo = photo;
		stopDmgStream();
		video.classList.add("hidden");
		canvas.classList.remove("hidden");
		snap.classList.add("hidden");
		retry.classList.remove("hidden");
	};
}

wheelokPhoto_button.onclick = () => {
	var video = video_wheelok;
	var photoChoice = photoChoice_wheelok;
	var snap = snap_wheelok;
	var canvas = canvas_wheelok;
	var retry = retry_wheelok;

	let wokStream = null;
	const stopWokStream = () => {
		try { wokStream?.getTracks?.().forEach(t => t.stop()); } catch {}
		wokStream = null;
	};

	try {
		navigator.mediaDevices.getUserMedia({video: { facingMode: "environment" }}).then((currentStream) => {
			wokStream = currentStream;
			video.srcObject = currentStream;
			video.play();
		});
	} catch (err) {
		console.error("Camera access error:", err);
	}

	photoChoice.classList.add('hidden');
	video.classList.remove('hidden');
	snap.classList.remove('hidden');

	retry.onclick = () => {
		video.classList.remove("hidden");
		canvas.classList.add("hidden");
		snap.classList.remove("hidden");
		retry.classList.add("hidden");
	};

	snap.onclick = () => {
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		const ctx = canvas.getContext("2d");
		ctx.drawImage(video, 0, 0);
		const photo = canvas.toDataURL("image/jpeg", 0.8);
		checkUpPreData.random_wheel_photo = photo;
		stopWokStream();
		video.classList.add("hidden");
		canvas.classList.remove("hidden");
		snap.classList.add("hidden");
		retry.classList.remove("hidden");
	};
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
	};

	const closeModal = () => {
		modal.classList.add("hidden");
		modalOverlay.classList.add("hidden");
		modal.setAttribute("aria-hidden", "true");
		modalOverlay.setAttribute("aria-hidden", "true");
		setModalStatus("");
	};

	const confirmDelete = (label) => {
		return new Promise((resolve) => {
			confirmText.textContent = `Вы точно уверены, что хотите удалить пользователя${label ? ` «${label}»` : ""}?`;

			const open = () => {
				confirmModal.classList.remove("hidden");
				confirmOverlay.classList.remove("hidden");
				confirmModal.setAttribute("aria-hidden", "false");
				confirmOverlay.setAttribute("aria-hidden", "false");
			};

			const close = () => {
				confirmModal.classList.add("hidden");
				confirmOverlay.classList.add("hidden");
				confirmModal.setAttribute("aria-hidden", "true");
				confirmOverlay.setAttribute("aria-hidden", "true");
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
	};
	const closeModal = () => {
		modal.classList.add("hidden");
		overlay.classList.add("hidden");
		modal.setAttribute("aria-hidden", "true");
		overlay.setAttribute("aria-hidden", "true");
		setModalStatus("");
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
			};
			const close = () => {
				cModal.classList.add("hidden");
				cOverlay.classList.add("hidden");
				cModal.setAttribute("aria-hidden", "true");
				cOverlay.setAttribute("aria-hidden", "true");
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

const camInput = document.getElementById("cameraInput");

camInput.onchange = () => {};

photoInput.onchange = () => {
	const file = photoInput.files[0];
	if (!file) return;

	const url = URL.createObjectURL(file);

	try {
		photoAction(url);
	} finally {
		try { photoInput.value = ""; } catch { }
	}
	// const img = document.createElement("img");
	// img.src = url;
	// img.style.width = "100%";
	// document.body.appendChild(img);
  };

retry.onclick = () => {
	video.classList.remove("hidden");
	canvas.classList.add("hidden");
	snap.classList.remove("hidden");
	retry.classList.add("hidden");
	toGeo.classList.add("inactive")
  };

snap.onclick = () => {

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");

  ctx.drawImage(video, 0, 0);

  const photo = canvas.toDataURL("image/jpeg", 0.8);

  console.log(photo);

  video.classList.add("hidden");
  canvas.classList.remove("hidden");
  snap.classList.add("hidden");
  retry.classList.remove("hidden");
  toGeo.classList.remove("inactive")
};

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

function updateSlider(){
	const value = slider.value;

	var g = 510 * (value / 100);
	var r = 510 - g;

	slider.style.background = 'rgb(' + r + ', ' + g + ', 0)';

	oilValue.innerText = "Уровень масла: " + value + "%"

	checkUpPreData.oil_level = value;
}

slider.addEventListener("input", updateSlider);

const slider_fuel = document.getElementById("slider_fuel");

function updateSliderFuel(){
	const value = slider_fuel.value;

	var g = 510 * (value / 100);
	var r = 510 - g;

	slider_fuel.style.background = 'rgb(' + r + ', ' + g + ', 0)';

	fuelValue.innerText = "Уровень топлива: " + value + "%"

	checkUpPreData.fuel_level = value;
}

slider_fuel.addEventListener("input", updateSliderFuel);

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

wheelokUpload_button.onclick = () => {
	photoInput.click();

	photoAction = (url) => {
		photoChoice_wheelok.classList.add('hidden');

		const canvas = document.getElementById("canvas_wheelok");
		const ctx = canvas.getContext("2d");
		canvas.classList.remove('hidden');

		const img = new Image();
		img.src = url;

		img.onload = () => {
			canvas.width = img.width;
			canvas.height = img.height;
			ctx.drawImage(img, 0, 0);
			URL.revokeObjectURL(url);
			checkUpPreData.random_wheel_photo = canvas.toDataURL("image/jpeg", 0.8);
		};
		img.onerror = () => URL.revokeObjectURL(url);
	};
}

damagedwheelUpload_button.onclick = () => {
	photoInput.click();

	photoAction = (url) => {
		photoChoice_damagedwheel.classList.add('hidden');

		const canvas = document.getElementById("canvas_damagedwheel");
		const ctx = canvas.getContext("2d");
		canvas.classList.remove('hidden');

		const img = new Image();
		img.src = url;

		img.onload = () => {
			canvas.width = img.width;
			canvas.height = img.height;
			ctx.drawImage(img, 0, 0);
			URL.revokeObjectURL(url);
			checkUpPreData.wheel_damaged_photo = canvas.toDataURL("image/jpeg", 0.8);
		};
		img.onerror = () => URL.revokeObjectURL(url);
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

get('cleanSwitch').onchange = () => {
	checkUpPreData.clean_ok = get('cleanSwitch').checked;
}

get('interior_okSwitch').onchange = () => {
	checkUpPreData.interior_ok = get('interior_okSwitch').checked;
}

get('details_okSwitch').onchange = () => {
	checkUpPreData.details_ok = get('details_okSwitch').checked;
}

get('glasswasherSwitch').onchange = () => {
	checkUpPreData.glasswasher_ok = get('glasswasherSwitch').checked;
}

// Legacy "change number" button removed in favor of CarSelector clear action.

get('topt2').onclick = () => {
	get('pt1').classList.add('hidden');
	get('pt2').classList.remove('hidden');
	get('page-pretrip').scrollTo(0, 0);
};

get('topt3').onclick = () => {
	get('pt2').classList.add('hidden');
	get('pt3').classList.remove('hidden');
	get('page-pretrip').scrollTo(0, 0);
};

get('slider_oil').value = 50;
get('slider_oil').style.background = 'gray';

get('slider_fuel').value = 50;
get('slider_fuel').style.background = 'gray';

get('impossibleSwitchPre').onchange = () => {
	get('salonPhotosPre').classList.toggle('hidden', get('impossibleSwitchPre').checked)
}

get('login').addEventListener("input", () => {
	var login = get('login').value;
	var password = get('password').value;

	get('login_button').classList.toggle('inactive', login.length == 0 || password.length == 0);
});

get('password').addEventListener("input", () => {
	var login = get('login').value;
	var password = get('password').value;

	get('login_button').classList.toggle('inactive', login.length == 0 || password.length == 0);
});

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
	checkUpPreData.brakefluid_level = document.querySelector('input[name="brakefluid_switch"]:checked')?.value;
	checkUpPreData.wifi = document.querySelector('input[name="wifi_switch"]:checked')?.value;
	checkUpPreData.vpn = document.querySelector('input[name="vpn_switch"]:checked')?.value;
	checkUpPreData.date = new Date().toISOString();

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

	console.log(checkUpPreData);
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