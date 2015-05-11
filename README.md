# superagent-d2l-cors-proxy

[![NPM version][npm-image]][npm-url]
[![Build status][ci-image]][ci-url]
[![Coverage Status][coverage-image]][coverage-url]
[![Dependency Status][dependencies-image]][dependencies-url]

Plugin for [superagent](https://github.com/visionmedia/superagent) for Brightspace free-range applications which will proxy cross-origin requests to the Brightspace CDN, allowing  [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS) for browsers which don't support it.

##Why
Older versions of IE -- specifically IE8 and IE9 -- do not support making  cross-origin requests using the standard [XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest) object. Instead, they rely on the non-standard, proprietary [XDomainRequest](https://developer.mozilla.org/en-US/docs/Web/API/XDomainRequest).

Not only does superagent [not support the XDomainRequest](https://github.com/visionmedia/superagent/issues/409) object, but XDomainRequest also has [many restrictions](http://blogs.msdn.com/b/ieinternals/archive/2010/05/13/xdomainrequest-restrictions-limitations-and-workarounds.aspx) which are not imposed normally when using CORS. There [are plugins for superagent](https://github.com/trevorreeves/superagent-legacyIESupport) which add support for the XDomainRequest object, but the restrictions still apply.

So we need a better way to make cross-origin requests to the Brightspace CDN in all browsers.

##How

Instead of making the request cross-origin, this plugin will proxy the request through Brightspace. For security and performance reasons, the proxy will **only** occur if:

* The browser being used doesn't natively support CORS (IE8 and IE9)
* The request target is the Brightspace CDN
* The request scheme is HTTP or HTTPS
* The request method is GET

##Usage

First, download via NPM:

```shell
npm install superagent-d2l-cors-proxy
```

Then simply `use` it with any requests you're making to the Brightspace CDN with superagent:

```javascript
var request = require('superagent'),
	proxy = require('superagent-d2l-cors-proxy');

request
	.get('https://s.brightspace.com/myApp/myFile.json')
	.use(proxy)
	.end(...);
```

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
