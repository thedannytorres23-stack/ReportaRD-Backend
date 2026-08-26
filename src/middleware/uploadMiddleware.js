import multer from "multer";

const almacenamiento = multer.memoryStorage();

const filtroArchivos = (req, file, cb) => {
  const tiposPermitidos = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ];

  if (!tiposPermitidos.includes(file.mimetype)) {
    return cb(
      new Error(
        "Formato no permitido. Usa JPG, PNG, WEBP, MP4, WEBM o MOV.",
      ),
    );
  }

  cb(null, true);
};

const upload = multer({
  storage: almacenamiento,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter: filtroArchivos,
});

export default upload;