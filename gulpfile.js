'use strict';

var opts = {
	id: 'superagent-d2l-cors-proxy',
	creds: {
		key: 'AKIAIG2ADEPNW456POYA',
		secret: process.env.CDN_SECRET
	},
	version: process.env.TRAVIS_TAG
};

var gulp = require('gulp'),
	pg = require('peanut-gallery'),
	publisher = require('gulp-frau-publisher').lib(opts);

gulp.task( 'publish', function( cb ) {
	gulp.src('./index.html')
		.pipe( publisher.getStream() )
		.on( 'end', function() {
			var message = '[Deployment available online](' +
				publisher.getLocation() + 'index.html)';

			pg.comment( message, {}, function( error, response ) {
				if( error )
					return cb( JSON.stringify( error ) );
				cb();
			} );

		} );
});
