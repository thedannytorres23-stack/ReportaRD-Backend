import Notification from "../models/Notification.js";
import { obtenerSocketIO } from "../sockets/socketManager.js";

export const crearNotificacion = async ({
  usuario,
  emisor,
  tipo,
  mensaje,
  tipoContenido = null,
  contenidoId = null,
  comentarioId = null,
}) => {
  try {
    if (!usuario || !emisor) {
      return null;
    }

    if (String(usuario) === String(emisor)) {
      return null;
    }

    const notificacion = await Notification.create({
      usuario,
      emisor,
      tipo,
      mensaje,
      tipoContenido,
      contenidoId,
      comentarioId,
    });

    const notificacionCompleta =
      await Notification.findById(
        notificacion._id,
      )
        .populate(
          "emisor",
          "nombre usuario foto",
        )
        .lean();

    const io = obtenerSocketIO();

    if (io && notificacionCompleta) {
      io
        .to(`usuario:${String(usuario)}`)
        .emit(
          "notificacion:nueva",
          notificacionCompleta,
        );
    }

    return notificacionCompleta || notificacion;
  } catch (error) {
    console.error(
      "Error creando notificación:",
      error,
    );

    return null;
  }
};