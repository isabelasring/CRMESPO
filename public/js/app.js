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
    "isInternal",
    "isArchived",
    "isFavorite",
    "type",
    "status",
    "priority",
    "name",
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
    "cTipoCaso",
    "barrio",
    "description",
  ];

  /** Siempre en el formulario web si existen en el CRM (aunque no estén en el layout). */
  const CAMPOS_FORMULARIO = ["cTipoCaso", "tipoCaso", "barrio", "description"];

  function esCampoParaFormulario(nombre, def) {
    if (!def || OMITIR.has(nombre)) return false;
    if (def.readOnly || def.disabled) return false;
    if (def.type === "bool") return false;
    if (nombre.startsWith("c") && TIPOS_OK.has(def.type)) return true;
    const base = ["description", "barrio"];
    return base.indexOf(nombre) !== -1 && TIPOS_OK.has(def.type);
  }

  function incluirCamposFormulario(nombres, fieldDefs) {
    const cfg = window.CRM_CONFIG || {};
    const extras = cfg.camposFormulario || CAMPOS_FORMULARIO;
    const set = new Set(nombres);
    extras.forEach(function (nombre) {
      if (esCampoParaFormulario(nombre, fieldDefs[nombre])) set.add(nombre);
    });
    return Array.from(set);
  }

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
    if (nombres.length) {
      nombres = incluirCamposFormulario(nombres, fieldDefs);
    }

    if (!nombres.length) {
      nombres = Object.keys(fieldDefs).filter(function (nombre) {
        return esCampoParaFormulario(nombre, fieldDefs[nombre]);
      });
    }

    return ordenarCampos(nombres).filter(function (nombre) {
      return esCampoParaFormulario(nombre, fieldDefs[nombre]);
    });
  }

  function prepararCasoParaApi(caso, reglaAsignacion) {
    const out = { status: caso.status || "New" };
    if (caso.name) out.name = caso.name;
    Object.keys(caso).forEach(function (nombre) {
      if (OMITIR.has(nombre)) return;
      if (nombre === "status") return;
      if (nombre.startsWith("c")) out[nombre] = caso[nombre];
      if (nombre === "description" || nombre === "barrio") out[nombre] = caso[nombre];
      const cfg = window.CRM_CONFIG || {};
      const campoEmail = cfg.campoEmailCiudadano || "emailReportante";
      if (nombre === campoEmail) out[nombre] = caso[nombre];
    });
    if (reglaAsignacion && reglaAsignacion.assignedUserId) {
      out.assignedUserId = reglaAsignacion.assignedUserId;
    }
    return out;
  }

  function mensajeErrorApi(texto, status) {
    if (status === 403) {
      return (
        "Sin permiso (403). En CRM: Roles del API User «Formulario web» → " +
        "Case: crear y asignar; campo cTipoCaso: editar."
      );
    }
    return texto || "Error " + status;
  }

  async function crearCasoEnCrm(key, payload) {
    const res = await fetch("/api/v1/Case", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": key,
      },
      body: JSON.stringify(payload),
    });
    return res;
  }

  async function asignarCasoEnCrm(key, caseId, assignedUserId) {
    return fetch("/api/v1/Case/" + caseId, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": key,
      },
      body: JSON.stringify({ assignedUserId: assignedUserId }),
    });
  }

  function agregarCorreoCiudadano(campoNombre) {
    if (contenedor.querySelector('[name="' + campoNombre + '"]')) return;
    const label = document.createElement("label");
    const titulo = document.createElement("span");
    titulo.textContent = "Correo electrónico *";
    label.appendChild(titulo);
    const input = document.createElement("input");
    input.type = "email";
    input.name = campoNombre;
    input.required = true;
    input.placeholder = "para enviarle confirmación del caso";
    label.appendChild(input);
    contenedor.insertBefore(label, contenedor.firstChild);
  }

  function motivoErrorCorreo(texto, status) {
    let msg = texto || "Error " + status;
    try {
      const j = JSON.parse(texto);
      if (j.message === "invalidCredentials") {
        return (
          "Gmail rechazó usuario/contraseña SMTP. Use contraseña de aplicación " +
          "(16 caracteres), no la clave normal. Administración → Cuentas de correo → " +
          "edite la cuenta y guarde de nuevo."
        );
      }
      if (j.message) msg = j.message;
    } catch (e) {
      /* no es JSON */
    }
    return msg;
  }

  function normalizarTexto(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function aplicarAsignacion(caso) {
    const reglas =
      (window.CRM_CONFIG && window.CRM_CONFIG.asignaciones) || [];
    for (let i = 0; i < reglas.length; i++) {
      const regla = reglas[i];
      const campo = regla.campo || "cTipoCaso";
      const valorCaso = caso[campo];
      if (!valorCaso || !regla.assignedUserId) continue;
      if (normalizarTexto(valorCaso) !== normalizarTexto(regla.valor)) continue;
      caso.assignedUserId = regla.assignedUserId;
      return regla;
    }
    return null;
  }

  function obtenerCorreo(caso) {
    const cfg = window.CRM_CONFIG || {};
    const campo = cfg.campoEmailCiudadano || "emailReportante";
    if (caso[campo]) return String(caso[campo]).trim();
    const input = form.querySelector('input[type="email"]');
    if (input && input.value) return input.value.trim();
    return "";
  }

  async function enviarCorreoConfirmacion(key, casoCreado, emailCiudadano, nombreCaso) {
    const cfg = window.CRM_CONFIG || {};
    const from = cfg.emailFrom;
    if (!from) return { ok: false, motivo: "sin EMAIL_FROM en .env" };

    const numero = casoCreado.number || casoCreado.id;
    const subject =
      "Hemos recibido su reporte ambiental — Caso " + numero;
    const body =
      "Estimado/a ciudadano/a,\n\n" +
      "Hemos recibido su reporte ambiental en el municipio de Envigado.\n\n" +
      "Número de caso: " +
      numero +
      "\n" +
      "Referencia: " +
      (nombreCaso || "") +
      "\n\n" +
      "Nuestro equipo revisará la información y dará seguimiento según corresponda.\n\n" +
      "Secretaría de Medio Ambiente y Desarrollo Agropecuario\n" +
      "Alcaldía de Envigado";

    const res = await fetch("/api/v1/Email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": key,
      },
      body: JSON.stringify({
        to: emailCiudadano,
        from: from,
        name: cfg.emailFromName || "CRM Envigado",
        subject: subject,
        body: body,
        bodyPlain: body,
        isHtml: false,
        status: "Sending",
        parentType: "Case",
        parentId: casoCreado.id,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      if (res.status === 403) {
        return {
          ok: false,
          motivo:
            "Sin permiso para Email. En CRM: Roles del API User → Email → permitir Crear.",
        };
      }
      return {
        ok: false,
        motivo: motivoErrorCorreo(err, res.status),
      };
    }
    return { ok: true };
  }

  async function enviarCorreoFuncionario(
    key,
    casoCreado,
    regla,
    nombreCaso,
    tipoCaso
  ) {
    const cfg = window.CRM_CONFIG || {};
    const to = regla.emailFuncionario;
    if (!to) return { ok: false, motivo: "sin ASIGNACION_EMAIL_CONTAMINACION en .env" };
    if (!cfg.emailFrom) return { ok: false, motivo: "sin EMAIL_FROM en .env" };

    const numero = casoCreado.number || casoCreado.id;
    const saludo = regla.nombreFuncionario
      ? "Hola " + regla.nombreFuncionario + ","
      : "Estimado/a funcionario/a,";
    const subject = "Nuevo caso asignado — " + numero + " (" + tipoCaso + ")";
    const body =
      saludo +
      "\n\n" +
      "Se le asignó un nuevo caso ambiental desde el formulario web.\n\n" +
      "Número: " +
      numero +
      "\n" +
      "Tipo: " +
      tipoCaso +
      "\n" +
      "Referencia: " +
      (nombreCaso || "") +
      "\n\n" +
      "Ingrese al CRM para revisarlo y dar seguimiento.\n\n" +
      "CRM Ambiental — Alcaldía de Envigado";

    const res = await fetch("/api/v1/Email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": key,
      },
      body: JSON.stringify({
        to: to,
        from: cfg.emailFrom,
        name: cfg.emailFromName || "CRM Envigado",
        subject: subject,
        body: body,
        bodyPlain: body,
        isHtml: false,
        status: "Sending",
        parentType: "Case",
        parentId: casoCreado.id,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return {
        ok: false,
        motivo: motivoErrorCorreo(err, res.status),
      };
    }
    return { ok: true };
  }

  function armarFormulario(nombres, fieldDefs) {
    contenedor.innerHTML = "";

    nombres.forEach(function (nombre) {
      contenedor.appendChild(crearInput(nombre, fieldDefs[nombre]));
    });

    agregarCorreoCiudadano(
      (window.CRM_CONFIG && window.CRM_CONFIG.campoEmailCiudadano) ||
        "emailReportante"
    );

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
      const partes = [
        caso.cTipoCaso,
        caso.tipoCaso,
        caso.type,
        caso.barrio,
        caso.description,
      ]
        .filter(Boolean)
        .map(String);
      caso.name = partes.length ? partes.join(" — ").slice(0, 249) : "Reporte web";
    }

    const reglaAsignacion = aplicarAsignacion(caso);
    const payload = prepararCasoParaApi(caso, reglaAsignacion);

    btn.disabled = true;
    btn.textContent = "Enviando…";

    try {
      let res = await crearCasoEnCrm(key, payload);

      if (!res.ok && res.status === 403 && payload.assignedUserId) {
        const sinAsignar = prepararCasoParaApi(caso, null);
        res = await crearCasoEnCrm(key, sinAsignar);
      }

      if (!res.ok) {
        const err = await res.text();
        throw new Error(mensajeErrorApi(err, res.status));
      }

      const creado = await res.json();

      if (
        reglaAsignacion &&
        reglaAsignacion.assignedUserId &&
        creado.assignedUserId !== reglaAsignacion.assignedUserId
      ) {
        const patch = await asignarCasoEnCrm(
          key,
          creado.id,
          reglaAsignacion.assignedUserId
        );
        if (!patch.ok) {
          console.warn("No se pudo asignar en CRM:", await patch.text());
        }
      }
      const correo = obtenerCorreo(caso);
      let textoOk =
        "Caso creado. Número: " + (creado.number || creado.id) + ".";

      if (correo) {
        const mail = await enviarCorreoConfirmacion(
          key,
          creado,
          correo,
          caso.name
        );
        if (mail.ok) {
          textoOk += " Le enviamos confirmación a " + correo + ".";
        } else {
          textoOk +=
            " No se pudo enviar el correo. " + (mail.motivo || "Revise permisos Email del API User y SMTP.");
          console.warn("Email:", mail.motivo);
        }
      }

      if (reglaAsignacion) {
        textoOk += " Asignado al responsable de " + (reglaAsignacion.valor || "contaminación") + ".";
        if (reglaAsignacion.emailFuncionario) {
          const aviso = await enviarCorreoFuncionario(
            key,
            creado,
            reglaAsignacion,
            caso.name,
            caso[reglaAsignacion.campo || "cTipoCaso"] || reglaAsignacion.valor
          );
          if (aviso.ok) {
            textoOk += " Se notificó al funcionario por correo.";
          } else {
            textoOk += " No se pudo avisar al funcionario por correo.";
            console.warn("Email funcionario:", aviso.motivo);
          }
        }
      }

      form.reset();
      mostrar(textoOk, false);
    } catch (err) {
      mostrar("Error: " + err.message, true);
    } finally {
      btn.disabled = false;
      btn.textContent = "Enviar reporte";
    }
  });

  cargarCampos();
})();
