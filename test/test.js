'use strict';

var expect = require('chai').expect,
	nock = require('nock'),
	proxy = require('../'),
	superagent = require('superagent'),
	sinon = require('sinon');

var cdnFile = 'https://s.brightspace.com/test/test.txt';
var end = superagent.Request.prototype.end;

var lastId = -1;
var iframeStub = {
	contentWindow: {
		postMessage: function(msgStr) {
			var msg = JSON.parse(msgStr);
			lastId = msg.id;
		}
	},
	setAttribute: function() {}
};

function MockXmlHttpRequest() { this.withCredentials = true; }
function MockIEXmlHttpRequest() {}

function createMessage(msg, source) {
	source = source || iframeStub.contentWindow;
	return {
		source: source,
		data: JSON.stringify(msg)
	};
}

describe('superagent-d2l-cors-proxy', function() {

	describe('tryGetHost', function() {

		[
			null,
			undefined,
			'',
			'foo.html',
			'/foo.ca'
		].forEach(function(url) {
			it('should fail with no protocol: ' + url, function() {
				var host = proxy._tryGetHost(url);
				expect(host).to.be.null;
			});
		});

		['//', 'http://', 'https://'].forEach(function(protocol) {
			[
				'host.com',
				'host.com/',
				'host.com/foo.html',
				'host.com/foo/bar.json'
			].forEach(function(url) {
				it('should return the host: ' + protocol + url, function() {
					var host = proxy._tryGetHost(protocol + url);
					expect(host).to.equal(protocol + 'host.com');
				});
			});
		});

	});

	describe('getProxyFilePath', function() {

		it('should return correct path', function() {
			var filePath = proxy.getProxyFilePath();
			expect(filePath).to.equal(
				require('path').join(__dirname, '../', 'index.html')
			);
		});

	});

	describe('getProxyDefaultLocation', function() {

		it('should return correct location', function() {
			var location = proxy.getProxyDefaultLocation();
			expect(location).to.be.defined;
		});

	});

	describe('proxy', function() {

		var addEventListenerSpy,
			corsProxy,
			createElementSpy,
			onMessage,
			postMessageSpy;

		function sendReady() {
			onMessage(
				createMessage({type:'ready'})
			);
		}

		beforeEach(function() {

			nock('https://s.brightspace.com')
				.get('/test/test.txt')
				.reply(200, {success: true});

			var iframe = null;
			global.document = {
				createElement: function() {
					iframe = iframeStub;
					return iframe;
				},
				body: {
					appendChild: function() {}
				},
				getElementById: function() {
					return iframe;
				}
			};

			global.window = {
				addEventListener: function(type, handler) {
					onMessage = handler;
				}
			};

			addEventListenerSpy = sinon.spy(
				global.window,
				'addEventListener'
			);
			createElementSpy = sinon.spy(
				global.document,
				'createElement'
			);
			postMessageSpy = sinon.spy(
				iframeStub.contentWindow,
				'postMessage'
			);

		});

		afterEach(function() {
			iframeStub.contentWindow.postMessage.restore();
		});

		describe('CORS support', function() {

			beforeEach(function() {
				global.XMLHttpRequest = MockXmlHttpRequest;
				corsProxy = proxy(superagent);
			});

			it('should not add a message event listener', function() {
				expect(addEventListenerSpy.called).to.be.false;
				expect(onMessage).to.be.undefined;
			});

			it('should not overwrite superagent Request.end', function() {
				expect(superagent.Request.prototype.end).to.equal(end);
			});

			it('should not create an IFRAME', function() {
				expect(createElementSpy.called).to.be.false;
			});

			it('should return req without _d2lCorsProxy', function() {
				var req = {};
				var res = corsProxy(req);
				expect(res._d2lCorsProxy).to.be.undefined;
			});

			it('should make a normal request without IFRAME', function(done) {
				superagent
					.get(cdnFile)
					.use(corsProxy)
					.end(function(err,res) {
						expect(addEventListenerSpy.called).to.be.false;
						expect(createElementSpy.called).to.be.false;
						expect(superagent.Request.prototype.end).to.equal(end);
						expect(res.body.success).to.be.true;
						done();
					});
			});

		});

		describe('no CORS support', function() {

			beforeEach(function() {
				global.XMLHttpRequest = MockIEXmlHttpRequest;
				corsProxy = proxy(superagent);
			});

			it('should add a message event listener', function() {
				expect(addEventListenerSpy.calledWith('message'))
					.to.be.true;
				expect(onMessage).to.be.defined;
			});

			it('should return req with _d2lCorsProxy', function() {
				var req = {};
				var res = corsProxy(req);
				expect(res._d2lCorsProxy).to.be.true;
			});

			it('should wait to send until "ready" event', function() {
				superagent.get(cdnFile).use(corsProxy).end();
				expect(postMessageSpy.called).to.be.false;
				sendReady();
				expect(postMessageSpy.calledOnce).to.be.true;
			});

			it('should proxy request after "ready" event', function(done) {
				superagent
					.get(cdnFile)
					.use(corsProxy)
					.end(function(err,res) {
						expect(res.body.foo).to.equal('bar');
						done();
					});
				sendReady();
				onMessage(
					createMessage({
						id: lastId,
						res: { body: {foo: 'bar' } }
					})
				);
			});

			it('should not create multiple IFRAMEs', function() {
				superagent.get(cdnFile).use(corsProxy).end();
				superagent.get(cdnFile).use(corsProxy).end();
				expect(createElementSpy.calledOnce).to.be.true;
			});

			it('should not handle events from other windows', function() {
				var spy = sinon.spy();
				superagent.get(cdnFile).use(corsProxy).end(spy);
				sendReady();
				onMessage(createMessage({ id: lastId }, 'foo' ));
				expect(spy.called).to.be.false;
			});

			it('should not break if no callback specified', function() {
				superagent.get(cdnFile).use(corsProxy).end();
				sendReady();
				onMessage(createMessage({ id: lastId }));
				expect(postMessageSpy.calledOnce).to.be.true;
			});

			it('should not handle events multiple times', function() {
				var spy = sinon.spy();
				superagent.get(cdnFile).use(corsProxy).end(spy);
				sendReady();
				onMessage(createMessage({ id: lastId } ));
				onMessage(createMessage({ id: lastId } ));
				expect(spy.calledOnce).to.be.true;
			});

			it('should not intercept requests without "use" call', function(done) {
				superagent.get(cdnFile).end(function(err, res) {
					expect(res.body.success).to.be.true;
					done();
				});
			});

		});

	});

});
