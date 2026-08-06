import "dotenv/config";
import app from "./src/app.js";
import { conectarBaseDatos } from "./src/config/database.js";

const puerto = process.env.PORT || 5000;

const iniciarServidor = async () => {
  try {
    await conectarBaseDatos();

    app.listen(puerto, () => {
      console.log("");
      console.log("ReportaRD Backend funcionando");
      console.log(`Servidor: http://localhost:${puerto}`);
      console.log(`Estado: http://localhost:${puerto}/api/health`);
      console.log("");
    });
  } catch (error) {
    console.error("");
    console.error("No se pudo iniciar ReportaRD Backend");
    console.error(error.message);
    process.exit(1);
  }
};

iniciarServidor();