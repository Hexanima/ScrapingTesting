import "dotenv/config";

const timeout = Number(process.env.LIST_CHANGE_TIMEOUT);

export const LIST_CHANGE_TIMEOUT = Number.isNaN(timeout) ? 60_000 : timeout;
