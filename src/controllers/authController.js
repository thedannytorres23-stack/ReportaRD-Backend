import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";

const crearToken = (usuario) => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET no está configurado");
  }

  return jwt.sign(
    {
      id: usuario._id,
      rol: usuario.rol,
    },
    jwtSecret,
    { expiresIn: "7d" },
  );
};

const responderErrorDuplicado = (error, res) => {
  if (error?.code !== 11000) return false;

  const campo = Object.keys(error.keyPattern || {})[0];

  res.status(409).json({
    ok: false,
    mensaje:
      campo === "usuario"
        ? "Ese nombre de usuario ya está en uso."
        : campo === "googleId"
          ? "Esa cuenta de Google ya está vinculada."
          : "Ese correo ya está registrado.",
  });

  return true;
};

const generarUsuarioUnico = async (correo, nombre) => {
  const baseCorreo = correo.split("@")[0];

  let base = baseCorreo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._]/g, "")
    .replace(/^[._]+|[._]+$/g, "");

  if (base.length < 3) {
    base = nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  }

  if (base.length < 3) {
    base = "ciudadano";
  }

  base = base.slice(0, 24);

  let candidato = base;
  let contador = 1;

  while (await User.exists({ usuario: candidato })) {
    candidato = `${base.slice(0, 24)}${contador}`;
    contador += 1;
  }

  return candidato.slice(0, 30);
};

export const registrar = async (req, res) => {
  try {
    const { nombre, usuario, correo, contrasena } = req.body;

    if (!nombre || !usuario || !correo || !contrasena) {
      return res.status(400).json({
        ok: false,
        mensaje: "Todos los campos son obligatorios.",
      });
    }

    if (contrasena.length < 8) {
      return res.status(400).json({
        ok: false,
        mensaje: "La contraseña debe tener al menos 8 caracteres.",
      });
    }

    const correoNormalizado = correo.trim().toLowerCase();

    const usuarioNormalizado = usuario
      .trim()
      .toLowerCase()
      .replace(/^@/, "");

    if (!/^[a-z0-9._]{3,30}$/.test(usuarioNormalizado)) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "El usuario debe tener entre 3 y 30 caracteres y solo puede contener letras, números, puntos o guiones bajos.",
      });
    }

    const existente = await User.findOne({
      $or: [
        { correo: correoNormalizado },
        { usuario: usuarioNormalizado },
      ],
    });

    if (existente) {
      return res.status(409).json({
        ok: false,
        mensaje: "El correo o nombre de usuario ya está registrado.",
      });
    }

    const nuevoUsuario = await User.create({
      nombre: nombre.trim(),
      usuario: usuarioNormalizado,
      correo: correoNormalizado,
      contrasena,
      proveedorAuth: "local",
      activo: true,
      ultimaActividad: new Date(),
    });

    const token = crearToken(nuevoUsuario);

    return res.status(201).json({
      ok: true,
      mensaje: "Usuario registrado correctamente.",
      token,
      usuario: nuevoUsuario,
    });
  } catch (error) {
    if (responderErrorDuplicado(error, res)) return undefined;

    console.error("Error registrando usuario:", error);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo registrar el usuario.",
    });
  }
};

export const iniciarSesion = async (req, res) => {
  try {
    const { identificador, contrasena } = req.body;

    if (!identificador || !contrasena) {
      return res.status(400).json({
        ok: false,
        mensaje: "El usuario y la contraseña son obligatorios.",
      });
    }

    const valor = identificador.trim().toLowerCase();

    const usuario = await User.findOne({
      $or: [{ correo: valor }, { usuario: valor }],
    }).select("+contrasena");

    if (!usuario) {
      return res.status(401).json({
        ok: false,
        mensaje: "Credenciales incorrectas.",
      });
    }

    if (!usuario.contrasena) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Esta cuenta utiliza Google. Inicia sesión con Google.",
      });
    }

    const contrasenaCorrecta =
      await usuario.compararContrasena(contrasena);

    if (!contrasenaCorrecta) {
      return res.status(401).json({
        ok: false,
        mensaje: "Credenciales incorrectas.",
      });
    }

    usuario.activo = true;
    usuario.ultimaActividad = new Date();

    await usuario.save();

    const token = crearToken(usuario);

    return res.status(200).json({
      ok: true,
      mensaje: "Sesión iniciada correctamente.",
      token,
      usuario,
    });
  } catch (error) {
    console.error("Error iniciando sesión:", error);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo iniciar sesión.",
    });
  }
};

