import Notification from "../models/Notification.js";

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

    return notificacion;
  } catch (error) {
    console.error(
      "Error creando notificación:",
      error,
    );

    return null;
  }
};