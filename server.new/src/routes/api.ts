import { Router } from "express";
import authRoutes from "./auth.js";
import tournamentRoutes from "./tournament.js";
import lineupRoutes from "./lineup.js";
import contestRoutes from "./contest.js";
import portoRoutes from "./porto.js";
import cronRoutes from "./cron.js";
// import userRoutes from "./user.js";

const router = Router();

// Tournament routes
router.use("/tournaments", tournamentRoutes);

// Contest routes
router.use("/contests", contestRoutes);

// User group routes
// router.use('/groups', userGroupRoutes);

// Lineup routes
router.use("/lineup", lineupRoutes);

// Auth routes
router.use("/auth", authRoutes);

// User Group routes
// router.use("/users", userRoutes);

// Porto routes
router.use("/porto", portoRoutes);

// Cron routes
router.use("/cron", cronRoutes);

export default router;
