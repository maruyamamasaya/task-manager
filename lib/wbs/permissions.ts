import type { WbsProjectRole } from "./types";
export const canEditWbs = (role:WbsProjectRole) => role === "owner" || role === "editor";
export const canManageWbs = (role:WbsProjectRole) => role === "owner";
export const roleLabel = (role:WbsProjectRole) => ({owner:"Owner",editor:"Editor",viewer:"Viewer"})[role];
