# `react-sip` changelog

## [0.8.1](https://github.com/callthemonline/react-sip/tree/0.8.1) (2018-10-20)

[All Commits](https://github.com/callthemonline/react-sip/compare/0.8.0...0.8.1)

- Upgrade dependencies including JsSIP 3.2.15 ([3564b47b](https://github.com/callthemonline/react-sip/commit/3564b47ba0215d9ef7fc4a542e8a66bf80ec5981))
- Fix TypeScript types in SipProvider ([a26ab823](https://github.com/callthemonline/react-sip/commit/a26ab823367eda93123422fdd9526aab574ac836))

## [0.8.0](https://github.com/callthemonline/react-sip/tree/0.8.0) (2018-08-04)

[All Commits](https://github.com/callthemonline/react-sip/compare/0.7.0...0.8.0)

- Guard against multiple SipProviders ([#22](https://github.com/callthemonline/react-sip/pull/22))
- Switch to TypeScript, TSLint and Prettier ([#21](https://github.com/callthemonline/react-sip/pull/21))

## [0.7.0](https://github.com/callthemonline/react-sip/tree/0.7.0) (2018-04-19)

[All Commits](https://github.com/callthemonline/react-sip/compare/0.6.0...0.7.0)

- Add pathname prop ([#18](https://github.com/callthemonline/react-sip/pull/18))

## [0.6.0](https://github.com/callthemonline/react-sip/tree/0.6.0) (2018-03-24)

[All Commits](https://github.com/callthemonline/react-sip/compare/0.5.0...0.6.0)

- Allow force restart ICE ([#17](https://github.com/callthemonline/react-sip/pull/17))

## [0.5.0](https://github.com/callthemonline/react-sip/tree/0.5.0) (2017-12-02)

[All Commits](https://github.com/callthemonline/react-sip/compare/0.4.0...0.5.0)

- Refactor `<SipProvider />` component by changing the shape of its context and by making it possible to modify all props on fly
- Expose `sipType`, `callType`, `extraHeadersType` and `iceServersType` `PropTypes`
- Improve docs in `README`
- add `LICENSE,`CHANGELOG`and`UPGRADING`
- Automatically publish to npm from travis

See [UPGRADING.md](./UPGRADING.md#04--05) for how to upgrade from 0.4
