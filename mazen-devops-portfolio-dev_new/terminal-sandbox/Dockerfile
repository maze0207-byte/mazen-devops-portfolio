FROM ubuntu:22.04-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get install -y --no-install-recommends bash curl jq kubectl helm coreutils iputils-ping ca-certificates && \
    rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1001 -s /usr/bin/bash visitor

RUN mkdir -p /scripts /home/visitor && \
    chown -R visitor:visitor /home/visitor /scripts

COPY ./scripts/restricted-shell.sh /scripts/restricted-shell.sh
COPY ./scripts/motd.sh /scripts/motd.sh
COPY ./files/about.txt /etc/about.txt

RUN chmod +x /scripts/restricted-shell.sh /scripts/motd.sh && \
    chown visitor:visitor /etc/about.txt

USER 1001
WORKDIR /home/visitor
ENV SHELL=/scripts/restricted-shell.sh
CMD ["/scripts/restricted-shell.sh"]
