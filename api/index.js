// Vercel serverless entry that proxies to the compiled Nest lambda
let cachedHandler = null;

module.exports = async function handler(req, res) {
	if (!cachedHandler) {
		// Use dynamic import to support ESM-built `dist/lambda` while this file
		// remains CommonJS. Try with and without extension for compatibility.
		const mod = await import('../dist/lambda.js').catch(() => import('../dist/lambda'));
		// Normalize potential shapes to obtain a callable handler
		let candidate = mod.default || mod.handler || mod;

		// If candidate is an object that contains a callable deeper, try common keys
		if (candidate && typeof candidate !== 'function') {
			if (typeof candidate.default === 'function') candidate = candidate.default;
			else if (typeof candidate.handler === 'function') candidate = candidate.handler;
			else if (typeof candidate.exports === 'function') candidate = candidate.exports;
		}

		// If candidate is an async factory (returns a handler), wrap it so we always
		// end up with a callable (req, res) => Promise
		if (typeof candidate === 'function') {
			cachedHandler = candidate;
		} else if (candidate && typeof candidate.then === 'function') {
			// candidate is a promise; await it to get the actual handler
			const awaited = await candidate;
			cachedHandler = awaited.default || awaited.handler || (typeof awaited === 'function' ? awaited : null);
		} else {
			// Fallback: return 500 so we can see meaningful logs instead of crash
			cachedHandler = (req, res) => {
				res.statusCode = 500;
				res.setHeader('content-type', 'text/plain');
				res.end('Invalid lambda export: handler not found');
			};
		}
	}

	// Diagnostic logs to detect recursion/shape in production
	try {
		console.log('api/index.js handler invoked', { url: req && req.url, method: req && req.method });
		console.log('cachedHandler type:', typeof cachedHandler);
		if (typeof cachedHandler !== 'function') console.log('cachedHandler keys:', Object.keys(cachedHandler || {}));
	} catch (e) {
		// ignore logging errors
	}

	return cachedHandler(req, res);
};
