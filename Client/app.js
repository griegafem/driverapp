var endpoint = "https://www.motorsharks.online";

const tg = window.Telegram.WebApp;

tg.expand();

var user = tg.initDataUnsafe.user;

user = null;

//const canvas = document.getElementById("canvas");
const snap = document.getElementById("snap");
const video = document.getElementById("video");
const retry = document.getElementById("retry");
const toGeo = document.getElementById("toGeo");
const toPhoto = document.getElementById("toPhoto");
const mileageInput = document.getElementById("mileage");
const carSearch = document.getElementById("carSearch");
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

const photodayPhoto_button = document.getElementById("photodayPhoto_button");
const photodayUpload_button = document.getElementById("photodayUpload_button");
const video_photoday = document.getElementById("video_photoday");
const canvas_photoday = document.getElementById("canvas_photoday");
const snap_photoday = document.getElementById("snap_photoday");
const retry_photoday = document.getElementById("retry_photoday");

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

const photoChoice_mileage_post = document.getElementById("photoChoice_mileage_post");
const mileage_postPhoto_button = document.getElementById("wheelokPhoto_button");
const mileage_postUpload_button = document.getElementById("mileage_postUpload_button");

const photoBlockTemplate = document.getElementById("photoBlockTemplate");

var session = localStorage.getItem('session');

if(session != null){
	postRequest(endpoint + "/api/authorize", JSON.stringify({session: session})).then(response => {
		var status = response.status;
		
		var name = response.name;
		console.log(response);
	
		if(status == "error"){
			// get('loading_label').classList.add('hidden');
			// get('access_form').classList.remove('hidden');
			get('login-form').classList.remove('hidden');
		}else{
			get('loading').classList.add('hidden');
			get('hi').innerText = response.name + ", хорошего дня!";
			get('status').innerText = "Пользователь: " + response.name + " " + response.surname;

			setRandomWheel(response.random_wheel);
			setPhotoDay(response.photoday);

			if(response.role == "Admin" || response.role == "Owner" || response.role == "Report") {
				access_key = response.access_key;
				get('reports_button').classList.remove('hidden');
			}
		}
	});
}else{
	get('login-form').classList.remove('hidden');
}

checkUpPreData = {
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
}

checkUpPostData = {
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
}

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

let cars = [];

fetch(endpoint + "/api/cars").then(r => r.json()).then(data => {cars = data;});

pretrip_button.onclick = () => {
	nextPage("pretrip");
	addPhotoBlock(document.getElementById('photoChoice_mileage'), null, (photoData) => { checkUpPreData.photo_mileage = photoData; });
	get('number_change_button').classList.add('hidden');
}

posttrip_button.onclick = () => {
	nextPage("posttrip");
}

addPhotoBlock(get('photoBlock_panel'), null, (photoData) => { checkUpPostData.photo_mileage = photoData; });
addPhotoBlock(get('damagePhoto'), null, (photoData) => { checkUpPostData.damage_photo = photoData; });

addPhotoBlock(get('postPhoto_1'), 'Сделайте 4 фото авто с углов начиная с переднего левого, переднего правого и тд', (photoData) => { checkUpPostData.photo_rl = photoData; });
addPhotoBlock(get('postPhoto_2'), null, (photoData) => { checkUpPostData.photo_rr = photoData; });
addPhotoBlock(get('postPhoto_3'), null, (photoData) => { checkUpPostData.photo_br = photoData; });
addPhotoBlock(get('postPhoto_4'), null, (photoData) => { checkUpPostData.photo_bl = photoData; });

addPhotoBlock(get('postPhoto_5'), 'Сделайте 2-4 фото салона с открытыми по очереди дверями начиная с водительского', (photoData) => { checkUpPostData.photo_irl = photoData; });
addPhotoBlock(get('postPhoto_6'), null, (photoData) => { checkUpPostData.photo_irr = photoData; });
addPhotoBlock(get('postPhoto_7'), null, (photoData) => { checkUpPostData.photo_ibr = photoData; });
addPhotoBlock(get('postPhoto_8'), null, (photoData) => { checkUpPostData.photo_ibl = photoData; });

addPhotoBlock(document.getElementById('postPhoto_9'), null, (photoData) => { checkUpPostData.photo_of_day = photoData; });

