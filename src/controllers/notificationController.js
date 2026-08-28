import mongoose from "mongoose";

import Notification from "../models/Notification.js";

export const listarNotificaciones = async (req, res) => {
  try {
    const notificaciones = await Notification.find({
      usuario: req.usuario._id,
    })
      .populate(
        "emisor",
        "nombre nombreUsuario fotoPerfil",
      )
      .sort({
        createdAt: -1,
      })
      .limit(100)
      .lean();

    return res.status(200).json({
      ok: true,
      notificaciones,
    });
  } catch (error) {
    console.error(
      "Error listando notificaciones:",
      error,
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "No se pudieron cargar las notificaciones.",
    });
  }
};

export const obtenerNoLeidas = async (
  req,
  res,
) => {
  try {
    const total = await Notification.countDocuments({
      usuario: req.usuario._id,
      leida: false,
    });

    return res.status(200).json({
      ok: true,
      total,
    });
  } catch (error) {
    console.error(
      "Error obteniendo notificaciones no leídas:",
      error,
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "No se pudo obtener el total de notificaciones.",
    });
  }
};

export const marcarComoLeida = async (
  req,
  res,
) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        ok: false,
        mensaje: "Notificación inválida.",
      });
    }

    const notificacion =
      await Notification.findOneAndUpdate(
        {
          _id: id,
          usuario: req.usuario._id,
        },
        {
          $set: {
            leida: true,
          },
        },
        {
          new: true,
        },
      );

    if (!notificacion) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "La notificación no fue encontrada.",
      });
    }

    return res.status(200).json({
      ok: true,
      notificacion,
    });
  } catch (error) {
    console.error(
      "Error marcando notificación como leída:",
      error,
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "No se pudo actualizar la notificación.",
    });
  }
};

export const marcarTodasComoLeidas = async (
  req,
  res,
) => {
  try {
    const resultado =
      await Notification.updateMany(
        {
          usuario: req.usuario._id,
          leida: false,
        },
        {
          $set: {
            leida: true,
          },
        },
      );

    return res.status(200).json({
      ok: true,
      actualizadas: resultado.modifiedCount,
    });
  } catch (error) {
    console.error(
      "Error marcando todas las notificaciones:",
      error,
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "No se pudieron actualizar las notificaciones.",
    });
  }
};