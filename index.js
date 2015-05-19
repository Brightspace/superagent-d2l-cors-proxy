'use strict';

var version = require('./package.json').version;

function tryGetHost(url) {

	url = url || '';

	var host = url;
	if(url.indexOf('http://') === 0) {
		host = url.substr(7);
	} else if(url.indexOf('https://') ===0) {
		host = url.substr(8);
	} else {
		return null;
	}

	var scheme = url.substr(0,(url.length-host.length));

	var index = host.indexOf('/');
	if(index > -1) {
		host = host.substr(0, index);
	}

	return scheme + host;

}

function buildFrame(host) {
	var iframe = document.createElement('iframe');
	iframe.setAttribute('style', 'display:none;');
	iframe.src = host + '/lib/superagent-d2l-cors-proxy/' + version + '/index.html';
	document.body.appendChild(iframe);
	return iframe;
}

module.exports = function(req) {

	// CORS feature detection:
	// http://stackoverflow.com/questions/1641507/detect-browser-support-for-cross-domain-xmlhttprequests
	// https://hacks.mozilla.org/2009/07/cross-site-xmlhttprequest-with-cors/
	var supportsCors = 'withCredentials' in new XMLHttpRequest();
	if(supportsCors) {
		return req;
	}

	var host = tryGetHost(req.url);
	if(!host) {
		return req;
	}

	var callback,
		iframe,
		msg,
		ready = false;

	function onMessage(evt) {

		if(!iframe || evt.source !== iframe.contentWindow) {
			return;
		}

		var data = JSON.parse(evt.data);

		if(data.type === 'ready') {
			ready = true;
			send();
			return;
		}

		callback.call(msg._this, data.err, data.res);
		window.removeEventListener('message', onMessage);
		iframe.parentNode.removeChild(iframe);

	}

	function send() {
		if(!ready) {
			return;
		}
		iframe.contentWindow.postMessage(
			JSON.stringify(msg),
			host
		);
	}

	req.end = function(fn) {

		window.addEventListener('message', onMessage);

		iframe = buildFrame(host);

		callback = fn || function(){};

		msg = {
			method: this.method,
			url: this.url,
			query: this._query,
			timeout: this._timeout,
			data: this._data,
			header: this.header,
			_this: this
		};
		send();

	};

	return req;

};
module.exports.getProxyFilePath = function() {
	return __dirname + '/index.html';
};
module.exports.getProxyDefaultLocation = function() {
	return '/lib/superagent-d2l-cors-proxy/' + version + '/index.html';
};
module.exports._tryGetHost = tryGetHost;
