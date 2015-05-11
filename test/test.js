'use strict';

var expect = require('chai').expect,
	proxy = require('../'),
	sinon = require('sinon');

var cdnFile = 'https://s.brightspace.com/test/text.txt';
var cdnFileHttp = 'HTtP://s.brightspACe.cOM/test/text.txt';
var otherFile = 'http://www.google.ca/file.json';

function MockXmlHttpRequest() { this.withCredentials = true; }
function MockIEXmlHttpRequest() {}

var testCases = [
	{ cors: true, url: cdnFile, proxy: false },
	{ cors: true, url: cdnFileHttp, proxy: false },
	{ cors: true, url: otherFile, proxy: false },
	{ cors: false, url: cdnFile, proxy: true },
	{ cors: false, url: cdnFileHttp, proxy: true },
	{ cors: false, url: otherFile, proxy: false }
];

describe('superagent-d2l-cors-proxy', function() {

	var request, setSpy;

	beforeEach(function() {
		request = {
			set: function() {}
		};
		setSpy = sinon.spy(request, 'set');
	});

	testCases.forEach(function(test, index) {

		var name = 'should' + (test.proxy ? '' : ' NOT') + ' proxy "' +
			test.url + '" ' + (test.cors ? '(CORS)' :  '(NO CORS)');

		it(name, function() {

			request.url = test.url;
			global.XMLHttpRequest = test.cors ?
				MockXmlHttpRequest : MockIEXmlHttpRequest;

			var result = proxy(request);

			if(test.proxy) {
				expect(setSpy.calledOnce).to.equal(true);
				expect(setSpy.calledWith('X-CorsProxy-Url', test.url));
				expect(result.url).to.equal('/d2l/lp/cors-proxy');
			} else {
				expect(setSpy.called).to.equal(false);
				expect(result.url).to.equal(test.url);
			}

		});

	});

});
