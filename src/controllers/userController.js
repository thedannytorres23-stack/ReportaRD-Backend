import mongoose from "mongoose";

import User from "../models/User.js";

import Notification from "../models/Notification.js";

import {
  crearNotificacion,
} from "../services/notificationService.js";

const CAMPOS_PUBLICOS =
  "nombre usuario foto portada biografia ubicacion activo ultimaActividad rol createdAt seguidores seguidos";

const escaparExpresion = (texto) => {
  return texto.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
};

export const listarUsuarios = async (
  req,
  res,
) => {
  try {
    const busqueda =
      req.query.buscar?.trim() || "";

    const limiteSolicitado = Number(
      req.query.limite || 20,
    );

    const limite = Math.min(
      Math.max(limiteSolicitado, 1),
      50,
    );

    const filtro = {
      _id: {
        $ne: req.usuario._id,
      },
    };

    if (busqueda) {
      const expresion = new RegExp(
        escaparExpresion(busqueda),
        "i",
      );

      filtro.$or = [
        {
          nombre: expresion,
        },
        {
          usuario: expresion,
        },
        {
          ubicacion: expresion,
        },
      ];
    }

    const usuarios = await User.find(
      filtro,
    )
      .select(CAMPOS_PUBLICOS)
      .sort({
        activo: -1,
        ultimaActividad: -1,
      })
      .limit(limite)
      .lean();

    /*
     * No enviamos todos los IDs de seguidores
     * en el buscador.
     *
     * Enviamos únicamente cantidades y si
     * el usuario actual ya sigue a esa persona.
     */

    const usuariosProcesados =
      usuarios.map((usuario) => ({
        ...usuario,

        totalSeguidores:
          usuario.seguidores?.length || 0,

        totalSeguidos:
          usuario.seguidos?.length || 0,

        siguiendo:
          usuario.seguidores?.some(
            (id) =>
              String(id) ===
              String(req.usuario._id),
          ) || false,

        seguidores: undefined,
        seguidos: undefined,
      }));

    return res.status(200).json({
      ok: true,
      total:
        usuariosProcesados.length,
      usuarios:
        usuariosProcesados,
    });
  } catch (error) {
    console.error(
      "Error listando usuarios:",
      error.message,
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "No se pudieron consultar los usuarios.",
    });
  }
};

export const obtenerUsuario = async (
  req,
  res,
) => {
  try {
    const { usuarioId } =
      req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        usuarioId,
      )
    ) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "El identificador del usuario no es válido.",
      });
    }

    const usuario =
      await User.findById(
        usuarioId,
      )
        .select(CAMPOS_PUBLICOS)
        .lean();

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "El perfil solicitado no existe.",
      });
    }

    const siguiendo =
      usuario.seguidores?.some(
        (id) =>
          String(id) ===
          String(req.usuario._id),
      ) || false;

    return res.status(200).json({
      ok: true,

      usuario: {
        ...usuario,

        totalSeguidores:
          usuario.seguidores?.length || 0,

        totalSeguidos:
          usuario.seguidos?.length || 0,

        siguiendo,

        seguidores: undefined,
        seguidos: undefined,
      },
    });
  } catch (error) {
    console.error(
      "Error consultando usuario:",
      error.message,
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "No se pudo consultar el perfil.",
    });
  }
};

export const cambiarSeguimiento = async (
  req,
  res,
) => {
  try {
    const { usuarioId } =
      req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        usuarioId,
      )
    ) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "El identificador del usuario no es válido.",
      });
    }

    if (
      String(usuarioId) ===
      String(req.usuario._id)
    ) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "No puedes seguirte a ti mismo.",
      });
    }

    const [usuarioActual, usuarioObjetivo] =
      await Promise.all([
        User.findById(
          req.usuario._id,
        ),

        User.findById(
          usuarioId,
        ),
      ]);

    if (!usuarioActual) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "Tu usuario no fue encontrado.",
      });
    }

    if (!usuarioObjetivo) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "El usuario que intentas seguir no existe.",
      });
    }

    const yaLoSigue =
      usuarioActual.seguidos.some(
        (id) =>
          String(id) ===
          String(usuarioObjetivo._id),
      );

    let siguiendo;

    if (yaLoSigue) {
      /*
       * DEJAR DE SEGUIR
       */

      usuarioActual.seguidos =
        usuarioActual.seguidos.filter(
          (id) =>
            String(id) !==
            String(usuarioObjetivo._id),
        );

      usuarioObjetivo.seguidores =
        usuarioObjetivo.seguidores.filter(
          (id) =>
            String(id) !==
            String(usuarioActual._id),
        );

      siguiendo = false;

      await Promise.all([
        usuarioActual.save(),
        usuarioObjetivo.save(),
      ]);

      /*
       * Si deja de seguirlo, retiramos
       * la notificación correspondiente.
       */

      await Notification.deleteOne({
        usuario:
          usuarioObjetivo._id,

        emisor:
          usuarioActual._id,

        tipo: "seguimiento",
      });
    } else {
      /*
       * SEGUIR
       */

      usuarioActual.seguidos.push(
        usuarioObjetivo._id,
      );

      usuarioObjetivo.seguidores.push(
        usuarioActual._id,
      );

      siguiendo = true;

      await Promise.all([
        usuarioActual.save(),
        usuarioObjetivo.save(),
      ]);

      await crearNotificacion({
        usuario:
          usuarioObjetivo._id,

        emisor:
          usuarioActual._id,

        tipo: "seguimiento",

        mensaje:
          "comenzó a seguirte.",
      });
    }

    return res.status(200).json({
      ok: true,

      mensaje: siguiendo
        ? `Ahora sigues a ${usuarioObjetivo.nombre}.`
        : `Dejaste de seguir a ${usuarioObjetivo.nombre}.`,

      siguiendo,

      totalSeguidores:
        usuarioObjetivo.seguidores.length,

      totalSeguidos:
        usuarioActual.seguidos.length,
    });
  } catch (error) {
    console.error(
      "Error cambiando seguimiento:",
      error,
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "No se pudo actualizar el seguimiento.",
    });
  }
};