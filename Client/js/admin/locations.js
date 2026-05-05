export function initLocationsAdminUi({ endpoint, postRequest, get, onNavigate }) {
	const tbody = document.getElementById("locationsTbody");
	const status = document.getElementById("locationsStatus");
	const btnOpenAdd = document.getElementById("locationsOpenAdd");
	const btnBack = document.getElementById("locationsBackBtn");

	const modal = document.getElementById("locationModal");
	const modalOverlay = document.getElementById("locationModalOverlay");
	const modalTitle = document.getElementById("locationModalTitle");
	const modalSubmit = document.getElementById("locationModalSubmit");
	const modalCancel = document.getElementById("locationModalCancel");
	const modalStatus = document.getElementById("locationModalStatus");

	const confirmModal = document.getElementById("confirmLocationModal");
	const confirmOverlay = document.getElementById("confirmLocationModalOverlay");
	const confirmText = document.getElementById("confirmLocationModalText");
	const confirmYes = document.getElementById("confirmLocationDeleteYes");
	const confirmNo = document.getElementById("confirmLocationDeleteNo");

	const inId = document.getElementById("locationEditId");
	const inName = document.getElementById("locationName");
	const inDesc = document.getElementById("locationDescription");

	if (!tbody || !btnOpenAdd || !btnBack || !modal || !modalOverlay) return { refresh: () => {}, getLocations };
	if (!confirmModal || !confirmOverlay || !confirmText || !confirmYes || !confirmNo) return { refresh: () => {}, getLocations };

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

	const confirmDelete = (label) => new Promise((resolve) => {
		confirmText.textContent = `Вы точно уверены, что хотите удалить локацию${label ? ` «${label}»` : ""}?`;

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

	const fill = (loc) => {
		inId && (inId.value = loc?.id ? String(loc.id) : "");
		inName && (inName.value = loc?.name || "");
		inDesc && (inDesc.value = loc?.description || "");
	};

	const render = () => {
		tbody.innerHTML = "";
		all.forEach((loc) => {
			const tr = document.createElement("tr");
			tr.innerHTML = `
				<td style="padding:8px; border-top:1px solid rgba(226,232,240,0.8); font-size:12px; color:#64748b;">${loc.id ?? ""}</td>
				<td style="padding:8px; border-top:1px solid rgba(226,232,240,0.8); font-size:13px;">${loc.name || ""}</td>
				<td style="padding:8px; border-top:1px solid rgba(226,232,240,0.8); font-size:13px; color:#64748b;">${loc.description || ""}</td>
				<td style="padding:6px; border-top:1px solid rgba(226,232,240,0.8); white-space:nowrap;">
					<div class="usersActions">
						<button class="btn btn--secondary btn--xxs" data-act="edit" data-id="${loc.id}" title="Редактировать" aria-label="Редактировать">✎</button>
						<button class="btn btn--danger btn--xxs" data-act="del" data-id="${loc.id}" title="Удалить" aria-label="Удалить">🗑</button>
					</div>
				</td>
			`;
			tbody.appendChild(tr);
		});
	};

	const s = () => localStorage.getItem("session") || "";

	const load = async () => {
		setStatus("Загрузка...");
		const r = await fetch(endpoint + "/api/admin/locations?session=" + encodeURIComponent(s()), { credentials: "same-origin", cache: "no-store" });
		const data = await r.json();
		if (data?.status !== "ok") {
			setStatus("Нет доступа или ошибка загрузки");
			all = [];
			render();
			return;
		}
		all = Array.isArray(data.locations) ? data.locations : [];
		setStatus(`Локаций: ${all.length}`);
		render();
	};

	btnBack.onclick = () => onNavigate("car");

	btnOpenAdd.onclick = () => {
		modalTitle.textContent = "Добавить локацию";
		modalSubmit.textContent = "Добавить";
		fill(null);
		openModal();
		inName?.focus?.();
	};

	modalCancel.onclick = () => closeModal();
	modalOverlay.addEventListener("click", () => closeModal());

	tbody.addEventListener("click", async (e) => {
		const btn = e.target?.closest?.("button");
		if (!btn) return;
		const act = btn.getAttribute("data-act");
		const id = Number(btn.getAttribute("data-id"));
		const loc = all.find((x) => Number(x.id) === id);
		if (!act || !id) return;

		if (act === "edit") {
			modalTitle.textContent = "Редактировать локацию";
			modalSubmit.textContent = "Сохранить";
			fill(loc);
			openModal();
			return;
		}
		if (act === "del") {
			const ok = await confirmDelete(loc?.name || "");
			if (!ok) return;
			setStatus("Удаление...");
			await postRequest(endpoint + "/api/admin/locations/delete", JSON.stringify({ session: s(), id }));
			await load();
		}
	});

	modalSubmit.onclick = async () => {
		const id = Number((inId?.value || "").trim()) || 0;
		const loc = {
			id,
			name: (inName?.value || "").trim(),
			description: (inDesc?.value || "").trim(),
		};
		if (!loc.name) { setModalStatus("Введите название"); return; }
		setModalStatus("Сохранение...");
		const r = await postRequest(endpoint + "/api/admin/locations/upsert", JSON.stringify({ session: s(), location: loc }));
		if (r?.status !== "ok") { setModalStatus("Ошибка сохранения"); return; }
		closeModal();
		await load();
	};

	async function getLocations() {
		try {
			const r = await fetch(endpoint + "/api/locations", { credentials: "same-origin", cache: "no-store" });
			const data = await r.json();
			return Array.isArray(data?.locations) ? data.locations : [];
		} catch {
			return [];
		}
	}

	return { refresh: load, getLocations };
}
