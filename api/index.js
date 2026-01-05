import app from "../server.js";

// Vercel Node function entrypoint
export default function handler(req, res) {
	return app(req, res);
}
