import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protegerRuta = async (req, res, next) => {
  try {
    const autorizacion = req.headers.authorization;

    if (
      !autorizacion ||
      !autorizacion.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        ok: false,
        mensaje: "Debes iniciar sesión para continuar.",
      });
    }

    const token = autorizacion.split(" ")[1];

    const datosToken = jwt.verify(
      token,
      process.env.JWT_SECRET,
    );

    const usuario = await User.findById(datosToken.id);

    if (!usuario) {
      return res.status(401).json({
        ok: false,
        mensaje: "El usuario de esta sesión ya no existe.",
      });
    }

    req.usuario = usuario;

    next();
  } catch {
    return res.status(401).json({
      ok: false,
      mensaje: "La sesión no es válida o ha expirado.",
    });
  }
};


export const obtenerPerfil = async (req, res) => {
  return res.status(200).json({
    ok: true,
    usuario: req.usuario,
  });
};