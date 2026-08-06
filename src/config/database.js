import mongoose from "mongoose";

export const conectarBaseDatos = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error(
      "La variable MONGODB_URI no está configurada en el archivo .env",
    );
  }

  await mongoose.connect(mongoUri);

  console.log("MongoDB conectado correctamente");
  console.log(`Base de datos: ${mongoose.connection.name}`);
};