# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [2.3.2](https://github.com/LibreService/my_rime/compare/v2.3.0-beta...v2.3.2) (2025-10-27)

### Features

* add announcement component and changelog parser ([7fabdee](https://github.com/LibreService/my_rime/commit/7fabdeec265664055ea549ee89aba59d2aba1869))
* add feedback form component, fix: T9Keyboard space not working ([17715ba](https://github.com/LibreService/my_rime/commit/17715bac17321d50aa34dc7044086f9ceaec6fc9))
* add speech model download script, integrate T9 pinyin functionality ([fd5bb9a](https://github.com/LibreService/my_rime/commit/fd5bb9a75f793b94ad85549d563464048133fa61))
* add yuyan T9 pinyin ([866da7c](https://github.com/LibreService/my_rime/commit/866da7cc3bbf10696a7688b07ca678c9da75a512))
* allow user to choose which t9 keyboard to use on window resize; ([fcec77d](https://github.com/LibreService/my_rime/commit/fcec77d6252e2706c79651beb466c8dab69d3f84))
* implement caching for voice recognition models ([e0c364f](https://github.com/LibreService/my_rime/commit/e0c364f72d48b9e5fcb2c0eaeb558de36b1e5250))

### Bug Fixes

* form submit not working ([c2fa572](https://github.com/LibreService/my_rime/commit/c2fa57296fe3f1ea043b47728c4489d944d94e96))
* form values missing when submit ([4b54082](https://github.com/LibreService/my_rime/commit/4b540826c183e7079f1787587a594baf911230e4))

### Documentation

* Update README.md ([bde45fc](https://github.com/LibreService/my_rime/commit/bde45fc1fd40032b6dc9ebaf5198fa164c900462))

### Code Refactoring

* remove unused ime package ([7ab0918](https://github.com/LibreService/my_rime/commit/7ab0918d804644ebc75f9626f56c825a55bfb2d8))

## [2.3.1] - 2025-10-27

### Features

- T9 pinyin keyboard with suggestion support
- User-configurable T9 keyboard layout selection
- Speech recognition model download script
- T9 sidebar improvements

### Changes

- Allow users to choose T9 keyboard layout on window resize
- Updated T9 sidebar interface

### Miscellaneous

- Added other input method recommendations
