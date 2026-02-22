FROM node:18.8-alpine
LABEL maintainer="VolgaCTF"

ARG UID=1337
ARG GID=1337
ARG BUILD_DATE
ARG BUILD_VERSION
ARG VCS_REF

LABEL org.label-schema.schema-version="1.0"
LABEL org.label-schema.name="volgactf-qualifier-backend"
LABEL org.label-schema.description="VolgaCTF Qualifier backend"
LABEL org.label-schema.url="https://volgactf.ru/en"
LABEL org.label-schema.vcs-url="https://github.com/VolgaCTF/volgactf-qualifier-backend"
LABEL org.label-schema.vcs-ref=$VCS_REF
LABEL org.label-schema.version=$BUILD_VERSION

WORKDIR /app
COPY VERSION package*.json entrypoint.sh .
COPY src ./src
COPY email-templates ./email-templates
RUN apk add --no-cache --virtual .gyp python3 make g++ postgresql-dev && npm ci --production && apk del .gyp
RUN addgroup --gid ${GID} volgactf && adduser --uid ${UID} --disabled-password --gecos "" --ingroup volgactf --no-create-home volgactf && chown -R volgactf:volgactf .
USER volgactf
ENTRYPOINT ["/bin/sh", "entrypoint.sh"]
