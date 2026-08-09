import mongoose from "mongoose";
import User from "../models/User.js";

const CAMPOS_PUBLICOS =
  "nombre usuario foto portada biografia ubicacion activo ultimaActividad rol createdAt";

const escaparExpresion = (texto) => {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const listarUsuarios = async (req, res) => {
  try {
    const busqueda = req.query.buscar?.trim() || "";
    const limiteSolicitado = Number(req.query.limite || 20);
    const limite = Math.min(Math.max(limiteSolicitado, 1), 50);

    const filtro = {
      _id: { $ne: req.usuario._id },
    };

    if (busqueda) {
      const expresion = new RegExp(escaparExpresion(busqueda), "i");
      filtro.$or = [
        { nombre: expresion },
        { usuario: expresion },
        { ubicacion: expresion },
      ];
    }

    const usuarios = await User.find(filtro)
      .select(CAMPOS_PUBLICOS)
      .sort({ activo: -1, ultimaActividad: -1 })
      .limit(limite);

    return res.status(200).json({
      ok: true,
      total: usuarios.length,
      usuarios,
    });
  } catch (error) {
    console.error("Error listando usuarios:", error.message);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudieron consultar los usuarios.",
    });
  }
};

export const obtenerUsuario = async (req, res) => {
  try {
    const { usuarioId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(usuarioId)) {
      return res.status(400).json({
        ok: false,
        mensaje: "El identificador del usuario no es válido.",
      });
    }

    const usuario = await User.findById(usuarioId).select(
      CAMPOS_PUBLICOS,
    );

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        mensaje: "El perfil solicitado no existe.",
      });
    }

    return res.status(200).json({
      ok: true,
      usuario,
    });
  } catch (error) {
    console.error("Error consultando usuario:", error.message);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo consultar el perfil.",
    });
  }
};