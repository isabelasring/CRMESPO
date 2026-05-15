(function () {
  const form = document.getElementById("form-reporte");
  const contenedor = document.getElementById("campos-crm");
  const cargando = document.getElementById("cargando");
  const mensaje = document.getElementById("mensaje");
  const btn = document.getElementById("btn-enviar");

  const OMITIR = new Set([
    "id",
    "number",
    "version",
    "createdAt",
    "modifiedAt",
    "createdById",
    "modifiedById",
    "createdByName",
    "modifiedByName",
    "assignedUserId",
    "assignedUserName",
    "teamsIds",
    "teamsNames",
    "deleted",
    "streamUpdatedAt",
    "contactId",
    "contactName",
    "accountId",
    "accountName",
    "leadId",
    "leadName",
    "attachments",
    "collaborators",
    "collaboratorsIds",
    "collaboratorsNames",
    "followersIds",
    "followersNames",
    "isDeleted",
    "groupEmailAccountId",
    "groupEmailAccountName",
  ]);

  const TIPOS_OK = new Set([
    "varchar",
    "text",
    "enum",
    "int",
    "float",
    "bool",
    "date",
    "datetime",
    "email",
    "phone",
    "url",
  ]);

  const ORDEN_PREFERIDO = [
    "name",
    "status",
    "type",
    "priority",
    "tipoCaso",
    "barrio",
    "description",
  ];

  function mostrar(texto, esError) {
    mensaje.hidden = false;
    mensaje.textContent = texto;
    mensaje.className = "mensaje " + (esError ? "error" : "ok");
  }

  function etiqueta(nombre) {
    return nombre
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, function (c) {
        return c.toUpperCase();
      });
  }

  function crearInput(nombre, def) {
    const label = document.createElement("label");
    const titulo = document.createElement("span");
    titulo.textContent = etiqueta(nombre) + (def.required ? " *" : "");
    label.appendChild(titulo);

    let control;
    const tipo = def.type;

    if (tipo === "enum" && def.options && def.options.length) {
      control = document.createElement("select");
      control.name = nombre;
      control.required = !!def.required;
      const vacio = document.createElement("option");
      vacio.value = "";
      vacio.textContent = "Seleccione…";
      control.appendChild(vacio);
      def.options.forEach(function (op) {
        const opt = document.createElement("option");
        opt.value = op;
        opt.textContent = op;
        control.appendChild(opt);
      });
    } else if (tipo === "text") {
      control = document.createElement("textarea");
      control.name = nombre;
      control.rows = 4;
      control.required = !!def.required;
    } else if (tipo === "bool") {
      control = document.createElement("input");
      control.type = "checkbox";
      control.name = nombre;
      control.value = "1";
    } else if (tipo === "date") {
      control = document.createElement("input");
      control.type = "date";
      control.name = nombre;
      control.required = !!def.required;
    } else if (tipo === "datetime") {
      control = document.createElement("input");
      control.type = "datetime-local";
      control.name = nombre;
      control.required = !!def.required;
    } else if (tipo === "int" || tipo === "float") {
      control = document.createElement("input");
      control.type = "number";
      control.name = nombre;
      control.required = !!def.required;
    } else {
      control = document.createElement("input");
      control.type = tipo === "email" ? "email" : "text";
      control.name = nombre;
      control.required = !!def.required;
    }

    label.appendChild(control);
    return label;
  }

  function nombresDesdeLayout(layout) {
    const lista = [];
    if (!Array.isArray(layout)) return lista;
    layout.forEach(function (fila) {
      if (!Array.isArray(fila)) return;
      fila.forEach(function (celda) {
        if (celda && celda.name) lista.push(celda.name);
      });
    });
    return lista;
  }

  function ordenarCampos(nombres) {
    const set = new Set(nombres);
    const ordenados = [];
    ORDEN_PREFERIDO.forEach(function (n) {
      if (set.has(n)) {
        ordenados.push(n);
        set.delete(n);
      }
    });
    Array.from(set)
      .sort()
      .forEach(function (n) {
        ordenados.push(n);
      });
    return ordenados;
  }

  function elegirCampos(meta) {
    const fieldDefs =
      (meta.entityDefs && meta.entityDefs.Case && meta.entityDefs.Case.fields) ||
      {};

    let layout =
      meta.layouts && meta.layouts.Case && meta.layouts.Case.edit
        ? meta.layouts.Case.edit
        : null;

    let nombres = nombresDesdeLayout(layout);

    if (!nombres.length) {
      nombres = Object.keys(fieldDefs).filter(function (nombre) {
        const def = fieldDefs[nombre];
        if (!def || OMITIR.has(nombre)) return false;
        if (def.readOnly || def.disabled) return false;
        if (!TIPOS_OK.has(def.type)) return false;
        return true;
      });
    }

    return ordenarCampos(nombres).filter(function (nombre) {
      const def = fieldDefs[nombre];
      if (!def || OMITIR.has(nombre)) return false;
      if (def.readOnly || def.disabled) return false;
      if (!TIPOS_OK.has(def.type)) return false;
      return true;
    });
  }

  function armarFormulario(nombres, fieldDefs) {
    contenedor.innerHTML = "";

    nombres.forEach(function (nombre) {
      contenedor.appendChild(crearInput(nombre, fieldDefs[nombre]));
    });

    if (!contenedor.children.length) {
      mostrar(
        "No hay campos disponibles. Revisa permisos del API User (rol con acceso a Cases).",
        true
      );
      return;
    }

    cargando.hidden = true;
    btn.disabled = false;
  }

  function cargarCampos() {
    const key = window.CRM_CONFIG && window.CRM_CONFIG.apiKey;
    if (!key) {
      cargando.textContent = "Falta ESPO_API_KEY en .env — ejecuta npm start.";
      return;
    }

    fetch("/api/v1/Metadata", {
      headers: { "X-Api-Key": key },
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Metadata " + res.status);
        return res.json();
      })
      .then(function (meta) {
        const fieldDefs =
          (meta.entityDefs && meta.entityDefs.Case && meta.entityDefs.Case.fields) ||
          {};
        const nombres = elegirCampos(meta);
        armarFormulario(nombres, fieldDefs);
      })
      .catch(function (err) {
        cargando.textContent =
          "No se pudieron leer los campos. ¿npm start, Docker y API Key activos?";
        console.error(err);
      });
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    mensaje.hidden = true;

    const key = window.CRM_CONFIG && window.CRM_CONFIG.apiKey;
    const fd = new FormData(form);
    const caso = {};

    for (const par of fd.entries()) {
      const name = par[0];
      let value = par[1];
      if (value === "" || name === "") continue;
      const input = form.querySelector('[name="' + name + '"]');
      if (input && input.type === "checkbox" && !input.checked) continue;
      caso[name] = value;
    }

    if (!caso.status) caso.status = "New";
    if (!caso.name) {
      const partes = [caso.tipoCaso, caso.type, caso.barrio, caso.description]
        .filter(Boolean)
        .map(String);
      caso.name = partes.length ? partes.join(" — ").slice(0, 249) : "Reporte web";
    }

    btn.disabled = true;
    btn.textContent = "Enviando…";

    try {
      const res = await fetch("/api/v1/Case", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": key,
        },
        body: JSON.stringify(caso),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Error " + res.status);
      }

      const creado = await res.json();
      form.reset();
      mostrar("Caso creado. Número: " + (creado.number || creado.id), false);
    } catch (err) {
      mostrar("Error: " + err.message, true);
    } finally {
      btn.disabled = false;
      btn.textContent = "Enviar reporte";
    }
  });

  cargarCampos();
})();