addPhotoBlock(get('prePhoto_1'), 'Сделайте 4 фото авто с углов начиная с переднего левого, переднего правого и тд', (photoData) => { checkUpPreData.photo_rl = photoData; });
addPhotoBlock(get('prePhoto_2'), null, (photoData) => { checkUpPreData.photo_rr = photoData; });
addPhotoBlock(get('prePhoto_3'), null, (photoData) => { checkUpPreData.photo_br = photoData; });
addPhotoBlock(get('prePhoto_4'), null, (photoData) => { checkUpPreData.photo_bl = photoData; });

addPhotoBlock(get('prePhoto_5'), 'Сделайте 2-4 фото салона с открытыми по очереди дверями начиная с водительского', (photoData) => { checkUpPreData.photo_irl = photoData; });
addPhotoBlock(get('prePhoto_6'), null, (photoData) => { checkUpPreData.photo_irr = photoData; });
addPhotoBlock(get('prePhoto_7'), null, (photoData) => { checkUpPreData.photo_ibr = photoData; });
addPhotoBlock(get('prePhoto_8'), null, (photoData) => { checkUpPreData.photo_ibl = photoData; });

function addPhotoBlock(parent, info, action){
    var clone = photoBlockTemplate.cloneNode(true);

    clone.id = '';
	clone.style = 'display: block;';

	clone.querySelector('#info_photoBlockTemplate').innerText = info;

	if(info != null) clone.querySelector('#info_photoBlockTemplate').style = 'display: block;';

	clone.querySelector('#photoBlockTemplate_photo_button').onclick = () => {
		var video = clone.querySelector('#video_photoBlockTemplate');
		var photoChoice = clone.querySelector('#photoChoice_photoBlockTemplate');
		var snap = clone.querySelector('#snap_photoBlockTemplate');
		var canvas = clone.querySelector('#canvas_photoBlockTemplate');
		var retry = clone.querySelector('#retry_photoBlockTemplate');

		try {
			navigator.mediaDevices.getUserMedia({video: { facingMode: "environment" }}).then((currentStream) =>{
				video.srcObject = currentStream;
				video.play();
			});
		} catch (err) {
			console.error("Camera access error:", err);
		}

		photoChoice.classList.add('hidden')
		video.classList.remove('hidden');

		snap.classList.remove('hidden');

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

			//console.log(photo);

			video.classList.add("hidden");
			canvas.classList.remove("hidden");
			snap.classList.add("hidden");
			retry.classList.remove("hidden");
		};
	}

	clone.querySelector('#photoBlockTemplate_upload_button').onclick = () => {
		photoInput.click();

		photoAction = (url) => { 
			clone.querySelector('#photoChoice_photoBlockTemplate').classList.add('hidden');
	
			const canvas = clone.querySelector("#canvas_photoBlockTemplate");
			const ctx = canvas.getContext("2d");
	
			canvas.classList.remove('hidden');
	
			const img = new Image();
			img.src = url;
	
			img.onload = () => {
				canvas.width = img.width;
				canvas.height = img.height;
	
				ctx.drawImage(img, 0, 0);

				const photo = canvas.toDataURL("image/jpeg", 0.8);
		
				if(action != null) action(photo);
			};
		};
	}

	parent.appendChild(clone);
}

var triple_switch_iterator = 1;

addTripleSwitch(get('wifi-container'), 'Wi-Fi', 'wifi_switch').querySelector('#switch-xl').style = "font-size: 10px";
addTripleSwitch(get('vpn-container'), 'VPN сервис', 'vpn_switch', '', 'Отсутсвует', '');

function addTripleSwitch(parent, title, name, v1, v2, v3){
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

	parent.appendChild(clone);

	return clone;
}

photodayPhoto_button.onclick = () => {
	var video = video_photoday;
	var photoChoice = photoChoice_photoday;
	var snap = snap_photoday;
	var canvas = canvas_photoday;
	var retry = retry_photoday;

	try {
        navigator.mediaDevices.getUserMedia({video: { facingMode: "environment" }}).then((currentStream) =>{
			video.srcObject = currentStream;
			video.play();
        });
      } catch (err) {
        console.error("Camera access error:", err);
      }

	  photoChoice.classList.add('hidden')
	  video.classList.remove('hidden');

	  snap.classList.remove('hidden');

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

		checkUpPreData.photo_of_day = photo;
	  
		//console.log(photo);

		video.classList.add("hidden");
		canvas.classList.remove("hidden");
		snap.classList.add("hidden");
		retry.classList.remove("hidden");
	  };
}

