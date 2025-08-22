const ACCESS_SECRET = process.env.ACCESS_SECRET || "access_secret";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "refresh_secret";

const SALT_ROUNDS = 11;

const PORT = process.env.HOST_PORT || 3000;

export { ACCESS_SECRET, REFRESH_SECRET, SALT_ROUNDS, PORT };
