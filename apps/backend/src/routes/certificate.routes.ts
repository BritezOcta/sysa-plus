import { Router } from "express";
import { certificateController as controller } from "../controllers/certificate.controller.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { ROLES } from "../types/auth.js";

/** RF-11: generación y descarga de certificados. */
export const certificateRouter = Router();

// Pública (sin sesión): la usa el QR del certificado para que terceros verifiquen su autenticidad.
certificateRouter.get("/verify/:code", controller.verify);

certificateRouter.use(requireAuth, requireRole(ROLES.ALUMNO));
certificateRouter.get("/", controller.options);
certificateRouter.post("/", controller.issue);
certificateRouter.get("/:code/pdf", controller.pdf);
