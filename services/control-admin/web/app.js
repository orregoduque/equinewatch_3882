let state,
  csrf,
  editing = null,
  planCursor = null,
  nextPlanCursor = null,
  selectedRun = null;
let authConfig,
  userCursor = null,
  nextUserCursor = null;
let grantCursor = null,
  nextGrantCursor = null;
const directoryCache = Object.fromEntries(
  ["users", "horses", "sites", "devices", "cameras"].map((k) => [k, new Map()]),
);
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
  organizations: [
    "Cada organización, en su espacio.",
    "Asigna responsables y prepara establos con acceso limitado a su ámbito.",
  ],
  people: [
    "Personas y caballos, por UUID.",
    "Crea identidades de prueba y conserva las asociaciones existentes.",
  ],
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
  installations: [
    "Del plan a la instalación.",
    "Reserva identidades, protege el inventario y ensaya cada paso.",
  ],
  history: [
    "Cada cambio, registrado.",
    "Consulta quién preparó o retiró un permiso y por qué.",
  ],
};
const errors = {
  ORG_MANAGER_REQUIRED:
    "El registro de caballos requiere una responsabilidad de organización.",
  OWNER_NOT_AUTHORIZED:
    "El propietario no está autorizado o activo para este establo. Revisa la selección.",
  HORSE_QUOTA_REACHED:
    "Se alcanzó el límite de caballos de esta organización. Solicita una revisión al administrador central.",
  HORSE_QUOTA_BELOW_USAGE:
    "El límite no puede ser menor que los caballos ya registrados.",
  INVALID_LIMIT: "Indica un límite entero entre 0 y 100.000.",
  PANEL_ACCESS_REQUIRED:
    "Tu cuenta no tiene una responsabilidad activa en este panel.",
  ORGANIZATION_NOT_FOUND: "La organización no está disponible en tu ámbito.",
  ORG_WRITE_REQUIRED: "Tu responsabilidad permite consultar este espacio.",
  INVALID_SCOPE:
    "El responsable de organización debe tener ámbito de organización.",
  HORSE_SITE_CONFLICT:
    "La cámara actual del caballo pertenece a otro establo. Revisa primero esa asociación.",
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
  LEGACY_RESOURCE_PROTECTED:
    "El plan comparte una identidad con el inventario existente. Revisa la asociación antes de continuar.",
  INVENTORY_CONFLICT:
    "El inventario contiene una identidad ya registrada o reservada. Revisa el lote completo.",
  RESOURCE_RESERVED:
    "Otra instalación ya reservó ese identificador, nodo, IP o caballo.",
  PLAN_STALE: "La asociación de esta cámara cambió. El plan necesita revisión.",
  INVALID_INVENTORY_SIZE: "El archivo debe contener entre 1 y 100 cámaras.",
  INVALID_RECEIVER_ORIGIN:
    "Indica solo el origen HTTPS del receptor, sin rutas ni credenciales.",
  INVALID_NODE_ID: "Indica un número de nodo positivo.",
  INVALID_BUCKET: "Revisa el nombre del bucket Wasabi.",
  INVALID_REGION: "Revisa la región Wasabi.",
  LOGIN_FAILED: "No se pudo iniciar sesión con esas credenciales.",
  SESSION_REQUIRED: "Inicia sesión para continuar.",
  SESSION_INVALID: "La sesión ya no es válida. Inicia sesión nuevamente.",
  AUTH_RATE_LIMIT: "Se alcanzó el límite de intentos. Espera un minuto.",
  MFA_REQUIRED: "Verifica tu segundo factor para continuar.",
  MFA_INVALID: "El código no es válido. Revisa el autenticador.",
  INVALID_EMAIL: "Revisa la dirección de correo.",
  DEMO_EMAIL_REQUIRED: "En el demo utiliza una dirección @example.invalid.",
  FIXTURE_EMAIL_REQUIRED:
    "En este staging usa control-nombre@example.invalid. Los clientes se conservan fuera del piloto.",
  USER_REQUEST_EXISTS:
    "Ya existe una solicitud para ese correo con otro nombre. Revisa el registro.",
  AUTH_ADMIN_NOT_CONFIGURED:
    "El creador de cuentas de este entorno todavía no está configurado.",
  PEOPLE_NOT_ENABLED: "Las altas aún no están habilitadas en este entorno.",
  REQUEST_BUSY: "El alta está en proceso. Espera antes de reintentar.",
};
function notice(message, error = false) {
  $("#notice").hidden = false;
  $("#notice").className = error ? "error" : "";
  $("#notice").textContent = message;
}
async function api(path, { method = "GET", body, idempotencyKey } = {}) {
  const headers = {};
  if (body) {
    headers["Content-Type"] = "application/json";
    headers["X-CSRF-Token"] = csrf;
    headers["Idempotency-Key"] = idempotencyKey || crypto.randomUUID();
  }
  const response = await fetch(path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
    }),
    data = await response.json();
  if (!response.ok) {
    const error = Error(
      errors[data.error] ||
        "No se pudo completar el cambio. Revisa la conexión y vuelve a intentarlo.",
    );
    error.code = data.error;
    error.status = response.status;
    if (
      authConfig?.login_required &&
      ["SESSION_REQUIRED", "SESSION_INVALID", "MFA_REQUIRED"].includes(
        data.error,
      )
    ) {
      csrf = undefined;
      $("#mfa-form").hidden = true;
      $("#login-form").hidden = false;
      showLogin(error.message);
    }
    throw error;
  }
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
  if (button) {
    page(button.dataset.page);
    if (button.dataset.page === "organizations" && state)
      refreshOrganizations().catch((error) => notice(error.message, true));
  }
});
function fill(select, items, label) {
  const previous = select.value;
  const previousLabel = select.selectedOptions[0]?.textContent;
  select.replaceChildren(new Option("Selecciona una opción", ""));
  items.forEach((item) => select.add(new Option(label(item), item.id)));
  if (previous && !items.some((i) => i.id === previous))
    select.add(new Option(previousLabel, previous));
  if (previous) select.value = previous;
}
function labelUser(id) {
  const u =
    directoryCache.users.get(id) || state.users.find((x) => x.id === id);
  return u?.full_name || "Usuario";
}
function labelHorse(id) {
  return (
    (directoryCache.horses.get(id) || state.horses.find((x) => x.id === id))
      ?.name || "Caballo"
  );
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
  all("[data-central-only]").forEach(
    (el) => (el.hidden = !state.context.global_admin),
  );
  all("nav [data-page]").forEach(
    (el) =>
      (el.hidden =
        !state.context.global_admin && el.dataset.page !== "organizations"),
  );
  if (!state.context.global_admin) {
    $("#account-label").textContent = "Responsabilidad limitada";
    $("#logout-button").hidden = state.mode !== "staging";
    if (state.mode === "staging") {
      $(".environment b").textContent = "STAGING AISLADO";
      $(".environment span").textContent =
        "Organizaciones de prueba · Acceso limitado por ámbito";
    }
    page("organizations");
    await refreshOrganizations();
    return;
  }
  for (const kind of Object.keys(directoryCache))
    for (const item of state[kind] || [])
      directoryCache[kind].set(item.id, item);
  const grants = await api(
    "/api/installations/grants?limit=20" +
      (grantCursor ? "&after=" + grantCursor : ""),
  );
  state.grants = grants.items;
  nextGrantCursor = grants.next;
  $("#grants-next").disabled = !grants.next;
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
  all("select[name=owner_id]").forEach((el) =>
    fill(
      el,
      state.users.filter((u) => u.is_active),
      (u) => u.full_name + " · " + u.email,
    ),
  );
  $("#user-form button[type=submit]").disabled = !state.people?.create_users;
  $("#horse-form button[type=submit]").disabled = !state.people?.create_horses;
  if (state.mode === "staging") {
    $(".environment b").textContent = "STAGING AISLADO";
    $(".environment span").textContent =
      "Supabase de pruebas · Sin cámaras ni clientes de producción";
    $("#account-label").textContent = "Administrador autenticado";
    $("#logout-button").hidden = false;
  }
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
  all("select[name=camera_id]").forEach((el) =>
    fill(el, state.cameras, (c) => c.technical_id),
  );
  render();
  await refreshInstallations();
  await refreshPeople();
  await refreshOrganizations();
}
function render() {
  const current = state.grants.filter(
    (g) =>
      !g.revoked_at && (!g.expires_at || Date.parse(g.expires_at) > Date.now()),
  );
  $("#stats").innerHTML = [
    [state.catalog_counts?.horses ?? state.horses.length, "Caballos de prueba"],
    [
      state.catalog_counts?.current_grants ?? current.length,
      "Accesos preparados",
    ],
    [
      state.catalog_counts?.cameras ?? state.cameras.length,
      "Cámaras en borrador",
    ],
    [0, "Cambios en producción"],
  ]
    .map(([n, t]) => `<div class="stat"><b>${n}</b><span>${t}</span></div>`)
    .join("");
  $("#horse-cards").innerHTML = state.horses
    .slice(0, 20)
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
    "inventory.observe": "Inventario existente registrado",
    "installation.prepare": "Plan de instalación preparado",
    "installation.simulation.queue": "Ensayo en cola",
    "installation.simulation.cancel": "Ensayo cancelado",
    "installation.step.claimed": "Paso reservado para ensayo",
    "installation.step.simulated": "Paso simulado",
    "installation.simulation.retry": "Reintento de ensayo preparado",
    "installation.simulation.failed": "Ensayo detenido",
    "horse.create": "Caballo de prueba creado",
    "user.request": "Alta de persona solicitada",
    "user.request.ready": "Cuenta y perfil preparados",
    "user.request.existing_review": "Cuenta existente conservada",
    "user.request.reconcile": "Alta pendiente de conciliación",
    "user.request.failed": "Alta detenida para revisión",
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
  const device =
    state.devices.find((d) => d.id === field(f, "device_id").value) ||
    directoryCache.devices.get(field(f, "device_id").value);
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
const stepLabels = {
  identity: "Caballo, propietario y equipo por UUID",
  network: "Identidad física y dirección IP",
  media: "JPEG y vídeo H.264",
  wasabi_writer: "Escritor Wasabi de la Raspberry",
  wasabi_reader: "Lector Wasabi de la app",
  photo_ingestion: "Captura y subida de fotografías",
  hls_receiver: "Capacidad y asociación del receptor HLS",
  publisher: "Publicador y límites locales",
  end_to_end: "Fotos, vídeo y permisos de extremo a extremo",
  recovery: "Recuperación después de cortes",
};
async function refreshInstallations() {
  const [plans, inventory] = await Promise.all([
    api(
      "/api/installations/plans?limit=20" +
        (planCursor ? "&after=" + planCursor : ""),
    ),
    api("/api/installations/inventory?limit=20"),
  ]);
  nextPlanCursor = plans.next;
  $("#plans-next").disabled = !nextPlanCursor;
  $("#inventory-summary").textContent = inventory.items.length
    ? inventory.items
        .map(
          (i) =>
            `${i.source}: ${i.camera_count} cámara(s) registradas como existentes`,
        )
        .join(" · ") + (inventory.next ? " · Hay más inventarios" : "")
    : "Todavía no hay inventarios registrados. La protección de identidades existentes depende de este registro revisado.";
  $("#installation-list").innerHTML = plans.items.length
    ? plans.items
        .map(
          (p) =>
            `<div class="installation-item"><b>${escape(p.spec.technical_id)}</b><small>${escape(labelHorse(p.spec.horse_id))} · ${escape(p.spec.ip_address)} · nodo ${p.spec.node_id}</small><small>${escape(p.spec.bucket)} / stable-eye/${escape(p.spec.site_id)}/node_${p.spec.node_id}/</small><div class="actions"><button data-installation-download="${p.id}">Descargar plan y políticas</button><button data-installation-simulate="${p.id}">Nuevo ensayo</button>${p.latest_run_id ? `<button data-installation-resume="${p.latest_run_id}">Ver / retomar último ensayo</button>` : ""}</div></div>`,
        )
        .join("")
    : '<div class="empty">Prepara una cámara y guarda su primer plan de instalación.</div>';
}
submit("#installation-form", async (f) => {
  await api("/api/installations/plans", {
    method: "POST",
    body: {
      camera_id: field(f, "camera_id").value,
      node_id: Number(field(f, "node_id").value),
      bucket: field(f, "bucket").value,
      wasabi_region: field(f, "wasabi_region").value,
      receiver_origin: field(f, "receiver_origin").value,
    },
  });
  planCursor = null;
  notice("Plan guardado con reservas y políticas para revisión.");
});
submit("#inventory-form", async (f) => {
  const file = field(f, "inventory").files[0];
  if (!file || file.size > 50000)
    throw Error("Selecciona un JSON de hasta 50 KB sin credenciales.");
  let content;
  try {
    content = JSON.parse(await file.text());
  } catch {
    throw Error("El archivo no contiene JSON válido.");
  }
  if (!content || Object.keys(content).some((k) => k !== "cameras"))
    throw Error(
      "Usa un archivo de inventario que contenga únicamente cameras.",
    );
  await api("/api/installations/inventory", {
    method: "POST",
    body: { source: field(f, "source").value, cameras: content.cameras },
  });
  f.reset();
  notice(
    "Inventario registrado como observación. Los equipos conservan su administración actual.",
  );
});
async function showRun(id) {
  const run = await api("/api/installations/runs/" + id);
  selectedRun = run.id;
  $("#run-panel").hidden = false;
  const done = run.steps.filter((s) => s.state === "simulated").length;
  const labels = {
    queued: "Listo para continuar",
    running: "Paso reservado temporalmente",
    retry_wait: "Esperando próximo intento",
    simulated: "Ensayo completado",
    failed: "Ensayo detenido",
    cancelled: "Ensayo cancelado",
  };
  $("#run-state").textContent =
    `${labels[run.state] || run.state} · ${done}/${run.steps.length} pasos simulados. Las comprobaciones externas siguen pendientes.`;
  $("#run-steps").innerHTML = run.steps
    .map(
      (s) =>
        `<li>${escape(stepLabels[s.step_key] || s.step_key)}<small>${s.state === "simulated" ? "Simulado · Requiere comprobación real" : "Pendiente"}</small></li>`,
    )
    .join("");
  const terminal = ["simulated", "failed", "cancelled"].includes(run.state);
  $("#run-advance").disabled = terminal;
  $("#run-cancel").disabled = terminal;
}
for (const [selector, cursor] of [
  ["#plans-first", () => null],
  ["#plans-next", () => nextPlanCursor],
]) {
  $(selector).onclick = async () => {
    try {
      planCursor = cursor();
      await refreshInstallations();
    } catch (error) {
      notice(error.message, true);
    }
  };
}
for (const [selector, action] of [
  ["#run-advance", "advance"],
  ["#run-cancel", "cancel"],
]) {
  $(selector).onclick = async () => {
    const button = $(selector);
    button.disabled = true;
    try {
      await api(`/api/installations/runs/${selectedRun}/${action}`, {
        method: "POST",
        body: {},
      });
      await showRun(selectedRun);
      await refreshInstallations();
    } catch (error) {
      notice(error.message, true);
      button.disabled = false;
    }
  };
}
document.addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (!(
    b.dataset.installationDownload ||
    b.dataset.installationSimulate ||
    b.dataset.installationResume
  ))
    return;
  b.disabled = true;
  try {
    if (b.dataset.installationDownload) {
      const p = await api(
        "/api/installations/plans/" + b.dataset.installationDownload,
      );
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(p, null, 2)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `plan-${p.spec.technical_id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    if (b.dataset.installationSimulate) {
      const run = await api(
        `/api/installations/plans/${b.dataset.installationSimulate}/simulations`,
        { method: "POST", body: {} },
      );
      await showRun(run.id);
      await refreshInstallations();
    }
    if (b.dataset.installationResume)
      await showRun(b.dataset.installationResume);
  } catch (error) {
    notice(error.message, true);
  } finally {
    b.disabled = false;
  }
});
async function refreshPeople() {
  const result = await api(
    "/api/people/users?limit=20" + (userCursor ? "&after=" + userCursor : ""),
  );
  nextUserCursor = result.next;
  $("#users-next").disabled = !nextUserCursor;
  const labels = {
    queued: "Pendiente",
    processing: "En proceso",
    reconcile: "Requiere conciliación",
    ready: "Cuenta y perfil creados; activación pendiente",
    existing_review: "Cuenta existente; revisar sin reemplazar",
    failed: "Detenida para revisión",
  };
  $("#user-requests").innerHTML = result.items.length
    ? result.items
        .map(
          (u) =>
            `<div class="installation-item"><b>${escape(u.full_name)}</b><small>${escape(u.email)} · ${escape(labels[u.state] || u.state)}</small>${u.auth_user_id ? `<small>UUID: ${escape(u.auth_user_id)}</small>` : ""}${["queued", "reconcile", "processing"].includes(u.state) ? `<div class="actions"><button data-user-process="${u.id}">Comprobar / retomar alta</button></div>` : ""}</div>`,
        )
        .join("")
    : '<div class="empty">Todavía no hay solicitudes de alta.</div>';
}
function installDirectorySearch() {
  const kinds = {
    user_id: "users",
    owner_id: "users",
    horse_id: "horses",
    site_id: "sites",
    device_id: "devices",
    camera_id: "cameras",
  };
  for (const select of all("select")) {
    const kind = kinds[select.name];
    if (!kind) continue;
    const label = document.createElement("label"),
      input = document.createElement("input");
    label.textContent =
      kind === "users"
        ? "Buscar persona"
        : kind === "horses"
          ? "Buscar caballo"
          : kind === "sites"
            ? "Buscar establo"
            : kind === "devices"
              ? "Buscar Raspberry"
              : "Buscar cámara";
    input.type = "search";
    input.placeholder =
      kind === "users" ? "Nombre o correo" : "Nombre o identificador";
    input.maxLength = 120;
    input.setAttribute("aria-label", label.textContent);
    label.append(input);
    select.closest("label").before(label);
    let timer,
      generation = 0;
    input.oninput = () => {
      clearTimeout(timer);
      const current = ++generation;
      timer = setTimeout(async () => {
        try {
          const result = await api(
            `/api/installations/${kind}?limit=20&q=${encodeURIComponent(input.value)}`,
          );
          if (current !== generation || select.disabled) return;
          for (const row of result.items) directoryCache[kind].set(row.id, row);
          fill(
            select,
            result.items.filter((row) => row.is_active !== false),
            (row) =>
              row.full_name
                ? row.full_name + " · " + row.email
                : row.name || row.technical_id,
          );
        } catch (error) {
          notice(error.message, true);
        }
      }, 300);
    };
  }
}
for (const [selector, cursor] of [
  ["#grants-first", () => null],
  ["#grants-next", () => nextGrantCursor],
])
  $(selector).onclick = async () => {
    try {
      grantCursor = cursor();
      await refresh();
    } catch (error) {
      notice(error.message, true);
    }
  };
submit("#user-form", async (f) => {
  const request = await api("/api/people/users", {
    method: "POST",
    body: {
      full_name: field(f, "full_name").value,
      email: field(f, "email").value,
    },
  });
  const result = await api(`/api/people/users/${request.id}/process`, {
    method: "POST",
    body: {},
  });
  f.reset();
  notice(
    result.state === "ready"
      ? "Cuenta y perfil de prueba creados. No se enviaron invitaciones ni se otorgó acceso a caballos."
      : result.state === "existing_review"
        ? "La cuenta ya existe. Se conservó sin cambiar sus datos o permisos."
        : "El alta quedó registrada para conciliación o revisión.",
  );
});
submit("#horse-form", async (f) => {
  const horse = await api("/api/people/horses", {
    method: "POST",
    body: {
      name: field(f, "name").value,
      stall_number: field(f, "stall_number").value,
      owner_id: field(f, "owner_id").value,
    },
  });
  f.reset();
  notice(
    `Caballo de prueba creado: ${horse.name}. La instalación de cámara y almacenamiento sigue pendiente.`,
  );
});
for (const [selector, cursor] of [
  ["#users-first", () => null],
  ["#users-next", () => nextUserCursor],
])
  $(selector).onclick = async () => {
    try {
      userCursor = cursor();
      await refreshPeople();
    } catch (e) {
      notice(e.message, true);
    }
  };
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-user-process]");
  if (!b) return;
  b.disabled = true;
  try {
    await api(`/api/people/users/${b.dataset.userProcess}/process`, {
      method: "POST",
      body: {},
    });
    await refresh();
  } catch (error) {
    notice(error.message, true);
  } finally {
    b.disabled = false;
  }
});
let organizationCursor = null,
  nextOrganizationCursor = null,
  organizationItems = [],
  selectedOrganization = null;
let organizationSearchVersion = 0;
const organizationResourceCursors = {},
  organizationResourceNext = {};
const organizationResourceNames = {
  sites: "Establos",
  horses: "Caballos",
  members: "Responsabilidades",
  devices: "Raspberry preparadas",
  cameras: "Cámaras preparadas",
  events: "Registro de preparación",
};
async function refreshOrganizations() {
  const requestVersion = ++organizationSearchVersion;
  const result = await api(
    "/api/organizations?limit=20" +
      (organizationCursor ? "&after=" + organizationCursor : "") +
      "&q=" +
      encodeURIComponent($("#organization-search").value),
  );
  if (requestVersion !== organizationSearchVersion) return;
  organizationItems = result.items;
  nextOrganizationCursor = result.next;
  const select = $("#organization-select"),
    previous = select.value;
  select.replaceChildren(
    new Option(
      result.items.length
        ? "Selecciona una organización"
        : "Sin organizaciones en este ámbito",
      "",
    ),
  );
  for (const o of result.items)
    select.add(
      new Option(
        o.name + (o.state === "suspended" ? " · Suspendida" : ""),
        o.id,
      ),
    );
  select.value = result.items.some((o) => o.id === previous)
    ? previous
    : result.items[0]?.id || "";
  $("#organizations-next").disabled = !result.next;
  if (!$("#organizations").hidden) await loadOrganization();
}
async function loadOrganization() {
  const id = $("#organization-select").value;
  selectedOrganization = null;
  $("#organization-registration-panel").hidden = true;
  $("#organization-owners-panel").hidden = true;
  $("#organization-registration-form").reset();
  approvedOwnerCursor = null;
  ownerRecordCursor = null;
  $("#organization-owner-search").value = "";
  for (const k of Object.keys(organizationResourceNames))
    organizationResourceCursors[k] = null;
  $("#organization-resources").replaceChildren();
  $("#organization-workspace").hidden = !id;
  if (!id) return;
  const row = organizationItems.find((o) => o.id === id);
  const workspace =
    row.state === "suspended"
      ? { organization: row, capabilities: {} }
      : await api("/api/organizations/" + id);
  if ($("#organization-select").value !== id) return;
  selectedOrganization = workspace;
  $("#organization-title").textContent = row.name;
  const roles = {
    control_admin: "Administración central",
    org_admin: "Responsable de organización",
    installer: "Instalador",
    viewer: "Consulta",
  };
  $("#organization-scope").textContent =
    row.state === "suspended"
      ? "Organización suspendida. Se conserva su historial."
      : (roles[workspace.organization.role] || "Ámbito asignado") +
        " · Los medios de producción conservan sus permisos actuales.";
  $("#organization-state").textContent =
    row.state === "suspended"
      ? "Reactivar organización"
      : "Suspender organización";
  $("#organization-site-form").hidden = !workspace.capabilities.create_sites;
  $("#organization-member-form").closest("[data-central-only]").hidden =
    !state.context.global_admin || row.state === "suspended";
  if (row.state === "suspended") return;
  $("#organization-registration-panel").hidden =
    !workspace.capabilities.manage_horses;
  $("#organization-owners-panel").hidden = !state.context.global_admin;
  if (workspace.horse_capacity) {
    const cap = workspace.horse_capacity;
    $("#organization-horse-capacity").textContent =
      `${cap.used} de ${cap.horse_limit} caballos registrados · ${cap.remaining} cupos disponibles. La instalación de cámara y almacenamiento se prepara después del alta.`;
    field($("#organization-limit-form"), "horse_limit").value = cap.horse_limit;
    $("#organization-registration-form button[type=submit]").disabled =
      !workspace.capabilities.create_horses || cap.remaining < 1;
  }
  await Promise.all(
    Object.keys(organizationResourceNames).map(async (kind) => {
      const panel = document.createElement("div");
      panel.className = "panel";
      panel.innerHTML = `<h2>${organizationResourceNames[kind]}</h2><div data-org-list="${kind}"></div><div class="actions"><button data-org-first="${kind}">Primera página</button><button data-org-next="${kind}">Más registros</button></div>`;
      $("#organization-resources").append(panel);
      await loadOrganizationResource(kind, id);
      if ($("#organization-select").value !== id) return;
    }),
  );
  if (state.context.global_admin && $("#organization-select").value === id)
    await loadOwnerRecords(id);
}
async function loadOrganizationResource(
  kind,
  id = $("#organization-select").value,
) {
  const result = await api(
    `/api/organizations/${id}/${kind}?limit=20` +
      (organizationResourceCursors[kind]
        ? "&after=" + organizationResourceCursors[kind]
        : ""),
  );
  if ($("#organization-select").value !== id) return;
  organizationResourceNext[kind] = result.next;
  const container = $(`[data-org-list="${kind}"]`);
  if (!container) return;
  container.innerHTML = result.items.length
    ? result.items
        .map((item) => {
          let label =
            item.name || item.technical_id || item.operation || item.user_id;
          let detail = item.site_id || item.id;
          let action = "";
          if (kind === "members") {
            label = state.context.global_admin
              ? labelUser(item.user_id)
              : "Tu responsabilidad";
            detail = `${item.role} · ${item.site_id ? "Establo " + item.site_id : "Toda la organización"} · ${item.active ? "Activa" : "Retirada"}`;
            if (state.context.global_admin && item.active)
              action = `<button data-org-revoke="${item.id}">Retirar responsabilidad</button>`;
          }
          return `<div class="camera-item"><b>${escape(label)}</b><small>${escape(detail)}</small>${action}</div>`;
        })
        .join("")
    : '<p class="empty">Todavía no hay registros en este ámbito.</p>';
  container._items = result.items;
  $(`[data-org-next="${kind}"]`).disabled = !result.next;
  if (kind === "sites") {
    const scope = $("#organization-member-form [name=scope_site]");
    scope.replaceChildren(new Option("Toda la organización", ""));
    const target = $("#organization-horse-form [name=org_site]");
    target.replaceChildren(
      new Option("Selecciona un establo de esta página", ""),
    );
    for (const site of result.items) {
      scope.add(new Option(site.name, site.id));
      target.add(new Option(site.name, site.id));
    }
    const ownerScope = field($("#organization-owner-form"), "owner_scope"),
      registrationSite = field(
        $("#organization-registration-form"),
        "registration_site",
      );
    ownerScope.replaceChildren(new Option("Toda la organización", ""));
    registrationSite.replaceChildren(
      new Option("Selecciona un establo de esta página", ""),
    );
    for (const site of result.items) {
      ownerScope.add(new Option(site.name, site.id));
      registrationSite.add(new Option(site.name, site.id));
    }
    await loadApprovedOwners();
  }
}
async function organizationSubmit(e, work) {
  e.preventDefault();
  const button = e.submitter;
  button.disabled = true;
  try {
    await work(e.target);
    await refresh();
  } catch (error) {
    notice(error.message, true);
  } finally {
    button.disabled = false;
  }
}
$("#organization-form").onsubmit = (e) =>
  organizationSubmit(e, async (f) => {
    await api("/api/organizations", {
      method: "POST",
      body: { name: field(f, "name").value },
    });
    f.reset();
    notice(
      "Organización de prueba creada. Las asignaciones se preparan expresamente.",
    );
  });
$("#organization-site-form").onsubmit = (e) =>
  organizationSubmit(e, async (f) => {
    await api(`/api/organizations/${$("#organization-select").value}/sites`, {
      method: "POST",
      body: { name: field(f, "name").value },
    });
    f.reset();
    notice("Nuevo establo preparado en esta organización.");
  });
$("#organization-member-form").onsubmit = (e) =>
  organizationSubmit(e, async (f) => {
    await api(`/api/organizations/${$("#organization-select").value}/members`, {
      method: "POST",
      body: {
        user_id: field(f, "user_id").value,
        role: field(f, "role").value,
        site_id: field(f, "scope_site").value || null,
      },
    });
    notice("Responsabilidad preparada en el panel de pruebas.");
  });
$("#organization-horse-form").onsubmit = (e) =>
  organizationSubmit(e, async (f) => {
    await api(`/api/organizations/${$("#organization-select").value}/horses`, {
      method: "POST",
      body: {
        horse_id: field(f, "horse_id").value,
        site_id: field(f, "org_site").value,
      },
    });
    notice(
      "Caballo asociado por UUID. Se conserva su propietario y su configuración de medios.",
    );
  });
$("#organization-select").onchange = () =>
  loadOrganization().catch((e) => notice(e.message, true));
$("#organizations-next").onclick = () => {
  organizationCursor = nextOrganizationCursor;
  refreshOrganizations().catch((e) => notice(e.message, true));
};
$("#organizations-first").onclick = () => {
  organizationCursor = null;
  refreshOrganizations().catch((e) => notice(e.message, true));
};
let organizationSearchTimer;
$("#organization-search").oninput = () => {
  clearTimeout(organizationSearchTimer);
  organizationSearchTimer = setTimeout(() => {
    organizationCursor = null;
    refreshOrganizations().catch((e) => notice(e.message, true));
  }, 250);
};
$("#organization-state").onclick = async (e) => {
  const org = selectedOrganization?.organization;
  if (!org) return;
  e.target.disabled = true;
  try {
    await api("/api/organizations/" + org.id, {
      method: "PUT",
      body: {
        revision: org.revision,
        state: org.state === "active" ? "suspended" : "active",
      },
    });
    await refreshOrganizations();
    notice("Estado de la organización actualizado.");
  } catch (error) {
    notice(error.message, true);
  } finally {
    e.target.disabled = false;
  }
};
$("#organization-resources").onclick = async (e) => {
  const button = e.target.closest("button");
  if (!button) return;
  button.disabled = true;
  try {
    const kind = button.dataset.orgNext || button.dataset.orgFirst;
    if (kind) {
      organizationResourceCursors[kind] = button.dataset.orgNext
        ? organizationResourceNext[kind]
        : null;
      await loadOrganizationResource(kind);
      return;
    }
    if (button.dataset.orgRevoke) {
      const member = $('[data-org-list="members"]')._items.find(
        (m) => m.id === button.dataset.orgRevoke,
      );
      await api(
        `/api/organizations/${$("#organization-select").value}/members/${member.id}`,
        {
          method: "PUT",
          body: {
            role: member.role,
            site_id: member.site_id,
            active: false,
            revision: member.revision,
          },
        },
      );
      await loadOrganizationResource("members");
      notice(
        "Responsabilidad retirada. Se comprobará nuevamente en la siguiente petición.",
      );
    }
  } catch (error) {
    notice(error.message, true);
  } finally {
    if (button.isConnected) button.disabled = false;
  }
};
let approvedOwnerCursor = null,
  nextApprovedOwnerCursor = null,
  ownerRecordCursor = null,
  nextOwnerRecordCursor = null,
  approvedOwnerGeneration = 0,
  pendingHorseRegistration = null;
async function loadApprovedOwners() {
  const org = $("#organization-select").value,
    site = field(
      $("#organization-registration-form"),
      "registration_site",
    ).value;
  const select = field($("#organization-registration-form"), "approved_owner"),
    generation = ++approvedOwnerGeneration;
  select.replaceChildren(
    new Option(
      site
        ? "Buscando propietarios aprobados…"
        : "Selecciona primero un establo",
      "",
    ),
  );
  select.disabled = true;
  $("#approved-owners-next").disabled = true;
  if (!site || !selectedOrganization?.capabilities.manage_horses) return;
  const result = await api(
    `/api/organizations/${org}/owners?site_id=${site}&limit=20&q=${encodeURIComponent($("#organization-owner-search").value)}` +
      (approvedOwnerCursor ? "&after=" + approvedOwnerCursor : ""),
  );
  if (
    generation !== approvedOwnerGeneration ||
    $("#organization-select").value !== org ||
    field($("#organization-registration-form"), "registration_site").value !==
      site
  )
    return;
  select.replaceChildren(
    new Option(
      result.items.length
        ? "Selecciona un propietario aprobado"
        : "No hay propietarios aprobados en este ámbito",
      "",
    ),
  );
  for (const owner of result.items)
    select.add(new Option(owner.full_name, owner.id));
  select.disabled = !result.items.length;
  nextApprovedOwnerCursor = result.next;
  $("#approved-owners-next").disabled = !result.next;
}
async function loadOwnerRecords(org = $("#organization-select").value) {
  const result = await api(
    `/api/organizations/${org}/owner-records?limit=20` +
      (ownerRecordCursor ? "&after=" + ownerRecordCursor : ""),
  );
  if ($("#organization-select").value !== org) return;
  $("#organization-owner-records")._items = result.items;
  nextOwnerRecordCursor = result.next;
  $("#owner-records-next").disabled = !result.next;
  $("#organization-owner-records").innerHTML = result.items.length
    ? result.items
        .map(
          (item) =>
            `<div class="camera-item"><b>${escape(labelUser(item.user_id))}</b><small>${escape(item.site_id ? "Establo " + item.site_id : "Toda la organización")} · ${item.active ? "Aprobación activa" : "Aprobación retirada"}</small><button data-owner-toggle="${item.id}">${item.active ? "Retirar aprobación" : "Reactivar aprobación"}</button></div>`,
        )
        .join("")
    : '<p class="empty">Todavía no hay propietarios aprobados.</p>';
}
field($("#organization-registration-form"), "registration_site").onchange =
  () => {
    approvedOwnerCursor = null;
    loadApprovedOwners().catch((e) => notice(e.message, true));
  };
let approvedOwnerTimer;
$("#organization-owner-search").oninput = () => {
  clearTimeout(approvedOwnerTimer);
  approvedOwnerTimer = setTimeout(() => {
    approvedOwnerCursor = null;
    loadApprovedOwners().catch((e) => notice(e.message, true));
  }, 250);
};
$("#approved-owners-first").onclick = () => {
  approvedOwnerCursor = null;
  loadApprovedOwners().catch((e) => notice(e.message, true));
};
$("#approved-owners-next").onclick = () => {
  approvedOwnerCursor = nextApprovedOwnerCursor;
  loadApprovedOwners().catch((e) => notice(e.message, true));
};
$("#owner-records-first").onclick = () => {
  ownerRecordCursor = null;
  loadOwnerRecords().catch((e) => notice(e.message, true));
};
$("#owner-records-next").onclick = () => {
  ownerRecordCursor = nextOwnerRecordCursor;
  loadOwnerRecords().catch((e) => notice(e.message, true));
};
$("#organization-owner-form").onsubmit = (e) =>
  organizationSubmit(e, async (f) => {
    await api(`/api/organizations/${$("#organization-select").value}/owners`, {
      method: "POST",
      body: {
        user_id: field(f, "user_id").value,
        site_id: field(f, "owner_scope").value || null,
      },
    });
    notice("Propietario aprobado para registrar caballos en su ámbito.");
  });
$("#organization-limit-form").onsubmit = (e) =>
  organizationSubmit(e, async (f) => {
    await api(
      `/api/organizations/${$("#organization-select").value}/horse-capacity`,
      {
        method: "PUT",
        body: {
          horse_limit: Number(field(f, "horse_limit").value),
          revision: selectedOrganization.horse_capacity.revision,
        },
      },
    );
    notice("Límite operativo actualizado.");
  });
$("#organization-owner-records").onclick = async (e) => {
  const b = e.target.closest("[data-owner-toggle]");
  if (!b) return;
  b.disabled = true;
  try {
    const record = $("#organization-owner-records")._items.find(
      (x) => x.id === b.dataset.ownerToggle,
    );
    await api(
      `/api/organizations/${$("#organization-select").value}/owners/${record.id}`,
      {
        method: "PUT",
        body: {
          site_id: record.site_id,
          active: !record.active,
          revision: record.revision,
        },
      },
    );
    await loadOwnerRecords();
    await loadApprovedOwners();
    notice(
      "Aprobación de propietario actualizada. Se conservan sus caballos existentes.",
    );
  } catch (error) {
    notice(error.message, true);
  } finally {
    if (b.isConnected) b.disabled = false;
  }
};
$("#organization-registration-form").onsubmit = async (e) => {
  e.preventDefault();
  const f = e.target,
    b = e.submitter,
    org = $("#organization-select").value;
  const body = {
    name: field(f, "name").value,
    stall_number: field(f, "stall_number").value,
    site_id: field(f, "registration_site").value,
    owner_id: field(f, "approved_owner").value,
  };
  const signature = JSON.stringify([org, body]);
  if (pendingHorseRegistration?.signature !== signature)
    pendingHorseRegistration = { signature, key: crypto.randomUUID() };
  b.disabled = true;
  try {
    const result = await api(`/api/organizations/${org}/horse-registrations`, {
      method: "POST",
      body,
      idempotencyKey: pendingHorseRegistration.key,
    });
    pendingHorseRegistration = null;
    f.reset();
    notice(
      `Caballo registrado: ${result.name}. La instalación de cámara y almacenamiento está pendiente.`,
    );
    await refresh();
  } catch (error) {
    notice(error.message, true);
  } finally {
    b.disabled =
      !selectedOrganization?.capabilities.create_horses ||
      selectedOrganization.horse_capacity?.remaining < 1;
  }
};
function showLogin(message = "") {
  $("#control-panel").hidden = true;
  $("#control-navigation").hidden = true;
  $("#login-panel").hidden = false;
  $("#login-notice").hidden = !message;
  $("#login-notice").textContent = message;
  document.body.classList.remove("loading");
}
function showPanel() {
  $("#control-panel").hidden = false;
  $("#control-navigation").hidden = false;
  $("#login-panel").hidden = true;
  document.body.classList.remove("loading");
}
async function loggedIn() {
  await refresh();
  showPanel();
}
$("#login-form").onsubmit = async (e) => {
  e.preventDefault();
  const f = e.target,
    b = e.submitter;
  b.disabled = true;
  try {
    const result = await api("/api/auth/login", {
      method: "POST",
      body: {
        email: field(f, "email").value,
        password: field(f, "password").value,
      },
    });
    csrf = result.csrf;
    if (result.authenticated) {
      await loggedIn();
      return;
    }
    if (result.mfa_enrollment_required) {
      showLogin(
        "Esta cuenta necesita registrar un autenticador antes de entrar. Solicita la preparación segura de la cuenta de pruebas.",
      );
      return;
    }
    fill(
      field($("#mfa-form"), "factor_id"),
      result.factors,
      (factor) => factor.name,
    );
    if (result.factors.length === 1)
      field($("#mfa-form"), "factor_id").value = result.factors[0].id;
    $("#login-form").hidden = true;
    $("#mfa-form").hidden = false;
    $("#login-notice").hidden = true;
  } catch (error) {
    showLogin(error.message);
  } finally {
    field(f, "password").value = "";
    b.disabled = false;
  }
};
$("#mfa-form").onsubmit = async (e) => {
  e.preventDefault();
  const f = e.target,
    b = e.submitter;
  b.disabled = true;
  try {
    await api("/api/auth/mfa", {
      method: "POST",
      body: {
        factor_id: field(f, "factor_id").value,
        code: field(f, "code").value,
      },
    });
    await loggedIn();
  } catch (error) {
    showLogin(error.message);
  } finally {
    field(f, "code").value = "";
    b.disabled = false;
  }
};
$("#logout-button").onclick = async () => {
  try {
    await api("/api/auth/logout", { method: "POST", body: {} });
  } finally {
    location.reload();
  }
};
async function initialize() {
  authConfig = await api("/api/auth/config");
  try {
    await loggedIn();
  } catch (error) {
    if (authConfig.login_required) showLogin(error.message);
    else {
      showPanel();
      notice(error.message, true);
    }
  }
}
installDirectorySearch();
initialize().catch((error) => showLogin(error.message));
