import Report from "../models/Report.js";

const escaparRegex = (texto = "") => {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const listarReportes = async (req, res) => {
  try {
    const buscar = req.query.buscar?.trim() || "";

    const limite = Math.min(
      Number(req.query.limite) || 30,
      50,
    );

    const filtro = {
      estado: {
        $ne: "rechazado",
      },
    };

    if (buscar) {
      const expresion = new RegExp(
        escaparRegex(buscar),
        "i",
      );

      filtro.$or = [
        { titulo: expresion },
        { descripcion: expresion },
        { categoria: expresion },
        { ubicacion: expresion },
      ];
    }

    const reportes = await Report.find(filtro)
      .populate(
        "autor",
        "nombre usuario foto activo",
      )
      .sort({
        createdAt: -1,
      })
      .limit(limite)
      .lean();

    return res.status(200).json({
      ok: true,
      total: reportes.length,
      reportes,
    });
  } catch (error) {
    console.error(
      "Error listando reportes:",
      error.message,
    );

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudieron obtener los reportes.",
    });
  }
};

export const crearReporte = async (req, res) => {
  try {
    const {
      titulo,
      descripcion,
      categoria,
      ubicacion,
      coordenadas,
      mediaUrl,
      mediaTipo,
    } = req.body;

    if (
      !titulo?.trim() ||
      !descripcion?.trim() ||
      !categoria?.trim() ||
      !ubicacion?.trim()
    ) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Título, descripción, categoría y ubicación son obligatorios.",
      });
    }

    const reporte = await Report.create({
      autor: req.usuario._id,
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      categoria: categoria.trim(),
      ubicacion: ubicacion.trim(),
      coordenadas,
      mediaUrl,
      mediaTipo,
    });

    await reporte.populate(
      "autor",
      "nombre usuario foto activo",
    );

    return res.status(201).json({
      ok: true,
      mensaje: "Reporte creado correctamente.",
      reporte,
    });
  } catch (error) {
    console.error(
      "Error creando reporte:",
      error.message,
    );

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo crear el reporte.",
    });
  }
};


export const confirmarReporte = async (req, res) => {
  try {
    const reporteId = req.params.id;
    const usuarioId = req.usuario._id;

    const reporte = await Report.findById(reporteId);

    if (!reporte) {
      return res.status(404).json({
        ok: false,
        mensaje: "El reporte no existe.",
      });
    }

    if (
      String(reporte.autor) === String(usuarioId)
    ) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "No puedes confirmar tu propio reporte.",
      });
    }

    const indiceConfirmacion =
      reporte.confirmadoPor.findIndex(
        (id) =>
          String(id) === String(usuarioId),
      );

    let confirmado;

    if (indiceConfirmacion >= 0) {
      reporte.confirmadoPor.splice(
        indiceConfirmacion,
        1,
      );

      confirmado = false;
    } else {
      reporte.confirmadoPor.push(usuarioId);

      confirmado = true;
    }

    reporte.confirmaciones =
      reporte.confirmadoPor.length;

    await reporte.save();

    return res.status(200).json({
      ok: true,
      mensaje: confirmado
        ? "Reporte confirmado correctamente."
        : "Confirmación eliminada correctamente.",
      confirmaciones: reporte.confirmaciones,
      confirmado,
    });
  } catch (error) {
    console.error(
      "Error cambiando confirmación:",
      error,
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "No se pudo actualizar la confirmación.",
    });
  }
};

export const eliminarReporte = async (req, res) => {
  try {
    const { id } = req.params;

    const reporte = await Report.findById(id);

    if (!reporte) {
      return res.status(404).json({
        ok: false,
        mensaje: "El reporte no existe.",
      });
    }

    const esAutor =
      reporte.autor.toString() ===
      req.usuario._id.toString();

    const puedeModerar = [
      "moderador",
      "administrador",
    ].includes(req.usuario.rol);

    if (!esAutor && !puedeModerar) {
      return res.status(403).json({
        ok: false,
        mensaje:
          "No tienes permiso para eliminar este reporte.",
      });
    }

    await Report.findByIdAndDelete(id);

    return res.status(200).json({
      ok: true,
      mensaje: "Reporte eliminado correctamente.",
      reporteId: id,
    });
  } catch (error) {
    console.error(
      "Error eliminando reporte:",
      error.message,
    );

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo eliminar el reporte.",
    });
  }
};