damagedwheelPhoto_button.onclick = () => {
	var video = video_damagedwheel;
	var photoChoice = photoChoice_damagedwheel;
	var snap = snap_damagedwheel;
	var canvas = canvas_damagedwheel;
	var retry = retry_damagedwheel;

	try {
        navigator.mediaDevices.getUserMedia({video: { facingMode: "environment" }}).then((currentStream) =>{
			video.srcObject = currentStream;
			video.play();
        });
      } catch (err) {
        console.error("Camera access error:", err);
      }

	  photoChoice.classList.add('hidden')
	  video.classList.remove('hidden');

	  snap.classList.remove('hidden');

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

		checkUpPreData.wheel_damaged_photo = photo;
	  
		//console.log(photo);

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

	try {
        navigator.mediaDevices.getUserMedia({video: { facingMode: "environment" }}).then((currentStream) =>{
			video.srcObject = currentStream;
			video.play();
        });
      } catch (err) {
        console.error("Camera access error:", err);
      }

	  photoChoice.classList.add('hidden')
	  video.classList.remove('hidden');

	  snap.classList.remove('hidden');

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
	  
		checkUpPreData.random_wheel_photo = photo;

		//console.log(photo);

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

carSearch.addEventListener("input", e => {

  const query = normalize(e.target.value);

  if(!query){

    renderCars(cars.slice(0,0));
    return;

  }

  const ranked = cars
    .map(car => ({
      car,
      score: scoreCar(car.number, query)
    }))
    .filter(x => x.score > 0)
    .sort((a,b)=> b.score - a.score)
    .slice(0,5)
    .map(x => x.car);

  renderCars(ranked);

});

function renderCars(list) {
	const el = document.getElementById("carList");
	el.innerHTML = "";
	list.forEach(car => {
		const div = document.createElement("div");
		div.className = "car";
		div.innerText = car.number;
		div.onclick = () => {
			state.car = car.number;
			carSearch.classList.add("hidden");
			//number.innerText = "Госномер: " + car.number;
			pretrip_button.classList.remove("inactive");
			get('number_change_button').classList.remove('hidden');
			get('posttrip_button').classList.remove('inactive');
			checkUpPreData.number = car.number;
			checkUpPostData.number = car.number;
			
			postRequest(endpoint + "/api/get-car", JSON.stringify({"number": car.number})).then(response => {
				console.log(response);
			
				if(response == "CAR_NOT_FOUND"){

				}else{
					//get('brand').innerText = "Марка: " + response.brand;
					//get('model').innerText = "Модель: " + response.model;
					get('number').innerText = response.brand +' ' + response.model + ' ' + car.number  
				}
			});

			renderCars([]);
		};
		el.appendChild(div);
	});
}

function nextPage(name) {
	document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
	document.getElementById("page-" + name).classList.add("active");
}

document.getElementById("toGeo").onclick = () => nextPage("geo");

getLocation_button.onclick = () => {
	getLocation_button.classList.add('inactive');
	getLocation_button.innerText = "Получение координат...";

	navigator.geolocation.getCurrentPosition(pos => {
		state.lat = pos.coords.latitude;
		state.lng = pos.coords.longitude;
		document.getElementById("coords").innerText = state.lat + ", " + state.lng;
		getLocation_button.innerText = "Координаты получены";
		checkUpPreData.geo = state.lat + " " + state.lng;
	});
};

function send() {

}

function scoreCar(carNumber, query){

    const number = normalize(carNumber);
  
    let score = 0;
  
    if(number.startsWith(query)) score += 100;
  
    if(number.includes(query)) score += 50;
  
    const digits = number.replace(/\D/g,"");
    const letters = number.replace(/[0-9]/g,"");
  
    if(digits.includes(query)) score += 30;
  
    if(letters.includes(query)) score += 20;
  
    return score;
  
  }

function normalize(text){

return text
	.toLowerCase()
	.replace(/[^a-zа-я0-9]/g,"");

}

const msg = document.getElementById("msg");

const camInput = document.getElementById("cameraInput");

camInput.onchange = () => {
  const file = camInput.files[0];

  //console.log("Фото:", file);

  const url = URL.createObjectURL(file);
  const img = document.createElement("img");
  img.src = url;
  img.style.width = "100%";
  document.body.appendChild(img);
};

photoInput.onchange = () => {
	const file = photoInput.files[0];
  
	//console.log("Фото:", file);
  
	const url = URL.createObjectURL(file);

	photoAction(url);
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

damagedwheelSwitch.onchange = () => {
	check = damagedwheelSwitch.checked;

	damagedwheelAttention.classList.toggle('hidden', !check);

	photoChoice_damagedwheel.classList.toggle('hidden', !check);

	checkUpPreData.wheel_damaged = check;

	get('wheelok').classList.toggle('hidden', check);
  };

wheelokSwitch.onchange = () => {
	check = wheelokSwitch.checked;

	wheelokInstruction.classList.toggle('hidden', !check);

	photoChoice_wheelok.classList.toggle('hidden', !check);

	get('damagedwheel').classList.toggle('hidden', check);
};

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

		const photo = canvas.toDataURL("image/jpeg", 0.8);
	  
		checkUpPreData.random_wheel_photo = photo;
	};
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

			const photo = canvas.toDataURL("image/jpeg", 0.8);
	  
			checkUpPreData.wheel_damaged_photo = photo;
		};
	};
}