export const iniciarSesionGoogle = async (req, res) => {
  try {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;

    if (!googleClientId) {
      console.error("GOOGLE_CLIENT_ID no está configurado");

      return res.status(500).json({
        ok: false,
        mensaje: "Google Sign-In no está configurado.",
      });
    }

    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        ok: false,
        mensaje: "No se recibió la credencial de Google.",
      });
    }

    const clienteGoogle = new OAuth2Client(googleClientId);

    const ticket = await clienteGoogle.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    });

    const datosGoogle = ticket.getPayload();

    if (
      !datosGoogle ||
      !datosGoogle.sub ||
      !datosGoogle.email ||
      !datosGoogle.email_verified
    ) {
      return res.status(401).json({
        ok: false,
        mensaje: "La cuenta de Google no pudo ser verificada.",
      });
    }

    const googleId = datosGoogle.sub;
    const correo = datosGoogle.email.trim().toLowerCase();
    const nombre = (datosGoogle.name || correo.split("@")[0]).trim();
    const foto = datosGoogle.picture || "";

    let usuario = await User.findOne({
      $or: [{ googleId }, { correo }],
    }).select("+contrasena");

    let cuentaNueva = false;

    if (usuario) {
      if (usuario.googleId && usuario.googleId !== googleId) {
        return res.status(409).json({
          ok: false,
          mensaje:
            "El correo está asociado a otra cuenta de Google.",
        });
      }

      if (!usuario.googleId) {
        usuario.googleId = googleId;
      }

      if (!usuario.foto && foto) {
        usuario.foto = foto;
      }

      usuario.activo = true;
      usuario.ultimaActividad = new Date();

      await usuario.save();
    } else {
      const nombreUsuario = await generarUsuarioUnico(
        correo,
        nombre,
      );

      usuario = await User.create({
        nombre,
        usuario: nombreUsuario,
        correo,
        googleId,
        proveedorAuth: "google",
        foto,
        activo: true,
        ultimaActividad: new Date(),
      });

      cuentaNueva = true;
    }

    const token = crearToken(usuario);

    const usuarioSeguro = usuario.toObject();

    delete usuarioSeguro.contrasena;

    return res.status(cuentaNueva ? 201 : 200).json({
      ok: true,
      mensaje: cuentaNueva
        ? "Cuenta creada con Google correctamente."
        : "Sesión iniciada con Google correctamente.",
      token,
      usuario: usuarioSeguro,
      cuentaNueva,
    });
  } catch (error) {
    if (responderErrorDuplicado(error, res)) return undefined;

    console.error("Error autenticando con Google:", error);

    return res.status(401).json({
      ok: false,
      mensaje:
        "No se pudo verificar la cuenta de Google. Inténtalo nuevamente.",
    });
  }
};

export const obtenerPerfil = async (req, res) => {
  try {
    const usuario = await User.findById(
      req.usuario._id,
    ).lean();

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        mensaje: "El usuario no existe.",
      });
    }

    return res.status(200).json({
      ok: true,
      usuario: {
        ...usuario,
        totalSeguidores: usuario.seguidores?.length || 0,
        totalSeguidos: usuario.seguidos?.length || 0,
        seguidores: undefined,
        seguidos: undefined,
        contrasena: undefined,
      },
    });
  } catch (error) {
    console.error(
      "Error obteniendo perfil:",
      error.message,
    );

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo obtener el perfil.",
    });
  }
};

export const actualizarPerfil = async (req, res) => {
  try {
    const {
      nombre,
      usuario,
      biografia = "",
      ubicacion = "",
      foto = "",
      portada = "",
    } = req.body;

    const nombreLimpio = nombre?.trim();

    const usuarioLimpio = usuario
      ?.trim()
      .toLowerCase()
      .replace(/^@/, "");

    if (!nombreLimpio || !usuarioLimpio) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "El nombre y el nombre de usuario son obligatorios.",
      });
    }

    if (!/^[a-z0-9._]{3,30}$/.test(usuarioLimpio)) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "El usuario debe tener entre 3 y 30 caracteres y solo puede contener letras, números, puntos o guiones bajos.",
      });
    }

    if (biografia.trim().length > 160) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "La biografía no puede superar los 160 caracteres.",
      });
    }

    const usuarioOcupado = await User.findOne({
      usuario: usuarioLimpio,
      _id: { $ne: req.usuario._id },
    });

    if (usuarioOcupado) {
      return res.status(409).json({
        ok: false,
        mensaje: "Ese nombre de usuario ya está en uso.",
      });
    }

    const imagenes = [foto, portada].filter(Boolean);

    const formatoImagenValido =
      /^data:image\/(jpeg|png|webp);base64,/;

    if (
      imagenes.some(
        (imagen) => !formatoImagenValido.test(imagen),
      )
    ) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "La foto o portada tiene un formato inválido.",
      });
    }

    if (
      imagenes.some((imagen) => imagen.length > 1_500_000)
    ) {
      return res.status(413).json({
        ok: false,
        mensaje: "Cada imagen debe pesar menos de 1 MB.",
      });
    }

    req.usuario.nombre = nombreLimpio;
    req.usuario.usuario = usuarioLimpio;
    req.usuario.biografia = biografia.trim();

    req.usuario.ubicacion =
      ubicacion.trim() || "República Dominicana";

    req.usuario.foto = foto;
    req.usuario.portada = portada;
    req.usuario.ultimaActividad = new Date();

    await req.usuario.save();

    return res.status(200).json({
      ok: true,
      mensaje: "Perfil actualizado correctamente.",
      usuario: req.usuario,
    });
  } catch (error) {
    if (responderErrorDuplicado(error, res)) return undefined;

    console.error(
      "Error actualizando perfil:",
      error.message,
    );

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo actualizar el perfil.",
    });
  }
};