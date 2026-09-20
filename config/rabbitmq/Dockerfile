# Config copiata nell'immagine: il bind-mount di enabled_plugins su Docker
# Desktop Windows dava errore eio, e i path relativi dei volumes finivano su
# cartelle vuote. Con il build context invece funziona.
FROM rabbitmq:3.13-management

COPY config/rabbitmq/rabbitmq.conf     /etc/rabbitmq/rabbitmq.conf
COPY config/rabbitmq/enabled_plugins   /etc/rabbitmq/enabled_plugins
COPY config/rabbitmq/definitions.json  /etc/rabbitmq/definitions.json
