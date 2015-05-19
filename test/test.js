'use strict';

var corsProxy = require('../'),
	expect = require('chai').expect,
	nock = require('nock'),
	superagent = require('superagent'),
	sinon = require('sinon');

var cdnFile = 'https://s.brightspace.com/test/test.txt';

var iframeStub = {
	contentWindow: {
		postMessage: function() {}
	},
	parentNode: {
		removeChild: function() {}
	},
	setAttribute: function() {}
};

function MockXmlHttpRequest() { this.withCredentials = true; }
function MockIEXmlHttpRequest() {}

function createMessage(msg, source) {
	msg = msg || {};
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
			'/foo.ca',
			'//host.com'
		].forEach(function(url) {
			it('should fail with no protocol: ' + url, function() {
				var host = corsProxy._tryGetHost(url);
				expect(host).to.be.null;
			});
		});

		['http://', 'https://'].forEach(function(protocol) {
			[
				'host.com',
				'host.com/',
				'host.com/foo.html',
				'host.com/foo/bar.json'
			].forEach(function(url) {
				it('should return the host: ' + protocol + url, function() {
					var host = corsProxy._tryGetHost(protocol + url);
					expect(host).to.equal(protocol + 'host.com');
				});
			});
		});

	});

	describe('getProxyFilePath', function() {

		it('should return correct path', function() {
			var filePath = corsProxy.getProxyFilePath();
			expect(filePath).to.equal(
				require('path').join(__dirname, '../', 'index.html')
			);
		});

	});

	describe('getProxyDefaultLocation', function() {

		it('should return correct location', function() {
			var location = corsProxy.getProxyDefaultLocation();
			expect(location).to.be.defined;
		});

	});

	describe('proxy', function() {

		var addEventListenerSpy,
			createElementSpy,
			onMessage,
			postMessageSpy,
			removeChildSpy,
			removeEventListenerSpy;

		function sendReady() {
			onMessage(
				createMessage({type:'ready'})
			);
		}

		beforeEach(function() {

			nock('https://s.brightspace.com')
				.get('/test/test.txt')
				.reply(200, {success: true});

			nock('http://localhost')
				.get('/foo')
				.reply(200, {foo: 'bar'});

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
				},
				removeEventListener: function() {}
			};

			addEventListenerSpy = sinon.spy(
				global.window,
				'addEventListener'
			);
			removeEventListenerSpy = sinon.spy(
				global.window,
				'removeEventListener'
			);
			createElementSpy = sinon.spy(
				global.document,
				'createElement'
			);
			postMessageSpy = sinon.spy(
				iframeStub.contentWindow,
				'postMessage'
			);
			removeChildSpy = sinon.spy(
				iframeStub.parentNode,
				'removeChild'
			);

		});

		afterEach(function() {
			iframeStub.contentWindow.postMessage.restore();
			iframeStub.parentNode.removeChild.restore();
		});

		describe('CORS support', function() {

			beforeEach(function() {
				global.XMLHttpRequest = MockXmlHttpRequest;
			});

			it('should not add a message event listener', function() {
				superagent.get(cdnFile).use(corsProxy).end();
				expect(addEventListenerSpy.called).to.be.false;
				expect(onMessage).to.be.undefined;
			});

			it('should not create an IFRAME', function() {
				superagent.get(cdnFile).use(corsProxy).end();
				expect(createElementSpy.called).to.be.false;
			});

			it('should make a normal request without IFRAME', function(done) {
				superagent
					.get(cdnFile)
					.use(corsProxy)
					.end(function(err,res) {
						expect(addEventListenerSpy.called).to.be.false;
						expect(createElementSpy.called).to.be.false;
						expect(res.body.success).to.be.true;
						done();
					});
			});

		});

		describe('no CORS support', function() {

			beforeEach(function() {
				global.XMLHttpRequest = MockIEXmlHttpRequest;
			});

			it('should add a message event listener', function() {
				superagent.get(cdnFile).use(corsProxy).end();
				expect(addEventListenerSpy.calledWith('message'))
					.to.be.true;
				expect(onMessage).to.be.defined;
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
						res: { body: {foo: 'bar' } }
					})
				);
			});

			it('should remove IFRAME after delivery', function() {
				superagent.get(cdnFile).use(corsProxy).end();
				sendReady();
				onMessage(createMessage());
				expect(removeChildSpy.calledOnce).to.be.true;
			});

			it('should remove event listener after delivery', function() {
				superagent.get(cdnFile).use(corsProxy).end();
				sendReady();
				onMessage(createMessage());
				expect(
					removeEventListenerSpy.calledWith('message', onMessage)
				).to.be.true;
			});

			it('should not handle events from other windows', function() {
				var spy = sinon.spy();
				superagent.get(cdnFile).use(corsProxy).end(spy);
				sendReady();
				onMessage(createMessage({},'foo'));
				expect(spy.called).to.be.false;
			});

			it('should not break if no callback specified', function() {
				superagent.get(cdnFile).use(corsProxy).end();
				sendReady();
				onMessage(createMessage());
				expect(postMessageSpy.calledOnce).to.be.true;
			});

			it('should not intercept requests without "use" call', function(done) {
				superagent.get(cdnFile).end(function(err, res) {
					expect(res.body.success).to.be.true;
					done();
				});
			});

			it('should not attach if host invalid', function(done) {
				superagent.get('/foo').use(corsProxy).end(function(err, res) {
					expect(res.body.foo).to.equal('bar');
					done(err);
				});
			});

		});

	});

});
