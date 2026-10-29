import { CONFIG } from "../_lib/config.js";
import { json, hoyChile } from "../_lib/util.js";

export const onRequestGet = () => json({ ...CONFIG, hoy: hoyChile() });
