import { json } from "../../_lib/util.js";
export const onRequestGet = ({ data }) => json({ usuario: data.user });
