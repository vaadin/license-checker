import babel from 'rollup-plugin-babel';

const config = [
  // Bundle and transpile the sources so that they can be executed
  // in any supported browser. The IIFE format makes it easy to wrap the output
  // into vaadin-dev-mode comments.
  {
    input: 'src/vaadin-license-checker.js',
    output: {
      format: 'iife',
      file: 'vaadin-license-checker.es5.js',
    },
    plugins: [
      babel({
        plugins: [
          'external-helpers',
          'transform-es2015-block-scoping',
          'transform-custom-element-classes',
          'transform-es2015-classes',
          'transform-es2015-template-literals'
        ]
      }),
    ]
  },
];

export default config;
