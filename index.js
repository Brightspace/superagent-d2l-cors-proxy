'use strict';

var headerName = 'X-CorsProxy-Url';

module.exports = function(req) {

	// CORS feature detection:
	// http://stackoverflow.com/questions/1641507/detect-browser-support-for-cross-domain-xmlhttprequests
	// https://hacks.mozilla.org/2009/07/cross-site-xmlhttprequest-with-cors/
	var val = 'withCredentials' in new XMLHttpRequest();
	if(val) {
		return req;
	}

	// only proxy requests to CDN over HTTP or HTTPS
	var url = req.url.trim().toLowerCase();
	if(url.indexOf('https://s.brightspace.com') !== 0 && url.indexOf('http://s.brightspace.com') !== 0 ) {
		return req;
	}

	req.set(headerName, req.url);
	req.url = '/d2l/lp/cors-proxy';

	return req;

};
