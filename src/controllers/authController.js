import jwt from "jsonwebtoken";
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
        : "Ese correo ya está registrado.",
  });

  return true;
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

    console.error("Error registrando usuario:", error.message);

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
    console.error("Error iniciando sesión:", error.message);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo iniciar sesión.",
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

        totalSeguidores:
          usuario.seguidores?.length || 0,

        totalSeguidos:
          usuario.seguidos?.length || 0,

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
      mensaje:
        "No se pudo obtener el perfil.",
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
        mensaje: "El nombre y el nombre de usuario son obligatorios.",
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
        mensaje: "La biografía no puede superar los 160 caracteres.",
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
    const formatoImagenValido = /^data:image\/(jpeg|png|webp);base64,/;

    if (imagenes.some((imagen) => !formatoImagenValido.test(imagen))) {
      return res.status(400).json({
        ok: false,
        mensaje: "La foto o portada tiene un formato inválido.",
      });
    }

    if (imagenes.some((imagen) => imagen.length > 1_500_000)) {
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

    console.error("Error actualizando perfil:", error.message);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo actualizar el perfil.",
    });
  }
};