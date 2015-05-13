'use strict';

var requests = {};
var queuedRequests = [];
var ready = false;
var id = 0;
var iframe = null;
var version = require('./package.json').version;

function send(msg) {

	requests[msg.id] = msg;

	if(!ready) {
		queuedRequests.push(msg.id);
		return;
	}

	iframe.contentWindow.postMessage(
		JSON.stringify(msg),
		'*'
	);

}

function sendQueuedRequests() {
	queuedRequests.forEach(function(id) {
		send(requests[id]);
	});
	queuedRequests = [];
}

function onMessage(evt) {

	if(evt.source !== iframe.contentWindow) {
		return;
	}

	var data = JSON.parse(evt.data);

	if(data.type === 'ready') {
		ready = true;
		sendQueuedRequests();
		return;
	}

	var r = requests[data.id];
	if(r) {
		r._this.callback.call(r._this, data.err, data.res);
		delete requests[data.id];
	}

}

function tryGetHost(url) {

	url = url || '';

	var host = url;
	if(url.indexOf('//') === 0) {
		host = url.substr(2);
	} else if(url.indexOf('http://') === 0) {
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
	iframe = document.getElementById('d2l-cors-proxy');
	if(iframe === null ) {
		iframe = document.createElement('iframe');
		iframe.id = 'd2l-cors-proxy';
		iframe.setAttribute('style', 'display:none;');
		iframe.src = host + '/lib/d2l-cors-proxy/' + version + '/';
		document.body.appendChild(iframe);
	}
}

module.exports = function(superagent) {

	// CORS feature detection:
	// http://stackoverflow.com/questions/1641507/detect-browser-support-for-cross-domain-xmlhttprequests
	// https://hacks.mozilla.org/2009/07/cross-site-xmlhttprequest-with-cors/
	var supportsCors = 'withCredentials' in new XMLHttpRequest();
	if(supportsCors) {
		return function(req) {
			return req;
		};
	}

	var oldEnd = superagent.Request.prototype.end;

	superagent.Request.prototype.end = function(fn) {

		var host = tryGetHost(this.url);
		if(!this._d2lCorsProxy || !host) {
			oldEnd.apply(this, arguments);
			return this;
		}

		buildFrame(host);

		this._callback = fn || function(){};

		var msg = {
			id: ++id,
			method: this.method,
			url: this.url,
			query: this._query,
			timeout: this._timeout,
			data: this._data,
			header: this.header,
			_this: this
		};
		send(msg);

	};

	window.addEventListener('message', onMessage);

	return function(req) {
		req._d2lCorsProxy = true;
		return req;
	};

};
module.exports.getProxyFilePath = function() {
	return __dirname + '/index.html';
};
module.exports.getProxyDefaultLocation = function() {
	return '/lib/d2l-cors-proxy/' + version + '/';
};
module.exports._tryGetHost = tryGetHost;
