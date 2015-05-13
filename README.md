# superagent-d2l-cors-proxy

[![NPM version][npm-image]][npm-url]
[![Build status][ci-image]][ci-url]
[![Coverage Status][coverage-image]][coverage-url]
[![Dependency Status][dependencies-image]][dependencies-url]

Plugin for [superagent](https://github.com/visionmedia/superagent) which will proxy cross-origin requests ([CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS)) for browsers which don't support them.

##Why
Older versions of IE (specifically IE8 and IE9) do not support making  cross-origin requests using the standard [XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest) object. Instead, they rely on the non-standard, proprietary [XDomainRequest](https://developer.mozilla.org/en-US/docs/Web/API/XDomainRequest).

Quite reasonably, superagent does [not support the XDomainRequest](https://github.com/visionmedia/superagent/issues/409) object. Also, XDomainRequest also [has a bunch of restrictions](http://blogs.msdn.com/b/ieinternals/archive/2010/05/13/xdomainrequest-restrictions-limitations-and-workarounds.aspx) which are not imposed normally when using CORS. There [are plugins for superagent](https://github.com/trevorreeves/superagent-legacyIESupport) which add support for the XDomainRequest object, but the restrictions still apply.

So we need a better way to make cross-origin requests in all browsers.

##How it works

If no CORS support is detected, this plugin will proxy the request through an IFRAME pointing at a HTML document on the destination host using [postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage). Since CORS doesn't apply to the document on the host, it can complete the actual request without limitations.

##Usage

First, download via NPM:

```shell
npm install superagent-d2l-cors-proxy
```

Upload the provided `index.html` file to your destination host at `http://myhost.com/lib/d2l-cors-proxy/0.0.1/`.

In your application, `require()` the library, passing it a reference to `superagent`:

```javascript
var request = require('superagent'),
var corsProxy = require('superagent-d2l-cors-proxy')(request);
```

Then `use()` the proxy with any requests you're making to the destination host with superagent:

```javascript
request
	.get('http://myHost.com/myApp/myFile.json')
	.use(corsProxy)
	.end(...);
```

**Important**: when making requests to other hosts that shouldn't be proxied, simply omit the `use(corsProxy)` from the superagent call.

## Contributing
Contributions are welcome, please submit a pull request!

### Code Style

This repository is configured with [EditorConfig](http://editorconfig.org) rules and
contributions should make use of them.

[npm-url]: https://www.npmjs.org/package/superagent-d2l-cors-proxy
[npm-image]: https://img.shields.io/npm/v/superagent-d2l-cors-proxy.svg
[ci-url]: https://travis-ci.org/Brightspace/superagent-d2l-cors-proxy
[ci-image]: https://img.shields.io/travis/Brightspace/superagent-d2l-cors-proxy.svg
[coverage-url]: https://coveralls.io/r/Brightspace/superagent-d2l-cors-proxy?branch=master
[coverage-image]: https://img.shields.io/coveralls/Brightspace/superagent-d2l-cors-proxy.svg
[dependencies-url]: https://david-dm.org/brightspace/superagent-d2l-cors-proxy
[dependencies-image]: https://img.shields.io/david/Brightspace/superagent-d2l-cors-proxy.svg
