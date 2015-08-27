var gulp = require('gulp');
var gls = require('gulp-live-server');

require('web-component-tester').gulp.init(gulp);

gulp.task('default', function() {
    console.log('\n  Use:\n    gulp <x|y|z>\n');
});

gulp.task('verify', ['start-license-server', 'test:local']);

gulp.task('start-license-server', function(){
    var server = gls.new('mockserver/server.js');
    server.start();
});

gulp.task('stop-license-server', function(){
    var server = gls.new('mockserver/server.js');
    server.start();
});
