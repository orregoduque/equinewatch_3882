let state,
  csrf,
  editing = null;
const $ = (s) => document.querySelector(s),
  all = (s) => [...document.querySelectorAll(s)],
  field = (f, n) => f.elements.namedItem(n);
const escape = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const titles = {
  overview: [
    "Todo en su lugar.",
    "Prepara accesos y nuevas instalaciones con un registro de cada cambio.",
  ],
  permissions: [
    "El acceso correcto.",
    "Define quién puede consultar las fotos y el vídeo de cada caballo.",
  ],
  onboarding: [
    "Una instalación bien preparada.",
    "Registra establo, equipo y cámara antes de conectar el flujo real.",
  ],
  history: [
    "Cada cambio, registrado.",
    "Consulta quién preparó o retiró un permiso y por qué.",
  ],
};
const errors = {
  RESOURCE_CONFLICT:
    "Ese registro ya existe o comparte una IP, MAC o identificador. Revisa los datos.",
  GRANT_EXISTS:
    "Ese usuario ya tiene un permiso preparado para este caballo. Usa Editar.",
  STALE_REVISION:
    "El registro cambió en otra ventana. Recarga antes de repetir.",
  SELECT_PERMISSION: "Selecciona fotografías o vídeo.",
  INVALID_EXPIRY: "El vencimiento debe ser una fecha futura.",
  ACTIVE_IDENTITY_REQUIRED: "Selecciona un usuario y un caballo activos.",
  PRIVATE_IPV4_REQUIRED: "Indica una IP local válida.",
  INVALID_MAC: "Indica la MAC con el formato aa:bb:cc:dd:ee:ff.",
  ADMIN_REQUIRED: "Se necesita acceso de administración.",
  INVALID_FIELDS: "Revisa los campos del formulario.",
};
function notice(message, error = false) {
  $("#notice").hidden = false;
  $("#notice").className = error ? "error" : "";
  $("#notice").textContent = message;
}
async function api(path, { method = "GET", body } = {}) {
  const headers = {};
  if (body) {
    headers["Content-Type"] = "application/json";
    headers["X-CSRF-Token"] = csrf;
    headers["Idempotency-Key"] = crypto.randomUUID();
  }
  const response = await fetch(path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
    }),
    data = await response.json();
  if (!response.ok)
    throw Error(
      errors[data.error] ||
        "No se pudo completar el cambio. Revisa la conexión y vuelve a intentarlo.",
    );
  return data;
}
function page(name) {
  all(".page").forEach((el) => (el.hidden = el.id !== name));
  all("nav button").forEach((el) =>
    el.classList.toggle("selected", el.dataset.page === name),
  );
  $("#page-title").textContent = titles[name][0];
  $("#page-description").textContent = titles[name][1];
}
document.addEventListener("click", (e) => {
  const button = e.target.closest("[data-page]");
  if (button) page(button.dataset.page);
});
function fill(select, items, label) {
  const previous = select.value;
  select.replaceChildren(new Option("Selecciona una opción", ""));
  items.forEach((item) => select.add(new Option(label(item), item.id)));
  if (items.some((i) => i.id === previous)) select.value = previous;
}
function labelUser(id) {
  const u = state.users.find((x) => x.id === id);
  return u?.full_name || "Usuario";
}
function labelHorse(id) {
  return state.horses.find((x) => x.id === id)?.name || "Caballo";
}
function date(s) {
  return s
    ? new Date(s).toLocaleString("es-CO", {
        timeZone: "America/Bogota",
        dateStyle: "short",
        timeStyle: "short",
      })
    : "Sin vencimiento";
}
async function refresh() {
  state = await api("/api/bootstrap");
  csrf = state.csrf;
  all("select[name=user_id]").forEach((el) =>
    fill(
      el,
      state.users.filter((u) => u.is_active),
      (u) => `${u.full_name} · ${u.email}`,
    ),
  );
  all("select[name=horse_id]").forEach((el) =>
    fill(
      el,
      state.horses.filter((h) => h.is_active),
      (h) => h.name,
    ),
  );
  all("select[name=site_id]").forEach((el) =>
    fill(el, state.sites, (s) => s.name),
  );
  all("select[name=device_id]").forEach((el) =>
    fill(
      el,
      state.devices,
      (d) =>
        `${d.name} · ${state.sites.find((s) => s.id === d.site_id)?.name || ""}`,
    ),
  );
  render();
}
function render() {
  const current = state.grants.filter(
    (g) =>
      !g.revoked_at && (!g.expires_at || Date.parse(g.expires_at) > Date.now()),
  );
  $("#stats").innerHTML = [
    [state.horses.length, "Caballos de prueba"],
    [current.length, "Accesos preparados"],
    [state.cameras.length, "Cámaras en borrador"],
    [0, "Cambios en producción"],
  ]
    .map(([n, t]) => `<div class="stat"><b>${n}</b><span>${t}</span></div>`)
    .join("");
  $("#horse-cards").innerHTML = state.horses
    .map(
      (h) =>
        `<div class="horse-card"><span class="horse-icon">♞</span><div><b>${escape(h.name)}</b><small>Catálogo ficticio · Disponible para simulación</small></div></div>`,
    )
    .join("");
  $("#grants").innerHTML = state.grants.length
    ? state.grants
        .map((g) => {
          const closed =
            g.revoked_at ||
            (g.expires_at && Date.parse(g.expires_at) <= Date.now());
          return `<tr><td>${escape(labelUser(g.user_id))}<small>${escape(labelHorse(g.horse_id))}</small></td><td>${[g.photos ? "Fotos" : "", g.live ? "Vídeo" : ""].filter(Boolean).join(" · ")}</td><td>${date(g.expires_at)}</td><td><span class="badge ${closed ? "closed" : ""}">${g.revoked_at ? "Retirado" : closed ? "Vencido" : "Preparado"}</span></td><td>${!g.revoked_at ? `<button data-edit="${g.id}">Editar</button><button data-revoke="${g.id}">Retirar</button>` : ""}</td></tr>`;
        })
        .join("")
    : '<tr><td colspan="5" class="empty">Todavía no hay accesos preparados. Crea el primero.</td></tr>';
  $("#camera-list").innerHTML = state.cameras.length
    ? state.cameras
        .map(
          (c) =>
            `<div class="camera-item"><button data-plan="${c.id}">Descargar preparación</button><b>${escape(c.technical_id)}</b><small>${escape(labelHorse(state.bindings.find((b) => b.camera_id === c.id && !b.ends_at)?.horse_id))} · IP propuesta ${escape(c.ip_address)} · Pendiente de validación física</small></div>`,
        )
        .join("")
    : '<div class="empty">No hay cámaras en preparación.</div>';
  const names = {
    "grant.create": "Acceso preparado",
    "grant.update": "Permiso actualizado",
    "grant.revoke": "Acceso retirado",
    "site.create": "Establo registrado",
    "device.prepare": "Equipo preparado",
    "camera.prepare": "Cámara asociada en borrador",
  };
  $("#audit").innerHTML = state.audit.length
    ? state.audit
        .map(
          (a) =>
            `<div class="audit-item"><b>${escape(names[a.operation] || a.operation)}</b>${escape(a.details.reason)}<small>${date(a.created_at)} · ${escape(labelUser(a.actor_id))}</small></div>`,
        )
        .join("")
    : '<div class="empty">Los cambios aparecerán aquí.</div>';
}
function resetGrant() {
  $("#grant-form").reset();
  editing = null;
  $("#grant-form [name=user_id]").disabled = false;
  $("#grant-form [name=horse_id]").disabled = false;
  $("#grant-title").textContent = "Preparar un acceso";
  $("#grant-form button[type=submit]").textContent = "Guardar acceso de prueba";
  $("#cancel-edit").hidden = true;
}
$("#cancel-edit").onclick = resetGrant;
function submit(id, callback) {
  $(id).addEventListener("submit", async (e) => {
    e.preventDefault();
    const b = e.submitter;
    b.disabled = true;
    try {
      await callback(e.target);
      await refresh();
    } catch (error) {
      notice(error.message, true);
    } finally {
      b.disabled = false;
    }
  });
}
submit("#grant-form", async (f) => {
  const data = {
    photos: field(f, "photos").checked,
    live: field(f, "live").checked,
    expires_at: field(f, "expires_at").value
      ? new Date(field(f, "expires_at").value).toISOString()
      : null,
    reason: field(f, "reason").value,
  };
  if (editing) {
    await api("/api/grants/" + editing.id, {
      method: "PUT",
      body: { ...data, revision: editing.revision },
    });
  } else
    await api("/api/grants", {
      method: "POST",
      body: {
        ...data,
        user_id: field(f, "user_id").value,
        horse_id: field(f, "horse_id").value,
      },
    });
  resetGrant();
  notice("Acceso guardado en pruebas. Los permisos de producción no cambian.");
});
submit("#simulation-form", async (f) => {
  const result = await api("/api/simulate", {
    method: "POST",
    body: {
      user_id: field(f, "user_id").value,
      horse_id: field(f, "horse_id").value,
      action: field(f, "action").value,
    },
  });
  const box = $("#simulation-result");
  box.hidden = false;
  box.className = "result" + (result.allow ? "" : " denied");
  box.textContent = result.allow
    ? "Permitido en la simulación. No se ha abierto contenido real."
    : "Sin acceso en la simulación para ese contenido.";
});
submit("#site-form", async (f) => {
  await api("/api/sites", {
    method: "POST",
    body: { name: field(f, "name").value },
  });
  f.reset();
  notice("Establo de prueba preparado.");
});
submit("#device-form", async (f) => {
  await api("/api/devices", {
    method: "POST",
    body: { site_id: field(f, "site_id").value, name: field(f, "name").value },
  });
  f.reset();
  notice(
    "Equipo registrado como borrador. No se ha conectado ninguna Raspberry.",
  );
});
submit("#camera-form", async (f) => {
  const device = state.devices.find(
    (d) => d.id === field(f, "device_id").value,
  );
  if (!device) throw Error("Selecciona una Raspberry.");
  await api("/api/cameras", {
    method: "POST",
    body: {
      site_id: device.site_id,
      device_id: device.id,
      horse_id: field(f, "horse_id").value,
      technical_id: field(f, "technical_id").value,
      mac: field(f, "mac").value.toLowerCase(),
      ip_address: field(f, "ip_address").value,
    },
  });
  f.reset();
  notice("Asociación preparada. La cámara física no se ha modificado.");
});
document.addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  try {
    if (b.dataset.edit) {
      const g = state.grants.find((g) => g.id === b.dataset.edit);
      editing = g;
      const f = $("#grant-form");
      field(f, "user_id").value = g.user_id;
      field(f, "horse_id").value = g.horse_id;
      field(f, "user_id").disabled = field(f, "horse_id").disabled = true;
      field(f, "photos").checked = g.photos;
      field(f, "live").checked = g.live;
      field(f, "reason").value = "";
      field(f, "expires_at").value = g.expires_at
        ? new Date(
            Date.parse(g.expires_at) - new Date().getTimezoneOffset() * 60000,
          )
            .toISOString()
            .slice(0, 16)
        : "";
      $("#grant-title").textContent = "Editar acceso preparado";
      f.querySelector("button[type=submit]").textContent = "Guardar cambios";
      $("#cancel-edit").hidden = false;
      f.scrollIntoView({ behavior: "smooth" });
    }
    if (b.dataset.revoke) {
      const g = state.grants.find((g) => g.id === b.dataset.revoke);
      await api("/api/grants/" + g.id + "/revoke", {
        method: "POST",
        body: {
          revision: g.revision,
          reason: "Retirado desde el panel de pruebas",
        },
      });
      await refresh();
      if (editing?.id === g.id) resetGrant();
      notice("Acceso retirado en pruebas. El historial se conserva.");
    }
    if (b.dataset.plan) {
      const plan = await api("/api/cameras/" + b.dataset.plan + "/plan"),
        blob = new Blob([JSON.stringify(plan, null, 2)], {
          type: "application/json",
        }),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "preparacion-" + plan.camera.technical_id + ".json";
      a.click();
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    notice(error.message, true);
  }
});
refresh().catch((error) => notice(error.message, true));
