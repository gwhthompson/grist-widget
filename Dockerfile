FROM gristlabs/grist:stable

RUN apt-get update && apt-get install -y openssl ca-certificates && \
    python3 -m pip install sqids python-ulid html2text policyengine-uk && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

COPY ./dist /grist/plugins/gwhthompson-widgets

ENTRYPOINT ["/bin/sh", "-c", "update-ca-certificates && exec ./sandbox/docker_entrypoint.sh \"$@\"", "--"]

CMD ["node", "./sandbox/supervisor.mjs"]