import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import app from "./src/app.js";
import { conectarBaseDatos } from "./src/config/database.js";
import configurarChatSocket from "./src/sockets/chatSocket.js";
import { establecerSocketIO } from "./src/sockets/socketManager.js";

const puerto = process.env.PORT || 5000;

const obtenerOrigenesPermitidos = () => {
  const origenesConfigurados =
    process.env.CLIENT_URLS
      ?.split(",")
      .map((origen) => origen.trim())
      .filter(Boolean);

  return origenesConfigurados?.length
    ? origenesConfigurados
    : [
        "http://localhost:5173",
        "http://localhost:5174",
      ];
};

const iniciarServidor = async () => {
  try {
    await conectarBaseDatos();

    const servidorHttp =
      http.createServer(app);

    const io = new Server(servidorHttp, {
      cors: {
        origin: obtenerOrigenesPermitidos(),
        credentials: true,
      },
    });

    establecerSocketIO(io);

    configurarChatSocket(io);

    // Permite emitir eventos desde los controladores.
    app.set("io", io);

    servidorHttp.listen(puerto, () => {
      console.log("");
      console.log(
        "ReportaRD Backend funcionando",
      );
      console.log(
        `Servidor: http://localhost:${puerto}`,
      );
      console.log(
        "Chat en tiempo real: activado",
      );
      console.log("");
    });
  } catch (error) {
    console.error(
      "No se pudo iniciar ReportaRD Backend",
    );
    console.error(error.message);
    process.exit(1);
  }
};

iniciarServidor();