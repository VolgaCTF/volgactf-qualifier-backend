# Themis Quals Backend
[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

## For developers

### Transpile code

```sh
$ npm run build
```

### Admin utility

```sh
$ npm run cli
```

### Database migration utility

Migrate to the latest version

```sh
$ npm run knex -- migrate:latest
```

Rollback

```sh
$ npm run knex -- migrate:rollback
```

### Lint code

```sh
$ npm run lint
```