photodayUpload_button.onclick = () => {
	photoInput.click();

	photoAction = (url) => { 
		photoChoice_photoday.classList.add('hidden');

		const canvas = document.getElementById("canvas_photoday");
		const ctx = canvas.getContext("2d");

		canvas.classList.remove('hidden');

		const img = new Image();
		img.src = url;

		img.onload = () => {
			canvas.width = img.width;
			canvas.height = img.height;

			ctx.drawImage(img, 0, 0);

			const photo = canvas.toDataURL("image/jpeg", 0.8);
	  
			checkUpPreData.photo_of_day = photo;
		};
	};
}

mileage_postUpload_button.onclick = () => {
	photoInput.click();

	photoAction = (url) => { 
		photoChoice_damagedwheel.classList.add('hidden');

		photoChoice_mileage_post.classList.add('hidden');
		const canvas = document.getElementById("canvas_mileage_post");
		const ctx = canvas.getContext("2d");

		canvas.classList.remove('hidden');

		const img = new Image();
		img.src = url;

		img.onload = () => {
			canvas.width = img.width;
			canvas.height = img.height;

			ctx.drawImage(img, 0, 0);
		};
	};
}

function get(name){
 return document.getElementById(name);
}

function postRequest(url, data, onError){
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 25000);

    return new Promise((resolve, reject) => {
        fetch(url, {
            method: 'POST',
			headers: {
				"Content-Type": "application/json; charset=UTF-8"
			  },
            body: data,
            signal: controller.signal
        })
        .then(response => response.json())
        .then(data => {resolve(data)})
        .catch(error => {console.error('Ошибка:', error); reject(error); onError()});})
        .finally(() => clearTimeout(id));;
}

function setRandomWheel(value){
	get('wheelokInstruction').innerText = "Сделай фото: " + value + ' колеса';
}

function setPhotoDay(value){
	get('photodayInstruction').innerText = "Сделай фото: " + value;
	get('photodayInstruction_2').innerText = "Сделай фото: " + value;
}

get('impossibleSwitch').onchange = () => {
	get('salonPhotos').classList.toggle('hidden', get('impossibleSwitch').checked);
}

