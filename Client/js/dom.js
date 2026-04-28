export function get(id) {
  return document.getElementById(id);
}

export function show(el) {
  if (!el) return;
  el.classList.remove("hidden");
}

export function hide(el) {
  if (!el) return;
  el.classList.add("hidden");
}

export function setInactive(el, inactive) {
  if (!el) return;
  el.classList.toggle("inactive", Boolean(inactive));
}

