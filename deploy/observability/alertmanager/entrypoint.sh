#!/bin/sh
set -eu

escape() {
  printf '%s' "$1" | sed 's/[\/&]/\\&/g'
}

sed \
  -e "s/\${SMTP_HOST}/$(escape "${SMTP_HOST}")/g" \
  -e "s/\${SMTP_PORT}/$(escape "${SMTP_PORT}")/g" \
  -e "s/\${SMTP_FROM}/$(escape "${SMTP_FROM}")/g" \
  -e "s/\${SMTP_USERNAME}/$(escape "${SMTP_USERNAME}")/g" \
  -e "s/\${SMTP_PASSWORD}/$(escape "${SMTP_PASSWORD}")/g" \
  -e "s/\${ALERT_EMAIL_TO}/$(escape "${ALERT_EMAIL_TO}")/g" \
  /etc/alertmanager/alertmanager.yml.template > /etc/alertmanager/alertmanager.yml

exec /bin/alertmanager --config.file=/etc/alertmanager/alertmanager.yml --storage.path=/alertmanager
