import cloudinary from "../config/cloudinary.js";

export const subirArchivo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        mensaje: "No se recibió ningún archivo.",
      });
    }

    const esVideo =
      req.file.mimetype.startsWith("video/");

    const resultado = await new Promise(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "reportard",
            resource_type: esVideo
              ? "video"
              : "image",
          },
          (error, resultadoSubida) => {
            if (error) {
              reject(error);
              return;
            }

            resolve(resultadoSubida);
          },
        );

        stream.end(req.file.buffer);
      },
    );

    return res.status(201).json({
      ok: true,
      archivo: {
        url: resultado.secure_url,
        publicId: resultado.public_id,
        tipo: esVideo
          ? "video"
          : "imagen",
      },
    });
  } catch (error) {
    console.error(
      "Error subiendo archivo:",
      error,
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "No se pudo subir el archivo.",
    });
  }
};