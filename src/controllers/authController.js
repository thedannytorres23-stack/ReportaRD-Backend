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
    {
      expiresIn: "7d",
    },
  );
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
    const usuarioNormalizado = usuario.trim().toLowerCase();

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