get('getLocation_2').onclick = () => {
	get('getLocation_2').classList.add('inactive');
	get('getLocation_2').innerText = "Получение координат...";

	navigator.geolocation.getCurrentPosition(pos => {
		state.lat = pos.coords.latitude;
		state.lng = pos.coords.longitude;
		get('coords_2').innerText = state.lat + ", " + state.lng;
		get('getLocation_2').innerText = "Координаты получены";
		checkUpPostData.geo = state.lat + " " + state.lng;
	});
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

get('number_change_button').onclick = () => {
	get('number_change_button').classList.add('hidden');
	get('carSearch').classList.remove('hidden');
	get('carSearch').value = "";
	get('brand').innerText = "";
	get('model').innerText = "";

	number.innerText = "Госномер: ";
};

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

get('login_button').onclick = () => {
	get('login_button').classList.add('inactive');
	get('login').classList.add('inactive');
	get('password').classList.add('inactive');
	get('login_button').innerText = 'Авторизация...';
	get('login_attention').classList.add('hidden');

	postRequest(endpoint + "/api/login", JSON.stringify({ login: get('login').value, password: get('password').value })).then(response => {
		var name = response.name;
		var status = response.status;
	
		console.log(response);

		if(status == "error"){
			get('login_attention').classList.remove('hidden');
			get('login_button').classList.remove('inactive');
			get('login_button').innerText = 'Вход';
			get('login').classList.remove('inactive');
			get('password').classList.remove('inactive');
		}else{
			session = response.session;
			localStorage.setItem('session', session)

			get('login-form').classList.add('hidden');
			get('hi').innerText = response.name + ", хорошего дня!";
			get('status').innerText = "Пользователь: " + response.name + " " + response.surname;
			get('loading').classList.add('hidden');

			setRandomWheel(response.random_wheel);
			setPhotoDay(response.photoday);

			if(response.role == "Admin" || response.role == "Owner" || response.role == "Report") {
				access_key = response.access_key;
				get('reports_button').classList.remove('hidden');
			}
		}
	});
};

get('login').addEventListener("input", () => {
	var login = get('login').value;
	var password = get('password').value;

	get('login_button').classList.toggle('inactive', login.length == 0 || password == 0);
});

get('password').addEventListener("input", () => {
	var login = get('login').value;
	var password = get('password').value;

	get('login_button').classList.toggle('inactive', login.length == 0 || password == 0);
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
	nextPage('help');
	get('head_block').style="display: none; height: 20px; margin-top: 15px;";
}

get('sendPreCheckUp').onclick = () => {
	checkUpPreData.brakefluid_level = document.querySelector('input[name="brakefluid_switch"]:checked')?.value;
	checkUpPreData.wifi = document.querySelector('input[name="wifi_switch"]:checked')?.value;
	checkUpPreData.vpn = document.querySelector('input[name="vpn_switch"]:checked')?.value;

	var data = JSON.stringify({data: checkUpPreData, session: session});

	get('sendPreCheckUp').classList.add('inactive');
	get('sendPreCheckUp').innerText = "Отправка...";

	postRequest(endpoint + "/api/pre-checkup", data, () => {
		get('sendPreCheckUp').classList.remove('inactive');
		get('sendPreCheckUp').innerText = "Отправить ещё раз";

		if (tg && tg.platform && tg.platform !== 'unknown') {
			tg.showAlert("Ошибка");
		} else {
			alert('Ошибка');
		}
	}).then(response => {
		get('sendPreCheckUp').innerText = "Отчёт отправлен!";

		if (tg && tg.platform && tg.platform !== 'unknown') {
			tg.showAlert("Осмотр отправлен");
			setTimeout(() => { tg.close(); }, 1500);
		} else {
			alert('Осмотр отправлен');
			setTimeout(() => { location.reload(); }, 1500);
		}
	});

	console.log(checkUpPreData);
}

get('sendPostCheckUp').onclick = () => {
	var button = get('sendPostCheckUp');

	checkUpPostData.mileage = get('mileage_post').value;

	checkUpPostData.mileage = get('mileage_post').value;
	checkUpPostData.location = get('location_post').value;

	checkUpPostData.additional_info = get('additionalinfo_post').value;
	checkUpPostData.critical_info = get('criticalinfo_post').value;

	var data = JSON.stringify({data: checkUpPostData, session: session});

	button.classList.add('inactive');
	button.innerText = "Отправка...";

	postRequest(endpoint + "/api/post-checkup", data, () => {
		button.classList.remove('inactive');
		button.innerText = "Отправить ещё раз";

		if (tg && tg.platform && tg.platform !== 'unknown') {
			tg.showAlert("Ошибка");
		} else {
			alert('Ошибка');
		}
	}).then(response => {
		button.innerText = "Отчёт отправлен!";

		if (tg && tg.platform && tg.platform !== 'unknown') {
			tg.showAlert("Осмотр отправлен");
			setTimeout(() => { tg.close(); }, 1500);
		} else {
			alert('Осмотр отправлен');
			setTimeout(() => { location.reload(); }, 1500);
		}
	});

	console.log(checkUpPostData);
}

get('damageSwitchPost').onchange = () => {
	get('damagePhoto').classList.toggle('hidden', !get('damageSwitchPost').checked)
}

get('tg_button').onclick = () => {
	var url = "https://t.me/MYGaluev";

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