// Vercel serverless entry that proxies to the compiled Nest lambda
let cachedHandler = null;

module.exports = async function handler(req, res) {
	if (!cachedHandler) {
		// Use dynamic import to support ESM-built `dist/lambda` while this file
		// remains CommonJS. Try with and without extension for compatibility.
		const mod = await import('../dist/lambda.js').catch(() => import('../dist/lambda'));
		cachedHandler = mod.default || mod.handler || mod;
	}
	return cachedHandler(req, res);
};
